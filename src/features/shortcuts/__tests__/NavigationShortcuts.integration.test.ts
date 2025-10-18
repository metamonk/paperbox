/**
 * NavigationShortcuts - Integration Tests
 *
 * W2.D8.8: Full navigation workflow integration tests
 *
 * Tests complete user workflows combining multiple navigation shortcuts:
 * - Create objects → zoom in (Cmd+2) → pan → reset (Cmd+0)
 * - Select objects → zoom to selection (Cmd+9) → zoom 100% (Cmd+1)
 * - Verify shortcuts work consistently together
 * - Verify viewport persists after each operation
 * - Test realistic multi-step navigation patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavigationShortcuts } from '../NavigationShortcuts';
import { FabricCanvasManager } from '../../../lib/fabric/FabricCanvasManager';
import { usePaperboxStore } from '../../../stores';
import hotkeys from 'hotkeys-js';

describe('NavigationShortcuts - Integration Tests', () => {
  let shortcuts: NavigationShortcuts;
  let canvasManager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    // Create canvas element
    canvasElement = document.createElement('canvas');
    canvasElement.width = 800;
    canvasElement.height = 600;
    document.body.appendChild(canvasElement);

    // Initialize canvas manager
    canvasManager = new FabricCanvasManager();
    canvasManager.initialize(canvasElement);

    // Initialize shortcuts
    shortcuts = new NavigationShortcuts({ canvasManager });
    shortcuts.initialize();

    // Reset store viewport
    usePaperboxStore.getState().resetViewport();
  });

  afterEach(() => {
    shortcuts.dispose();
    canvasManager.dispose();
    if (canvasElement.parentNode) {
      document.body.removeChild(canvasElement);
    }
    hotkeys.deleteScope('all');
  });

  describe('Complete Navigation Workflow', () => {
    it('should handle create → zoom in → pan → reset workflow', () => {
      const canvas = canvasManager.getCanvas();

      // Step 1: Create objects on canvas
      const rect1 = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 200,
        height: 150,
        getBoundingRect: () => ({
          left: 100,
          top: 100,
          width: 200,
          height: 150,
        }),
      };

      const rect2 = {
        type: 'rect',
        left: 400,
        top: 300,
        width: 150,
        height: 100,
        getBoundingRect: () => ({
          left: 400,
          top: 300,
          width: 150,
          height: 100,
        }),
      };

      canvas.add(rect1 as any, rect2 as any);
      expect(canvas.getObjects().length).toBe(2);

      // Step 2: Zoom in to 200% (Cmd+2)
      hotkeys.trigger('cmd+2');
      expect(canvas.getZoom()).toBe(2.0);

      // Step 3: Pan viewport manually
      canvas.absolutePan({ x: -100, y: -50 });
      expect(canvas.viewportTransform[4]).toBe(-100);
      expect(canvas.viewportTransform[5]).toBe(-50);

      // Step 4: Reset viewport (Cmd+0)
      hotkeys.trigger('cmd+0');
      expect(canvas.getZoom()).toBe(1);
      expect(canvas.viewportTransform[4]).toBe(0);
      expect(canvas.viewportTransform[5]).toBe(0);

      // Verify Zustand store reflects final state
      const viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(1);
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
    });

    it('should handle select → zoom to selection → zoom 100% workflow', () => {
      const canvas = canvasManager.getCanvas();

      // Step 1: Create multiple objects
      const rect1 = {
        type: 'rect',
        left: 50,
        top: 50,
        width: 100,
        height: 100,
        getBoundingRect: () => ({
          left: 50,
          top: 50,
          width: 100,
          height: 100,
        }),
      };

      const rect2 = {
        type: 'rect',
        left: 300,
        top: 200,
        width: 100,
        height: 100,
        getBoundingRect: () => ({
          left: 300,
          top: 200,
          width: 100,
          height: 100,
        }),
      };

      const rect3 = {
        type: 'rect',
        left: 600,
        top: 400,
        width: 80,
        height: 80,
        getBoundingRect: () => ({
          left: 600,
          top: 400,
          width: 80,
          height: 80,
        }),
      };

      canvas.add(rect1 as any, rect2 as any, rect3 as any);

      // Step 2: Select first two objects
      canvas.setActiveObject(rect1 as any);
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue([rect1, rect2] as any);

      // Step 3: Zoom to selection (Cmd+9)
      hotkeys.trigger('cmd+9');

      const zoomAfterSelection = canvas.getZoom();
      expect(zoomAfterSelection).toBeGreaterThan(0);
      expect(zoomAfterSelection).toBeLessThan(5); // Reasonable zoom level

      // Step 4: Zoom to 100% (Cmd+1)
      hotkeys.trigger('cmd+1');
      expect(canvas.getZoom()).toBe(1.0);

      // Verify Zustand store reflects final state
      const viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(1.0);
    });

    it('should maintain viewport consistency across multiple zoom operations', () => {
      const canvas = canvasManager.getCanvas();

      // Create test object
      const rect = {
        type: 'rect',
        left: 200,
        top: 150,
        width: 150,
        height: 100,
        getBoundingRect: () => ({
          left: 200,
          top: 150,
          width: 150,
          height: 100,
        }),
      };

      canvas.add(rect as any);
      canvas.setActiveObject(rect as any);

      // Sequence: 100% → 200% → Reset → 100% → Zoom to selection
      hotkeys.trigger('cmd+1'); // 100%
      expect(canvas.getZoom()).toBe(1.0);

      hotkeys.trigger('cmd+2'); // 200%
      expect(canvas.getZoom()).toBe(2.0);

      hotkeys.trigger('cmd+0'); // Reset
      expect(canvas.getZoom()).toBe(1.0);
      expect(canvas.viewportTransform[4]).toBe(0);

      hotkeys.trigger('cmd+1'); // 100% (should be idempotent)
      expect(canvas.getZoom()).toBe(1.0);

      hotkeys.trigger('cmd+9'); // Zoom to selection
      const finalZoom = canvas.getZoom();
      expect(finalZoom).toBeGreaterThan(0);

      // All operations should sync to store
      const viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(canvas.getZoom());
      expect(viewport.panX).toBe(canvas.viewportTransform[4]);
      expect(viewport.panY).toBe(canvas.viewportTransform[5]);
    });
  });

  describe('Viewport Persistence', () => {
    it('should persist viewport state after each shortcut operation', () => {
      const canvas = canvasManager.getCanvas();

      // Zoom to 200%
      hotkeys.trigger('cmd+2');

      // Verify persistence
      let viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(2.0);

      // Pan manually
      canvas.absolutePan({ x: 50, y: 75 });

      // Zoom to 100%
      hotkeys.trigger('cmd+1');

      // Verify pan persisted, zoom changed
      viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(1.0);
      expect(viewport.panX).toBe(50);
      expect(viewport.panY).toBe(75);

      // Reset viewport
      hotkeys.trigger('cmd+0');

      // Verify everything reset
      viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(1);
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
    });

    it('should handle rapid shortcut changes without state corruption', () => {
      const canvas = canvasManager.getCanvas();

      // Create object for zoom-to-selection
      const rect = {
        type: 'rect',
        left: 300,
        top: 250,
        width: 100,
        height: 100,
        getBoundingRect: () => ({
          left: 300,
          top: 250,
          width: 100,
          height: 100,
        }),
      };

      canvas.add(rect as any);
      canvas.setActiveObject(rect as any);

      // Rapid shortcut sequence
      for (let i = 0; i < 10; i++) {
        hotkeys.trigger('cmd+1'); // 100%
        hotkeys.trigger('cmd+2'); // 200%
        hotkeys.trigger('cmd+9'); // Zoom to selection
        hotkeys.trigger('cmd+0'); // Reset
      }

      // Final state should be reset (last operation was Cmd+0)
      expect(canvas.getZoom()).toBe(1);
      expect(canvas.viewportTransform[4]).toBe(0);
      expect(canvas.viewportTransform[5]).toBe(0);

      // Store should match canvas state
      const viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(1);
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should work correctly with manual viewport operations', () => {
      const canvas = canvasManager.getCanvas();

      // Manual zoom
      canvas.setZoom(1.5);
      canvas.requestRenderAll();

      // Shortcut zoom
      hotkeys.trigger('cmd+2'); // 200%
      expect(canvas.getZoom()).toBe(2.0);

      // Manual pan
      canvas.absolutePan({ x: 100, y: 200 });

      // Shortcut reset
      hotkeys.trigger('cmd+0');
      expect(canvas.getZoom()).toBe(1);
      expect(canvas.viewportTransform[4]).toBe(0);
      expect(canvas.viewportTransform[5]).toBe(0);
    });

    it('should integrate with object selection changes', () => {
      const canvas = canvasManager.getCanvas();

      // Create three objects
      const rect1 = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 100,
        height: 100,
        getBoundingRect: () => ({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
        }),
      };

      const rect2 = {
        type: 'rect',
        left: 300,
        top: 300,
        width: 100,
        height: 100,
        getBoundingRect: () => ({
          left: 300,
          top: 300,
          width: 100,
          height: 100,
        }),
      };

      const rect3 = {
        type: 'rect',
        left: 500,
        top: 100,
        width: 100,
        height: 100,
        getBoundingRect: () => ({
          left: 500,
          top: 100,
          width: 100,
          height: 100,
        }),
      };

      canvas.add(rect1 as any, rect2 as any, rect3 as any);

      // Select first object, zoom to it
      canvas.setActiveObject(rect1 as any);
      hotkeys.trigger('cmd+9');

      const zoom1 = canvas.getZoom();
      expect(zoom1).toBeGreaterThan(0);

      // Change selection to multiple objects
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue([rect2, rect3] as any);

      // Zoom to new selection
      hotkeys.trigger('cmd+9');

      const zoom2 = canvas.getZoom();
      expect(zoom2).toBeGreaterThan(0);

      // Different selections should result in different zoom levels
      // (though specific values depend on object positions and sizes)
      expect(zoom2).not.toBe(zoom1);
    });
  });

  describe('Error Recovery', () => {
    it('should gracefully handle shortcuts when no objects exist', () => {
      const canvas = canvasManager.getCanvas();

      // No objects on canvas
      expect(canvas.getObjects().length).toBe(0);

      // All shortcuts should work without errors
      expect(() => {
        hotkeys.trigger('cmd+0'); // Reset
        hotkeys.trigger('cmd+1'); // 100%
        hotkeys.trigger('cmd+2'); // 200%
        hotkeys.trigger('cmd+9'); // Zoom to selection (no-op)
      }).not.toThrow();

      // Viewport should reflect non-zoom shortcuts
      expect(canvas.getZoom()).toBe(2.0); // Last zoom operation
    });

    it('should handle shortcuts during canvas state transitions', () => {
      const canvas = canvasManager.getCanvas();

      // Create object
      const rect = {
        type: 'rect',
        left: 200,
        top: 200,
        width: 100,
        height: 100,
        getBoundingRect: () => ({
          left: 200,
          top: 200,
          width: 100,
          height: 100,
        }),
      };

      canvas.add(rect as any);

      // Trigger shortcuts while adding/removing objects
      hotkeys.trigger('cmd+2');
      canvas.add(rect as any);
      hotkeys.trigger('cmd+1');
      canvas.remove(rect as any);
      hotkeys.trigger('cmd+0');

      // Should end in reset state
      expect(canvas.getZoom()).toBe(1);
      expect(canvas.viewportTransform[4]).toBe(0);
      expect(canvas.viewportTransform[5]).toBe(0);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle navigation with many objects on canvas', () => {
      const canvas = canvasManager.getCanvas();

      // Create 50 objects
      const objects = [];
      for (let i = 0; i < 50; i++) {
        const rect = {
          type: 'rect',
          left: (i % 10) * 80,
          top: Math.floor(i / 10) * 80,
          width: 60,
          height: 60,
          getBoundingRect: () => ({
            left: (i % 10) * 80,
            top: Math.floor(i / 10) * 80,
            width: 60,
            height: 60,
          }),
        };
        objects.push(rect);
        canvas.add(rect as any);
      }

      expect(canvas.getObjects().length).toBe(50);

      // Select multiple objects
      canvas.setActiveObject(objects[0] as any);
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue(objects.slice(0, 10) as any);

      // Navigation shortcuts should still work
      const startTime = performance.now();

      hotkeys.trigger('cmd+9'); // Zoom to selection
      hotkeys.trigger('cmd+1'); // 100%
      hotkeys.trigger('cmd+2'); // 200%
      hotkeys.trigger('cmd+0'); // Reset

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (<100ms for 50 objects)
      expect(duration).toBeLessThan(100);

      // Final state should be correct
      expect(canvas.getZoom()).toBe(1);
      expect(canvas.viewportTransform[4]).toBe(0);
      expect(canvas.viewportTransform[5]).toBe(0);
    });
  });
});
