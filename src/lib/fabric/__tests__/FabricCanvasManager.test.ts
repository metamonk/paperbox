/**
 * FabricCanvasManager Tests
 *
 * TDD approach: RED → GREEN → REFACTOR
 *
 * Tests for canvas initialization, configuration, and lifecycle management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import { Canvas as FabricCanvas } from 'fabric';

describe('FabricCanvasManager - Canvas Initialization', () => {
  let manager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    // Create a mock canvas element for testing
    canvasElement = document.createElement('canvas');
    canvasElement.id = 'test-canvas';
    canvasElement.width = 800;
    canvasElement.height = 600;
    document.body.appendChild(canvasElement);
  });

  afterEach(() => {
    // Clean up after each test
    if (manager) {
      manager.dispose();
    }
    document.body.removeChild(canvasElement);
  });

  describe('initialize()', () => {
    it('should initialize canvas with correct dimensions', () => {
      // Arrange
      manager = new FabricCanvasManager();

      // Act
      const canvas = manager.initialize(canvasElement, {
        width: 800,
        height: 600,
      });

      // Assert
      expect(canvas).toBeInstanceOf(FabricCanvas);
      expect(canvas.getWidth()).toBe(800);
      expect(canvas.getHeight()).toBe(600);
    });

    it('should initialize canvas with correct background color', () => {
      // Arrange
      manager = new FabricCanvasManager();

      // Act
      const canvas = manager.initialize(canvasElement, {
        backgroundColor: '#f0f0f0',
      });

      // Assert
      expect(canvas).toBeInstanceOf(FabricCanvas);
      expect(canvas.backgroundColor).toBe('#f0f0f0');
    });

    it('should use default config when no config provided', () => {
      // Arrange
      manager = new FabricCanvasManager();

      // Act
      const canvas = manager.initialize(canvasElement);

      // Assert
      expect(canvas).toBeInstanceOf(FabricCanvas);
      expect(canvas.getWidth()).toBe(800); // Default width
      expect(canvas.getHeight()).toBe(600); // Default height
      expect(canvas.backgroundColor).toBe('#ffffff'); // Default white
    });

    it('should merge constructor config with initialize config', () => {
      // Arrange
      manager = new FabricCanvasManager({
        width: 1000,
        backgroundColor: '#000000',
      });

      // Act
      const canvas = manager.initialize(canvasElement, {
        height: 700,
      });

      // Assert
      expect(canvas.getWidth()).toBe(1000); // From constructor
      expect(canvas.getHeight()).toBe(700); // From initialize
      expect(canvas.backgroundColor).toBe('#000000'); // From constructor
    });

    it('should return canvas instance via getCanvas()', () => {
      // Arrange
      manager = new FabricCanvasManager();
      const canvas = manager.initialize(canvasElement);

      // Act
      const retrievedCanvas = manager.getCanvas();

      // Assert
      expect(retrievedCanvas).toBe(canvas);
      expect(retrievedCanvas).toBeInstanceOf(FabricCanvas);
    });

    it('should return null from getCanvas() before initialization', () => {
      // Arrange
      manager = new FabricCanvasManager();

      // Act
      const canvas = manager.getCanvas();

      // Assert
      expect(canvas).toBeNull();
    });
  });

  describe('dispose()', () => {
    it('should dispose canvas and clear instance', () => {
      // Arrange
      manager = new FabricCanvasManager();
      manager.initialize(canvasElement);

      // Act
      manager.dispose();
      const canvas = manager.getCanvas();

      // Assert
      expect(canvas).toBeNull();
    });

    it('should not throw error when disposing uninitialized manager', () => {
      // Arrange
      manager = new FabricCanvasManager();

      // Act & Assert
      expect(() => manager.dispose()).not.toThrow();
    });
  });
});

describe('FabricCanvasManager - Event Listeners', () => {
  let manager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    canvasElement = document.createElement('canvas');
    canvasElement.id = 'test-canvas-events';
    document.body.appendChild(canvasElement);
    manager = new FabricCanvasManager();
  });

  afterEach(() => {
    manager.dispose();
    document.body.removeChild(canvasElement);
  });

  describe('setupEventListeners()', () => {
    it('should throw error if called before initialize()', () => {
      // Arrange
      const handlers = {};

      // Act & Assert
      expect(() => manager.setupEventListeners(handlers)).toThrow(
        'Canvas not initialized'
      );
    });

    it('should not throw error if called after initialize()', () => {
      // Arrange
      manager.initialize(canvasElement);
      const handlers = {};

      // Act & Assert
      expect(() => manager.setupEventListeners(handlers)).not.toThrow();
    });

    it('should call onObjectModified handler when object is modified', () => {
      // Arrange
      manager.initialize(canvasElement);
      const onObjectModified = vi.fn();
      manager.setupEventListeners({ onObjectModified });

      const canvas = manager.getCanvas();
      expect(canvas).not.toBeNull();

      // Act
      // Simulate object:modified event
      canvas!.fire('object:modified', { target: {} as any });

      // Assert
      expect(onObjectModified).toHaveBeenCalledTimes(1);
    });

    it('should call onSelectionCreated handler when selection is created', () => {
      // Arrange
      manager.initialize(canvasElement);
      const onSelectionCreated = vi.fn();
      manager.setupEventListeners({ onSelectionCreated });

      const canvas = manager.getCanvas();
      expect(canvas).not.toBeNull();

      // Act
      canvas!.fire('selection:created', { selected: [] });

      // Assert
      expect(onSelectionCreated).toHaveBeenCalledTimes(1);
      expect(onSelectionCreated).toHaveBeenCalledWith([]);
    });

    it('should call onSelectionCleared handler when selection is cleared', () => {
      // Arrange
      manager.initialize(canvasElement);
      const onSelectionCleared = vi.fn();
      manager.setupEventListeners({ onSelectionCleared });

      const canvas = manager.getCanvas();
      expect(canvas).not.toBeNull();

      // Act
      canvas!.fire('selection:cleared', { deselected: [] });

      // Assert
      expect(onSelectionCleared).toHaveBeenCalledTimes(1);
    });
  });
});

describe('FabricCanvasManager - Object Factory', () => {
  let manager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    canvasElement = document.createElement('canvas');
    canvasElement.id = 'test-canvas-factory';
    document.body.appendChild(canvasElement);
    manager = new FabricCanvasManager();
    manager.initialize(canvasElement);
  });

  afterEach(() => {
    manager.dispose();
    document.body.removeChild(canvasElement);
  });

  describe('createFabricObject()', () => {
    it('should create fabric.Rect from rectangle CanvasObject', () => {
      // Arrange
      const rectangleObject: import('@/types/canvas').RectangleObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 150,
        width: 200,
        height: 100,
        rotation: 0,
        group_id: null,
        z_index: 1,
        fill: '#ff0000',
        stroke: '#000000',
        stroke_width: 2,
        opacity: 1,
        type_properties: {
          corner_radius: 10,
        },
        style_properties: {},
        metadata: {},
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      // Act
      const fabricObject = manager.createFabricObject(rectangleObject);

      // Assert
      expect(fabricObject).not.toBeNull();
      expect(fabricObject?.type).toBe('rect');
      expect(fabricObject?.left).toBe(100);
      expect(fabricObject?.top).toBe(150);
      expect(fabricObject?.width).toBe(200);
      expect(fabricObject?.height).toBe(100);
      expect(fabricObject?.fill).toBe('#ff0000');
      expect(fabricObject?.stroke).toBe('#000000');
      expect(fabricObject?.strokeWidth).toBe(2);
      expect(fabricObject?.opacity).toBe(1);
      expect((fabricObject as any)?.rx).toBe(10); // corner radius
      expect((fabricObject as any)?.ry).toBe(10);
    });

    it('should create fabric.Circle from circle CanvasObject', () => {
      // Arrange
      const circleObject: import('@/types/canvas').CircleObject = {
        id: 'circle-1',
        type: 'circle',
        x: 250,
        y: 200,
        width: 100,
        height: 100,
        rotation: 0,
        group_id: null,
        z_index: 2,
        fill: '#00ff00',
        stroke: null,
        stroke_width: null,
        opacity: 0.8,
        type_properties: {
          radius: 50,
        },
        style_properties: {},
        metadata: {},
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      // Act
      const fabricObject = manager.createFabricObject(circleObject);

      // Assert
      expect(fabricObject).not.toBeNull();
      expect(fabricObject?.type).toBe('circle');
      expect(fabricObject?.left).toBe(250);
      expect(fabricObject?.top).toBe(200);
      expect((fabricObject as any)?.radius).toBe(50);
      expect(fabricObject?.fill).toBe('#00ff00');
      expect(fabricObject?.opacity).toBe(0.8);
    });

    it('should create fabric.Textbox from text CanvasObject', () => {
      // Arrange
      const textObject: import('@/types/canvas').TextObject = {
        id: 'text-1',
        type: 'text',
        x: 300,
        y: 100,
        width: 150,
        height: 50,
        rotation: 0,
        group_id: null,
        z_index: 3,
        fill: '#0000ff',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        type_properties: {
          text_content: 'Hello World',
          font_size: 24,
          font_family: 'Arial',
          font_weight: 'bold',
          text_align: 'center',
        },
        style_properties: {},
        metadata: {},
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      // Act
      const fabricObject = manager.createFabricObject(textObject);

      // Assert
      expect(fabricObject).not.toBeNull();
      expect(fabricObject?.type).toBe('textbox');
      expect(fabricObject?.left).toBe(300);
      expect(fabricObject?.top).toBe(100);
      expect((fabricObject as any)?.text).toBe('Hello World');
      expect((fabricObject as any)?.fontSize).toBe(24);
      expect((fabricObject as any)?.fontFamily).toBe('Arial');
      expect((fabricObject as any)?.fontWeight).toBe('bold');
      expect((fabricObject as any)?.textAlign).toBe('center');
      expect(fabricObject?.fill).toBe('#0000ff');
    });

    it('should store database ID in fabric object data property', () => {
      // Arrange
      const rectangleObject: import('@/types/canvas').RectangleObject = {
        id: 'rect-with-id',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        rotation: 0,
        group_id: null,
        z_index: 1,
        fill: '#ffffff',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      // Act
      const fabricObject = manager.createFabricObject(rectangleObject);

      // Assert
      expect(fabricObject).not.toBeNull();
      expect((fabricObject as any)?.data).toEqual({
        id: 'rect-with-id',
        type: 'rectangle',
      });
    });

    it('should apply rotation to fabric object', () => {
      // Arrange
      const rectangleObject: import('@/types/canvas').RectangleObject = {
        id: 'rect-rotated',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        rotation: 45,
        group_id: null,
        z_index: 1,
        fill: '#ffffff',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      // Act
      const fabricObject = manager.createFabricObject(rectangleObject);

      // Assert
      expect(fabricObject).not.toBeNull();
      expect(fabricObject?.angle).toBe(45);
    });
  });
});

describe('FabricCanvasManager - Object Serialization', () => {
  let manager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    canvasElement = document.createElement('canvas');
    canvasElement.id = 'test-canvas-serialization';
    document.body.appendChild(canvasElement);
    manager = new FabricCanvasManager();
    manager.initialize(canvasElement);
  });

  afterEach(() => {
    manager.dispose();
    document.body.removeChild(canvasElement);
  });

  describe('toCanvasObject()', () => {
    it('should serialize fabric.Rect to RectangleObject', () => {
      // Arrange - Create a rectangle via factory
      const originalData: import('@/types/canvas').RectangleObject = {
        id: 'rect-serialize-1',
        type: 'rectangle',
        x: 150,
        y: 200,
        width: 250,
        height: 150,
        rotation: 30,
        group_id: null,
        z_index: 5,
        fill: '#00ff00',
        stroke: '#00aa00',
        stroke_width: 3,
        opacity: 0.85,
        type_properties: {
          corner_radius: 15,
        },
        style_properties: {},
        metadata: {},
        created_by: 'user-serialize',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      const fabricRect = manager.createFabricObject(originalData);

      // Act - Serialize back to CanvasObject
      const serialized = manager.toCanvasObject(fabricRect!);

      // Assert - Check all properties preserved
      expect(serialized).not.toBeNull();
      expect(serialized!.type).toBe('rectangle');
      expect(serialized!.x).toBe(150);
      expect(serialized!.y).toBe(200);
      expect(serialized!.width).toBe(250);
      expect(serialized!.height).toBe(150);
      expect(serialized!.rotation).toBe(30);
      expect(serialized!.fill).toBe('#00ff00');
      expect(serialized!.stroke).toBe('#00aa00');
      expect(serialized!.stroke_width).toBe(3);
      expect(serialized!.opacity).toBe(0.85);
      expect(serialized!.type_properties.corner_radius).toBe(15);
    });

    it('should serialize fabric.Circle to CircleObject', () => {
      // Arrange
      const originalData: import('@/types/canvas').CircleObject = {
        id: 'circle-serialize-1',
        type: 'circle',
        x: 300,
        y: 250,
        width: 120,
        height: 120,
        rotation: 0,
        group_id: null,
        z_index: 3,
        fill: '#ff00ff',
        stroke: '#aa00aa',
        stroke_width: 2,
        opacity: 0.9,
        type_properties: {
          radius: 60,
        },
        style_properties: {},
        metadata: {},
        created_by: 'user-serialize',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      const fabricCircle = manager.createFabricObject(originalData);

      // Act
      const serialized = manager.toCanvasObject(fabricCircle!);

      // Assert
      expect(serialized).not.toBeNull();
      expect(serialized!.type).toBe('circle');
      expect(serialized!.x).toBe(300);
      expect(serialized!.y).toBe(250);
      expect(serialized!.type_properties.radius).toBe(60);
      expect(serialized!.fill).toBe('#ff00ff');
      expect(serialized!.stroke).toBe('#aa00aa');
    });

    it('should serialize fabric.Textbox to TextObject', () => {
      // Arrange
      const originalData: import('@/types/canvas').TextObject = {
        id: 'text-serialize-1',
        type: 'text',
        x: 50,
        y: 400,
        width: 350,
        height: 100,
        rotation: 0,
        group_id: null,
        z_index: 10,
        fill: '#0000ff',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        type_properties: {
          text_content: 'Serialization Test',
          font_size: 32,
          font_family: 'Helvetica',
          font_weight: 'bold',
          font_style: 'italic',
          text_align: 'center',
        },
        style_properties: {},
        metadata: {},
        created_by: 'user-serialize',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      const fabricText = manager.createFabricObject(originalData);

      // Act
      const serialized = manager.toCanvasObject(fabricText!);

      // Assert
      expect(serialized).not.toBeNull();
      expect(serialized!.type).toBe('text');
      expect(serialized!.type_properties.text_content).toBe('Serialization Test');
      expect(serialized!.type_properties.font_size).toBe(32);
      expect(serialized!.type_properties.font_family).toBe('Helvetica');
      expect(serialized!.type_properties.font_weight).toBe('bold');
      expect(serialized!.type_properties.font_style).toBe('italic');
      expect(serialized!.type_properties.text_align).toBe('center');
    });

    it('should preserve database ID through round-trip serialization', () => {
      // Arrange
      const originalData: import('@/types/canvas').RectangleObject = {
        id: 'round-trip-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 0,
        group_id: null,
        z_index: 1,
        fill: '#ff0000',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        type_properties: {
          corner_radius: 0,
        },
        style_properties: {},
        metadata: {},
        created_by: 'user-test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      // Act - Create fabric object then serialize back
      const fabricObject = manager.createFabricObject(originalData);
      const serialized = manager.toCanvasObject(fabricObject!);

      // Assert - ID should be preserved
      expect(serialized).not.toBeNull();
      expect(serialized!.id).toBe('round-trip-1');
      expect(fabricObject!.data.id).toBe('round-trip-1');
    });

    it('should return null for null input', () => {
      // Act
      const result = manager.toCanvasObject(null);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle objects with null stroke', () => {
      // Arrange
      const originalData: import('@/types/canvas').CircleObject = {
        id: 'null-stroke-1',
        type: 'circle',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        rotation: 0,
        group_id: null,
        z_index: 1,
        fill: '#ffaa00',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        type_properties: {
          radius: 50,
        },
        style_properties: {},
        metadata: {},
        created_by: 'user-test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      const fabricCircle = manager.createFabricObject(originalData);

      // Act
      const serialized = manager.toCanvasObject(fabricCircle!);

      // Assert
      expect(serialized).not.toBeNull();
      expect(serialized!.stroke).toBeNull();
      expect(serialized!.stroke_width).toBeNull();
    });
  });
});

/**
 * W1.D2.5: Object Management Tests [RED Phase]
 */
