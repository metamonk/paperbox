/**
 * FabricCanvasManager - Pixel Grid Tests
 *
 * W2.D8.4: RED phase - Tests for pixel grid visualization feature
 *
 * Tests:
 * - Pixel grid hidden at zoom levels <= 8x
 * - Pixel grid visible at zoom levels > 8x
 * - Grid scale adjusts with zoom level
 * - Grid styling (color, opacity) is correct
 * - Performance: grid updates don't block rendering
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';

describe('FabricCanvasManager - Pixel Grid', () => {
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
  });

  afterEach(() => {
    canvasManager.dispose();
    if (canvasElement.parentNode) {
      document.body.removeChild(canvasElement);
    }
  });

  describe('Grid Visibility Thresholds', () => {
    it('should NOT show pixel grid at 1x zoom (default)', () => {
      const canvas = canvasManager.getCanvas();

      // Setup pixel grid
      canvasManager.setupPixelGrid();

      // Default zoom is 1x - grid should be hidden
      expect(canvas.getZoom()).toBe(1);
      expect(canvasManager.isPixelGridVisible()).toBe(false);
    });

    it('should NOT show pixel grid at 4x zoom', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();
      canvas.setZoom(4);

      // Below threshold - grid should still be hidden
      expect(canvasManager.isPixelGridVisible()).toBe(false);
    });

    it('should NOT show pixel grid at exactly 8x zoom (threshold)', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();
      canvas.setZoom(8);

      // At threshold - grid should still be hidden
      expect(canvasManager.isPixelGridVisible()).toBe(false);
    });

    it('should show pixel grid at 8.1x zoom (just above threshold)', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();
      canvas.setZoom(8.1);

      // Above threshold - grid should be visible
      expect(canvasManager.isPixelGridVisible()).toBe(true);
    });

    it('should show pixel grid at 10x zoom', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();
      canvas.setZoom(10);

      expect(canvasManager.isPixelGridVisible()).toBe(true);
    });

    it('should show pixel grid at 20x zoom (maximum zoom)', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();
      canvas.setZoom(20);

      expect(canvasManager.isPixelGridVisible()).toBe(true);
    });
  });

  describe('Grid Toggle on Zoom Changes', () => {
    it('should hide grid when zooming from 10x to 5x', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();

      // Start above threshold
      canvas.setZoom(10);
      expect(canvasManager.isPixelGridVisible()).toBe(true);

      // Zoom out below threshold
      canvas.setZoom(5);
      expect(canvasManager.isPixelGridVisible()).toBe(false);
    });

    it('should show grid when zooming from 5x to 10x', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();

      // Start below threshold
      canvas.setZoom(5);
      expect(canvasManager.isPixelGridVisible()).toBe(false);

      // Zoom in above threshold
      canvas.setZoom(10);
      expect(canvasManager.isPixelGridVisible()).toBe(true);
    });

    it('should toggle grid correctly during mousewheel zoom', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();
      canvasManager.setupMousewheelZoom();

      // Simulate zoom from 1x to 12x
      canvas.setZoom(12);
      canvas.fire('mouse:wheel', { e: { deltaY: 0, offsetX: 400, offsetY: 300, preventDefault: () => {}, stopPropagation: () => {} } });

      expect(canvasManager.isPixelGridVisible()).toBe(true);
    });
  });

  describe('Grid Styling', () => {
    it('should use subtle gray color for grid lines', () => {
      canvasManager.setupPixelGrid();

      const gridStyle = canvasManager.getPixelGridStyle();

      // Grid should be light gray
      expect(gridStyle.stroke).toMatch(/#[dD][0-9a-fA-F]{5}|#[eE][0-9a-fA-F]{5}|rgba?\(.*\)/);
    });

    it('should use low opacity (0.3-0.6) for grid lines', () => {
      canvasManager.setupPixelGrid();

      const gridStyle = canvasManager.getPixelGridStyle();

      // Grid should have subtle opacity
      expect(gridStyle.opacity).toBeGreaterThanOrEqual(0.3);
      expect(gridStyle.opacity).toBeLessThanOrEqual(0.6);
    });

    it('should use thin lines (1px) for grid', () => {
      canvasManager.setupPixelGrid();

      const gridStyle = canvasManager.getPixelGridStyle();

      expect(gridStyle.strokeWidth).toBe(1);
    });
  });

  describe('Grid Scale with Zoom', () => {
    it('should adjust grid spacing based on zoom level', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();

      // At 10x zoom, grid spacing should represent 1 pixel
      canvas.setZoom(10);
      const spacing10x = canvasManager.getPixelGridSpacing();

      // At 20x zoom, grid spacing should be 2x larger
      canvas.setZoom(20);
      const spacing20x = canvasManager.getPixelGridSpacing();

      expect(spacing20x).toBe(spacing10x * 2);
    });

    it('should maintain 1:1 pixel grid ratio at all zoom levels > 8x', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();

      // Test multiple zoom levels
      const zoomLevels = [9, 10, 12, 15, 20];

      zoomLevels.forEach(zoom => {
        canvas.setZoom(zoom);
        const spacing = canvasManager.getPixelGridSpacing();

        // Spacing should equal zoom level (1 pixel * zoom = spacing)
        expect(spacing).toBe(zoom);
      });
    });
  });

  describe('Performance', () => {
    it('should not block canvas rendering when showing grid', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();
      canvas.setZoom(10);

      const start = performance.now();

      // Add 50 objects while grid is visible
      for (let i = 0; i < 50; i++) {
        canvas.add({
          type: 'rect',
          left: i * 20,
          top: i * 20,
          width: 50,
          height: 50,
          fill: 'blue'
        } as any);
      }

      canvas.requestRenderAll();
      const duration = performance.now() - start;

      // Should complete in reasonable time (<500ms)
      expect(duration).toBeLessThan(500);
    });

    it('should not impact zoom performance', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();
      canvasManager.setupMousewheelZoom();

      // Add objects to canvas
      for (let i = 0; i < 20; i++) {
        canvas.add({
          type: 'rect',
          left: i * 30,
          top: i * 30,
          width: 40,
          height: 40,
          fill: 'red'
        } as any);
      }

      const start = performance.now();

      // Simulate 10 zoom operations
      for (let i = 0; i < 10; i++) {
        canvas.setZoom(8 + i * 0.5);
        canvas.requestRenderAll();
      }

      const duration = performance.now() - start;

      // 10 zoom operations should complete quickly (<100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Lifecycle', () => {
    it('should initialize pixel grid on setupPixelGrid()', () => {
      canvasManager.setupPixelGrid();

      // Grid system should be initialized
      expect(canvasManager.isPixelGridInitialized()).toBe(true);
    });

    it('should clean up pixel grid on dispose()', () => {
      canvasManager.setupPixelGrid();

      expect(canvasManager.isPixelGridInitialized()).toBe(true);

      canvasManager.dispose();

      // Grid should be cleaned up
      expect(canvasManager.isPixelGridInitialized()).toBe(false);
    });

    it('should handle multiple setupPixelGrid() calls gracefully', () => {
      // Should not throw or create duplicate grids
      expect(() => {
        canvasManager.setupPixelGrid();
        canvasManager.setupPixelGrid();
        canvasManager.setupPixelGrid();
      }).not.toThrow();

      expect(canvasManager.isPixelGridInitialized()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zoom level exactly at threshold boundary', () => {
      const canvas = canvasManager.getCanvas();

      canvasManager.setupPixelGrid();

      // Test boundary conditions
      canvas.setZoom(7.9999);
      expect(canvasManager.isPixelGridVisible()).toBe(false);

      canvas.setZoom(8.0000);
      expect(canvasManager.isPixelGridVisible()).toBe(false);

      canvas.setZoom(8.0001);
      expect(canvasManager.isPixelGridVisible()).toBe(true);
    });

    it('should work when canvas is very small', () => {
      // Create tiny canvas
      const tinyCanvas = document.createElement('canvas');
      tinyCanvas.width = 100;
      tinyCanvas.height = 100;
      document.body.appendChild(tinyCanvas);

      const tinyManager = new FabricCanvasManager();
      tinyManager.initialize(tinyCanvas);
      tinyManager.setupPixelGrid();

      const canvas = tinyManager.getCanvas();
      canvas.setZoom(10);

      expect(tinyManager.isPixelGridVisible()).toBe(true);

      tinyManager.dispose();
      document.body.removeChild(tinyCanvas);
    });

    it('should work when canvas is very large', () => {
      // Create large canvas
      const largeCanvas = document.createElement('canvas');
      largeCanvas.width = 4000;
      largeCanvas.height = 3000;
      document.body.appendChild(largeCanvas);

      const largeManager = new FabricCanvasManager();
      largeManager.initialize(largeCanvas);
      largeManager.setupPixelGrid();

      const canvas = largeManager.getCanvas();
      canvas.setZoom(10);

      expect(largeManager.isPixelGridVisible()).toBe(true);

      largeManager.dispose();
      document.body.removeChild(largeCanvas);
    });
  });
});
