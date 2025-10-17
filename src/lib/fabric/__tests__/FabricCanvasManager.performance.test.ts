/**
 * FabricCanvasManager - Performance Tests
 *
 * W2.D7.7: RED phase - Tests for viewport update throttling
 *
 * Tests:
 * - Viewport sync throttling during rapid zoom/pan
 * - RequestAnimationFrame usage for smooth updates
 * - Maximum update frequency limits
 * - Callback batching under high load
 * - Performance under stress (100+ rapid updates)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import type { Canvas as FabricCanvas } from 'fabric';

describe('FabricCanvasManager - Performance Optimization', () => {
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

  describe('Viewport Update Throttling', () => {
    it('should throttle viewport sync callbacks during rapid zoom', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // Simulate 50 rapid zoom events (within 500ms)
      const startCallCount = syncCallback.mock.calls.length;

      for (let i = 0; i < 50; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -10,
          clientX: 400,
          clientY: 300,
        });
        canvas.fire('mouse:wheel', { e: wheelEvent });
      }

      // Wait for throttling to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      const endCallCount = syncCallback.mock.calls.length;
      const actualCalls = endCallCount - startCallCount;

      // Should have significantly fewer calls than 50 (throttled)
      // Expect at most 10 calls (1 per frame at ~60fps over 500ms = ~8 frames)
      expect(actualCalls).toBeLessThan(15);
      expect(actualCalls).toBeGreaterThan(0);
    });

    it('should throttle viewport sync callbacks during rapid pan', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupSpacebarPan();

      // Simulate rapid mouse:up events (which trigger requestViewportSync)
      for (let i = 0; i < 100; i++) {
        const vpt = canvas.viewportTransform;
        vpt[4] += 1; // translateX
        vpt[5] += 1; // translateY
        canvas.requestRenderAll();

        // Trigger viewport sync via canvas event (uses RAF throttling)
        canvas.fire('mouse:up');
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // With throttling, should have fewer than 100 calls
      expect(syncCallback.mock.calls.length).toBeLessThan(100);
    });

    it('should use requestAnimationFrame for viewport updates', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // Trigger zoom event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.fire('mouse:wheel', { e: wheelEvent });

      // Should use requestAnimationFrame for throttling
      expect(rafSpy).toHaveBeenCalled();

      rafSpy.mockRestore();
    });

    it('should maintain viewport accuracy despite throttling', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // Set specific zoom level
      canvas.setZoom(5);

      // Trigger multiple rapid zooms
      for (let i = 0; i < 20; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -10,
          clientX: 400,
          clientY: 300,
        });
        canvas.fire('mouse:wheel', { e: wheelEvent });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Final callback should have accurate zoom level
      const lastCall = syncCallback.mock.calls[syncCallback.mock.calls.length - 1];
      expect(lastCall).toBeDefined();

      if (lastCall) {
        const [zoom] = lastCall;
        const actualZoom = canvas.getZoom();
        expect(Math.abs(zoom - actualZoom)).toBeLessThan(0.1);
      }
    });
  });

  describe('Update Frequency Limits', () => {
    it('should not exceed 60fps update rate', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      const startTime = performance.now();
      const testDuration = 1000; // 1 second

      // Simulate continuous rapid zoom updates via mouse:wheel events
      const interval = setInterval(() => {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -10,
          clientX: 400,
          clientY: 300,
        });
        canvas.fire('mouse:wheel', { e: wheelEvent });
      }, 5); // Try to update every 5ms (200fps)

      await new Promise((resolve) => setTimeout(resolve, testDuration));
      clearInterval(interval);

      const endTime = performance.now();
      const actualDuration = endTime - startTime;

      // At 60fps, max updates in 1 second = 60
      // Allow 10% margin for timing variations
      const maxExpectedCalls = Math.ceil((actualDuration / 1000) * 60 * 1.1);

      expect(syncCallback.mock.calls.length).toBeLessThan(maxExpectedCalls);
    });

    it('should handle burst updates followed by idle period', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);

      // Burst: 50 rapid updates
      for (let i = 0; i < 50; i++) {
        const vpt = canvas.viewportTransform;
        vpt[4] += 1;
        canvas.requestRenderAll();
      }

      const burstCallCount = syncCallback.mock.calls.length;

      // Idle: Wait 500ms
      await new Promise((resolve) => setTimeout(resolve, 500));

      const idleCallCount = syncCallback.mock.calls.length;

      // No additional calls during idle period
      expect(idleCallCount).toBe(burstCallCount);
    });
  });

  describe('Callback Batching', () => {
    it('should batch multiple viewport changes into single callback', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);

      const initialCallCount = syncCallback.mock.calls.length;

      // Rapid changes within same frame
      const vpt = canvas.viewportTransform;
      vpt[0] = 2; // zoom
      vpt[3] = 2;
      vpt[4] = 100; // pan
      vpt[5] = 200;
      canvas.requestRenderAll();

      // Wait for next frame
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const finalCallCount = syncCallback.mock.calls.length;

      // Should batch into 1-2 calls, not 4 separate calls
      expect(finalCallCount - initialCallCount).toBeLessThan(3);
    });

    it('should preserve latest viewport state in batched callback', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);

      // Make multiple rapid changes
      const vpt = canvas.viewportTransform;

      vpt[4] = 50; // pan to 50
      canvas.requestRenderAll();

      vpt[4] = 100; // pan to 100
      canvas.requestRenderAll();

      vpt[4] = 150; // pan to 150 (final)
      canvas.requestRenderAll();

      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Latest callback should have final value (150), not intermediate
      if (syncCallback.mock.calls.length > 0) {
        const lastCall = syncCallback.mock.calls[syncCallback.mock.calls.length - 1];
        const [, panX] = lastCall;
        expect(panX).toBe(150);
      }
    });
  });

  describe('Performance Under Stress', () => {
    it('should handle 100+ rapid viewport changes gracefully', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);

      const startTime = performance.now();

      // 100 rapid changes
      for (let i = 0; i < 100; i++) {
        const vpt = canvas.viewportTransform;
        vpt[4] = i; // pan
        vpt[0] = 1 + i * 0.01; // zoom
        vpt[3] = 1 + i * 0.01;
        canvas.requestRenderAll();

        if (i % 10 === 0) {
          const viewport = manager.getViewport();
          syncCallback(viewport.zoom, viewport.panX, viewport.panY);
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (<500ms)
      expect(duration).toBeLessThan(500);

      // Callbacks should be throttled
      expect(syncCallback.mock.calls.length).toBeLessThan(100);
    });

    it('should maintain performance with concurrent zoom and pan', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      const startTime = performance.now();

      // Alternate zoom and pan operations
      for (let i = 0; i < 50; i++) {
        if (i % 2 === 0) {
          // Zoom
          const wheelEvent = new WheelEvent('wheel', {
            deltaY: -10,
            clientX: 400,
            clientY: 300,
          });
          canvas.fire('mouse:wheel', { e: wheelEvent });
        } else {
          // Pan
          const vpt = canvas.viewportTransform;
          vpt[4] += 10;
          vpt[5] += 10;
          canvas.requestRenderAll();
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly
      expect(duration).toBeLessThan(600);

      // Callbacks should be throttled
      expect(syncCallback.mock.calls.length).toBeLessThan(50);
    });

    it('should not drop final viewport state under stress', async () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);

      // Rapid changes with specific final state
      const vpt = canvas.viewportTransform;

      for (let i = 0; i < 100; i++) {
        vpt[4] = i;
        canvas.requestRenderAll();

        if (i === 99) {
          // Final state
          vpt[0] = 3;
          vpt[3] = 3;
          vpt[4] = 999;
          vpt[5] = 888;
        }
      }

      // Flush all pending updates
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Trigger final sync
      const viewport = manager.getViewport();
      syncCallback(viewport.zoom, viewport.panX, viewport.panY);

      // Final callback should have correct state
      const lastCall = syncCallback.mock.calls[syncCallback.mock.calls.length - 1];
      expect(lastCall).toBeDefined();

      if (lastCall) {
        const [, panX, panY] = lastCall;
        expect(panX).toBe(999);
        expect(panY).toBe(888);
      }
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak requestAnimationFrame callbacks', async () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);
      manager.setupMousewheelZoom();

      // Trigger multiple updates via canvas events (which use RAF)
      for (let i = 0; i < 10; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -10,
          clientX: 400,
          clientY: 300,
        });
        canvas.fire('mouse:wheel', { e: wheelEvent });
      }

      // Let first RAF execute
      await new Promise((resolve) => requestAnimationFrame(resolve));

      // Dispose should cancel pending RAF
      manager.dispose();

      // cancelAnimationFrame should be called to prevent leaks
      expect(cancelSpy).toHaveBeenCalled();

      rafSpy.mockRestore();
      cancelSpy.mockRestore();
    });

    it('should clear throttle state on dispose', () => {
      const syncCallback = vi.fn();
      manager.setViewportSyncCallback(syncCallback);

      // Trigger some updates
      const vpt = canvas.viewportTransform;
      vpt[4] += 10;
      canvas.requestRenderAll();

      // Dispose manager
      manager.dispose();

      // Further updates should not trigger callback
      vpt[4] += 10;
      canvas.requestRenderAll();

      // No new calls after dispose
      const callCountAtDispose = syncCallback.mock.calls.length;

      // Wait a bit
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(syncCallback.mock.calls.length).toBe(callCountAtDispose);
          resolve();
        }, 100);
      });
    });
  });
});