describe('FabricCanvasManager - Object Management', () => {
  let manager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    canvasElement = document.createElement('canvas');
    canvasElement.id = 'test-canvas-management';
    document.body.appendChild(canvasElement);
    manager = new FabricCanvasManager();
    manager.initialize(canvasElement);
  });

  afterEach(() => {
    manager.dispose();
    document.body.removeChild(canvasElement);
  });

  describe('addObject()', () => {
    it('should add a CanvasObject to the canvas and return the Fabric object', () => {
      const canvasObject: import('@/types/canvas').RectangleObject = {
        id: 'rect-add-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 0,
        fill: '#ff0000',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: 1,
        style_properties: {},
        metadata: {},
        type_properties: {
          corner_radius: 0,
        },
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      const fabricObject = manager.addObject(canvasObject);

      expect(fabricObject).toBeDefined();
      expect(fabricObject?.type).toBe('rect');
      expect(fabricObject?.left).toBe(100);
      expect(fabricObject?.top).toBe(100);
      expect(fabricObject?.data?.id).toBe('rect-add-1');

      // Verify object is on canvas
      const canvas = manager.getCanvas();
      const objects = canvas?.getObjects();
      expect(objects).toHaveLength(1);
      expect(objects?.[0]).toBe(fabricObject);
    });

    it('should return null if canvas is not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();

      const canvasObject: import('@/types/canvas').CircleObject = {
        id: 'circle-add-fail',
        type: 'circle',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#00ff00',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: 1,
        style_properties: {},
        metadata: {},
        type_properties: {
          radius: 50,
        },
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      const fabricObject = uninitializedManager.addObject(canvasObject);
      expect(fabricObject).toBeNull();
    });
  });

  describe('removeObject()', () => {
    it('should remove an object from the canvas by database ID', () => {
      // Add an object first
      const canvasObject: import('@/types/canvas').RectangleObject = {
        id: 'rect-remove-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 0,
        fill: '#ff0000',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: 1,
        style_properties: {},
        metadata: {},
        type_properties: {
          corner_radius: 0,
        },
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      manager.addObject(canvasObject);

      // Verify object is on canvas
      let canvas = manager.getCanvas();
      expect(canvas?.getObjects()).toHaveLength(1);

      // Remove the object
      const removed = manager.removeObject('rect-remove-1');
      expect(removed).toBe(true);

      // Verify object is removed from canvas
      canvas = manager.getCanvas();
      expect(canvas?.getObjects()).toHaveLength(0);
    });

    it('should return false when trying to remove non-existent object', () => {
      const removed = manager.removeObject('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should return false if canvas is not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();
      const removed = uninitializedManager.removeObject('any-id');
      expect(removed).toBe(false);
    });
  });

  describe('findObjectById()', () => {
    it('should find an object by its database ID', () => {
      // Add multiple objects
      const rect: import('@/types/canvas').RectangleObject = {
        id: 'rect-find-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 0,
        fill: '#ff0000',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: 1,
        style_properties: {},
        metadata: {},
        type_properties: { corner_radius: 0 },
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      const circle: import('@/types/canvas').CircleObject = {
        id: 'circle-find-1',
        type: 'circle',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#00ff00',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: 2,
        style_properties: {},
        metadata: {},
        type_properties: { radius: 50 },
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      const fabricRect = manager.addObject(rect);
      const fabricCircle = manager.addObject(circle);

      // Find rectangle
      const foundRect = manager.findObjectById('rect-find-1');
      expect(foundRect).toBe(fabricRect);
      expect(foundRect?.data?.id).toBe('rect-find-1');

      // Find circle
      const foundCircle = manager.findObjectById('circle-find-1');
      expect(foundCircle).toBe(fabricCircle);
      expect(foundCircle?.data?.id).toBe('circle-find-1');
    });

    it('should return null when object is not found', () => {
      const found = manager.findObjectById('non-existent-id');
      expect(found).toBeNull();
    });

    it('should return null if canvas is not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();
      const found = uninitializedManager.findObjectById('any-id');
      expect(found).toBeNull();
    });
  });
});

/**
 * W1.D2.7: Selection Management Tests [RED Phase]
 */
describe('FabricCanvasManager - Selection Management', () => {
  let manager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    canvasElement = document.createElement('canvas');
    canvasElement.id = 'test-canvas-selection';
    document.body.appendChild(canvasElement);
    manager = new FabricCanvasManager();
    manager.initialize(canvasElement);
  });

  afterEach(() => {
    manager.dispose();
    document.body.removeChild(canvasElement);
  });

  describe('selectObject()', () => {
    it('should select an object by its database ID', () => {
      // Add an object
      const canvasObject: import('@/types/canvas').RectangleObject = {
        id: 'rect-select-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 0,
        fill: '#ff0000',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: 1,
        style_properties: {},
        metadata: {},
        type_properties: { corner_radius: 0 },
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      manager.addObject(canvasObject);

      // Select the object
      const selected = manager.selectObject('rect-select-1');
      expect(selected).toBe(true);

      // Verify selection
      const canvas = manager.getCanvas();
      const activeObject = canvas?.getActiveObject();
      expect(activeObject).toBeDefined();
      expect(activeObject?.data?.id).toBe('rect-select-1');
    });

    it('should return false when trying to select non-existent object', () => {
      const selected = manager.selectObject('non-existent-id');
      expect(selected).toBe(false);
    });

    it('should return false if canvas is not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();
      const selected = uninitializedManager.selectObject('any-id');
      expect(selected).toBe(false);
    });
  });

  describe('deselectAll()', () => {
    it('should deselect all selected objects', () => {
      // Add and select an object
      const canvasObject: import('@/types/canvas').CircleObject = {
        id: 'circle-deselect-1',
        type: 'circle',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#00ff00',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: 1,
        style_properties: {},
        metadata: {},
        type_properties: { radius: 50 },
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      manager.addObject(canvasObject);
      manager.selectObject('circle-deselect-1');

      // Verify object is selected
      let canvas = manager.getCanvas();
      expect(canvas?.getActiveObject()).toBeDefined();

      // Deselect all
      manager.deselectAll();

      // Verify no selection
      canvas = manager.getCanvas();
      expect(canvas?.getActiveObject()).toBeUndefined();
    });

    it('should not throw error if no objects are selected', () => {
      expect(() => manager.deselectAll()).not.toThrow();
    });

    it('should not throw error if canvas is not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();
      expect(() => uninitializedManager.deselectAll()).not.toThrow();
    });
  });

  describe('getSelectedObjects()', () => {
    it('should return array of selected object IDs', () => {
      // Add multiple objects
      const rect: import('@/types/canvas').RectangleObject = {
        id: 'rect-selected-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        rotation: 0,
        fill: '#ff0000',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: 1,
        style_properties: {},
        metadata: {},
        type_properties: { corner_radius: 0 },
        created_by: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      manager.addObject(rect);
      manager.selectObject('rect-selected-1');

      const selectedIds = manager.getSelectedObjects();
      expect(selectedIds).toEqual(['rect-selected-1']);
    });

    it('should return empty array when no objects are selected', () => {
      const selectedIds = manager.getSelectedObjects();
      expect(selectedIds).toEqual([]);
    });

    it('should return empty array if canvas is not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();
      const selectedIds = uninitializedManager.getSelectedObjects();
      expect(selectedIds).toEqual([]);
    });
  });
});

