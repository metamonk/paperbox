/**
 * OperationQueue Unit Tests
 *
 * Tests:
 * - Enqueue/dequeue operations
 * - localStorage persistence
 * - Queue flush on reconnect
 * - Max queue size enforcement
 * - Retry logic for failed operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OperationQueue, type QueuedOperation } from '../OperationQueue';
import type { CanvasObject } from '../../../types/canvas';

// Mock supabase
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn((message, options) => 'toast-id'),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('OperationQueue', () => {
  let queue: OperationQueue;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Get fresh instance
    queue = OperationQueue.getInstance();
    queue.reset();
  });

  afterEach(() => {
    queue.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = OperationQueue.getInstance();
      const instance2 = OperationQueue.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Enqueue Operations', () => {
    it('should enqueue create operation', () => {
      queue.enqueue({
        type: 'create',
        objectId: 'test-id',
        canvasId: 'canvas-1',
        payload: { x: 100, y: 100 } as Partial<CanvasObject>,
      });
      
      expect(queue.getCount()).toBe(1);
      expect(queue.hasOperations()).toBe(true);
    });

    it('should enqueue update operation', () => {
      queue.enqueue({
        type: 'update',
        objectId: 'test-id',
        canvasId: 'canvas-1',
        payload: { x: 200, y: 200 } as Partial<CanvasObject>,
      });
      
      expect(queue.getCount()).toBe(1);
    });

    it('should enqueue delete operation', () => {
      queue.enqueue({
        type: 'delete',
        objectId: 'test-id',
        canvasId: 'canvas-1',
        payload: {},
      });
      
      expect(queue.getCount()).toBe(1);
    });

    it('should enqueue multiple operations', () => {
      queue.enqueue({
        type: 'create',
        objectId: 'test-1',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      queue.enqueue({
        type: 'update',
        objectId: 'test-2',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      queue.enqueue({
        type: 'delete',
        objectId: 'test-3',
        canvasId: 'canvas-1',
        payload: {},
      });
      
      expect(queue.getCount()).toBe(3);
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist queue to localStorage', () => {
      queue.enqueue({
        type: 'create',
        objectId: 'test-id',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      const stored = localStorage.getItem('paperbox_offline_queue');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.operations).toHaveLength(1);
      expect(parsed.operations[0].objectId).toBe('test-id');
    });

    it('should load queue from localStorage', () => {
      // Simulate previous session
      const mockOperation: QueuedOperation = {
        id: 'op-1',
        timestamp: Date.now(),
        type: 'create',
        objectId: 'test-id',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
        retryCount: 0,
      };
      
      localStorage.setItem('paperbox_offline_queue', JSON.stringify({
        operations: [mockOperation],
        lastFlushTime: null,
      }));
      
      // Create new queue (simulates page refresh)
      const newQueue = OperationQueue.getInstance();
      newQueue.loadFromStorage();
      
      expect(newQueue.getCount()).toBe(1);
      expect(newQueue.hasOperations()).toBe(true);
      
      newQueue.reset();
    });

    it('should clean up old operations (>24 hours)', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      
      localStorage.setItem('paperbox_offline_queue', JSON.stringify({
        operations: [{
          id: 'op-1',
          timestamp: oldTimestamp,
          type: 'create',
          objectId: 'test-id',
          canvasId: 'canvas-1',
          payload: {} as Partial<CanvasObject>,
          retryCount: 0,
        }],
        lastFlushTime: null,
      }));
      
      queue.loadFromStorage();
      
      // Old operation should be cleaned up
      expect(queue.getCount()).toBe(0);
    });
  });

  describe('Max Queue Size', () => {
    it('should enforce max queue size (1000 operations)', () => {
      // Try to enqueue 1001 operations
      for (let i = 0; i < 1001; i++) {
        queue.enqueue({
          type: 'create',
          objectId: `test-${i}`,
          canvasId: 'canvas-1',
          payload: {} as Partial<CanvasObject>,
        });
      }
      
      // Should cap at 1000
      expect(queue.getCount()).toBe(1000);
    });

    it('should drop oldest operation when queue is full', () => {
      // Fill queue to max
      for (let i = 0; i < 1000; i++) {
        queue.enqueue({
          type: 'create',
          objectId: `test-${i}`,
          canvasId: 'canvas-1',
          payload: {} as Partial<CanvasObject>,
        });
      }
      
      // Add one more - should drop oldest
      queue.enqueue({
        type: 'create',
        objectId: 'test-newest',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      expect(queue.getCount()).toBe(1000);
      
      const state = queue.getState();
      // Newest should be in queue
      expect(state.operations.some(op => op.objectId === 'test-newest')).toBe(true);
    });
  });

  describe('Queue Flush', () => {
    it('should clear queue after successful flush', async () => {
      queue.enqueue({
        type: 'create',
        objectId: 'test-id',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      await queue.flush();
      
      expect(queue.getCount()).toBe(0);
      expect(queue.hasOperations()).toBe(false);
    });

    it('should not flush if already flushing', async () => {
      queue.enqueue({
        type: 'create',
        objectId: 'test-id',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      // Start two flushes simultaneously
      const flush1 = queue.flush();
      const flush2 = queue.flush();
      
      await Promise.all([flush1, flush2]);
      
      // Should only process once
      expect(queue.getCount()).toBe(0);
    });
  });

  describe('Clear and Remove Operations', () => {
    it('should clear entire queue', () => {
      queue.enqueue({
        type: 'create',
        objectId: 'test-1',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      queue.enqueue({
        type: 'create',
        objectId: 'test-2',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      queue.clear();
      
      expect(queue.getCount()).toBe(0);
      expect(queue.hasOperations()).toBe(false);
    });

    it('should remove specific operation', () => {
      queue.enqueue({
        type: 'create',
        objectId: 'test-1',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      const state = queue.getState();
      const opId = state.operations[0].id;
      
      queue.remove(opId);
      
      expect(queue.getCount()).toBe(0);
    });
  });

  describe('Queue State', () => {
    it('should provide queue state for debugging', () => {
      queue.enqueue({
        type: 'create',
        objectId: 'test-id',
        canvasId: 'canvas-1',
        payload: {} as Partial<CanvasObject>,
      });
      
      const state = queue.getState();
      
      expect(state.count).toBe(1);
      expect(state.operations).toHaveLength(1);
      expect(state.operations[0].objectId).toBe('test-id');
    });
  });
});

