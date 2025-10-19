/**
 * Collaboration Slice - Zustand Store
 *
 * Manages real-time collaboration features:
 * - User presence tracking (who's online)
 * - Object locks (prevent concurrent edits)
 * - Selection state broadcasting (show what others are editing)
 * - Awareness state (user names, colors, activities)
 *
 * Integration:
 * - Supabase Realtime Presence API for user tracking
 * - Canvas event sync via CanvasSyncManager
 */

import type { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PaperboxStore } from '../index';
import { perfMonitor } from '../../lib/monitoring/PerformanceMonitor';

/**
 * Selection state - tracks which objects a user has selected
 */
export interface SelectionState {
  objectIds: string[];
  updatedAt: number; // For conflict resolution (last-touch-wins)
}

/**
 * User presence information
 */
export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string; // For cursor and selection highlighting
  isActive: boolean;
  lastSeen: number;
  currentTool?: string;
  selection?: SelectionState; // Selected objects
  activelyEditing?: string | null; // Object currently being modified
}

/**
 * Live cursor position
 * Note: Cursors are managed by useBroadcastCursors hook, not this slice
 */
export interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Object lock information
 */
export interface ObjectLock {
  objectId: string;
  userId: string;
  userName: string;
  acquiredAt: number;
  expiresAt?: number;
}

/**
 * Collaboration slice state interface
 */
export interface CollaborationSlice {
  // State
  currentUserId: string | null;
  presence: Record<string, UserPresence>;
  locks: Record<string, ObjectLock>;
  isOnline: boolean;
  roomId: string | null;
  presenceChannel: RealtimeChannel | null;

  // Actions - User presence
  setCurrentUser: (userId: string, userName: string, userColor: string) => void;
  updatePresence: (userId: string, updates: Partial<UserPresence>) => void;
  removePresence: (userId: string) => void;
  setPresenceMap: (presenceMap: Record<string, UserPresence>) => void;
  clearAllPresence: () => void;

  // Actions - Selection state
  updateRemoteSelection: (userId: string, selection: SelectionState) => void;
  clearRemoteSelection: (userId: string) => void;
  broadcastSelection: (objectIds: string[]) => void;
  broadcastActivelyEditing: (objectIds: string[] | null) => void;
  handleSelectionConflict: (remoteUserId: string, remoteSelection: SelectionState) => string[];

  // Actions - Object locks
  acquireLock: (objectId: string, userId: string, userName: string) => boolean;
  releaseLock: (objectId: string) => void;
  releaseLockByUser: (userId: string) => void;
  releaseAllLocks: () => void;
  setLocks: (locks: Record<string, ObjectLock>) => void;

  // Actions - Database-level locking
  requestLock: (objectId: string) => Promise<boolean>;
  releaseDbLock: (objectId: string) => Promise<void>;

  // Actions - Connection state
  setOnline: (isOnline: boolean) => void;
  setRoomId: (roomId: string | null) => void;

  // Supabase Presence
  setupPresenceChannel: (userId: string, userName: string, userColor: string, roomId: string) => void;
  cleanupPresenceChannel: () => void;

  // Utilities
  getPresence: (userId: string) => UserPresence | undefined;
  getLock: (objectId: string) => ObjectLock | undefined;
  isObjectLocked: (objectId: string) => boolean;
  isObjectLockedByCurrentUser: (objectId: string) => boolean;
  isObjectLockedByOther: (objectId: string) => boolean;
  getActiveUsers: () => UserPresence[];
}

/**
 * Create collaboration slice
 */
export const createCollaborationSlice: StateCreator<
  PaperboxStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  CollaborationSlice