/**
 * W1.D2.9: Integration Testing - Full Object Lifecycle
 */
describe('FabricCanvasManager - Integration: Full Object Lifecycle', () => {
  let manager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    canvasElement = document.createElement('canvas');
    canvasElement.id = 'test-canvas-integration';
    document.body.appendChild(canvasElement);
    manager = new FabricCanvasManager();
    manager.initialize(canvasElement);
  });

  afterEach(() => {
    manager.dispose();
    document.body.removeChild(canvasElement);
  });

  it('should handle complete object lifecycle: create → add → select → modify → serialize → remove', () => {
    // 1. Create database object
    const original: import('@/types/canvas').RectangleObject = {
      id: 'lifecycle-rect-1',
      type: 'rectangle',
      x: 50,
      y: 50,
      width: 150,
      height: 100,
      rotation: 0,
      fill: '#3498db',
      stroke: '#2980b9',
      stroke_width: 2,
      opacity: 1,
      group_id: null,
      z_index: 1,
      style_properties: {},
      metadata: {},
      type_properties: { corner_radius: 10 },
      created_by: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_by: null,
      lock_acquired_at: null,
    };

    // 2. Add to canvas
    const fabricObject = manager.addObject(original);
    expect(fabricObject).toBeDefined();
    expect(fabricObject?.type).toBe('rect');

    // Verify on canvas
    let canvas = manager.getCanvas();
    expect(canvas?.getObjects()).toHaveLength(1);

    // 3. Select object
    const selected = manager.selectObject('lifecycle-rect-1');
    expect(selected).toBe(true);

    const selectedIds = manager.getSelectedObjects();
    expect(selectedIds).toEqual(['lifecycle-rect-1']);

    // 4. Modify object (simulate user interaction)
    if (fabricObject) {
      fabricObject.left = 100;
      fabricObject.top = 100;
      fabricObject.angle = 45;
    }

    // 5. Serialize back to database format
    const serialized = manager.toCanvasObject(fabricObject!);
    expect(serialized).toBeDefined();
    expect(serialized!.x).toBe(100);
    expect(serialized!.y).toBe(100);
    expect(serialized!.rotation).toBe(45);
    expect(serialized!.id).toBe('lifecycle-rect-1');

    // 6. Deselect
    manager.deselectAll();
    expect(manager.getSelectedObjects()).toEqual([]);

    // 7. Remove from canvas
    const removed = manager.removeObject('lifecycle-rect-1');
    expect(removed).toBe(true);

    canvas = manager.getCanvas();
    expect(canvas?.getObjects()).toHaveLength(0);
  });

  it('should handle multiple objects with independent lifecycles', () => {
    // Create multiple objects
    const rect: import('@/types/canvas').RectangleObject = {
      id: 'multi-rect-1',
      type: 'rectangle',
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      rotation: 0,
      fill: '#e74c3c',
      stroke: null,
      stroke_width: null,
      opacity: 1,
      group_id: null,
      z_index: 1,
      style_properties: {},
      metadata: {},
      type_properties: { corner_radius: 0 },
      created_by: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_by: null,
      lock_acquired_at: null,
    };

    const circle: import('@/types/canvas').CircleObject = {
      id: 'multi-circle-1',
      type: 'circle',
      x: 200,
      y: 200,
      width: 80,
      height: 80,
      rotation: 0,
      fill: '#2ecc71',
      stroke: null,
      stroke_width: null,
      opacity: 1,
      group_id: null,
      z_index: 2,
      style_properties: {},
      metadata: {},
      type_properties: { radius: 40 },
      created_by: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_by: null,
      lock_acquired_at: null,
    };

    const text: import('@/types/canvas').TextObject = {
      id: 'multi-text-1',
      type: 'text',
      x: 300,
      y: 100,
      width: 200,
      height: 50,
      rotation: 0,
      fill: '#34495e',
      stroke: null,
      stroke_width: null,
      opacity: 1,
      group_id: null,
      z_index: 3,
      style_properties: {},
      metadata: {},
      type_properties: {
        text_content: 'Integration Test',
        font_size: 24,
        font_family: 'Arial',
        font_weight: 'bold',
        font_style: 'normal',
        text_align: 'center',
      },
      created_by: 'user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_by: null,
      lock_acquired_at: null,
    };

    // Add all objects
    const fabricRect = manager.addObject(rect);
    const fabricCircle = manager.addObject(circle);
    const fabricText = manager.addObject(text);

    // Verify all on canvas
    const canvas = manager.getCanvas();
    expect(canvas?.getObjects()).toHaveLength(3);

    // Test individual selection
    manager.selectObject('multi-circle-1');
    expect(manager.getSelectedObjects()).toEqual(['multi-circle-1']);

    // Test finding objects
    expect(manager.findObjectById('multi-rect-1')).toBe(fabricRect);
    expect(manager.findObjectById('multi-circle-1')).toBe(fabricCircle);
    expect(manager.findObjectById('multi-text-1')).toBe(fabricText);

    // Test round-trip serialization for each
    const serializedRect = manager.toCanvasObject(fabricRect!);
    const serializedCircle = manager.toCanvasObject(fabricCircle!);
    const serializedText = manager.toCanvasObject(fabricText!);

    expect(serializedRect?.id).toBe('multi-rect-1');
    expect(serializedCircle?.id).toBe('multi-circle-1');
    expect(serializedText?.id).toBe('multi-text-1');

    // Remove one object
    manager.removeObject('multi-circle-1');
    expect(canvas?.getObjects()).toHaveLength(2);
    expect(manager.findObjectById('multi-circle-1')).toBeNull();

    // Others remain
    expect(manager.findObjectById('multi-rect-1')).toBe(fabricRect);
    expect(manager.findObjectById('multi-text-1')).toBe(fabricText);
  });
});
