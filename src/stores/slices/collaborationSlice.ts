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
import type { PaperboxStore } from '../index';

/**
 * User presence information
 */
export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string; // For cursor and selection highlighting
  isActive: boolean;
  lastSeen: number; // Timestamp
  currentTool?: string;
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

  // Actions - Object locks
  acquireLock: (objectId: string, userId: string, userName: string) => boolean;
  releaseLock: (objectId: string) => void;
  releaseLockByUser: (userId: string) => void;
  releaseAllLocks: () => void;
  setLocks: (locks: Record<string, ObjectLock>) => void;

  // Actions - Connection state
  setOnline: (isOnline: boolean) => void;
  setRoomId: (roomId: string | null) => void;

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
});
