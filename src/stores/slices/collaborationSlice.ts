/**
 * Collaboration Slice - Zustand Store
 *
 * Manages real-time collaboration features
 * Part of 6-slice architecture for Phase II
 *
 * Responsibilities:
 * - User presence tracking (who's online)
 * - Live cursor positions (multiplayer cursors)
 * - Object locks (prevent concurrent edits)
 * - Awareness state (user names, colors, activities)
 *
 * Integration Points:
 * - Supabase Realtime (W1.D4) for presence broadcast
 * - Supabase Presence API for user tracking
 * - Canvas event sync for cursor positions
 */

import type { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PaperboxStore } from '../index';
import { perfMonitor } from '../../lib/monitoring/PerformanceMonitor';

/**
 * Selection state information
 * W5.D5++++++ Phase 1: Track what objects each user has selected
 */
export interface SelectionState {
  objectIds: string[]; // Array of selected canvas object IDs
  updatedAt: number; // Timestamp for conflict resolution (last-touch-wins)
}

/**
 * User presence information
 * W5.D5++++++ Extended with selection state for collaborative editing
 */
export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string; // For cursor and selection highlighting
  isActive: boolean;
  lastSeen: number; // Timestamp
  currentTool?: string;

  // W5.D5++++++ NEW: Collaborative selection state
  selection?: SelectionState; // What objects this user has selected
  activelyEditing?: string | null; // Object ID currently being modified (Phase 2: edit locks)
}

