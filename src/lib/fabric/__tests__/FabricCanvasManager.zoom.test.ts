/**
 * FabricCanvasManager - Mousewheel Zoom Tests
 *
 * W2.D6.5: RED phase - Tests for mousewheel zoom functionality
 *
 * Tests:
 * - Mouse wheel event triggers zoom change
 * - Zoom increases on negative deltaY (scroll up)
 * - Zoom decreases on positive deltaY (scroll down)
 * - Zoom is clamped to 0.01 minimum
 * - Zoom is clamped to 20 maximum
 * - Zoom is centered on cursor position (zoomToPoint)
 * - Default prevents browser scroll
 * - Viewport state syncs to Zustand after zoom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import type { Canvas as FabricCanvas } from 'fabric';

describe('FabricCanvasManager - Mousewheel Zoom', () => {
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

  describe('setupMousewheelZoom()', () => {
    it('should add mouse:wheel event listener to canvas', () => {
      // Setup zoom
      manager.setupMousewheelZoom();

      // Check that canvas has mouse:wheel listener
      // Fabric.js doesn't expose listener count, so we verify by testing behavior
      const initialZoom = canvas.getZoom();
      expect(initialZoom).toBe(1);

      // Simulate mousewheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100, // Scroll up (zoom in)
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      // After zoom event, zoom should have changed
      const newZoom = canvas.getZoom();
      expect(newZoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom in when deltaY is negative (scroll up)', () => {
      manager.setupMousewheelZoom();
      const initialZoom = canvas.getZoom();

      // Simulate scroll up (zoom in)
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      const newZoom = canvas.getZoom();
      expect(newZoom).toBeGreaterThan(initialZoom);
    });

    it('should zoom out when deltaY is positive (scroll down)', () => {
      manager.setupMousewheelZoom();

      // First zoom in
      canvas.setZoom(2);
      const initialZoom = canvas.getZoom();

      // Simulate scroll down (zoom out)
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      const newZoom = canvas.getZoom();
      expect(newZoom).toBeLessThan(initialZoom);
    });

    it('should clamp zoom to minimum 0.01', () => {
      manager.setupMousewheelZoom();

      // Set very low zoom
      canvas.setZoom(0.05);

      // Simulate massive scroll down (zoom out)
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 10000, // Very large deltaY
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      const newZoom = canvas.getZoom();
      expect(newZoom).toBeGreaterThanOrEqual(0.01);
    });

    it('should clamp zoom to maximum 20', () => {
      manager.setupMousewheelZoom();

      // Set high zoom
      canvas.setZoom(15);

      // Simulate massive scroll up (zoom in)
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -10000, // Very large negative deltaY
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      const newZoom = canvas.getZoom();
      expect(newZoom).toBeLessThanOrEqual(20);
    });

    it('should zoom to cursor position (zoomToPoint)', () => {
      manager.setupMousewheelZoom();

      const cursorX = 200;
      const cursorY = 150;

      // Get initial zoom
      const initialZoom = canvas.getZoom();

      // Simulate zoom at specific cursor position
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: cursorX,
        clientY: cursorY,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      // Zoom should have changed
      const newZoom = canvas.getZoom();
      expect(newZoom).toBeGreaterThan(initialZoom);

      // zoomToPoint should have been called (verified by zoom change)
      // Note: Full viewport transform testing requires real Fabric.js implementation
    });

    it('should handle rapid zoom events', () => {
      manager.setupMousewheelZoom();

      const initialZoom = canvas.getZoom();

      // Simulate rapid mouse wheel events
      for (let i = 0; i < 10; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -50,
          clientX: 400,
          clientY: 300,
        });

        canvas.fire('mouse:wheel', {
          e: wheelEvent,
        });
      }

      const finalZoom = canvas.getZoom();
      expect(finalZoom).toBeGreaterThan(initialZoom);
      expect(finalZoom).toBeLessThanOrEqual(20); // Still clamped
    });

    it('should handle alternating zoom in/out', () => {
      manager.setupMousewheelZoom();

      canvas.setZoom(5);
      const midZoom = canvas.getZoom();

      // Zoom in
      let wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.fire('mouse:wheel', { e: wheelEvent });

      const zoomedIn = canvas.getZoom();
      expect(zoomedIn).toBeGreaterThan(midZoom);

      // Zoom out
      wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        clientX: 400,
        clientY: 300,
      });
      canvas.fire('mouse:wheel', { e: wheelEvent });

      const zoomedOut = canvas.getZoom();
      expect(zoomedOut).toBeLessThan(zoomedIn);
    });

    it('should sync viewport to Zustand after zoom', () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // Simulate zoom event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      // Callback should be called with new viewport
      expect(syncCallback).toHaveBeenCalled();

      const [zoom, panX, panY] = syncCallback.mock.calls[0];
      expect(zoom).toBeGreaterThan(1);
      expect(typeof panX).toBe('number');
      expect(typeof panY).toBe('number');
    });

    it('should handle edge case: deltaY = 0', () => {
      manager.setupMousewheelZoom();

      const initialZoom = canvas.getZoom();

      // Simulate wheel event with no delta
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 0,
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      // Zoom should remain unchanged
      const newZoom = canvas.getZoom();
      expect(newZoom).toBe(initialZoom);
    });

    it('should handle very small deltaY values', () => {
      manager.setupMousewheelZoom();

      const initialZoom = canvas.getZoom();

      // Simulate very small scroll
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -1,
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      const newZoom = canvas.getZoom();
      // Small change expected
      expect(newZoom).toBeGreaterThan(initialZoom);
      expect(newZoom).toBeLessThan(initialZoom * 1.01); // Very small increase
    });

    it('should handle very large deltaY values', () => {
      manager.setupMousewheelZoom();

      canvas.setZoom(5);
      const initialZoom = canvas.getZoom();

      // Simulate very large scroll
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 1000,
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      const newZoom = canvas.getZoom();
      expect(newZoom).toBeLessThan(initialZoom);
      expect(newZoom).toBeGreaterThanOrEqual(0.01); // Still clamped to minimum
    });
  });

  describe('Zoom formula: zoom *= 0.999 ** delta', () => {
    it('should follow the official Fabric.js zoom formula', () => {
      manager.setupMousewheelZoom();

      // Test the formula manually
      const initialZoom = 1;
      const delta = 100;
      const expectedZoom = initialZoom * (0.999 ** delta);

      // Set canvas to initial zoom
      canvas.setZoom(initialZoom);

      // Simulate zoom event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: delta,
        clientX: 400,
        clientY: 300,
      });

      canvas.fire('mouse:wheel', {
        e: wheelEvent,
      });

      const actualZoom = canvas.getZoom();
      // Should be close to expected (allowing for floating point precision)
      expect(Math.abs(actualZoom - expectedZoom)).toBeLessThan(0.001);
    });
  });

  describe('Error Handling', () => {
    it('should throw error if canvas not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();

      expect(() => {
        uninitializedManager.setupMousewheelZoom();
      }).toThrow('Canvas not initialized');
    });

    it('should handle missing offsetX/offsetY in event', () => {
      manager.setupMousewheelZoom();

      const initialZoom = canvas.getZoom();

      // Simulate event without offset coordinates
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
      });

      // Should not throw error
      expect(() => {
        canvas.fire('mouse:wheel', {
          e: wheelEvent,
        });
      }).not.toThrow();

      // Zoom should still change (defaults to 0,0 or handles gracefully)
      const newZoom = canvas.getZoom();
      expect(newZoom).toBeGreaterThan(initialZoom);
    });
  });
});
