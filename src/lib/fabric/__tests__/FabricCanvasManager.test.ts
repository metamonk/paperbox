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
      canvas!.fire('selection:cleared', {});

      // Assert
      expect(onSelectionCleared).toHaveBeenCalledTimes(1);
    });
  });
});
