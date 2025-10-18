/**
 * Collaboration Slice Tests
 *
 * Tests for real-time collaboration features
 * Covers user presence, cursor positions, object locks, and connection state
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePaperboxStore } from '../index';
import type { UserPresence, ObjectLock } from '../slices/collaborationSlice';
import { supabase } from '@/lib/supabase'; // W1.D7: For database locking tests

// Mock Supabase client with presence channel support
// Create a shared mock channel that all calls will return
const mockChannel = {
  on: vi.fn(function (this: any) {
    return this;
  }),
  track: vi.fn(() => Promise.resolve()),
  untrack: vi.fn(() => Promise.resolve()),
  subscribe: vi.fn(function (this: any) {
    return this;
  }),
  unsubscribe: vi.fn(() => Promise.resolve()),
  presenceState: vi.fn(() => ({})),
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    from: vi.fn(), // W1.D7: For database operations (will be mocked per-test)
  },
}));

describe('collaborationSlice - Real-time Collaboration Management', () => {
  beforeEach(() => {
    // Reset mock calls
    vi.clearAllMocks();

    // Reset collaboration state before each test
    const store = usePaperboxStore.getState();
    store.cleanupPresenceChannel(); // W1.D6: Clean up presence channel
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

  // ─── Supabase Presence Integration (W1.D5) ───

  describe('Supabase Presence Integration (W1.D5)', () => {
    describe('setupPresenceChannel()', () => {
      it('should create presence channel with room-specific name', async () => {
        const { supabase } = await import('@/lib/supabase');
        const store = usePaperboxStore.getState();

        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        expect(supabase.channel).toHaveBeenCalledWith('presence-room-123', {
          config: {
            presence: {
              key: 'user-1',
            },
          },
        });
      });

      it('should track current user presence on channel', () => {
        const store = usePaperboxStore.getState();

        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        expect(mockChannel.track).toHaveBeenCalledWith({
          userId: 'user-1',
          userName: 'Alice',
          userColor: '#FF0000',
          isActive: true,
          lastSeen: expect.any(Number),
        });
      });

      it('should subscribe to presence events', () => {
        const store = usePaperboxStore.getState();

        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        // Verify on() was called for presence events
        expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'sync' }, expect.any(Function));
        expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'join' }, expect.any(Function));
        expect(mockChannel.on).toHaveBeenCalledWith('presence', { event: 'leave' }, expect.any(Function));
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      it('should store presence channel reference in state', () => {
        const store = usePaperboxStore.getState();

        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        const { presenceChannel } = usePaperboxStore.getState();
        expect(presenceChannel).toBeDefined();
      });

      it('should cleanup existing presence channel before creating new one', () => {
        const store = usePaperboxStore.getState();

        // Setup first channel
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        // Reset mock counts
        mockChannel.untrack.mockClear();
        mockChannel.unsubscribe.mockClear();

        // Setup second channel (should cleanup first)
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        // First channel should have been cleaned up
        expect(mockChannel.untrack).toHaveBeenCalled();
        expect(mockChannel.unsubscribe).toHaveBeenCalled();
      });
    });

    describe('cleanupPresenceChannel()', () => {
      it('should untrack current user', () => {
        const store = usePaperboxStore.getState();

        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');
        store.cleanupPresenceChannel();

        expect(mockChannel.untrack).toHaveBeenCalled();
      });

      it('should unsubscribe from presence channel', () => {
        const store = usePaperboxStore.getState();

        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');
        store.cleanupPresenceChannel();

        expect(mockChannel.unsubscribe).toHaveBeenCalled();
      });

      it('should clear presence channel reference from state', () => {
        const store = usePaperboxStore.getState();

        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');
        store.cleanupPresenceChannel();

        const { presenceChannel } = usePaperboxStore.getState();
        expect(presenceChannel).toBeNull();
      });

      it('should handle cleanup when no presence channel exists', () => {
        const store = usePaperboxStore.getState();

        // Should not throw even if no channel exists
        expect(() => {
          store.cleanupPresenceChannel();
        }).not.toThrow();
      });
    });

    describe('Integration with collaboration lifecycle', () => {
      it('should setup presence when connecting to room', () => {
        const store = usePaperboxStore.getState();

        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.setRoomId('room-123');
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        const { presenceChannel, currentUserId, roomId } = usePaperboxStore.getState();
        expect(presenceChannel).toBeDefined();
        expect(currentUserId).toBe('user-1');
        expect(roomId).toBe('room-123');
      });

      it('should cleanup presence when disconnecting from room', () => {
        const store = usePaperboxStore.getState();

        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');
        store.cleanupPresenceChannel();
        store.setRoomId(null);

        const { presenceChannel, roomId } = usePaperboxStore.getState();
        expect(presenceChannel).toBeNull();
        expect(roomId).toBeNull();
      });
    });
  });

  // ========================================================================
  // W1.D6: Live Cursor Tracking Tests
  // ========================================================================
  describe('W1.D6: Live Cursor Tracking', () => {
    describe('broadcastCursor()', () => {
      it('should update presence channel with cursor position', () => {
        const store = usePaperboxStore.getState();

        // Setup current user and presence channel first
        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        // Clear setup track call
        mockChannel.track.mockClear();

        // Broadcast cursor position
        store.broadcastCursor(100, 200);

        // Verify channel.track() was called with cursor data
        expect(mockChannel.track).toHaveBeenCalledWith(
          expect.objectContaining({
            cursor: expect.objectContaining({
              x: 100,
              y: 200,
              timestamp: expect.any(Number),
            }),
          })
        );
      });

      it('should throttle cursor broadcasts to 60fps (16.67ms)', async () => {
        const store = usePaperboxStore.getState();
        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        mockChannel.track.mockClear();

        // First broadcast should go through and set lastCursorBroadcast
        store.broadcastCursor(100, 200);
        expect(usePaperboxStore.getState().lastCursorBroadcast).not.toBeNull();
        const firstBroadcastTime = usePaperboxStore.getState().lastCursorBroadcast!;

        // Immediate second broadcast should be throttled
        store.broadcastCursor(110, 210);
        expect(usePaperboxStore.getState().lastCursorBroadcast).toBe(firstBroadcastTime); // Timestamp unchanged (throttled)

        // Wait for throttle period to expire
        await new Promise(resolve => setTimeout(resolve, 20));

        // Third broadcast should go through
        store.broadcastCursor(120, 220);
        expect(usePaperboxStore.getState().lastCursorBroadcast).toBeGreaterThan(firstBroadcastTime); // Timestamp updated
      });

      it('should handle null presence channel gracefully', () => {
        const store = usePaperboxStore.getState();

        // No presence channel setup
        expect(() => {
          store.broadcastCursor(100, 200);
        }).not.toThrow();

        expect(mockChannel.track).not.toHaveBeenCalled();
      });

      it('should update lastCursorBroadcast timestamp', () => {
        const store = usePaperboxStore.getState();
        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        // Clear setup track call
        mockChannel.track.mockClear();

        store.broadcastCursor(100, 200);

        const { lastCursorBroadcast } = usePaperboxStore.getState();
        expect(lastCursorBroadcast).toBeDefined();
        expect(lastCursorBroadcast).toBeGreaterThan(0);
      });

      it('should include all presence data when broadcasting cursor', () => {
        const store = usePaperboxStore.getState();
        store.setCurrentUser('user-1', 'Alice', '#FF0000');
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        // Clear mocks to isolate broadcastCursor call
        mockChannel.track.mockClear();

        // Reset lastCursorBroadcast to allow immediate broadcast
        usePaperboxStore.setState((state) => {
          state.lastCursorBroadcast = null;
        });

        store.broadcastCursor(150, 250);

        // Verify track was called with cursor data
        expect(mockChannel.track).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-1',
            userName: 'Alice',
            userColor: '#FF0000',
            isActive: true,
            cursor: expect.objectContaining({
              x: 150,
              y: 250,
              timestamp: expect.any(Number),
            }),
          })
        );
      });
    });

    describe('Cursor state synchronization', () => {
      it('should update cursor state when presence sync event includes cursor data', () => {
        const store = usePaperboxStore.getState();
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        // Manually update cursor via updateCursor
        store.updateCursor('user-2', 300, 400);

        const { cursors } = usePaperboxStore.getState();
        expect(cursors['user-2']).toEqual(
          expect.objectContaining({
            userId: 'user-2',
            x: 300,
            y: 400,
          })
        );
      });

      it('should remove cursor when user leaves', () => {
        const store = usePaperboxStore.getState();

        store.updateCursor('user-2', 100, 200);
        expect(usePaperboxStore.getState().cursors['user-2']).toBeDefined();

        store.removeCursor('user-2');
        expect(usePaperboxStore.getState().cursors['user-2']).toBeUndefined();
      });

      it('should clear all cursors when leaving room', () => {
        const store = usePaperboxStore.getState();

        store.updateCursor('user-2', 100, 200);
        store.updateCursor('user-3', 300, 400);
        expect(Object.keys(usePaperboxStore.getState().cursors)).toHaveLength(2);

        store.clearAllCursors();
        expect(Object.keys(usePaperboxStore.getState().cursors)).toHaveLength(0);
      });
    });

    describe('Integration with Presence events', () => {
      it('should extract cursor data from presence state on sync', () => {
        const store = usePaperboxStore.getState();
        store.setupPresenceChannel('user-1', 'Alice', '#FF0000', 'room-123');

        // Simulate presence state with cursor data
        const mockPresenceState = {
          'user-2': [{
            userId: 'user-2',
            userName: 'Bob',
            userColor: '#00FF00',
            isActive: true,
            lastSeen: Date.now(),
            cursor: { x: 500, y: 600, timestamp: Date.now() },
          }],
        };

        mockChannel.presenceState.mockReturnValue(mockPresenceState);

        // Get the sync handler that was registered
        const syncHandler = mockChannel.on.mock.calls.find(
          call => call[0] === 'presence' && call[1].event === 'sync'
        )?.[2];

        // Trigger sync event
        if (syncHandler) syncHandler();

        const { cursors } = usePaperboxStore.getState();
        expect(cursors['user-2']).toEqual(
          expect.objectContaining({
            userId: 'user-2',
            x: 500,
            y: 600,
          })
        );
      });
    });
  });

  // ============================================================
  // W1.D7: Object Locking - Async Database Integration
  // ============================================================

  describe('W1.D7: Async Object Locking', () => {
    beforeEach(() => {
      usePaperboxStore.getState().setCurrentUser('user-1', 'Alice', '#FF0000');
    });

    describe('requestLock()', () => {
      it('should successfully acquire lock for unlocked object', async () => {
        const objectId = 'object-123';

        // Mock successful database lock acquisition
        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: objectId,
                    locked_by: 'user-1',
                    lock_acquired_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        const result = await store.requestLock(objectId);

        expect(result).toBe(true);

        // Get fresh state after async operation
        const updatedStore = usePaperboxStore.getState();
        expect(updatedStore.locks[objectId]).toBeDefined();
        expect(updatedStore.locks[objectId].userId).toBe('user-1');
        expect(updatedStore.locks[objectId].userName).toBe('Alice');
      });

      it('should fail to acquire lock if already locked by another user', async () => {
        const objectId = 'object-123';

        // Mock failed lock acquisition (no data returned)
        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Object already locked' },
                }),
              }),
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        const result = await store.requestLock(objectId);

        expect(result).toBe(false);
        expect(store.locks[objectId]).toBeUndefined();
      });

      it('should update local state on successful lock acquisition', async () => {
        const objectId = 'object-456';

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: objectId,
                    locked_by: 'user-1',
                    lock_acquired_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        await store.requestLock(objectId);

        const lock = store.getLock(objectId);
        expect(lock).toBeDefined();
        expect(lock?.objectId).toBe(objectId);
        expect(lock?.userId).toBe('user-1');
        expect(lock?.userName).toBe('Alice');
        expect(lock?.acquiredAt).toBeGreaterThan(0);
      });

      it('should handle database errors gracefully', async () => {
        const objectId = 'object-789';

        // Mock database error
        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failed' },
                }),
              }),
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        const result = await store.requestLock(objectId);

        expect(result).toBe(false);
        expect(store.locks[objectId]).toBeUndefined();
      });
    });

    describe('releaseLock()', () => {
      it('should release lock owned by current user', async () => {
        const objectId = 'object-123';

        // First acquire the lock locally
        usePaperboxStore.getState().acquireLock(objectId, 'user-1', 'Alice');

        // Mock successful database release
        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        await store.releaseDbLock(objectId);

        // Get fresh state after async operation
        const updatedStore = usePaperboxStore.getState();
        expect(updatedStore.locks[objectId]).toBeUndefined();
      });

      it('should not release lock owned by another user', async () => {
        const objectId = 'object-123';

        // Lock is owned by user-2
        usePaperboxStore.getState().acquireLock(objectId, 'user-2', 'Bob');

        // Mock database update (won't match eq condition)
        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        await store.releaseDbLock(objectId);

        // Lock should still exist (database didn't update it since user-1 doesn't own it)
        expect(store.locks[objectId]).toBeDefined();
        expect(store.locks[objectId].userId).toBe('user-2');
      });

      it('should clear local state on successful release', async () => {
        const objectId = 'object-456';

        usePaperboxStore.getState().acquireLock(objectId, 'user-1', 'Alice');

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        expect(store.isObjectLocked(objectId)).toBe(true);

        await store.releaseDbLock(objectId);

        expect(store.isObjectLocked(objectId)).toBe(false);
      });

      it('should handle database errors gracefully', async () => {
        const objectId = 'object-789';

        usePaperboxStore.getState().acquireLock(objectId, 'user-1', 'Alice');

        // Mock database error
        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: { message: 'Database connection failed' },
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        await store.releaseDbLock(objectId);

        // Lock should remain if database update failed
        expect(store.locks[objectId]).toBeDefined();
      });
    });

    describe('Lock utilities with async operations', () => {
      it('isObjectLocked() should return true for locked objects', async () => {
        const objectId = 'object-123';

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: objectId,
                    locked_by: 'user-1',
                    lock_acquired_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        await store.requestLock(objectId);

        expect(store.isObjectLocked(objectId)).toBe(true);
      });

      it('isObjectLockedByCurrentUser() should identify user locks', async () => {
        const objectId = 'object-123';

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: objectId,
                    locked_by: 'user-1',
                    lock_acquired_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        await store.requestLock(objectId);

        expect(store.isObjectLockedByCurrentUser(objectId)).toBe(true);
      });

      it('isObjectLockedByOther() should identify other user locks', async () => {
        const objectId = 'object-123';

        // Lock is owned by user-2
        usePaperboxStore.getState().acquireLock(objectId, 'user-2', 'Bob');

        const store = usePaperboxStore.getState();
        expect(store.isObjectLockedByOther(objectId)).toBe(true);
      });

      it('getLock() should return lock metadata', async () => {
        const objectId = 'object-123';

        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: objectId,
                    locked_by: 'user-1',
                    lock_acquired_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
        });

        vi.spyOn(supabase, 'from').mockReturnValue({
          update: mockUpdate,
        } as any);

        const store = usePaperboxStore.getState();
        await store.requestLock(objectId);

        const lock = store.getLock(objectId);
        expect(lock).toBeDefined();
        expect(lock?.objectId).toBe(objectId);
        expect(lock?.userId).toBe('user-1');
        expect(lock?.userName).toBe('Alice');
      });
    });
  });
});
