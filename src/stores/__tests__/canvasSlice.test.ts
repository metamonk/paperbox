/**
 * Canvas Slice Tests (W1.D4-aligned)
 *
 * Tests for Supabase-integrated canvasSlice with:
 * - Async CRUD operations with optimistic updates
 * - Internal mutation methods for SyncManager
 * - Error handling and rollback
 * - Lifecycle management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePaperboxStore } from '../index';
import type { CanvasObject } from '@/types/canvas';
import { supabase } from '@/lib/supabase';

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
      delete: vi.fn(() => ({
        in: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
      unsubscribe: vi.fn(),
    })),
  },
}));

describe('canvasSlice - W1.D4 Supabase Integration', () => {
  beforeEach(() => {
    // Reset store before each test using internal mutation
    const store = usePaperboxStore.getState();
    store._setObjects({});
    store._setLoading(false);
    store._setError(null);
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have empty objects on initialization', () => {
      const { objects, loading, error } = usePaperboxStore.getState();

      expect(objects).toEqual({});
      expect(loading).toBe(false);
      expect(error).toBeNull();
    });

    it('should have all required methods', () => {
      const store = usePaperboxStore.getState();

      // Async CRUD operations
      expect(typeof store.initialize).toBe('function');
      expect(typeof store.createObject).toBe('function');
      expect(typeof store.updateObject).toBe('function');
      expect(typeof store.deleteObjects).toBe('function');
      expect(typeof store.cleanup).toBe('function');

      // Internal mutations
      expect(typeof store._addObject).toBe('function');
      expect(typeof store._updateObject).toBe('function');
      expect(typeof store._removeObject).toBe('function');
      expect(typeof store._removeObjects).toBe('function');
      expect(typeof store._setObjects).toBe('function');

      // Utilities
      expect(typeof store.getObjectById).toBe('function');
      expect(typeof store.getAllObjects).toBe('function');
    });
  });

  describe('initialize() - Lifecycle', () => {
    it('should set loading state during initialization', async () => {
      const { initialize } = usePaperboxStore.getState();

      const initPromise = initialize('user-123');

      // Check loading state is true during async operation
      expect(usePaperboxStore.getState().loading).toBe(true);

      await initPromise;

      // Check loading state is false after completion
      expect(usePaperboxStore.getState().loading).toBe(false);
    });

    it('should load objects from Supabase on initialize', async () => {
      // Mock Supabase response
      const mockObjects = [
        {
          id: 'rect-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          rotation: 0,
          opacity: 1,
          fill: '#ff0000',
          stroke: '#000000',
          stroke_width: 2,
          type_properties: {},
          style_properties: {},
          metadata: {},
          created_by: 'user-123',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          group_id: null,
          z_index: 0,
          locked_by: null,
          lock_acquired_at: null,
        },
      ];

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockObjects, error: null })),
        })),
      } as any);

      const { initialize, getAllObjects } = usePaperboxStore.getState();

      await initialize('user-123');

      const objects = getAllObjects();
      expect(objects).toHaveLength(1);
      expect(objects[0].id).toBe('rect-1');
      expect(objects[0].type).toBe('rectangle');
    });

    it('should handle initialization error', async () => {
      const mockError = new Error('Database connection failed');

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: mockError })),
        })),
      } as any);

      const { initialize } = usePaperboxStore.getState();

      await initialize('user-123');

      const { error, loading } = usePaperboxStore.getState();
      expect(loading).toBe(false);
      expect(error).toContain('Database connection failed');
    });
  });

  describe('createObject() - Async CRUD', () => {
    it('should create object with optimistic update', async () => {
      const { createObject, getObjectById } = usePaperboxStore.getState();

      const newObject: Partial<CanvasObject> = {
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        fill: '#ff0000',
      };

      const createdId = await createObject(newObject, 'user-123');

      // Check object exists in store
      const retrieved = getObjectById(createdId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('rectangle');
      expect(retrieved?.x).toBe(100);
      expect(retrieved?.fill).toBe('#ff0000');

      // Verify Supabase insert was called
      expect(supabase.from).toHaveBeenCalledWith('canvas_objects');
    });

    it('should rollback on database error', async () => {
      const mockError = new Error('Insert failed');

      vi.mocked(supabase.from).mockReturnValueOnce({
        insert: vi.fn(() => Promise.resolve({ error: mockError })),
      } as any);

      const { createObject, getAllObjects } = usePaperboxStore.getState();

      const newObject: Partial<CanvasObject> = {
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      };

      await expect(createObject(newObject, 'user-123')).rejects.toThrow(
        'Insert failed',
      );

      // Verify rollback - object should not exist
      expect(getAllObjects()).toHaveLength(0);
    });
  });

  describe('updateObject() - Async CRUD', () => {
    it('should update object with optimistic update', async () => {
      const { _addObject, updateObject, getObjectById } =
        usePaperboxStore.getState();

      const initialObject: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      _addObject(initialObject);

      await updateObject('rect-1', { x: 300, y: 400 });

      const updated = getObjectById('rect-1');
      expect(updated?.x).toBe(300);
      expect(updated?.y).toBe(400);
      expect(updated?.fill).toBe('#ff0000'); // Preserved

      // Verify Supabase update was called
      expect(supabase.from).toHaveBeenCalledWith('canvas_objects');
    });

    it('should rollback update on database error', async () => {
      const mockError = new Error('Update failed');

      const { _addObject, updateObject, getObjectById } =
        usePaperboxStore.getState();

      const initialObject: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      _addObject(initialObject);

      vi.mocked(supabase.from).mockReturnValueOnce({
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: mockError })),
        })),
      } as any);

      await expect(updateObject('rect-1', { x: 300 })).rejects.toThrow(
        'Update failed',
      );

      // Verify rollback - x should still be 100
      const retrieved = getObjectById('rect-1');
      expect(retrieved?.x).toBe(100);
    });

    it('should throw error for non-existent object', async () => {
      const { updateObject } = usePaperboxStore.getState();

      await expect(
        updateObject('nonexistent', { x: 100 }),
      ).rejects.toThrow('Object nonexistent not found');
    });
  });

  describe('deleteObjects() - Async CRUD', () => {
    it('should delete objects with optimistic update', async () => {
      const { _addObject, deleteObjects, getAllObjects } =
        usePaperboxStore.getState();

      const obj1: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      const obj2: CanvasObject = {
        ...obj1,
        id: 'circle-1',
        type: 'circle',
      };

      _addObject(obj1);
      _addObject(obj2);

      expect(getAllObjects()).toHaveLength(2);

      await deleteObjects(['rect-1']);

      expect(getAllObjects()).toHaveLength(1);
      expect(getAllObjects()[0].id).toBe('circle-1');

      // Verify Supabase delete was called
      expect(supabase.from).toHaveBeenCalledWith('canvas_objects');
    });

    it('should rollback delete on database error', async () => {
      const mockError = new Error('Delete failed');

      const { _addObject, deleteObjects, getAllObjects } =
        usePaperboxStore.getState();

      const obj: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      _addObject(obj);

      vi.mocked(supabase.from).mockReturnValueOnce({
        delete: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ error: mockError })),
        })),
      } as any);

      await expect(deleteObjects(['rect-1'])).rejects.toThrow('Delete failed');

      // Verify rollback - object should still exist
      expect(getAllObjects()).toHaveLength(1);
      expect(getAllObjects()[0].id).toBe('rect-1');
    });

    it('should handle deleting empty array', async () => {
      const { deleteObjects, getAllObjects } = usePaperboxStore.getState();

      await deleteObjects([]);

      expect(getAllObjects()).toHaveLength(0);
      // Should not call Supabase
      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe('Internal Mutations (_methods for SyncManager)', () => {
    it('_addObject should add object synchronously', () => {
      const { _addObject, getObjectById } = usePaperboxStore.getState();

      const obj: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      _addObject(obj);

      const retrieved = getObjectById('rect-1');
      expect(retrieved).toEqual(obj);
    });

    it('_updateObject should update object synchronously', () => {
      const { _addObject, _updateObject, getObjectById } =
        usePaperboxStore.getState();

      const obj: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      _addObject(obj);
      _updateObject('rect-1', { x: 300, y: 400 });

      const updated = getObjectById('rect-1');
      expect(updated?.x).toBe(300);
      expect(updated?.y).toBe(400);
      expect(updated?.fill).toBe('#ff0000'); // Preserved
    });

    it('_removeObject should remove object synchronously', () => {
      const { _addObject, _removeObject, getObjectById } =
        usePaperboxStore.getState();

      const obj: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      _addObject(obj);
      expect(getObjectById('rect-1')).toBeDefined();

      _removeObject('rect-1');
      expect(getObjectById('rect-1')).toBeUndefined();
    });

    it('_removeObjects should remove multiple objects synchronously', () => {
      const { _addObject, _removeObjects, getAllObjects } =
        usePaperboxStore.getState();

      const obj1: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      const obj2: CanvasObject = { ...obj1, id: 'circle-1', type: 'circle' };
      const obj3: CanvasObject = { ...obj1, id: 'text-1', type: 'text' };

      _addObject(obj1);
      _addObject(obj2);
      _addObject(obj3);

      expect(getAllObjects()).toHaveLength(3);

      _removeObjects(['rect-1', 'circle-1']);

      const remaining = getAllObjects();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('text-1');
    });

    it('_setObjects should replace all objects synchronously', () => {
      const { _addObject, _setObjects, getAllObjects } =
        usePaperboxStore.getState();

      const oldObj: CanvasObject = {
        id: 'old-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      _addObject(oldObj);

      const newObj: CanvasObject = { ...oldObj, id: 'new-1' };
      _setObjects({ 'new-1': newObj });

      const all = getAllObjects();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('new-1');
    });

    it('_setLoading should update loading state', () => {
      const { _setLoading } = usePaperboxStore.getState();

      _setLoading(true);
      expect(usePaperboxStore.getState().loading).toBe(true);

      _setLoading(false);
      expect(usePaperboxStore.getState().loading).toBe(false);
    });

    it('_setError should update error state', () => {
      const { _setError } = usePaperboxStore.getState();

      _setError('Something went wrong');
      expect(usePaperboxStore.getState().error).toBe('Something went wrong');

      _setError(null);
      expect(usePaperboxStore.getState().error).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    it('getObjectById should return object when exists', () => {
      const { _addObject, getObjectById } = usePaperboxStore.getState();

      const obj: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      _addObject(obj);

      const result = getObjectById('rect-1');
      expect(result).toEqual(obj);
    });

    it('getObjectById should return undefined when not exists', () => {
      const { getObjectById } = usePaperboxStore.getState();

      const result = getObjectById('nonexistent');
      expect(result).toBeUndefined();
    });

    it('getAllObjects should return array of all objects', () => {
      const { _addObject, getAllObjects } = usePaperboxStore.getState();

      const obj1: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        group_id: null,
        z_index: 0,
        locked_by: null,
        lock_acquired_at: null,
      };

      const obj2: CanvasObject = { ...obj1, id: 'circle-1', type: 'circle' };

      _addObject(obj1);
      _addObject(obj2);

      const all = getAllObjects();
      expect(all).toBeInstanceOf(Array);
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(obj1);
      expect(all).toContainEqual(obj2);
    });

    it('getAllObjects should return empty array for empty store', () => {
      const { getAllObjects } = usePaperboxStore.getState();

      const result = getAllObjects();
      expect(result).toEqual([]);
    });
  });

  describe('Realtime Subscriptions (W1.D4.7-4.9)', () => {
    let mockChannel: any;
    let mockSubscribe: any;
    let mockOn: any;
    let mockUnsubscribe: any;
    let capturedEventHandler: any;

    beforeEach(() => {
      // Create mock Realtime channel
      mockUnsubscribe = vi.fn();
      mockSubscribe = vi.fn(() => mockChannel);
      mockOn = vi.fn((eventType, config, handler) => {
        // Capture the handler for manual event triggering
        capturedEventHandler = handler;
        return { subscribe: mockSubscribe };
      });

      mockChannel = {
        on: mockOn,
        subscribe: mockSubscribe,
        unsubscribe: mockUnsubscribe,
      };

      // Mock supabase.channel()
      vi.spyOn(supabase as any, 'channel').mockReturnValue(mockChannel);
    });

    describe('setupRealtimeSubscription()', () => {
      it('should create channel with correct name', () => {
        const { setupRealtimeSubscription } = usePaperboxStore.getState();

        setupRealtimeSubscription('user-123');

        expect((supabase as any).channel).toHaveBeenCalledWith('canvas-changes');
      });

      it('should subscribe to postgres_changes with correct config', () => {
        const { setupRealtimeSubscription } = usePaperboxStore.getState();

        setupRealtimeSubscription('user-123');

        expect(mockOn).toHaveBeenCalledWith(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'canvas_objects',
            filter: 'created_by=eq.user-123',
          },
          expect.any(Function),
        );
      });

      it('should call subscribe() on channel', () => {
        const { setupRealtimeSubscription } = usePaperboxStore.getState();

        setupRealtimeSubscription('user-123');

        expect(mockSubscribe).toHaveBeenCalled();
      });

      it('should store channel reference in state', () => {
        const { setupRealtimeSubscription } = usePaperboxStore.getState();

        setupRealtimeSubscription('user-123');

        const { realtimeChannel } = usePaperboxStore.getState();
        expect(realtimeChannel).toBe(mockChannel);
      });

      it('should cleanup existing subscription before creating new one', () => {
        const { setupRealtimeSubscription } = usePaperboxStore.getState();

        // Setup first subscription
        setupRealtimeSubscription('user-123');
        const firstChannel = usePaperboxStore.getState().realtimeChannel;

        // Setup second subscription
        setupRealtimeSubscription('user-456');

        // First channel should have been unsubscribed
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });

    describe('Realtime Event Handling - INSERT', () => {
      it('should add new object to state on INSERT event', () => {
        const { setupRealtimeSubscription, getObjectById } = usePaperboxStore.getState();

        setupRealtimeSubscription('user-123');

        // Simulate INSERT event from Supabase
        const insertPayload = {
          eventType: 'INSERT',
          new: {
            id: 'rect-new',
            type: 'rectangle',
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            rotation: 0,
            group_id: null,
            z_index: 0,
            fill: '#ff0000',
            stroke: '#000000',
            stroke_width: 2,
            opacity: 1,
            type_properties: {},
            style_properties: {},
            metadata: {},
            created_by: 'user-123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            locked_by: null,
            lock_acquired_at: null,
          },
          old: {},
          schema: 'public',
          table: 'canvas_objects',
        };

        // Trigger the event
        capturedEventHandler(insertPayload);

        // Verify object was added to state
        const obj = getObjectById('rect-new');
        expect(obj).toBeDefined();
        expect(obj?.type).toBe('rectangle');
        expect(obj?.x).toBe(50);
        expect(obj?.fill).toBe('#ff0000');
      });
    });

    describe('Realtime Event Handling - UPDATE', () => {
      it('should update existing object on UPDATE event', () => {
        const { setupRealtimeSubscription, _addObject, getObjectById } = usePaperboxStore.getState();

        // Add initial object
        const initialObj: CanvasObject = {
          id: 'rect-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          rotation: 0,
          group_id: null,
          z_index: 0,
          fill: '#ffffff',
          stroke: '#000000',
          stroke_width: 2,
          opacity: 1,
          type_properties: {},
          style_properties: {},
          metadata: {},
          created_by: 'user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          locked_by: null,
          lock_acquired_at: null,
        };
        _addObject(initialObj);

        setupRealtimeSubscription('user-123');

        // Simulate UPDATE event
        const updatePayload = {
          eventType: 'UPDATE',
          new: {
            id: 'rect-1',
            type: 'rectangle',
            x: 200, // Changed
            y: 150, // Changed
            width: 200,
            height: 150,
            rotation: 45, // Changed
            group_id: null,
            z_index: 0,
            fill: '#00ff00', // Changed
            stroke: '#000000',
            stroke_width: 2,
            opacity: 0.5, // Changed
            type_properties: {},
            style_properties: {},
            metadata: {},
            created_by: 'user-123',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            locked_by: null,
            lock_acquired_at: null,
          },
          old: {
            id: 'rect-1',
            x: 100,
            y: 100,
            rotation: 0,
            opacity: 1,
            fill: '#ffffff',
          },
          schema: 'public',
          table: 'canvas_objects',
        };

        capturedEventHandler(updatePayload);

        const updated = getObjectById('rect-1');
        expect(updated?.x).toBe(200);
        expect(updated?.y).toBe(150);
        expect(updated?.rotation).toBe(45);
        expect(updated?.opacity).toBe(0.5);
        expect(updated?.fill).toBe('#00ff00');
      });
    });

    describe('Realtime Event Handling - DELETE', () => {
      it('should remove object from state on DELETE event', () => {
        const { setupRealtimeSubscription, _addObject, getObjectById } = usePaperboxStore.getState();

        // Add object to delete
        const objToDelete: CanvasObject = {
          id: 'rect-delete',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          rotation: 0,
          group_id: null,
          z_index: 0,
          fill: '#ffffff',
          stroke: '#000000',
          stroke_width: 2,
          opacity: 1,
          type_properties: {},
          style_properties: {},
          metadata: {},
          created_by: 'user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          locked_by: null,
          lock_acquired_at: null,
        };
        _addObject(objToDelete);

        expect(getObjectById('rect-delete')).toBeDefined();

        setupRealtimeSubscription('user-123');

        // Simulate DELETE event
        const deletePayload = {
          eventType: 'DELETE',
          new: {},
          old: {
            id: 'rect-delete',
            type: 'rectangle',
          },
          schema: 'public',
          table: 'canvas_objects',
        };

        capturedEventHandler(deletePayload);

        // Verify object was removed
        expect(getObjectById('rect-delete')).toBeUndefined();
      });
    });

    describe('cleanupRealtimeSubscription()', () => {
      it('should unsubscribe from channel', () => {
        const { setupRealtimeSubscription, cleanupRealtimeSubscription } =
          usePaperboxStore.getState();

        setupRealtimeSubscription('user-123');
        cleanupRealtimeSubscription();

        expect(mockUnsubscribe).toHaveBeenCalled();
      });

      it('should clear channel reference from state', () => {
        const { setupRealtimeSubscription, cleanupRealtimeSubscription } =
          usePaperboxStore.getState();

        setupRealtimeSubscription('user-123');
        expect(usePaperboxStore.getState().realtimeChannel).toBe(mockChannel);

        cleanupRealtimeSubscription();
        expect(usePaperboxStore.getState().realtimeChannel).toBeNull();
      });

      it('should handle cleanup when no subscription exists', () => {
        const { cleanupRealtimeSubscription } = usePaperboxStore.getState();

        // Should not throw error
        expect(() => cleanupRealtimeSubscription()).not.toThrow();
      });
    });

    describe('Integration with initialize() and cleanup()', () => {
      it('should setup realtime subscription after initialize()', async () => {
        const { initialize } = usePaperboxStore.getState();

        // Mock Supabase data fetch
        vi.mocked(supabase.from).mockReturnValue({
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        } as any);

        await initialize('user-123');

        // Should have setup realtime subscription
        expect((supabase as any).channel).toHaveBeenCalledWith('canvas-changes');
        expect(mockSubscribe).toHaveBeenCalled();
      });

      it('should cleanup subscription on cleanup()', () => {
        const { setupRealtimeSubscription, cleanup } = usePaperboxStore.getState();

        setupRealtimeSubscription('user-123');
        cleanup();

        expect(mockUnsubscribe).toHaveBeenCalled();
        expect(usePaperboxStore.getState().realtimeChannel).toBeNull();
      });
    });
  });
});
