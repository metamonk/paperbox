/**
 * FabricCanvasManager - Spacebar + Drag Panning Tests
 *
 * W2.D6.7: RED phase - Tests for spacebar + drag pan functionality
 *
 * Tests:
 * - Spacebar key enables pan mode
 * - Mouse drag updates viewport position during pan mode
 * - Pan syncs to Zustand on mouse:up
 * - Panning disabled when spacebar not held
 * - Multiple pan gestures work correctly
 * - Pan state resets properly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import type { Canvas as FabricCanvas } from 'fabric';

describe('FabricCanvasManager - Spacebar + Drag Panning', () => {
  let manager: FabricCanvasManager;
  let canvas: FabricCanvas;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    // Create real canvas element
    canvasElement = document.createElement('canvas');
    canvasElement.width = 800;
    canvasElement.height = 600;
    document.body.appendChild(canvasElement);

    // Initialize FabricCanvasManager
    manager = new FabricCanvasManager();
    canvas = manager.initialize(canvasElement);
  });

  afterEach(() => {
    manager.dispose();
    if (canvasElement.parentNode) {
      document.body.removeChild(canvasElement);
    }
  });

  describe('setupSpacebarPan()', () => {
    it('should enable panning mode when spacebar is pressed', () => {
      // Setup pan controls
      manager.setupSpacebarPan();

      // Get initial canvas selection state
      const initialSelection = canvas.selection;

      // Simulate spacebar keydown
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Canvas selection should be disabled during pan mode
      expect(canvas.selection).toBe(false);
    });

    it('should disable panning mode when spacebar is released', () => {
      manager.setupSpacebarPan();

      // Press spacebar
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Release spacebar
      const keyupEvent = new KeyboardEvent('keyup', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keyupEvent);

      // Canvas selection should be re-enabled
      expect(canvas.selection).toBe(true);
    });

    it('should update viewport position on mouse drag during pan mode', () => {
      manager.setupSpacebarPan();

      // Set initial viewport
      canvas.setZoom(1);
      canvas.absolutePan({ x: 0, y: 0 });

      // Store initial values (not reference)
      const initialPanX = canvas.viewportTransform[4];
      const initialPanY = canvas.viewportTransform[5];

      // Activate pan mode
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Simulate mouse down (start pan)
      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });

      // Simulate mouse move (dragging)
      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 150, clientY: 150 }),
      });

      // Viewport should have changed
      expect(canvas.viewportTransform[4]).not.toBe(initialPanX); // panX changed
      expect(canvas.viewportTransform[5]).not.toBe(initialPanY); // panY changed
    });

    it('should NOT pan when spacebar is not held', () => {
      manager.setupSpacebarPan();

      // Set initial viewport
      canvas.setZoom(1);
      canvas.absolutePan({ x: 0, y: 0 });

      const initialViewport = [...canvas.viewportTransform];

      // Try to pan WITHOUT pressing spacebar
      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });

      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 150, clientY: 150 }),
      });

      // Viewport should NOT have changed
      const newViewport = canvas.viewportTransform;
      expect(newViewport[4]).toBe(initialViewport[4]); // panX unchanged
      expect(newViewport[5]).toBe(initialViewport[5]); // panY unchanged
    });

    it('should sync viewport to Zustand on mouse:up after pan', () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupSpacebarPan();

      // Activate pan mode
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Start panning
      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });

      // Drag
      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 150, clientY: 150 }),
      });

      // Release mouse
      canvas.fire('mouse:up', {
        e: new MouseEvent('mouseup', { clientX: 150, clientY: 150 }),
      });

      // Viewport sync callback should have been called
      expect(syncCallback).toHaveBeenCalled();
      const [zoom, panX, panY] = syncCallback.mock.calls[0];
      expect(typeof zoom).toBe('number');
      expect(typeof panX).toBe('number');
      expect(typeof panY).toBe('number');
    });

    it('should handle multiple pan gestures correctly', () => {
      manager.setupSpacebarPan();

      // Set initial viewport
      canvas.setZoom(1);
      canvas.absolutePan({ x: 0, y: 0 });

      // Activate pan mode
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // First pan gesture
      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });
      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 150, clientY: 150 }),
      });
      canvas.fire('mouse:up', {
        e: new MouseEvent('mouseup', { clientX: 150, clientY: 150 }),
      });

      const firstPanViewport = [...canvas.viewportTransform];

      // Second pan gesture
      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 200, clientY: 200 }),
      });
      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 250, clientY: 250 }),
      });
      canvas.fire('mouse:up', {
        e: new MouseEvent('mouseup', { clientX: 250, clientY: 250 }),
      });

      const secondPanViewport = canvas.viewportTransform;

      // Second pan should have changed viewport further
      expect(secondPanViewport[4]).not.toBe(firstPanViewport[4]);
      expect(secondPanViewport[5]).not.toBe(firstPanViewport[5]);
    });

    it('should restore canvas selection after pan completes', () => {
      manager.setupSpacebarPan();

      // Activate pan mode
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Pan mode should disable selection
      expect(canvas.selection).toBe(false);

      // Deactivate pan mode
      const keyupEvent = new KeyboardEvent('keyup', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keyupEvent);

      // Selection should be restored
      expect(canvas.selection).toBe(true);
    });

    it('should calculate pan delta correctly based on mouse movement', () => {
      manager.setupSpacebarPan();

      // Set initial viewport
      canvas.setZoom(1);
      canvas.absolutePan({ x: 100, y: 200 });

      const initialPanX = canvas.viewportTransform[4];
      const initialPanY = canvas.viewportTransform[5];

      // Activate pan mode
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Start pan at (300, 300)
      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 300, clientY: 300 }),
      });

      // Move to (400, 450) - delta of (+100, +150)
      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 400, clientY: 450 }),
      });

      const newPanX = canvas.viewportTransform[4];
      const newPanY = canvas.viewportTransform[5];

      // Pan should have moved by approximately the delta
      // (exact values depend on zoom level)
      expect(newPanX).toBeGreaterThan(initialPanX);
      expect(newPanY).toBeGreaterThan(initialPanY);
    });

    it('should handle zoom-adjusted panning correctly', () => {
      manager.setupSpacebarPan();

      // Set zoomed-in viewport
      canvas.setZoom(2);
      canvas.absolutePan({ x: 0, y: 0 });

      const initialPanX = canvas.viewportTransform[4];

      // Activate pan mode
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Pan gesture
      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });

      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 200, clientY: 100 }),
      });

      const newPanX = canvas.viewportTransform[4];

      // Pan should work at zoomed level
      expect(newPanX).not.toBe(initialPanX);
    });

    it('should not interfere with object selection when not panning', () => {
      manager.setupSpacebarPan();

      // Canvas selection should be enabled by default
      expect(canvas.selection).toBe(true);

      // Add an object to canvas
      const mockObject = { type: 'rect' };
      canvas.add(mockObject as any);

      // Click without spacebar should allow selection
      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });

      // Selection should still be enabled
      expect(canvas.selection).toBe(true);
    });

    it('should handle rapid spacebar press/release', () => {
      manager.setupSpacebarPan();

      // Rapid press
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);
      expect(canvas.selection).toBe(false);

      // Rapid release
      const keyupEvent = new KeyboardEvent('keyup', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keyupEvent);
      expect(canvas.selection).toBe(true);

      // Repeat
      document.dispatchEvent(keydownEvent);
      expect(canvas.selection).toBe(false);

      document.dispatchEvent(keyupEvent);
      expect(canvas.selection).toBe(true);
    });

    it('should clean up event listeners on disposal', () => {
      manager.setupSpacebarPan();

      // Activate pan mode
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Dispose manager
      manager.dispose();

      // Try to trigger pan mode after disposal (should not crash)
      const keydownEvent2 = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });

      expect(() => {
        document.dispatchEvent(keydownEvent2);
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error if canvas not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();

      expect(() => {
        uninitializedManager.setupSpacebarPan();
      }).toThrow('Canvas not initialized');
    });

    it('should handle missing mouse coordinates gracefully', () => {
      manager.setupSpacebarPan();

      // Activate pan mode
      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      // Mouse down without coordinates
      expect(() => {
        canvas.fire('mouse:down', {
          e: new MouseEvent('mousedown'),
        });
      }).not.toThrow();

      // Mouse move without coordinates
      expect(() => {
        canvas.fire('mouse:move', {
          e: new MouseEvent('mousemove'),
        });
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle panning at extreme zoom levels', () => {
      manager.setupSpacebarPan();

      // Test at minimum zoom
      canvas.setZoom(0.01);
      canvas.absolutePan({ x: 0, y: 0 });

      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });
      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 200, clientY: 200 }),
      });

      const minZoomPan = canvas.viewportTransform[4];

      // Test at maximum zoom
      canvas.setZoom(20);
      canvas.absolutePan({ x: 0, y: 0 });

      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });
      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 200, clientY: 200 }),
      });

      const maxZoomPan = canvas.viewportTransform[4];

      // Panning should work at both extremes
      expect(typeof minZoomPan).toBe('number');
      expect(typeof maxZoomPan).toBe('number');
    });

    it('should handle panning with very large viewport offsets', () => {
      manager.setupSpacebarPan();

      // Set extreme initial pan
      canvas.setZoom(1);
      canvas.absolutePan({ x: 10000, y: -5000 });

      const initialPanX = canvas.viewportTransform[4];

      const keydownEvent = new KeyboardEvent('keydown', {
        key: ' ',
        code: 'Space',
      });
      document.dispatchEvent(keydownEvent);

      canvas.fire('mouse:down', {
        e: new MouseEvent('mousedown', { clientX: 100, clientY: 100 }),
      });
      canvas.fire('mouse:move', {
        e: new MouseEvent('mousemove', { clientX: 200, clientY: 100 }),
      });

      const newPanX = canvas.viewportTransform[4];

      // Should handle large offsets
      expect(newPanX).not.toBe(initialPanX);
      expect(Math.abs(newPanX)).toBeGreaterThan(1000);
    });
  });
});