> = (set, get) => ({
  // Initial state
  currentUserId: null,
  presence: {},
  locks: {},
  isOnline: false,
  roomId: null,
  presenceChannel: null,

  // ─── User Presence Actions ───

  setCurrentUser: (userId: string, userName: string, userColor: string) =>
    set(
      (state) => {
        state.currentUserId = userId;
        state.presence[userId] = {
          userId,
          userName,
          userColor,
          isActive: true,
          lastSeen: Date.now(),
        };
      },
      undefined,
      'collaboration/setCurrentUser',
    ),

  updatePresence: (userId: string, updates: Partial<UserPresence>) =>
    set(
      (state) => {
        const existing = state.presence[userId];
        if (existing) {
          state.presence[userId] = {
            ...existing,
            ...updates,
            lastSeen: Date.now(),
          };
        } else {
          state.presence[userId] = {
            userId,
            userName: updates.userName || 'Unknown',
            userColor: updates.userColor || '#808080',
            isActive: updates.isActive ?? true,
            lastSeen: Date.now(),
            currentTool: updates.currentTool,
            selection: updates.selection,
            activelyEditing: updates.activelyEditing,
          };
        }
      },
      undefined,
      'collaboration/updatePresence',
    ),

  removePresence: (userId: string) =>
    set(
      (state) => {
        delete state.presence[userId];
      },
      undefined,
      'collaboration/removePresence',
    ),

  setPresenceMap: (presenceMap: Record<string, UserPresence>) =>
    set(
      (state) => {
        state.presence = presenceMap;
      },
      undefined,
      'collaboration/setPresenceMap',
    ),

  clearAllPresence: () =>
    set(
      (state) => {
        const currentUserId = state.currentUserId;
        if (currentUserId && state.presence[currentUserId]) {
          const currentUser = state.presence[currentUserId];
          state.presence = { [currentUserId]: currentUser };
        } else {
          state.presence = {};
        }
      },
      undefined,
      'collaboration/clearAllPresence',
    ),

  // ─── Selection State Actions ───

  updateRemoteSelection: (userId: string, selection: SelectionState) =>
    set(
      (state) => {
        if (state.presence[userId]) {
          state.presence[userId].selection = selection;
        }
      },
      undefined,
      'collaboration/updateRemoteSelection',
    ),

  clearRemoteSelection: (userId: string) =>
    set(
      (state) => {
        if (state.presence[userId]) {
          state.presence[userId].selection = undefined;
        }
      },
      undefined,
      'collaboration/clearRemoteSelection',
    ),

  /**
   * Broadcast local selection to other users via Supabase Presence
   * Called from CanvasSyncManager when Fabric selection events fire
   */
  broadcastSelection: (objectIds: string[]) => {
    const state = get();
    const channel = state.presenceChannel;
    const currentUser = state.presence[state.currentUserId ?? ''];

    if (!channel || !currentUser) {
      console.warn('[Collaboration] Cannot broadcast selection - no channel or current user');
      return;
    }

    if (channel.state !== 'joined') {
      console.warn('[Collaboration] Cannot broadcast - channel not ready:', channel.state);
      return;
    }

    const now = Date.now();
    const selectionData = objectIds.length > 0
      ? { objectIds, updatedAt: now }
      : undefined;

    // Broadcast selection via Supabase Presence
    channel.track({
      userId: currentUser.userId,
      userName: currentUser.userName,
      userColor: currentUser.userColor,
      isActive: true,
      lastSeen: now,
      currentTool: currentUser.currentTool,
      selection: selectionData,
    });

    // Update local presence state
    set(
      (state) => {
        if (state.presence[state.currentUserId ?? '']) {
          state.presence[state.currentUserId ?? ''].selection = selectionData;
        }
      },
      undefined,
      'collaboration/broadcastSelection',
    );
  },

  /**
   * Handle selection conflict when another user selects objects we have selected
   * Uses last-touch-wins strategy based on timestamps
   * 
   * @returns Array of object IDs to deselect (conflicts where they win)
   */
  handleSelectionConflict: (_remoteUserId: string, remoteSelection: SelectionState) => {
    const state = get();
    const currentUserId = state.currentUserId;

    if (!currentUserId) return [];

    const myPresence = state.presence[currentUserId];
    if (!myPresence?.selection) return [];

    const mySelection = myPresence.selection;
    const conflicts = mySelection.objectIds.filter((id) => 
      remoteSelection.objectIds.includes(id)
    );

    if (conflicts.length === 0) return [];

    // Last-touch-wins: If their selection is newer, we lose those objects
    if (remoteSelection.updatedAt > mySelection.updatedAt) {
      console.log('[Collaboration] Selection conflict - they win:', {
        conflicts,
        myTime: new Date(mySelection.updatedAt).toISOString(),
        theirTime: new Date(remoteSelection.updatedAt).toISOString(),
      });
      return conflicts;
    }

    return []; // We win
  },

  /**
   * Broadcast "actively editing" state during object manipulation
   * Shows other users which objects are currently being moved/modified
   */
  broadcastActivelyEditing: (objectIds: string[] | null) => {
    const state = get();
    const channel = state.presenceChannel;
    const currentUser = state.presence[state.currentUserId ?? ''];

    if (!channel || !currentUser) return;

    const activelyEditing = objectIds && objectIds.length > 0 ? objectIds[0] : null;

    channel.track({
      userId: currentUser.userId,
      userName: currentUser.userName,
      userColor: currentUser.userColor,
      isActive: true,
      lastSeen: Date.now(),
      currentTool: currentUser.currentTool,
      selection: currentUser.selection,
      activelyEditing,
    });

    set(
      (state) => {
        if (state.presence[state.currentUserId ?? '']) {
          state.presence[state.currentUserId ?? ''].activelyEditing = activelyEditing;
        }
      },
      undefined,
      'collaboration/broadcastActivelyEditing',
    );
  },

  // ─── Object Lock Actions ───

  /**
   * Acquire lock on object
   * @returns true if lock acquired, false if already locked by another user
   */
  acquireLock: (objectId: string, userId: string, userName: string) => {
    const state = get();
    const existingLock = state.locks[objectId];
    
    if (existingLock && existingLock.userId !== userId) {
      return false;
    }

    set(
      (draft) => {
        draft.locks[objectId] = {
          objectId,
          userId,
          userName,
          acquiredAt: Date.now(),
          expiresAt: Date.now() + 30000, // 30 second expiry
        };
      },
      undefined,
      'collaboration/acquireLock',
    );

    return true;
  },

  releaseLock: (objectId: string) =>
    set(
      (state) => {
        delete state.locks[objectId];
      },
      undefined,
      'collaboration/releaseLock',
    ),

  releaseLockByUser: (userId: string) =>
    set(
      (state) => {
        Object.keys(state.locks).forEach((objectId) => {
          if (state.locks[objectId].userId === userId) {
            delete state.locks[objectId];
          }
        });
      },
      undefined,
      'collaboration/releaseLockByUser',
    ),

  releaseAllLocks: () =>
    set(
      (state) => {
        state.locks = {};
      },
      undefined,
      'collaboration/releaseAllLocks',
    ),

  setLocks: (locks: Record<string, ObjectLock>) =>
    set(
      (state) => {
        state.locks = locks;
      },
      undefined,
      'collaboration/setLocks',
    ),

  // ─── Database-Level Locking ───

  /**
   * Request database-level lock on object (optimistic locking)
   * @returns true if lock acquired, false if already locked
   */
  requestLock: async (objectId: string) => {
    const stopTimer = perfMonitor.startTimer('lock_acquisition');
    const userId = get().currentUserId;
    const userName = get().presence[userId ?? '']?.userName ?? 'Unknown';

    if (!userId) {
      stopTimer();
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('canvas_objects')
        .update({
          locked_by: userId,
          lock_acquired_at: new Date().toISOString(),
        })
        .eq('id', objectId)
        .is('locked_by', null) // Only lock if unlocked
        .select()
        .single();

      if (error || !data) {
        stopTimer();
        return false;
      }

      get().acquireLock(objectId, userId, userName);
      stopTimer();
      return true;
    } catch (error) {
      console.error('[Collaboration] Failed to acquire database lock:', error);
      stopTimer();
      return false;
    }
  },

  /**
   * Release database-level lock on object
   * Only releases if current user owns the lock
   */
  releaseDbLock: async (objectId: string) => {
    const stopTimer = perfMonitor.startTimer('lock_release');
    const userId = get().currentUserId;

    if (!userId) {
      stopTimer();
      return;
    }

    const existingLock = get().locks[objectId];
    if (!existingLock || existingLock.userId !== userId) {
      stopTimer();
      return;
    }

    try {
      const { error } = await supabase
        .from('canvas_objects')
        .update({
          locked_by: null,
          lock_acquired_at: null,
        })
        .eq('id', objectId)
        .eq('locked_by', userId);

      if (!error) {
        get().releaseLock(objectId);
      }

      stopTimer();
    } catch (error) {
      console.error('[Collaboration] Failed to release database lock:', error);
      stopTimer();
    }
  },

  // ─── Connection State Actions ───

  setOnline: (isOnline: boolean) =>
    set(
      (state) => {
        state.isOnline = isOnline;
      },
      undefined,
      'collaboration/setOnline',
    ),

  setRoomId: (roomId: string | null) =>
    set(
      (state) => {
        state.roomId = roomId;
      },
      undefined,
      'collaboration/setRoomId',
    ),

  // ─── Supabase Presence Channel ───

  /**
   * Setup Supabase Presence channel for real-time collaboration
   * Creates channel, tracks current user, and subscribes to presence events
   */
  setupPresenceChannel: (userId: string, userName: string, userColor: string, roomId: string) => {
    // Cleanup existing channel
    get().cleanupPresenceChannel();

    // Add current user to presence map immediately
    // This ensures broadcast functions work before Supabase sync completes
    const now = Date.now();
    set(
      (state) => {
        state.presence[userId] = {
          userId,
          userName,
          userColor,
          isActive: true,
          lastSeen: now,
        };
      },
      undefined,
      'collaboration/addCurrentUserToPresence'
    );

    // Create presence channel for the room
    const channelName = `presence-${roomId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    // Track current user's presence
    channel.track({
      userId,
      userName,
      userColor,
      isActive: true,
      lastSeen: now,
    });

    // Subscribe to presence events
    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const presenceMap: Record<string, UserPresence> = {};

        Object.entries(presenceState).forEach(([key, presences]) => {
          const presence = (presences as any[])[0];
          if (presence) {
            presenceMap[key] = {
              userId: presence.userId,
              userName: presence.userName,
              userColor: presence.userColor,
              isActive: presence.isActive ?? true,
              lastSeen: presence.lastSeen ?? Date.now(),
              currentTool: presence.currentTool,
              selection: presence.selection,
              activelyEditing: presence.activelyEditing,
            };
          }
        });

        get().setPresenceMap(presenceMap);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presence = (newPresences as any[])[0];
        if (presence) {
          get().updatePresence(key, {
            userId: presence.userId,
            userName: presence.userName,
            userColor: presence.userColor,
            isActive: presence.isActive ?? true,
            currentTool: presence.currentTool,
            selection: presence.selection,
            activelyEditing: presence.activelyEditing,
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        get().removePresence(key);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Set channel in store only after successful subscription
          set({ presenceChannel: channel }, undefined, 'collaboration/setupPresence');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Collaboration] Channel subscription failed:', status);
          set({ presenceChannel: null }, undefined, 'collaboration/setupPresenceError');
        }
      });
  },

  /**
   * Cleanup Supabase Presence channel
   */
  cleanupPresenceChannel: () => {
    const channel = get().presenceChannel;
    if (channel) {
      channel.untrack();
      channel.unsubscribe();
      set({ presenceChannel: null }, undefined, 'collaboration/cleanupPresence');
    }
  },

  // ─── Utility Functions ───

  getPresence: (userId: string) => {
    return get().presence[userId];
  },

  getLock: (objectId: string) => {
    return get().locks[objectId];
  },

  isObjectLocked: (objectId: string) => {
    return !!get().locks[objectId];
  },

  isObjectLockedByCurrentUser: (objectId: string) => {
    const state = get();
    const lock = state.locks[objectId];
    return lock?.userId === state.currentUserId;
  },

  isObjectLockedByOther: (objectId: string) => {
    const state = get();
    const lock = state.locks[objectId];
    return !!lock && lock.userId !== state.currentUserId;
  },

  getActiveUsers: () => {
    return Object.values(get().presence).filter((p) => p.isActive);
  },
});