/**
 * Live cursor position
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
  presence: Record<string, UserPresence>; // userId -> presence
  cursors: Record<string, CursorPosition>; // userId -> cursor
  locks: Record<string, ObjectLock>; // objectId -> lock
  isOnline: boolean;
  roomId: string | null;
  presenceChannel: RealtimeChannel | null; // W1.D5: Supabase Presence channel
  lastCursorBroadcast: number | null; // W1.D6: Timestamp of last cursor broadcast for throttling

  // Actions - User presence
  setCurrentUser: (userId: string, userName: string, userColor: string) => void;
  updatePresence: (userId: string, updates: Partial<UserPresence>) => void;
  removePresence: (userId: string) => void;
  setPresenceMap: (presenceMap: Record<string, UserPresence>) => void;
  clearAllPresence: () => void;

  // Actions - Cursor positions
  updateCursor: (userId: string, x: number, y: number) => void;
  removeCursor: (userId: string) => void;
  clearAllCursors: () => void;
  broadcastCursor: (x: number, y: number) => void; // W1.D6: Broadcast cursor via Presence

  // W5.D5++++++ Actions - Selection state (Phase 1: Collaborative selection)
  updateRemoteSelection: (userId: string, selection: SelectionState) => void;
  clearRemoteSelection: (userId: string) => void;
  broadcastSelection: (objectIds: string[]) => void; // Broadcast local selection to others
  broadcastActivelyEditing: (objectIds: string[] | null) => void; // Broadcast actively editing state
  handleSelectionConflict: (remoteUserId: string, remoteSelection: SelectionState) => string[]; // Returns conflicting IDs

  // Actions - Object locks
  acquireLock: (objectId: string, userId: string, userName: string) => boolean;
  releaseLock: (objectId: string) => void;
  releaseLockByUser: (userId: string) => void;
  releaseAllLocks: () => void;
  setLocks: (locks: Record<string, ObjectLock>) => void;

  // W1.D7: Async database-level locking
  requestLock: (objectId: string) => Promise<boolean>;
  releaseDbLock: (objectId: string) => Promise<void>;

  // Actions - Connection state
  setOnline: (isOnline: boolean) => void;
  setRoomId: (roomId: string | null) => void;

  // Supabase Presence (W1.D5)
  setupPresenceChannel: (userId: string, userName: string, userColor: string, roomId: string) => void;
  cleanupPresenceChannel: () => void;

  // Utilities
  getPresence: (userId: string) => UserPresence | undefined;
  getCursor: (userId: string) => CursorPosition | undefined;
  getLock: (objectId: string) => ObjectLock | undefined;
  isObjectLocked: (objectId: string) => boolean;
  isObjectLockedByCurrentUser: (objectId: string) => boolean;
  isObjectLockedByOther: (objectId: string) => boolean;
  getActiveUsers: () => UserPresence[];
  getActiveCursors: () => CursorPosition[];
}

/**
 * Create collaboration slice
 *
 * NOTE: Full real-time sync will be implemented in W1.D4 (Supabase integration)
 * This provides the state structure and local management
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
  cursors: {},
  locks: {},
  isOnline: false,
  roomId: null,
  presenceChannel: null,
  lastCursorBroadcast: null,

  // User presence actions

  /**
   * Set current user information
   */
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

  /**
   * Update user presence
   */
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
          // Create new presence if doesn't exist
          state.presence[userId] = {
            userId,
            userName: updates.userName || 'Unknown',
            userColor: updates.userColor || '#808080',
            isActive: updates.isActive ?? true,
            lastSeen: Date.now(),
            currentTool: updates.currentTool,
          };
        }
      },
      undefined,
      'collaboration/updatePresence',
    ),

  /**
   * Remove user presence
   */
  removePresence: (userId: string) =>
    set(
      (state) => {
        delete state.presence[userId];
      },
      undefined,
      'collaboration/removePresence',
    ),

  /**
   * Set entire presence map (for initial sync)
   */
  setPresenceMap: (presenceMap: Record<string, UserPresence>) =>
    set(
      (state) => {
        state.presence = presenceMap;
      },
      undefined,
      'collaboration/setPresenceMap',
    ),

  /**
   * Clear all presence (disconnect)
   */
  clearAllPresence: () =>
    set(
      (state) => {
        // Keep only current user
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

  // Cursor position actions

  /**
   * Update cursor position for user
   */
  updateCursor: (userId: string, x: number, y: number) =>
    set(
      (state) => {
        state.cursors[userId] = {
          userId,
          x,
          y,
          timestamp: Date.now(),
        };
      },
      undefined,
      'collaboration/updateCursor',
    ),

  /**
   * Remove cursor
   */
  removeCursor: (userId: string) =>
    set(
      (state) => {
        delete state.cursors[userId];
      },
      undefined,
      'collaboration/removeCursor',
    ),

  /**
   * Clear all cursors
   */
  clearAllCursors: () =>
    set(
      (state) => {
        state.cursors = {};
      },
      undefined,
      'collaboration/clearAllCursors',
    ),

  /**
   * Broadcast cursor position via Supabase Presence
   * W1.D6: Live Cursor Tracking
   *
   * Throttled to 60fps (16.67ms) for performance
   */
  broadcastCursor: (x: number, y: number) => {
    const state = get();
    const channel = state.presenceChannel;

    // Early return if no presence channel
    if (!channel) return;

    // Throttle to max 60fps (16.67ms)
    const now = Date.now();
    const lastBroadcast = state.lastCursorBroadcast;

    // Only throttle if we have a previous broadcast timestamp
    if (lastBroadcast !== null && now - lastBroadcast < 16.67) return;

    // Get current presence data
    const currentUser = state.presence[state.currentUserId ?? ''];
    if (!currentUser) return;

    // Broadcast cursor position with full presence data
    channel.track({
      userId: currentUser.userId,
      userName: currentUser.userName,
      userColor: currentUser.userColor,
      isActive: true,
      lastSeen: now,
      currentTool: currentUser.currentTool,
      cursor: {
        x,
        y,
        timestamp: now,
      },
    });

    // Update lastCursorBroadcast timestamp
    set(
      (state) => {
        state.lastCursorBroadcast = now;
      },
      undefined,
      'collaboration/broadcastCursor',
    );
  },

  // ─── Selection State Actions (W5.D5++++++ Phase 1) ───

  /**
   * Update remote user's selection state
   * Called when receiving selection broadcast from another user
   */
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

  /**
   * Clear remote user's selection
   * Called when receiving empty selection broadcast
   */
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
   * Broadcast local selection to all other users
   * Called from CanvasSyncManager when Fabric selection events fire
   *
   * @param objectIds - Array of selected object IDs (empty array = deselect all)
   */
  broadcastSelection: (objectIds: string[]) => {
    const state = get();
    const channel = state.presenceChannel;
    const currentUser = state.presence[state.currentUserId ?? ''];

    if (!channel || !currentUser) {
      console.warn('[Collaboration] Cannot broadcast selection - no channel or current user');
      return;
    }

    const now = Date.now();

    console.log('[🎯 DEBUG] broadcastSelection called:', {
      objectIds,
      count: objectIds.length,
      isMultiSelect: objectIds.length > 1,
      userName: currentUser.userName,
      channel: !!channel
    });

    // Broadcast selection state with full presence data
    channel.track({
      userId: currentUser.userId,
      userName: currentUser.userName,
      userColor: currentUser.userColor,
      isActive: true,
      lastSeen: now,
      currentTool: currentUser.currentTool,
      cursor: state.cursors[currentUser.userId], // Include cursor if available
      selection: objectIds.length > 0
        ? {
            objectIds,
            updatedAt: now,
          }
        : undefined, // undefined = no selection
    });

    // Update local presence state
    set(
      (state) => {
        if (state.presence[state.currentUserId ?? '']) {
          state.presence[state.currentUserId ?? ''].selection = objectIds.length > 0
            ? {
                objectIds,
                updatedAt: now,
              }
            : undefined;
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
   * @param remoteUserId - User ID of remote user
   * @param remoteSelection - Remote user's selection state
   * @returns Array of object IDs we need to deselect (conflicts)
   */
  handleSelectionConflict: (remoteUserId: string, remoteSelection: SelectionState) => {
    const state = get();
    const currentUserId = state.currentUserId;

    // No current user or no local selection = no conflict
    if (!currentUserId) return [];

    const myPresence = state.presence[currentUserId];
    if (!myPresence?.selection) return [];

    const mySelection = myPresence.selection;
    const myObjectIds = mySelection.objectIds;
    const theirObjectIds = remoteSelection.objectIds;

    // Find objects selected by both users
    const conflicts = myObjectIds.filter((id) => theirObjectIds.includes(id));

    if (conflicts.length === 0) return [];

    // Last-touch-wins: If their selection is newer, we lose those objects
    if (remoteSelection.updatedAt > mySelection.updatedAt) {
      console.log('[Collaboration] Selection conflict:', {
        conflicts,
        myTime: new Date(mySelection.updatedAt).toISOString(),
        theirTime: new Date(remoteSelection.updatedAt).toISOString(),
        result: 'They win (newer timestamp)',
      });

      return conflicts; // Return conflicting IDs that need to be deselected
    }

    // We win (our timestamp is newer or equal)
    console.log('[Collaboration] Selection conflict:', {
      conflicts,
      myTime: new Date(mySelection.updatedAt).toISOString(),
      theirTime: new Date(remoteSelection.updatedAt).toISOString(),
      result: 'We win (newer/equal timestamp)',
    });

    return []; // No deselection needed
  },

  /**
   * Broadcast "actively editing" state during object manipulation
   * Shows other users which objects are currently being moved/modified
   *
   * @param objectIds - Array of object IDs being edited (null = stopped editing)
   */
  broadcastActivelyEditing: (objectIds: string[] | null) => {
    const state = get();
    const channel = state.presenceChannel;
    const currentUser = state.presence[state.currentUserId ?? ''];

    if (!channel || !currentUser) return;

    console.log('[🎯 DEBUG] broadcastActivelyEditing called:', {
      objectIds,
      isEditing: !!objectIds,
      count: objectIds?.length || 0
    });

    // Broadcast actively editing state with full presence data
    channel.track({
      userId: currentUser.userId,
      userName: currentUser.userName,
      userColor: currentUser.userColor,
      isActive: true,
      lastSeen: Date.now(),
      currentTool: currentUser.currentTool,
      cursor: state.cursors[currentUser.userId],
      selection: currentUser.selection,
      activelyEditing: objectIds && objectIds.length > 0 ? objectIds[0] : null, // Track first object for simplicity
    });

    // Update local presence state
    set(
      (state) => {
        if (state.presence[state.currentUserId ?? '']) {
          state.presence[state.currentUserId ?? ''].activelyEditing = 
            objectIds && objectIds.length > 0 ? objectIds[0] : null;
        }
      },
      undefined,
      'collaboration/broadcastActivelyEditing',
    );
  },

  // Object lock actions

  /**
   * Acquire lock on object
   * Returns true if lock acquired, false if already locked by another user
   */
  acquireLock: (objectId: string, userId: string, userName: string) => {
    const state = get();

    // Check if already locked by another user
    const existingLock = state.locks[objectId];
    if (existingLock && existingLock.userId !== userId) {
      return false;
    }

    // Acquire or refresh lock
    set(
      (draft) => {
        draft.locks[objectId] = {
          objectId,
          userId,
          userName,
          acquiredAt: Date.now(),
          expiresAt: Date.now() + 30000, // 30 second expiry (will be refreshed)
        };
      },
      undefined,
      'collaboration/acquireLock',
    );

    return true;
  },

  /**
   * Release lock on object
   */
  releaseLock: (objectId: string) =>
    set(
      (state) => {
        delete state.locks[objectId];
      },
      undefined,
      'collaboration/releaseLock',
    ),

  /**
   * Release all locks held by user (on disconnect)
   */
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

  /**
   * Release all locks (emergency cleanup)
   */
  releaseAllLocks: () =>
    set(
      (state) => {
        state.locks = {};
      },
      undefined,
      'collaboration/releaseAllLocks',
    ),

  /**
   * Set locks map (for sync)
   */
  setLocks: (locks: Record<string, ObjectLock>) =>
    set(
      (state) => {
        state.locks = locks;
      },
      undefined,
      'collaboration/setLocks',
    ),

  // W1.D7: Async database-level locking

  /**
   * Request lock on object (database-level optimistic locking)
   * Returns true if lock acquired, false if already locked by another user
   */
  requestLock: async (objectId: string) => {
    // W5.D5++ Performance monitoring
    const stopTimer = perfMonitor.startTimer('lock_acquisition');

    const userId = get().currentUserId;
    const userName = get().presence[userId ?? '']?.userName ?? 'Unknown';

    if (!userId) {
      stopTimer();
      return false; // No current user
    }

    try {
      // Optimistic lock: Only update if not currently locked
      const { data, error } = await supabase
        .from('canvas_objects')
        .update({
          locked_by: userId,
          lock_acquired_at: new Date().toISOString(),
        })
        .eq('id', objectId)
        .is('locked_by', null) // Critical: Only lock if unlocked
        .select()
        .single();

      if (error || !data) {
        // Lock failed - object already locked by someone else
        stopTimer();
        return false;
      }

      // Update local state
      get().acquireLock(objectId, userId, userName);

      stopTimer();
      return true;
    } catch (error) {
      console.error('Failed to acquire database lock:', error);
      stopTimer();
      return false;
    }
  },

  /**
   * Release lock on object (database-level)
   * Only releases if current user owns the lock
   */
  releaseDbLock: async (objectId: string) => {
    // W5.D5++ Performance monitoring
    const stopTimer = perfMonitor.startTimer('lock_release');

    const userId = get().currentUserId;

    if (!userId) {
      stopTimer();
      return; // No current user
    }

    // Check if we own the lock locally before attempting database release
    const existingLock = get().locks[objectId];
    if (!existingLock || existingLock.userId !== userId) {
      stopTimer();
      return; // Don't own the lock, nothing to release
    }

    try {
      // Release lock in database (only succeeds if we own it)
      const { error } = await supabase
        .from('canvas_objects')
        .update({
          locked_by: null,
          lock_acquired_at: null,
        })
        .eq('id', objectId)
        .eq('locked_by', userId);

      if (!error) {
        // Update local state
        get().releaseLock(objectId);
      }

      stopTimer();
    } catch (error) {
      console.error('Failed to release database lock:', error);
      stopTimer();
    }
  },

  // Connection state actions

  /**
   * Set online status
   */
  setOnline: (isOnline: boolean) =>
    set(
      (state) => {
        state.isOnline = isOnline;
      },
      undefined,
      'collaboration/setOnline',
    ),

  /**
   * Set room ID (canvas session)
   */
  setRoomId: (roomId: string | null) =>
    set(
      (state) => {
        state.roomId = roomId;
      },
      undefined,
      'collaboration/setRoomId',
    ),

  // Utility functions

  /**
   * Get presence for user
   */
  getPresence: (userId: string) => {
    return get().presence[userId];
  },

  /**
   * Get cursor for user
   */
  getCursor: (userId: string) => {
    return get().cursors[userId];
  },

  /**
   * Get lock for object
   */
  getLock: (objectId: string) => {
    return get().locks[objectId];
  },

  /**
   * Check if object is locked
   */
  isObjectLocked: (objectId: string) => {
    return !!get().locks[objectId];
  },

  /**
   * Check if object is locked by current user
   */
  isObjectLockedByCurrentUser: (objectId: string) => {
    const state = get();
    const lock = state.locks[objectId];
    return lock?.userId === state.currentUserId;
  },

  /**
   * Check if object is locked by another user
   */
  isObjectLockedByOther: (objectId: string) => {
    const state = get();
    const lock = state.locks[objectId];
    return !!lock && lock.userId !== state.currentUserId;
  },

  /**
   * Get all active users
   */
  getActiveUsers: () => {
    return Object.values(get().presence).filter((p) => p.isActive);
  },

  /**
   * Get all active cursors
   */
  getActiveCursors: () => {
    return Object.values(get().cursors);
  },

  // ─── Supabase Presence (W1.D5) ───

  /**
   * W1.D5: Setup Supabase Presence channel for real-time user tracking
   *
   * Creates a presence channel, tracks current user, and subscribes to presence events
   */
  setupPresenceChannel: (userId: string, userName: string, userColor: string, roomId: string) => {
    // Cleanup existing channel first
    get().cleanupPresenceChannel();

    // Create presence channel for the room
    const channel = supabase.channel(`presence-${roomId}`, {
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
      lastSeen: Date.now(),
    });

    // Subscribe to presence events
    channel
      .on('presence', { event: 'sync' }, () => {
        // Sync event - update entire presence map
        const presenceState = channel.presenceState();
        const presenceMap: Record<string, UserPresence> = {};
        const cursorsMap: Record<string, CursorPosition> = {};

        // Convert Supabase presence format to our format
        Object.entries(presenceState).forEach(([key, presences]) => {
          // Supabase stores array of presences per key, take first one
          const presence = (presences as any[])[0];
          if (presence) {
            presenceMap[key] = {
              userId: presence.userId,
              userName: presence.userName,
              userColor: presence.userColor,
              isActive: presence.isActive ?? true,
              lastSeen: presence.lastSeen ?? Date.now(),
              currentTool: presence.currentTool,
              // W5.D5++++++ Extract selection state if present
              selection: presence.selection,
              activelyEditing: presence.activelyEditing,
            };

            // W1.D6: Extract cursor data if present
            if (presence.cursor) {
              cursorsMap[key] = {
                userId: presence.userId,
                x: presence.cursor.x,
                y: presence.cursor.y,
                timestamp: presence.cursor.timestamp,
              };
            }
          }
        });

        get().setPresenceMap(presenceMap);

        // W1.D6: Update cursors map
        set(
          (state) => {
            state.cursors = cursorsMap;
          },
          undefined,
          'collaboration/syncCursors',
        );
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // User joined - add to presence
        const presence = (newPresences as any[])[0];
        if (presence) {
          get().updatePresence(key, {
            userId: presence.userId,
            userName: presence.userName,
            userColor: presence.userColor,
            isActive: presence.isActive ?? true,
            currentTool: presence.currentTool,
            // W5.D5++++++ Include selection state
            selection: presence.selection,
            activelyEditing: presence.activelyEditing,
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        // User left - remove from presence
        get().removePresence(key);
      })
      .subscribe();

    set({ presenceChannel: channel }, undefined, 'collaboration/setupPresence');
  },

  /**
   * W1.D5: Cleanup Supabase Presence channel
   *
   * Untracks current user and unsubscribes from channel
   */
  cleanupPresenceChannel: () => {
    const channel = get().presenceChannel;
    if (channel) {
      channel.untrack();
      channel.unsubscribe();
      set({ presenceChannel: null }, undefined, 'collaboration/cleanupPresence');
    }
  },
});
