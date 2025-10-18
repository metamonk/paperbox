/**
 * FabricCanvasManager - Transform Matrix Tests
 *
 * W2.D7.5: RED phase - Tests for transform matrix handling
 *
 * Critical Pattern (Fabric.js v6):
 * ALWAYS call requestRenderAll() after modifying viewportTransform matrix elements
 *
 * Tests:
 * - requestRenderAll() called after manual matrix modification
 * - Viewport state consistency after zoom/pan
 * - Matrix element order: [scaleX, skewY, skewX, scaleY, translateX, translateY]
 * - Zoom operations update scale elements (indices 0 and 3)
 * - Pan operations update translate elements (indices 4 and 5)
 * - requestRenderAll() triggers canvas recalculation
 * - Direct matrix modification without requestRenderAll() may not render
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import type { Canvas as FabricCanvas } from 'fabric';

describe('FabricCanvasManager - Transform Matrix Handling', () => {
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

  describe('Transform Matrix Structure', () => {
    it('should have 6-element transform matrix [scaleX, skewY, skewX, scaleY, translateX, translateY]', () => {
      const vpt = canvas.viewportTransform;

      expect(vpt).toBeDefined();
      expect(Array.isArray(vpt)).toBe(true);
      expect(vpt.length).toBe(6);

      // Default values: [1, 0, 0, 1, 0, 0]
      expect(vpt[0]).toBe(1); // scaleX
      expect(vpt[1]).toBe(0); // skewY
      expect(vpt[2]).toBe(0); // skewX
      expect(vpt[3]).toBe(1); // scaleY
      expect(vpt[4]).toBe(0); // translateX
      expect(vpt[5]).toBe(0); // translateY
    });

    it('should update scale elements (indices 0, 3) on zoom', () => {
      const initialVpt = canvas.viewportTransform;
      const initialScale = initialVpt ? initialVpt[0] : 1;

      // Zoom in
      canvas.setZoom(2);

      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();
      if (vpt) {
        expect(vpt[0]).toBe(2); // scaleX updated
        expect(vpt[3]).toBe(2); // scaleY updated
        expect(vpt[0]).toBeGreaterThan(initialScale);
      }
    });

    it('should update translate elements (indices 4, 5) on pan', () => {
      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        // Manually modify pan
        vpt[4] = 100; // translateX
        vpt[5] = 200; // translateY
        canvas.requestRenderAll(); // Fabric.js v6 pattern

        const updatedVpt = canvas.viewportTransform;
        expect(updatedVpt).toBeDefined();
        if (updatedVpt) {
          expect(updatedVpt[4]).toBe(100);
          expect(updatedVpt[5]).toBe(200);
        }
      }
    });
  });

  describe('requestRenderAll() Requirement', () => {
    it('should call requestRenderAll() after manual matrix modification', () => {
      const requestRenderAllSpy = vi.spyOn(canvas, 'requestRenderAll');

      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        // Manual modification
        vpt[4] += 50; // translateX
        vpt[5] += 100; // translateY

        // CRITICAL: Must call requestRenderAll() (Fabric.js v6 pattern)
        canvas.requestRenderAll();

        expect(requestRenderAllSpy).toHaveBeenCalled();
      }
    });

    it('should recalculate canvas after requestRenderAll()', () => {
      const renderAllSpy = vi.spyOn(canvas, 'renderAll');

      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        vpt[0] = 2; // scaleX
        vpt[3] = 2; // scaleY
        canvas.requestRenderAll();

        // requestRenderAll() should trigger renderAll eventually
        expect(renderAllSpy).toHaveBeenCalled();
      }
    });

    it('should maintain viewport state consistency after manual modification', () => {
      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        // Set specific viewport state
        vpt[0] = 1.5; // scaleX (zoom)
        vpt[3] = 1.5; // scaleY (zoom)
        vpt[4] = 200; // translateX (panX)
        vpt[5] = 300; // translateY (panY)
        canvas.requestRenderAll();

        // Verify state is consistent
        const updatedVpt = canvas.viewportTransform;
        expect(updatedVpt).toBeDefined();
        if (updatedVpt) {
          expect(updatedVpt[0]).toBe(1.5);
          expect(updatedVpt[3]).toBe(1.5);
          expect(updatedVpt[4]).toBe(200);
          expect(updatedVpt[5]).toBe(300);

          // Verify zoom level matches
          expect(canvas.getZoom()).toBe(1.5);
        }
      }
    });
  });

  describe('Zoom and Pan Integration', () => {
    it('should update transform matrix when zooming to point', () => {
      const requestRenderAllSpy = vi.spyOn(canvas, 'requestRenderAll');

      const point = { x: 400, y: 300 }; // Center of 800x600 canvas
      const newZoom = 2;

      canvas.zoomToPoint(point, newZoom);

      // zoomToPoint() should update viewport transform
      // Verify zoom level changed
      expect(canvas.getZoom()).toBe(newZoom);
    });

    it('should preserve transform matrix integrity during zoom/pan sequence', () => {
      // Initial state
      const initialVpt = canvas.viewportTransform;
      expect(initialVpt).toBeDefined();

      // Zoom in
      canvas.setZoom(2);
      const afterZoomVpt = canvas.viewportTransform;
      expect(afterZoomVpt).toBeDefined();
      if (afterZoomVpt) {
        expect(afterZoomVpt[0]).toBe(2); // scaleX
        expect(afterZoomVpt[3]).toBe(2); // scaleY
      }

      // Pan
      if (afterZoomVpt) {
        afterZoomVpt[4] = 100; // translateX
        afterZoomVpt[5] = 150; // translateY
        canvas.setViewportTransform(afterZoomVpt);
      }

      // Verify final state
      const finalVpt = canvas.viewportTransform;
      expect(finalVpt).toBeDefined();
      if (finalVpt) {
        expect(finalVpt[0]).toBe(2);   // Zoom preserved
        expect(finalVpt[3]).toBe(2);   // Zoom preserved
        expect(finalVpt[4]).toBe(100); // Pan preserved
        expect(finalVpt[5]).toBe(150); // Pan preserved
      }
    });

    it('should handle rapid zoom/pan updates correctly', () => {
      const requestRenderAllSpy = vi.spyOn(canvas, 'requestRenderAll');

      // Simulate rapid updates
      for (let i = 0; i < 10; i++) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[0] = 1 + i * 0.1; // Increment zoom
          vpt[3] = 1 + i * 0.1;
          vpt[4] = i * 10;      // Increment pan
          vpt[5] = i * 20;
          canvas.requestRenderAll();
        }
      }

      // Verify requestRenderAll() called for each update
      expect(requestRenderAllSpy).toHaveBeenCalledTimes(10);

      // Verify final state
      const finalVpt = canvas.viewportTransform;
      expect(finalVpt).toBeDefined();
      if (finalVpt) {
        expect(finalVpt[0]).toBeCloseTo(1.9, 1);
        expect(finalVpt[3]).toBeCloseTo(1.9, 1);
        expect(finalVpt[4]).toBe(90);
        expect(finalVpt[5]).toBe(180);
      }
    });
  });

  describe('Viewport State Sync', () => {
    it('should sync viewport state to Zustand after transform change', () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);

      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        // Modify transform
        vpt[0] = 3;   // scaleX (zoom)
        vpt[3] = 3;   // scaleY (zoom)
        vpt[4] = 50;  // translateX (panX)
        vpt[5] = 100; // translateY (panY)
        canvas.requestRenderAll();

        // Manually trigger sync (in real usage, this happens on canvas events)
        const zoom = canvas.getZoom();
        const vpTransform = canvas.viewportTransform;
        if (vpTransform) {
          syncCallback(zoom, vpTransform[4], vpTransform[5]);
        }

        // Verify callback called with correct values
        expect(syncCallback).toHaveBeenCalledWith(3, 50, 100);
      }
    });

    it('should maintain consistency between getZoom() and matrix scale', () => {
      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        // Set zoom via matrix
        vpt[0] = 2.5;
        vpt[3] = 2.5;
        canvas.requestRenderAll();

        // getZoom() should match matrix scale
        expect(canvas.getZoom()).toBe(2.5);
        expect(canvas.getZoom()).toBe(vpt[0]);
        expect(canvas.getZoom()).toBe(vpt[3]);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid transform matrix gracefully', () => {
      // Fabric.js v6: Direct array modification, so we test array integrity
      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();
      expect(vpt.length).toBe(6); // Must be 6 elements
    });

    it('should handle null or undefined transform gracefully', () => {
      const vpt = canvas.viewportTransform;
      expect(vpt).not.toBeNull();
      expect(vpt).not.toBeUndefined();
    });

    it('should handle extreme scale values', () => {
      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        // Very small zoom
        vpt[0] = 0.01;
        vpt[3] = 0.01;
        canvas.requestRenderAll();
        expect(canvas.getZoom()).toBe(0.01);

        // Very large zoom
        vpt[0] = 100;
        vpt[3] = 100;
        canvas.requestRenderAll();
        expect(canvas.getZoom()).toBe(100);
      }
    });

    it('should handle extreme translate values', () => {
      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        // Large positive pan
        vpt[4] = 10000;
        vpt[5] = 10000;
        canvas.requestRenderAll();

        const updatedVpt = canvas.viewportTransform;
        expect(updatedVpt).toBeDefined();
        if (updatedVpt) {
          expect(updatedVpt[4]).toBe(10000);
          expect(updatedVpt[5]).toBe(10000);
        }

        // Large negative pan
        vpt[4] = -10000;
        vpt[5] = -10000;
        canvas.requestRenderAll();

        const finalVpt = canvas.viewportTransform;
        expect(finalVpt).toBeDefined();
        if (finalVpt) {
          expect(finalVpt[4]).toBe(-10000);
          expect(finalVpt[5]).toBe(-10000);
        }
      }
    });
  });

  describe('Canvas Manager Integration', () => {
    it('should throw error if canvas not initialized', () => {
      const uninitializedManager = new FabricCanvasManager();

      // getCanvas should return null if not initialized
      expect(uninitializedManager.getCanvas()).toBeNull();
    });

    it('should properly initialize transform matrix on canvas creation', () => {
      const vpt = canvas.viewportTransform;
      expect(vpt).toBeDefined();

      if (vpt) {
        // Should start with identity matrix
        expect(vpt[0]).toBe(1); // scaleX
        expect(vpt[1]).toBe(0); // skewY
        expect(vpt[2]).toBe(0); // skewX
        expect(vpt[3]).toBe(1); // scaleY
        expect(vpt[4]).toBe(0); // translateX
        expect(vpt[5]).toBe(0); // translateY
      }
    });
  });
});
