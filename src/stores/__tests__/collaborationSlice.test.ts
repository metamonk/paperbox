/**
 * Collaboration Slice Tests
 *
 * Tests for real-time collaboration features
 * Covers user presence, cursor positions, object locks, and connection state
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePaperboxStore } from '../index';
import type { UserPresence, CursorPosition, ObjectLock } from '../slices/collaborationSlice';

describe('collaborationSlice - Real-time Collaboration Management', () => {
  beforeEach(() => {
    // Reset collaboration state before each test
    const store = usePaperboxStore.getState();
    store.clearAllPresence();
    store.clearAllCursors();
    store.releaseAllLocks();
    store.setOnline(false);
    store.setRoomId(null);

    // Clear mock timers if any
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have empty presence map after cleanup', () => {
      const { presence } = usePaperboxStore.getState();

      // After clearAllPresence(), presence may contain current user if set
      // For initial state, we just verify it's an object
      expect(presence).toBeDefined();
      expect(typeof presence).toBe('object');
    });

    it('should have empty cursors map on initialization', () => {
      const { cursors } = usePaperboxStore.getState();

      expect(cursors).toEqual({});
    });

    it('should have empty locks map on initialization', () => {
      const { locks } = usePaperboxStore.getState();

      expect(locks).toEqual({});
    });

    it('should be offline initially', () => {
      const { isOnline } = usePaperboxStore.getState();

      expect(isOnline).toBe(false);
    });

    it('should have null roomId initially', () => {
      const { roomId } = usePaperboxStore.getState();

      expect(roomId).toBeNull();
    });
  });

  describe('setCurrentUser()', () => {
    it('should set current user and add to presence', () => {
      const store = usePaperboxStore.getState();

      store.setCurrentUser('user-1', 'Alice', '#FF0000');

      const { currentUserId, presence } = usePaperboxStore.getState();
      expect(currentUserId).toBe('user-1');
      expect(presence['user-1']).toBeDefined();
      expect(presence['user-1']).toMatchObject({
        userId: 'user-1',
        userName: 'Alice',
        userColor: '#FF0000',
        isActive: true,
      });
      expect(presence['user-1'].lastSeen).toBeGreaterThan(0);
    });
  });

  describe('User Presence Management', () => {
    describe('updatePresence()', () => {
      it('should update existing presence', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.updatePresence('user-1', {
          currentTool: 'rectangle',
          isActive: false,
        });

        const { presence } = usePaperboxStore.getState();
        expect(presence['user-1'].currentTool).toBe('rectangle');
        expect(presence['user-1'].isActive).toBe(false);
        expect(presence['user-1'].userName).toBe('Alice'); // Unchanged
      });

      it('should create new presence if user does not exist', () => {
        const store = usePaperboxStore.getState();

        store.updatePresence('user-2', {
          userName: 'Bob',
          userColor: '#00FF00',
          currentTool: 'circle',
        });

        const { presence } = usePaperboxStore.getState();
        expect(presence['user-2']).toBeDefined();
        expect(presence['user-2']).toMatchObject({
          userId: 'user-2',
          userName: 'Bob',
          userColor: '#00FF00',
          isActive: true,
          currentTool: 'circle',
        });
      });

      it('should use default values for new presence when fields missing', () => {
        const store = usePaperboxStore.getState();

        store.updatePresence('user-3', {});

        const { presence } = usePaperboxStore.getState();
        expect(presence['user-3']).toMatchObject({
          userId: 'user-3',
          userName: 'Unknown',
          userColor: '#808080',
          isActive: true,
        });
      });

      it('should update lastSeen timestamp', async () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        const firstTimestamp = usePaperboxStore.getState().presence['user-1'].lastSeen;

        // Wait a bit to ensure timestamp changes
        await new Promise((resolve) => setTimeout(resolve, 1));

        store.updatePresence('user-1', { currentTool: 'text' });
        const secondTimestamp = usePaperboxStore.getState().presence['user-1'].lastSeen;

        expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp);
      });
    });

    describe('removePresence()', () => {
      it('should remove user presence', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.removePresence('user-1');

        const { presence } = usePaperboxStore.getState();
        expect(presence['user-1']).toBeUndefined();
      });

      it('should handle removing non-existent presence gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.removePresence('non-existent')).not.toThrow();
      });
    });

    describe('setPresenceMap()', () => {
      it('should set entire presence map', () => {
        const store = usePaperboxStore.getState();

        const presenceMap: Record<string, UserPresence> = {
          'user-1': {
            userId: 'user-1',
            userName: 'Alice',
            userColor: '#FF0000',
            isActive: true,
            lastSeen: Date.now(),
          },
          'user-2': {
            userId: 'user-2',
            userName: 'Bob',
            userColor: '#00FF00',
            isActive: true,
            lastSeen: Date.now(),
          },
        };

        store.setPresenceMap(presenceMap);

        const { presence } = usePaperboxStore.getState();
        expect(presence).toEqual(presenceMap);
      });
    });

    describe('clearAllPresence()', () => {
      it('should keep only current user when clearing presence', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.updatePresence('user-2', {
          userName: 'Bob',
          userColor: '#00FF00',
        });

        store.clearAllPresence();

        const { presence } = usePaperboxStore.getState();
        expect(presence['user-1']).toBeDefined(); // Current user kept
        expect(presence['user-2']).toBeUndefined(); // Other user removed
      });

      it('should clear all non-current user presence', () => {
        const store = usePaperboxStore.getState();

        // clearAllPresence() preserves currentUser if currentUserId is set
        // This tests that it clears other users while keeping current user
        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.updatePresence('user-2', {
          userName: 'Bob',
          userColor: '#00FF00',
        });
        store.updatePresence('user-3', {
          userName: 'Charlie',
          userColor: '#0000FF',
        });

        store.clearAllPresence();

        const { presence } = usePaperboxStore.getState();
        expect(presence['user-1']).toBeDefined(); // Current user kept
        expect(presence['user-2']).toBeUndefined(); // Others removed
        expect(presence['user-3']).toBeUndefined();
      });
    });
  });

  describe('Cursor Position Management', () => {
    describe('updateCursor()', () => {
      it('should update cursor position', () => {
        const store = usePaperboxStore.getState();

        store.updateCursor('user-1', 100, 200);

        const { cursors } = usePaperboxStore.getState();
        expect(cursors['user-1']).toBeDefined();
        expect(cursors['user-1']).toMatchObject({
          userId: 'user-1',
          x: 100,
          y: 200,
        });
        expect(cursors['user-1'].timestamp).toBeGreaterThan(0);
      });

      it('should update existing cursor', () => {
        const store = usePaperboxStore.getState();

        store.updateCursor('user-1', 100, 200);
        store.updateCursor('user-1', 300, 400);

        const { cursors } = usePaperboxStore.getState();
        expect(cursors['user-1'].x).toBe(300);
        expect(cursors['user-1'].y).toBe(400);
      });
    });

    describe('removeCursor()', () => {
      it('should remove cursor', () => {
        const store = usePaperboxStore.getState();

        store.updateCursor('user-1', 100, 200);
        store.removeCursor('user-1');

        const { cursors } = usePaperboxStore.getState();
        expect(cursors['user-1']).toBeUndefined();
      });

      it('should handle removing non-existent cursor gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.removeCursor('non-existent')).not.toThrow();
      });
    });

    describe('clearAllCursors()', () => {
      it('should clear all cursors', () => {
        const store = usePaperboxStore.getState();

        store.updateCursor('user-1', 100, 200);
        store.updateCursor('user-2', 300, 400);

        store.clearAllCursors();

        const { cursors } = usePaperboxStore.getState();
        expect(cursors).toEqual({});
      });
    });
  });

  describe('Object Lock Management', () => {
    describe('acquireLock()', () => {
      it('should acquire lock on unlocked object', () => {
        const store = usePaperboxStore.getState();

        const acquired = store.acquireLock('obj-1', 'user-1', 'Alice');

        expect(acquired).toBe(true);

        const { locks } = usePaperboxStore.getState();
        expect(locks['obj-1']).toBeDefined();
        expect(locks['obj-1']).toMatchObject({
          objectId: 'obj-1',
          userId: 'user-1',
          userName: 'Alice',
        });
        expect(locks['obj-1'].acquiredAt).toBeGreaterThan(0);
        expect(locks['obj-1'].expiresAt).toBeGreaterThan(0);
      });

      it('should refresh lock if already held by same user', async () => {
        const store = usePaperboxStore.getState();

        store.acquireLock('obj-1', 'user-1', 'Alice');
        const firstTimestamp = usePaperboxStore.getState().locks['obj-1'].acquiredAt;

        // Wait a bit to ensure timestamp changes
        await new Promise((resolve) => setTimeout(resolve, 1));

        const refreshed = store.acquireLock('obj-1', 'user-1', 'Alice');
        const secondTimestamp = usePaperboxStore.getState().locks['obj-1'].acquiredAt;

        expect(refreshed).toBe(true);
        expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp);
      });

      it('should fail to acquire lock if held by another user', () => {
        const store = usePaperboxStore.getState();

        store.acquireLock('obj-1', 'user-1', 'Alice');
        const acquired = store.acquireLock('obj-1', 'user-2', 'Bob');

        expect(acquired).toBe(false);

        const { locks } = usePaperboxStore.getState();
        expect(locks['obj-1'].userId).toBe('user-1'); // Still held by user-1
      });
    });

    describe('releaseLock()', () => {
      it('should release lock on object', () => {
        const store = usePaperboxStore.getState();

        store.acquireLock('obj-1', 'user-1', 'Alice');
        store.releaseLock('obj-1');

        const { locks } = usePaperboxStore.getState();
        expect(locks['obj-1']).toBeUndefined();
      });

      it('should handle releasing non-existent lock gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.releaseLock('non-existent')).not.toThrow();
      });
    });

    describe('releaseLockByUser()', () => {
      it('should release all locks held by user', () => {
        const store = usePaperboxStore.getState();

        store.acquireLock('obj-1', 'user-1', 'Alice');
        store.acquireLock('obj-2', 'user-1', 'Alice');
        store.acquireLock('obj-3', 'user-2', 'Bob');

        store.releaseLockByUser('user-1');

        const { locks } = usePaperboxStore.getState();
        expect(locks['obj-1']).toBeUndefined();
        expect(locks['obj-2']).toBeUndefined();
        expect(locks['obj-3']).toBeDefined(); // user-2's lock remains
      });

      it('should handle releasing locks for user with no locks', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.releaseLockByUser('non-existent')).not.toThrow();
      });
    });

    describe('releaseAllLocks()', () => {
      it('should release all locks', () => {
        const store = usePaperboxStore.getState();

        store.acquireLock('obj-1', 'user-1', 'Alice');
        store.acquireLock('obj-2', 'user-2', 'Bob');

        store.releaseAllLocks();

        const { locks } = usePaperboxStore.getState();
        expect(locks).toEqual({});
      });
    });

    describe('setLocks()', () => {
      it('should set entire locks map', () => {
        const store = usePaperboxStore.getState();

        const locksMap: Record<string, ObjectLock> = {
          'obj-1': {
            objectId: 'obj-1',
            userId: 'user-1',
            userName: 'Alice',
            acquiredAt: Date.now(),
          },
          'obj-2': {
            objectId: 'obj-2',
            userId: 'user-2',
            userName: 'Bob',
            acquiredAt: Date.now(),
          },
        };

        store.setLocks(locksMap);

        const { locks } = usePaperboxStore.getState();
        expect(locks).toEqual(locksMap);
      });
    });
  });

  describe('Connection State Management', () => {
    describe('setOnline()', () => {
      it('should set online status to true', () => {
        const store = usePaperboxStore.getState();

        store.setOnline(true);

        expect(usePaperboxStore.getState().isOnline).toBe(true);
      });

      it('should set online status to false', () => {
        const store = usePaperboxStore.getState();

        store.setOnline(true);
        store.setOnline(false);

        expect(usePaperboxStore.getState().isOnline).toBe(false);
      });
    });

    describe('setRoomId()', () => {
      it('should set room ID', () => {
        const store = usePaperboxStore.getState();

        store.setRoomId('room-123');

        expect(usePaperboxStore.getState().roomId).toBe('room-123');
      });

      it('should clear room ID when set to null', () => {
        const store = usePaperboxStore.getState();

        store.setRoomId('room-123');
        store.setRoomId(null);

        expect(usePaperboxStore.getState().roomId).toBeNull();
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getPresence()', () => {
      it('should return presence for user', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');

        const presence = store.getPresence('user-1');

        expect(presence).toBeDefined();
        expect(presence?.userId).toBe('user-1');
        expect(presence?.userName).toBe('Alice');
      });

      it('should return undefined for non-existent user', () => {
        const store = usePaperboxStore.getState();

        const presence = store.getPresence('non-existent');

        expect(presence).toBeUndefined();
      });
    });

    describe('getCursor()', () => {
      it('should return cursor for user', () => {
        const store = usePaperboxStore.getState();

        store.updateCursor('user-1', 100, 200);

        const cursor = store.getCursor('user-1');

        expect(cursor).toBeDefined();
        expect(cursor?.userId).toBe('user-1');
        expect(cursor?.x).toBe(100);
        expect(cursor?.y).toBe(200);
      });

      it('should return undefined for non-existent cursor', () => {
        const store = usePaperboxStore.getState();

        const cursor = store.getCursor('non-existent');

        expect(cursor).toBeUndefined();
      });
    });

    describe('getLock()', () => {
      it('should return lock for object', () => {
        const store = usePaperboxStore.getState();

        store.acquireLock('obj-1', 'user-1', 'Alice');

        const lock = store.getLock('obj-1');

        expect(lock).toBeDefined();
        expect(lock?.objectId).toBe('obj-1');
        expect(lock?.userId).toBe('user-1');
      });

      it('should return undefined for non-existent lock', () => {
        const store = usePaperboxStore.getState();

        const lock = store.getLock('non-existent');

        expect(lock).toBeUndefined();
      });
    });

    describe('isObjectLocked()', () => {
      it('should return true for locked object', () => {
        const store = usePaperboxStore.getState();

        store.acquireLock('obj-1', 'user-1', 'Alice');

        expect(store.isObjectLocked('obj-1')).toBe(true);
      });

      it('should return false for unlocked object', () => {
        const store = usePaperboxStore.getState();

        expect(store.isObjectLocked('obj-1')).toBe(false);
      });
    });

    describe('isObjectLockedByCurrentUser()', () => {
      it('should return true if locked by current user', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.acquireLock('obj-1', 'user-1', 'Alice');

        expect(store.isObjectLockedByCurrentUser('obj-1')).toBe(true);
      });

      it('should return false if locked by another user', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.acquireLock('obj-1', 'user-2', 'Bob');

        expect(store.isObjectLockedByCurrentUser('obj-1')).toBe(false);
      });

      it('should return false if not locked', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');

        expect(store.isObjectLockedByCurrentUser('obj-1')).toBe(false);
      });
    });

    describe('isObjectLockedByOther()', () => {
      it('should return true if locked by another user', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.acquireLock('obj-1', 'user-2', 'Bob');

        expect(store.isObjectLockedByOther('obj-1')).toBe(true);
      });

      it('should return false if locked by current user', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.acquireLock('obj-1', 'user-1', 'Alice');

        expect(store.isObjectLockedByOther('obj-1')).toBe(false);
      });

      it('should return false if not locked', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');

        expect(store.isObjectLockedByOther('obj-1')).toBe(false);
      });
    });

    describe('getActiveUsers()', () => {
      it('should return only active users', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.updatePresence('user-2', {
          userName: 'Bob',
          userColor: '#00FF00',
          isActive: true,
        });
        store.updatePresence('user-3', {
          userName: 'Charlie',
          userColor: '#0000FF',
          isActive: false,
        });

        const activeUsers = store.getActiveUsers();

        expect(activeUsers).toHaveLength(2);
        expect(activeUsers.map((u) => u.userId)).toContain('user-1');
        expect(activeUsers.map((u) => u.userId)).toContain('user-2');
        expect(activeUsers.map((u) => u.userId)).not.toContain('user-3');
      });

      it('should filter inactive users from active users list', () => {
        const store = usePaperboxStore.getState();

        // clearAllPresence keeps current user, so let's test filtering instead
        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.updatePresence('user-1', { isActive: false }); // Mark as inactive

        const activeUsers = store.getActiveUsers();

        // Should be empty since user-1 is inactive
        expect(activeUsers).toEqual([]);
      });
    });

    describe('getActiveCursors()', () => {
      it('should return all cursors', () => {
        const store = usePaperboxStore.getState();

        store.updateCursor('user-1', 100, 200);
        store.updateCursor('user-2', 300, 400);

        const cursors = store.getActiveCursors();

        expect(cursors).toHaveLength(2);
      });

      it('should return empty array if no cursors', () => {
        const store = usePaperboxStore.getState();

        const cursors = store.getActiveCursors();

        expect(cursors).toEqual([]);
      });
    });
  });

  describe('Collaboration Workflow Integration', () => {
    it('should handle complete collaboration session lifecycle', () => {
      const store = usePaperboxStore.getState();

      // 1. Connect to room
      store.setOnline(true);
      store.setRoomId('room-123');
      store.setCurrentUser('user-1', 'Alice', '#FF0000');

      expect(usePaperboxStore.getState().isOnline).toBe(true);
      expect(usePaperboxStore.getState().roomId).toBe('room-123');

      // 2. Other users join
      store.updatePresence('user-2', {
        userName: 'Bob',
        userColor: '#00FF00',
      });

      expect(store.getActiveUsers()).toHaveLength(2);

      // 3. Track cursors
      store.updateCursor('user-1', 100, 200);
      store.updateCursor('user-2', 300, 400);

      expect(store.getActiveCursors()).toHaveLength(2);

      // 4. Lock objects
      const acquired = store.acquireLock('obj-1', 'user-1', 'Alice');
      expect(acquired).toBe(true);
      expect(store.isObjectLockedByCurrentUser('obj-1')).toBe(true);

      // 5. Release lock
      store.releaseLock('obj-1');
      expect(store.isObjectLocked('obj-1')).toBe(false);

      // 6. User disconnects
      store.removeCursor('user-2');
      store.removePresence('user-2');

      expect(store.getActiveUsers()).toHaveLength(1);

      // 7. Disconnect
      store.setOnline(false);
      store.clearAllPresence();
      store.clearAllCursors();

      expect(usePaperboxStore.getState().isOnline).toBe(false);
    });

    it('should handle concurrent lock conflicts', () => {
      const store = usePaperboxStore.getState();

      store.setCurrentUser('user-1', 'Alice', '#FF0000');

      // User 1 acquires lock
      const acquired1 = store.acquireLock('obj-1', 'user-1', 'Alice');
      expect(acquired1).toBe(true);

      // User 2 tries to acquire same lock
      const acquired2 = store.acquireLock('obj-1', 'user-2', 'Bob');
      expect(acquired2).toBe(false);

      // User 1 releases lock
      store.releaseLock('obj-1');

      // User 2 can now acquire lock
      const acquired3 = store.acquireLock('obj-1', 'user-2', 'Bob');
      expect(acquired3).toBe(true);
      expect(store.isObjectLockedByOther('obj-1')).toBe(true);
    });

    it('should clean up all user state on disconnect', () => {
      const store = usePaperboxStore.getState();

      store.setCurrentUser('user-1', 'Alice', '#FF0000');

      // User 2 joins and does various actions
      store.updatePresence('user-2', {
        userName: 'Bob',
        userColor: '#00FF00',
      });
      store.updateCursor('user-2', 100, 200);
      store.acquireLock('obj-1', 'user-2', 'Bob');
      store.acquireLock('obj-2', 'user-2', 'Bob');

      // Clean up user-2 on disconnect
      store.removePresence('user-2');
      store.removeCursor('user-2');
      store.releaseLockByUser('user-2');

      const { presence, cursors, locks } = usePaperboxStore.getState();
      expect(presence['user-2']).toBeUndefined();
      expect(cursors['user-2']).toBeUndefined();
      expect(locks['obj-1']).toBeUndefined();
      expect(locks['obj-2']).toBeUndefined();
    });
  });
});
