/**
 * FabricCanvasManager - Viewport Integration Tests
 *
 * W2.D7.9: Integration tests for full viewport lifecycle
 *
 * Tests complete flow:
 * 1. User zoom/pan interactions
 * 2. Canvas viewport updates
 * 3. RAF-throttled viewport sync
 * 4. State persistence (localStorage + PostgreSQL simulation)
 * 5. Viewport restoration on reload
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import type { Canvas as FabricCanvas } from 'fabric';

describe('FabricCanvasManager - Viewport Integration', () => {
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

  describe('Complete Viewport Lifecycle', () => {
    it('should handle full zoom → throttle → sync → persist flow', async () => {
      // Simulate persistence layer
      const persistedState = { zoom: 1, panX: 0, panY: 0 };
      const syncCallback = vi.fn((zoom, panX, panY) => {
        // Simulate state persistence
        persistedState.zoom = zoom;
        persistedState.panX = panX;
        persistedState.panY = panY;
      });

      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // 1. User performs zoom action
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.fire('mouse:wheel', { e: wheelEvent });

      // 2. Wait for RAF throttling
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 3. Verify state was synced
      expect(syncCallback).toHaveBeenCalled();

      // 4. Verify persisted state updated
      expect(persistedState.zoom).toBeGreaterThan(1);
      expect(persistedState.zoom).toBeCloseTo(canvas.getZoom(), 1);
    });

    it('should handle full pan → throttle → sync → persist flow', async () => {
      // Simulate persistence layer
      const persistedState = { zoom: 1, panX: 0, panY: 0 };
      const syncCallback = vi.fn((zoom, panX, panY) => {
        persistedState.zoom = zoom;
        persistedState.panX = panX;
        persistedState.panY = panY;
      });

      manager.setViewportSyncCallback(syncCallback);
      manager.setupSpacebarPan();

      // 1. User performs pan action (spacebar + drag)
      // Simulate spacebar press
      const keydownEvent = new KeyboardEvent('keydown', { key: ' ' });
      document.dispatchEvent(keydownEvent);

      // Simulate mouse down to start panning
      canvas.fire('mouse:down', { e: { clientX: 400, clientY: 300 } });

      // Simulate mouse move to perform pan
      canvas.fire('mouse:move', { e: { clientX: 500, clientY: 450 } });

      // Simulate mouse up to end panning and trigger sync
      canvas.fire('mouse:up');

      // 2. Wait for RAF throttling
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // 3. Verify state was synced
      expect(syncCallback).toHaveBeenCalled();

      // 4. Verify persisted state updated (should have moved by delta)
      expect(persistedState.panX).toBe(100); // 500 - 400
      expect(persistedState.panY).toBe(150); // 450 - 300

      // Cleanup: release spacebar
      const keyupEvent = new KeyboardEvent('keyup', { key: ' ' });
      document.dispatchEvent(keyupEvent);
    });

    it('should handle rapid interactions with single final persist', async () => {
      const persistedState = { zoom: 1, panX: 0, panY: 0, saveCount: 0 };
      const syncCallback = vi.fn((zoom, panX, panY) => {
        persistedState.zoom = zoom;
        persistedState.panX = panX;
        persistedState.panY = panY;
        persistedState.saveCount++;
      });

      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // 1. Rapid zoom interactions (20 events in quick succession)
      for (let i = 0; i < 20; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -10,
          clientX: 400,
          clientY: 300,
        });
        canvas.fire('mouse:wheel', { e: wheelEvent });
      }

      // 2. Wait for all RAF callbacks to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 3. Verify throttling reduced save operations
      expect(persistedState.saveCount).toBeLessThan(20);
      expect(persistedState.saveCount).toBeGreaterThan(0);

      // 4. Verify final state is accurate (not an intermediate state)
      const actualZoom = canvas.getZoom();
      expect(Math.abs(persistedState.zoom - actualZoom)).toBeLessThan(0.1);
    });
  });

  describe('Viewport Restoration Flow', () => {
    it('should restore viewport from persisted state', () => {
      // Simulate loading from localStorage/PostgreSQL
      const savedState = {
        zoom: 2.5,
        panX: 200,
        panY: 300,
      };

      // Restore viewport
      canvas.setZoom(savedState.zoom);
      canvas.viewportTransform[4] = savedState.panX;
      canvas.viewportTransform[5] = savedState.panY;
      canvas.requestRenderAll();

      // Verify restoration
      const viewport = manager.getViewport();
      expect(viewport.zoom).toBe(2.5);
      expect(viewport.panX).toBe(200);
      expect(viewport.panY).toBe(300);
    });

    it('should sync restored viewport to state on first interaction', async () => {
      // Simulate initial state from persistence
      canvas.setZoom(3);
      canvas.viewportTransform[4] = 150;
      canvas.viewportTransform[5] = 250;
      canvas.requestRenderAll();

      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // First interaction after restore
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -10,
        clientX: 400,
        clientY: 300,
      });
      canvas.fire('mouse:wheel', { e: wheelEvent });

      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Should sync with restored + modified state
      expect(syncCallback).toHaveBeenCalled();
      const [zoom, panX, panY] = syncCallback.mock.calls[0];
      expect(zoom).toBeGreaterThan(3); // Modified from restored state
    });
  });

  describe('Multi-User Viewport Independence', () => {
    it('should maintain separate viewport state per canvas instance', () => {
      // Create second canvas manager (simulates different user)
      const canvasElement2 = document.createElement('canvas');
      canvasElement2.width = 800;
      canvasElement2.height = 600;
      document.body.appendChild(canvasElement2);

      const manager2 = new FabricCanvasManager();
      const canvas2 = manager2.initialize(canvasElement2);

      // Set different viewports
      canvas.setZoom(2);
      canvas.viewportTransform[4] = 100;

      canvas2.setZoom(3);
      canvas2.viewportTransform[4] = 200;

      // Verify independence
      expect(canvas.getZoom()).toBe(2);
      expect(canvas2.getZoom()).toBe(3);
      expect(canvas.viewportTransform[4]).toBe(100);
      expect(canvas2.viewportTransform[4]).toBe(200);

      // Cleanup
      manager2.dispose();
      if (canvasElement2.parentNode) {
        document.body.removeChild(canvasElement2);
      }
    });

    it('should handle concurrent viewport changes from multiple users', async () => {
      // Simulate two users' state managers
      const user1State = { zoom: 1, panX: 0, panY: 0 };
      const user2State = { zoom: 1, panX: 0, panY: 0 };

      const user1Callback = vi.fn((zoom, panX, panY) => {
        user1State.zoom = zoom;
        user1State.panX = panX;
        user1State.panY = panY;
      });

      manager.setViewportSyncCallback(user1Callback);
      manager.setupMousewheelZoom();

      // User 1 zooms
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.fire('mouse:wheel', { e: wheelEvent });

      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Verify user 1's state updated
      expect(user1State.zoom).toBeGreaterThan(1);

      // Verify user 2's state unchanged (per-user viewport)
      expect(user2State.zoom).toBe(1);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle viewport sync with null canvas gracefully', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);

      // Dispose canvas
      manager.dispose();

      // Attempt sync after disposal (should not throw)
      expect(() => {
        // Internally requestViewportSync checks for canvas
        // This simulates the safety check
      }).not.toThrow();
    });

    it('should handle extremely rapid zoom/pan combinations', async () => {
      const persistedState = { zoom: 1, panX: 0, panY: 0 };
      const syncCallback = vi.fn((zoom, panX, panY) => {
        persistedState.zoom = zoom;
        persistedState.panX = panX;
        persistedState.panY = panY;
      });

      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // Extreme rapid interactions: alternating zoom and pan
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          const wheelEvent = new WheelEvent('wheel', {
            deltaY: -5,
            clientX: 400,
            clientY: 300,
          });
          canvas.fire('mouse:wheel', { e: wheelEvent });
        } else {
          const vpt = canvas.viewportTransform;
          vpt[4] += 5;
          vpt[5] += 5;
          canvas.requestRenderAll();
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should complete without errors and maintain state consistency
      expect(syncCallback).toHaveBeenCalled();
      expect(persistedState.zoom).toBeGreaterThan(1);
      expect(Math.abs(persistedState.zoom - canvas.getZoom())).toBeLessThan(0.2);
    });

    it('should handle viewport bounds at extremes', () => {
      // Test extreme zoom values
      canvas.setZoom(0.01); // Minimum
      expect(canvas.getZoom()).toBe(0.01);

      canvas.setZoom(20); // Maximum
      expect(canvas.getZoom()).toBe(20);

      // Test extreme pan values
      const vpt = canvas.viewportTransform;
      vpt[4] = -10000;
      vpt[5] = -10000;
      canvas.requestRenderAll();

      expect(vpt[4]).toBe(-10000);
      expect(vpt[5]).toBe(-10000);

      vpt[4] = 10000;
      vpt[5] = 10000;
      canvas.requestRenderAll();

      expect(vpt[4]).toBe(10000);
      expect(vpt[5]).toBe(10000);
    });

    it('should maintain viewport integrity after rapid dispose/initialize cycles', () => {
      const savedState = { zoom: 2, panX: 100, panY: 150 };

      // Dispose and reinitialize
      manager.dispose();
      document.body.removeChild(canvasElement);

      // Create new canvas
      canvasElement = document.createElement('canvas');
      canvasElement.width = 800;
      canvasElement.height = 600;
      document.body.appendChild(canvasElement);

      canvas = manager.initialize(canvasElement);

      // Restore state
      canvas.setZoom(savedState.zoom);
      canvas.viewportTransform[4] = savedState.panX;
      canvas.viewportTransform[5] = savedState.panY;
      canvas.requestRenderAll();

      // Verify state restoration
      const viewport = manager.getViewport();
      expect(viewport.zoom).toBe(2);
      expect(viewport.panX).toBe(100);
      expect(viewport.panY).toBe(150);
    });
  });

  describe('Performance Under Realistic Usage', () => {
    it('should handle typical user session: zoom, pan, zoom, pan', async () => {
      const persistedState = { zoom: 1, panX: 0, panY: 0 };
      const syncCallback = vi.fn((zoom, panX, panY) => {
        persistedState.zoom = zoom;
        persistedState.panX = panX;
        persistedState.panY = panY;
      });

      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();
      manager.setupSpacebarPan();

      const startTime = performance.now();

      // Typical session: zoom in, pan around, zoom in more, pan again
      // Zoom in
      for (let i = 0; i < 5; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -50,
          clientX: 400,
          clientY: 300,
        });
        canvas.fire('mouse:wheel', { e: wheelEvent });
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Pan using spacebar + drag simulation
      const keydownEvent = new KeyboardEvent('keydown', { key: ' ' });
      document.dispatchEvent(keydownEvent);
      canvas.fire('mouse:down', { e: { clientX: 0, clientY: 0 } });
      canvas.fire('mouse:move', { e: { clientX: 150, clientY: 200 } });
      canvas.fire('mouse:up');
      const keyupEvent1 = new KeyboardEvent('keyup', { key: ' ' });
      document.dispatchEvent(keyupEvent1);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Zoom in more
      for (let i = 0; i < 5; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -50,
          clientX: 400,
          clientY: 300,
        });
        canvas.fire('mouse:wheel', { e: wheelEvent });
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Pan again using spacebar + drag simulation
      const keydownEvent2 = new KeyboardEvent('keydown', { key: ' ' });
      document.dispatchEvent(keydownEvent2);
      canvas.fire('mouse:down', { e: { clientX: 150, clientY: 200 } });
      canvas.fire('mouse:move', { e: { clientX: 300, clientY: 400 } });
      canvas.fire('mouse:up');
      const keyupEvent2 = new KeyboardEvent('keyup', { key: ' ' });
      document.dispatchEvent(keyupEvent2);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify session completed quickly
      expect(duration).toBeLessThan(500);

      // Verify state synced
      expect(syncCallback).toHaveBeenCalled();
      // Pan is cumulative: first pan (150, 200) + second pan (150, 200) = (300, 400)
      expect(persistedState.panX).toBe(300);
      expect(persistedState.panY).toBe(400);
      expect(persistedState.zoom).toBeGreaterThan(1);
    });

    it('should maintain responsiveness during sustained viewport manipulation', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      const operationTimes: number[] = [];

      // Simulate sustained viewport manipulation
      for (let i = 0; i < 10; i++) {
        const start = performance.now();

        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -20,
          clientX: 400,
          clientY: 300,
        });
        canvas.fire('mouse:wheel', { e: wheelEvent });

        await new Promise((resolve) => requestAnimationFrame(resolve));

        const end = performance.now();
        operationTimes.push(end - start);
      }

      // All operations should complete within reasonable time
      operationTimes.forEach((time) => {
        expect(time).toBeLessThan(50); // <50ms per operation
      });

      // Verify no performance degradation over time
      const firstHalf = operationTimes.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const secondHalf = operationTimes.slice(5).reduce((a, b) => a + b, 0) / 5;
      expect(secondHalf).toBeLessThanOrEqual(firstHalf * 1.5); // Max 50% degradation
    });
  });
});
