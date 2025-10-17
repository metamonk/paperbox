/**
 * Tests for FabricCanvasManager
 *
 * TDD Red Phase: Write failing tests first
 * Expected: Tests will fail initially, then pass after implementation in W1.D1.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FabricCanvasManager, getFabricCanvasManager } from '../FabricCanvasManager';
import * as fabric from 'fabric';

describe('FabricCanvasManager', () => {
  let manager: FabricCanvasManager;

  beforeEach(() => {
    manager = new FabricCanvasManager();
  });

  afterEach(() => {
    // Clean up canvas instances
    manager.dispose();
  });

  describe('initialize()', () => {
    it('should create a canvas element with correct ID', () => {
      const config = {
        containerId: 'test-canvas',
        width: 800,
        height: 600,
      };

      const canvas = manager.initialize(config);

      expect(canvas).toBeDefined();
      expect(canvas).toBeInstanceOf(fabric.Canvas);
    });

    it('should initialize canvas with correct dimensions', () => {
      const config = {
        containerId: 'test-canvas-dimensions',
        width: 1024,
        height: 768,
      };

      const canvas = manager.initialize(config);

      expect(canvas.getWidth()).toBe(1024);
      expect(canvas.getHeight()).toBe(768);
    });

    it('should set default backgroundColor to white', () => {
      const config = {
        containerId: 'test-canvas-bg',
        width: 800,
        height: 600,
      };

      const canvas = manager.initialize(config);

      expect(canvas.backgroundColor).toBe('#ffffff');
    });

    it('should use custom backgroundColor when provided', () => {
      const config = {
        containerId: 'test-canvas-custom-bg',
        width: 800,
        height: 600,
        backgroundColor: '#f0f0f0',
      };

      const canvas = manager.initialize(config);

      expect(canvas.backgroundColor).toBe('#f0f0f0');
    });

    it('should enable selection by default', () => {
      const config = {
        containerId: 'test-canvas-selection',
        width: 800,
        height: 600,
      };

      const canvas = manager.initialize(config);

      expect(canvas.selection).toBe(true);
    });

    it('should preserve object stacking', () => {
      const config = {
        containerId: 'test-canvas-stacking',
        width: 800,
        height: 600,
      };

      const canvas = manager.initialize(config);

      expect(canvas.preserveObjectStacking).toBe(true);
    });

    it('should enable retina scaling for HiDPI displays', () => {
      const config = {
        containerId: 'test-canvas-retina',
        width: 800,
        height: 600,
      };

      const canvas = manager.initialize(config);

      expect(canvas.enableRetinaScaling).toBe(true);
    });

    it('should disable renderOnAddRemove for manual render control', () => {
      const config = {
        containerId: 'test-canvas-render-control',
        width: 800,
        height: 600,
      };

      const canvas = manager.initialize(config);

      expect(canvas.renderOnAddRemove).toBe(false);
    });
  });

  describe('getCanvas()', () => {
    it('should return null before initialization', () => {
      expect(manager.getCanvas()).toBeNull();
    });

    it('should return canvas instance after initialization', () => {
      const config = {
        containerId: 'test-canvas-get',
        width: 800,
        height: 600,
      };

      manager.initialize(config);
      const canvas = manager.getCanvas();

      expect(canvas).toBeDefined();
      expect(canvas).toBeInstanceOf(fabric.Canvas);
    });
  });

  describe('dispose()', () => {
    it('should clean up canvas instance', () => {
      const config = {
        containerId: 'test-canvas-dispose',
        width: 800,
        height: 600,
      };

      manager.initialize(config);
      expect(manager.getCanvas()).not.toBeNull();

      manager.dispose();
      expect(manager.getCanvas()).toBeNull();
    });

    it('should remove canvas element from DOM', () => {
      const config = {
        containerId: 'test-canvas-dom-cleanup',
        width: 800,
        height: 600,
      };

      manager.initialize(config);
      manager.dispose();

      // After disposal, getCanvas should return null
      expect(manager.getCanvas()).toBeNull();
    });
  });

  describe('getFabricCanvasManager() singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = getFabricCanvasManager();
      const instance2 = getFabricCanvasManager();

      expect(instance1).toBe(instance2);
    });

    it('should provide a working FabricCanvasManager instance', () => {
      const instance = getFabricCanvasManager();

      expect(instance).toBeInstanceOf(FabricCanvasManager);
    });
  });
});
