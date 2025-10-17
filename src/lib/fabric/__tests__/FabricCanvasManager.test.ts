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
