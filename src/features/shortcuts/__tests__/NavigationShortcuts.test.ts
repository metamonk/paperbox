/**
 * NavigationShortcuts - Tests
 *
 * W2.D8.2: RED phase - Tests for keyboard navigation shortcuts
 *
 * Tests:
 * - Cmd+0 resets viewport to [1,0,0,1,0,0]
 * - Cmd+1 sets zoom to 100% (1.0)
 * - Cmd+2 sets zoom to 200% (2.0)
 * - Cmd+9 zooms to selection bounds
 * - Viewport syncs to Zustand after shortcuts
 * - Shortcuts work with modifier keys (Cmd/Ctrl)
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavigationShortcuts } from '../NavigationShortcuts';
import { FabricCanvasManager } from '../../../lib/fabric/FabricCanvasManager';
import { usePaperboxStore } from '../../../stores';
import hotkeys from 'hotkeys-js';

describe('NavigationShortcuts', () => {
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

  describe('Cmd+0: Reset Viewport', () => {
    it('should reset viewport to identity transform [1,0,0,1,0,0]', () => {
      const canvas = canvasManager.getCanvas();

      // Set non-default viewport
      canvas.setZoom(2.5);
      canvas.absolutePan({ x: 100, y: 200 });

      // Trigger Cmd+0
      hotkeys.trigger('cmd+0');

      // Should reset to identity
      expect(canvas.getZoom()).toBe(1);
      expect(canvas.viewportTransform[4]).toBe(0); // panX
      expect(canvas.viewportTransform[5]).toBe(0); // panY
    });

    it('should sync reset viewport to Zustand store', () => {
      const canvas = canvasManager.getCanvas();

      // Set non-default viewport
      canvas.setZoom(3);
      canvas.absolutePan({ x: 50, y: -50 });

      // Trigger Cmd+0
      hotkeys.trigger('cmd+0');

      // Store should reflect reset
      const viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(1);
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
    });

    it('should work with Ctrl+0 on non-Mac systems', () => {
      const canvas = canvasManager.getCanvas();

      canvas.setZoom(1.5);
      canvas.absolutePan({ x: 25, y: 25 });

      // Trigger Ctrl+0
      hotkeys.trigger('ctrl+0');

      expect(canvas.getZoom()).toBe(1);
      expect(canvas.viewportTransform[4]).toBe(0);
      expect(canvas.viewportTransform[5]).toBe(0);
    });

    it('should handle multiple reset calls', () => {
      const canvas = canvasManager.getCanvas();

      // Multiple resets should be idempotent
      hotkeys.trigger('cmd+0');
      hotkeys.trigger('cmd+0');
      hotkeys.trigger('cmd+0');

      expect(canvas.getZoom()).toBe(1);
      expect(canvas.viewportTransform[4]).toBe(0);
      expect(canvas.viewportTransform[5]).toBe(0);
    });
  });

  describe('Cmd+1: Zoom to 100%', () => {
    it('should set zoom to exactly 1.0 (100%)', () => {
      const canvas = canvasManager.getCanvas();

      // Set different zoom
      canvas.setZoom(2.5);

      // Trigger Cmd+1
      hotkeys.trigger('cmd+1');

      expect(canvas.getZoom()).toBe(1.0);
    });

    it('should preserve pan position when zooming to 100%', () => {
      const canvas = canvasManager.getCanvas();

      // Set zoom and pan
      canvas.setZoom(3);
      canvas.absolutePan({ x: 100, y: 50 });

      const panXBefore = canvas.viewportTransform[4];
      const panYBefore = canvas.viewportTransform[5];

      // Trigger Cmd+1
      hotkeys.trigger('cmd+1');

      // Zoom changes, but pan should remain
      expect(canvas.getZoom()).toBe(1.0);
      expect(canvas.viewportTransform[4]).toBe(panXBefore);
      expect(canvas.viewportTransform[5]).toBe(panYBefore);
    });

    it('should sync zoom to Zustand store', () => {
      const canvas = canvasManager.getCanvas();
      canvas.setZoom(0.5);

      hotkeys.trigger('cmd+1');

      const viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(1.0);
    });

    it('should work with Ctrl+1', () => {
      const canvas = canvasManager.getCanvas();
      canvas.setZoom(4);

      hotkeys.trigger('ctrl+1');

      expect(canvas.getZoom()).toBe(1.0);
    });
  });

  describe('Cmd+2: Zoom to 200%', () => {
    it('should set zoom to exactly 2.0 (200%)', () => {
      const canvas = canvasManager.getCanvas();

      // Set different zoom
      canvas.setZoom(0.5);

      // Trigger Cmd+2
      hotkeys.trigger('cmd+2');

      expect(canvas.getZoom()).toBe(2.0);
    });

    it('should preserve pan position when zooming to 200%', () => {
      const canvas = canvasManager.getCanvas();

      canvas.setZoom(1);
      canvas.absolutePan({ x: 75, y: 125 });

      const panXBefore = canvas.viewportTransform[4];
      const panYBefore = canvas.viewportTransform[5];

      hotkeys.trigger('cmd+2');

      expect(canvas.getZoom()).toBe(2.0);
      expect(canvas.viewportTransform[4]).toBe(panXBefore);
      expect(canvas.viewportTransform[5]).toBe(panYBefore);
    });

    it('should sync zoom to Zustand store', () => {
      const canvas = canvasManager.getCanvas();
      canvas.setZoom(1);

      hotkeys.trigger('cmd+2');

      const viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(2.0);
    });

    it('should work with Ctrl+2', () => {
      const canvas = canvasManager.getCanvas();
      canvas.setZoom(1);

      hotkeys.trigger('ctrl+2');

      expect(canvas.getZoom()).toBe(2.0);
    });
  });

  describe('Cmd+9: Zoom to Selection', () => {
    it('should zoom to fit single selected object', () => {
      const canvas = canvasManager.getCanvas();

      // Create and select object
      const rect = {
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

      canvas.add(rect as any);
      canvas.setActiveObject(rect as any);

      // Trigger Cmd+9
      hotkeys.trigger('cmd+9');

      // Should zoom to fit the object
      const zoom = canvas.getZoom();
      expect(zoom).toBeGreaterThan(0);
      expect(zoom).toBeLessThanOrEqual(20);
    });

    it('should zoom to fit multiple selected objects', () => {
      const canvas = canvasManager.getCanvas();

      // Create multiple objects
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

      canvas.add(rect1 as any, rect2 as any);
      canvas.setActiveObject(rect1 as any);

      // Mock getActiveObjects to return both
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue([rect1, rect2] as any);

      // Trigger Cmd+9
      hotkeys.trigger('cmd+9');

      // Should zoom to fit both objects
      const zoom = canvas.getZoom();
      expect(zoom).toBeGreaterThan(0);
    });

    it('should do nothing if no objects selected', () => {
      const canvas = canvasManager.getCanvas();

      const zoomBefore = canvas.getZoom();
      const panXBefore = canvas.viewportTransform[4];
      const panYBefore = canvas.viewportTransform[5];

      // Trigger Cmd+9 with no selection
      hotkeys.trigger('cmd+9');

      // Should not change viewport
      expect(canvas.getZoom()).toBe(zoomBefore);
      expect(canvas.viewportTransform[4]).toBe(panXBefore);
      expect(canvas.viewportTransform[5]).toBe(panYBefore);
    });

    it('should center selection in viewport', () => {
      const canvas = canvasManager.getCanvas();

      // Create centered object
      const rect = {
        type: 'rect',
        left: 350,
        top: 250,
        width: 100,
        height: 100,
        getBoundingRect: () => ({
          left: 350,
          top: 250,
          width: 100,
          height: 100,
        }),
      };

      canvas.add(rect as any);
      canvas.setActiveObject(rect as any);

      hotkeys.trigger('cmd+9');

      // Object center (400, 300) should be near viewport center (400, 300)
      const zoom = canvas.getZoom();
      const panX = canvas.viewportTransform[4];
      const panY = canvas.viewportTransform[5];

      // Calculate object center in viewport coordinates
      const objectCenterViewportX = 400 * zoom + panX;
      const objectCenterViewportY = 300 * zoom + panY;

      // Should be near canvas center (400, 300)
      expect(Math.abs(objectCenterViewportX - 400)).toBeLessThan(50);
      expect(Math.abs(objectCenterViewportY - 300)).toBeLessThan(50);
    });

    it('should sync viewport to Zustand after zoom-to-selection', () => {
      const canvas = canvasManager.getCanvas();

      const rect = {
        type: 'rect',
        left: 100,
        top: 100,
        width: 200,
        height: 200,
        getBoundingRect: () => ({
          left: 100,
          top: 100,
          width: 200,
          height: 200,
        }),
      };

      canvas.add(rect as any);
      canvas.setActiveObject(rect as any);

      hotkeys.trigger('cmd+9');

      const viewport = usePaperboxStore.getState().viewport;
      expect(viewport.zoom).toBe(canvas.getZoom());
      expect(viewport.panX).toBe(canvas.viewportTransform[4]);
      expect(viewport.panY).toBe(canvas.viewportTransform[5]);
    });

    it('should work with Ctrl+9', () => {
      const canvas = canvasManager.getCanvas();

      const rect = {
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

      canvas.add(rect as any);
      canvas.setActiveObject(rect as any);

      // Mock getActiveObjects for Ctrl+9
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue([rect] as any);

      const zoomBefore = canvas.getZoom();

      hotkeys.trigger('ctrl+9');

      expect(canvas.getZoom()).not.toBe(zoomBefore);
    });
  });

  describe('Lifecycle', () => {
    it('should register all shortcuts on initialize', () => {
      // Shortcuts already initialized in beforeEach
      // Trigger each shortcut to verify registration

      const canvas = canvasManager.getCanvas();
      canvas.setZoom(3);

      hotkeys.trigger('cmd+0');
      expect(canvas.getZoom()).toBe(1);

      hotkeys.trigger('cmd+1');
      expect(canvas.getZoom()).toBe(1);

      hotkeys.trigger('cmd+2');
      expect(canvas.getZoom()).toBe(2);
    });

    it('should unbind all shortcuts on dispose', () => {
      const canvas = canvasManager.getCanvas();

      // Dispose shortcuts
      shortcuts.dispose();

      // Set non-default viewport
      canvas.setZoom(5);

      // Shortcuts should not work after dispose
      hotkeys.trigger('cmd+0');

      // Zoom should remain unchanged
      expect(canvas.getZoom()).toBe(5);
    });

    it('should handle multiple initialize/dispose cycles', () => {
      const canvas = canvasManager.getCanvas();

      // Dispose and re-initialize
      shortcuts.dispose();
      shortcuts.initialize();

      canvas.setZoom(3);

      // Should work after re-initialization
      hotkeys.trigger('cmd+0');
      expect(canvas.getZoom()).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle shortcuts when canvas not available', () => {
      // Dispose canvas but keep shortcuts
      canvasManager.dispose();

      // Should not throw when canvas is null
      expect(() => {
        hotkeys.trigger('cmd+0');
        hotkeys.trigger('cmd+1');
        hotkeys.trigger('cmd+2');
        hotkeys.trigger('cmd+9');
      }).not.toThrow();
    });

    it('should handle shortcuts during canvas initialization', () => {
      // Create new manager without canvas
      const newManager = new FabricCanvasManager();
      const newShortcuts = new NavigationShortcuts({ canvasManager: newManager });
      newShortcuts.initialize();

      // Should not throw
      expect(() => {
        hotkeys.trigger('cmd+0');
      }).not.toThrow();

      newShortcuts.dispose();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zoom to selection with very small objects', () => {
      const canvas = canvasManager.getCanvas();

      // Tiny object (1px x 1px)
      const tiny = {
        type: 'rect',
        left: 400,
        top: 300,
        width: 1,
        height: 1,
        getBoundingRect: () => ({
          left: 400,
          top: 300,
          width: 1,
          height: 1,
        }),
      };

      canvas.add(tiny as any);
      canvas.setActiveObject(tiny as any);

      // Mock getActiveObjects to return tiny object
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue([tiny] as any);

      hotkeys.trigger('cmd+9');

      // Should zoom in significantly
      const zoom = canvas.getZoom();
      expect(zoom).toBeGreaterThan(10);
    });

    it('should handle zoom to selection with very large objects', () => {
      const canvas = canvasManager.getCanvas();

      // Very large object
      const large = {
        type: 'rect',
        left: 0,
        top: 0,
        width: 8000,
        height: 8000,
        getBoundingRect: () => ({
          left: 0,
          top: 0,
          width: 8000,
          height: 8000,
        }),
      };

      canvas.add(large as any);
      canvas.setActiveObject(large as any);

      // Mock getActiveObjects to return large object
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue([large] as any);

      hotkeys.trigger('cmd+9');

      // Should zoom out significantly
      const zoom = canvas.getZoom();
      expect(zoom).toBeLessThan(0.5);
      expect(zoom).toBeGreaterThan(0);
    });

    it('should handle rapid shortcut triggering', () => {
      const canvas = canvasManager.getCanvas();

      // Rapid key presses
      for (let i = 0; i < 50; i++) {
        hotkeys.trigger('cmd+1');
        hotkeys.trigger('cmd+2');
        hotkeys.trigger('cmd+0');
      }

      // Should still work correctly
      expect(canvas.getZoom()).toBe(1);
    });
  });
});
