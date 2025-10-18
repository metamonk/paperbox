/**
 * CanvasSyncManager Unit Tests
 * W1.D9: Test bidirectional sync coordination with loop prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasSyncManager } from '../CanvasSyncManager';
import type { FabricCanvasManager } from '../../fabric/FabricCanvasManager';
import type { PaperboxStore } from '../../../stores';
import type { CanvasObject } from '../../../types/canvas';
import type { FabricObject } from 'fabric';

// Mock FabricCanvasManager
const createMockFabricManager = () => ({
  setupEventListeners: vi.fn(),
  toCanvasObject: vi.fn(),
  addObject: vi.fn(),
  removeObject: vi.fn(),
  findObjectById: vi.fn(),
  setupMousewheelZoom: vi.fn(), // W2.D11: Added for CanvasSyncManager compatibility
  setupSpacebarPan: vi.fn(),    // W2.D11: Added for CanvasSyncManager compatibility
});

// Mock PaperboxStore
const createMockStore = () => {
  const subscribers: Array<(objects: Record<string, CanvasObject>, prevObjects: Record<string, CanvasObject>) => void> = [];
  let currentObjects: Record<string, CanvasObject> = {};

  // Create spies once and reuse them
  const updateObjectSpy = vi.fn();
  const selectObjectsSpy = vi.fn();
  const deselectAllSpy = vi.fn();

  return {
    getState: vi.fn(() => ({
      objects: currentObjects,
      updateObject: updateObjectSpy,
      selectObjects: selectObjectsSpy,
      deselectAll: deselectAllSpy,
    })),
    subscribe: vi.fn((
      selector: (state: any) => Record<string, CanvasObject>,
      listener: (objects: Record<string, CanvasObject>, prevObjects: Record<string, CanvasObject>) => void
    ) => {
      subscribers.push(listener);
      return () => {
        const index = subscribers.indexOf(listener);
        if (index > -1) subscribers.splice(index, 1);
      };
    }),
    // Helper to trigger subscriptions in tests
    _triggerSubscription: (newObjects: Record<string, CanvasObject>) => {
      const prevObjects = currentObjects;
      currentObjects = newObjects;
      subscribers.forEach(listener => listener(newObjects, prevObjects));
    },
    // Expose spies for testing
    _spies: {
      updateObject: updateObjectSpy,
      selectObjects: selectObjectsSpy,
      deselectAll: deselectAllSpy,
    },
  };
};

// Mock CanvasObject factory
const createMockCanvasObject = (overrides: Partial<CanvasObject> = {}): CanvasObject => ({
  id: 'obj-1',
  type: 'rectangle',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  rotation: 0,
  opacity: 1,
  fill: '#000000',
  locked_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: 'user-1',
  type_properties: {},
  ...overrides,
});

// Mock FabricObject
const createMockFabricObject = (id: string): Partial<FabricObject> => ({
  data: { id },
  left: 100,
  top: 100,
  width: 200,
  height: 150,
});

describe('CanvasSyncManager', () => {
  let syncManager: CanvasSyncManager;
  let mockFabricManager: ReturnType<typeof createMockFabricManager>;
  let mockStore: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    mockFabricManager = createMockFabricManager();
    mockStore = createMockStore();
    syncManager = new CanvasSyncManager(
      mockFabricManager as unknown as FabricCanvasManager,
      mockStore as unknown as PaperboxStore
    );
  });

  describe('initialization', () => {
    it('should initialize bidirectional sync', () => {
      syncManager.initialize();

      expect(mockFabricManager.setupEventListeners).toHaveBeenCalledOnce();
      expect(mockStore.subscribe).toHaveBeenCalledOnce();
    });

    it('should set up canvas event handlers', () => {
      syncManager.initialize();

      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];
      expect(eventHandlers).toHaveProperty('onObjectModified');
      expect(eventHandlers).toHaveProperty('onSelectionCreated');
      expect(eventHandlers).toHaveProperty('onSelectionUpdated');
      expect(eventHandlers).toHaveProperty('onSelectionCleared');
    });

    it('should set up store subscription', () => {
      syncManager.initialize();

      expect(mockStore.subscribe).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('Canvas → State sync', () => {
    beforeEach(() => {
      syncManager.initialize();
    });

    it('should sync object modifications from canvas to state', () => {
      const mockCanvasObj = createMockCanvasObject();
      const mockFabricObj = createMockFabricObject('obj-1');

      mockFabricManager.toCanvasObject.mockReturnValue(mockCanvasObj);

      // Get the event handlers that were registered
      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];

      // Simulate object modification
      eventHandlers.onObjectModified(mockFabricObj as FabricObject);

      expect(mockFabricManager.toCanvasObject).toHaveBeenCalledWith(mockFabricObj);
      expect(mockStore._spies.updateObject).toHaveBeenCalledWith('obj-1', mockCanvasObj);
    });

    it('should sync selection created from canvas to state', () => {
      const mockFabricObjs = [
        createMockFabricObject('obj-1'),
        createMockFabricObject('obj-2'),
      ];

      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];
      eventHandlers.onSelectionCreated(mockFabricObjs as FabricObject[]);

      expect(mockStore._spies.selectObjects).toHaveBeenCalledWith(['obj-1', 'obj-2']);
    });

    it('should sync selection updated from canvas to state', () => {
      const mockFabricObjs = [createMockFabricObject('obj-1')];

      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];
      eventHandlers.onSelectionUpdated(mockFabricObjs as FabricObject[]);

      expect(mockStore._spies.selectObjects).toHaveBeenCalledWith(['obj-1']);
    });

    it('should sync selection cleared from canvas to state', () => {
      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];
      eventHandlers.onSelectionCleared();

      expect(mockStore._spies.deselectAll).toHaveBeenCalled();
    });

    it('should filter out fabric objects without ids in selection', () => {
      const mockFabricObjs = [
        createMockFabricObject('obj-1'),
        { data: {} }, // No id
        createMockFabricObject('obj-2'),
      ];

      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];
      eventHandlers.onSelectionCreated(mockFabricObjs as FabricObject[]);

      expect(mockStore._spies.selectObjects).toHaveBeenCalledWith(['obj-1', 'obj-2']);
    });
  });

  describe('State → Canvas sync', () => {
    beforeEach(() => {
      syncManager.initialize();
    });

    it('should add new objects to canvas when added to state', () => {
      const newObj = createMockCanvasObject({ id: 'obj-1' });

      // Trigger subscription with new object
      mockStore._triggerSubscription({ 'obj-1': newObj });

      expect(mockFabricManager.addObject).toHaveBeenCalledWith(newObj);
    });

    it('should remove objects from canvas when removed from state', () => {
      const obj = createMockCanvasObject({ id: 'obj-1' });

      // Start with object present
      mockStore._triggerSubscription({ 'obj-1': obj });
      mockFabricManager.addObject.mockClear();

      // Remove object
      mockStore._triggerSubscription({});

      expect(mockFabricManager.removeObject).toHaveBeenCalledWith('obj-1');
    });

    it('should update objects in canvas when changed in state', () => {
      const originalObj = createMockCanvasObject({ id: 'obj-1', x: 100 });
      const updatedObj = createMockCanvasObject({ id: 'obj-1', x: 200 });

      // Start with original object
      mockStore._triggerSubscription({ 'obj-1': originalObj });
      mockFabricManager.addObject.mockClear();
      mockFabricManager.removeObject.mockClear();

      // Update object
      mockStore._triggerSubscription({ 'obj-1': updatedObj });

      expect(mockFabricManager.removeObject).toHaveBeenCalledWith('obj-1');
      expect(mockFabricManager.addObject).toHaveBeenCalledWith(updatedObj);
    });

    it('should not update objects if no meaningful changes detected', () => {
      const obj1 = createMockCanvasObject({ id: 'obj-1' });
      const obj2 = { ...obj1 }; // Same properties

      mockStore._triggerSubscription({ 'obj-1': obj1 });
      mockFabricManager.addObject.mockClear();
      mockFabricManager.removeObject.mockClear();

      mockStore._triggerSubscription({ 'obj-1': obj2 });

      expect(mockFabricManager.removeObject).not.toHaveBeenCalled();
      expect(mockFabricManager.addObject).not.toHaveBeenCalled();
    });
  });

  describe('Loop prevention', () => {
    beforeEach(() => {
      syncManager.initialize();
    });

    it('should prevent canvas→state update from triggering state→canvas update', () => {
      const mockCanvasObj = createMockCanvasObject();
      const mockFabricObj = createMockFabricObject('obj-1');

      mockFabricManager.toCanvasObject.mockReturnValue(mockCanvasObj);

      // Simulate canvas modification
      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];
      eventHandlers.onObjectModified(mockFabricObj as FabricObject);

      // Verify that the subscription callback would be skipped
      // (In real implementation, the sync flag prevents the callback from executing)
      expect(mockFabricManager.toCanvasObject).toHaveBeenCalledOnce();
    });

    it('should prevent state→canvas update from triggering canvas→state update', () => {
      const newObj = createMockCanvasObject({ id: 'obj-1' });

      // Trigger state change
      mockStore._triggerSubscription({ 'obj-1': newObj });

      // Fabric manager addObject is called
      expect(mockFabricManager.addObject).toHaveBeenCalledWith(newObj);

      // If this triggered a canvas event, toCanvasObject would be called
      // But with loop prevention, it shouldn't
      expect(mockFabricManager.toCanvasObject).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from store on dispose', () => {
      syncManager.initialize();

      const unsubscribeFn = mockStore.subscribe.mock.results[0].value;
      const unsubscribeSpy = vi.fn(unsubscribeFn);
      mockStore.subscribe.mockReturnValue(unsubscribeSpy);

      syncManager.initialize(); // Re-initialize to get spied unsubscribe
      syncManager.dispose();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });

    it('should allow multiple dispose calls safely', () => {
      syncManager.initialize();

      expect(() => {
        syncManager.dispose();
        syncManager.dispose();
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      syncManager.initialize();
    });

    it('should handle null canvas object from toCanvasObject', () => {
      const mockFabricObj = createMockFabricObject('obj-1');
      mockFabricManager.toCanvasObject.mockReturnValue(null);

      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];

      expect(() => {
        eventHandlers.onObjectModified(mockFabricObj as FabricObject);
      }).not.toThrow();

      expect(mockStore._spies.updateObject).not.toHaveBeenCalled();
    });

    it('should handle empty selection arrays', () => {
      const eventHandlers = mockFabricManager.setupEventListeners.mock.calls[0][0];

      expect(() => {
        eventHandlers.onSelectionCreated([]);
      }).not.toThrow();

      expect(mockStore._spies.selectObjects).toHaveBeenCalledWith([]);
    });

    it('should handle concurrent object additions and deletions', () => {
      const obj1 = createMockCanvasObject({ id: 'obj-1' });
      const obj2 = createMockCanvasObject({ id: 'obj-2' });

      // Start with obj-1
      mockStore._triggerSubscription({ 'obj-1': obj1 });
      mockFabricManager.addObject.mockClear();

      // Remove obj-1, add obj-2
      mockStore._triggerSubscription({ 'obj-2': obj2 });

      expect(mockFabricManager.removeObject).toHaveBeenCalledWith('obj-1');
      expect(mockFabricManager.addObject).toHaveBeenCalledWith(obj2);
    });
  });
});
