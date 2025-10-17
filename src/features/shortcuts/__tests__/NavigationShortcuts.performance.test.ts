/**
 * NavigationShortcuts - Performance Benchmarks
 *
 * W2.D8.9: Performance benchmark with navigation shortcuts
 *
 * Baseline metrics for canvas with 500 objects:
 * - Pan performance: Smooth at 60fps (16.67ms per frame)
 * - Zoom performance: <16ms per operation
 * - Shortcut response time: <50ms
 * - Viewport sync overhead: <5ms
 * - Memory usage: <100MB
 *
 * Performance targets:
 * - Target: 60fps (16.67ms per frame)
 * - Acceptable: 30fps (33.33ms per frame)
 * - Warning: <30fps (>33.33ms per frame)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NavigationShortcuts } from '../NavigationShortcuts';
import { FabricCanvasManager } from '../../../lib/fabric/FabricCanvasManager';
import { usePaperboxStore } from '../../../stores';
import hotkeys from 'hotkeys-js';

describe('NavigationShortcuts - Performance Benchmarks', () => {
  let shortcuts: NavigationShortcuts;
  let canvasManager: FabricCanvasManager;
  let canvasElement: HTMLCanvasElement;

  beforeEach(() => {
    // Create canvas element
    canvasElement = document.createElement('canvas');
    canvasElement.width = 1920; // Full HD
    canvasElement.height = 1080;
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

  describe('Baseline Performance with 500 Objects', () => {
    it('should handle zoom shortcuts with 500 objects (<50ms)', () => {
      const canvas = canvasManager.getCanvas();

      // Create 500 objects in grid pattern
      const objects = [];
      for (let i = 0; i < 500; i++) {
        const row = Math.floor(i / 25); // 25 columns
        const col = i % 25;
        const rect = {
          type: 'rect',
          left: col * 80,
          top: row * 80,
          width: 60,
          height: 60,
          fill: `hsl(${(i * 7) % 360}, 70%, 50%)`,
          getBoundingRect: () => ({
            left: col * 80,
            top: row * 80,
            width: 60,
            height: 60,
          }),
        };
        objects.push(rect);
        canvas.add(rect as any);
      }

      expect(canvas.getObjects().length).toBe(500);

      // Measure Cmd+0 (Reset Viewport)
      const reset1Start = performance.now();
      hotkeys.trigger('cmd+0');
      const reset1End = performance.now();
      const reset1Duration = reset1End - reset1Start;

      // Measure Cmd+1 (Zoom 100%)
      const zoom100Start = performance.now();
      hotkeys.trigger('cmd+1');
      const zoom100End = performance.now();
      const zoom100Duration = zoom100End - zoom100Start;

      // Measure Cmd+2 (Zoom 200%)
      const zoom200Start = performance.now();
      hotkeys.trigger('cmd+2');
      const zoom200End = performance.now();
      const zoom200Duration = zoom200End - zoom200Start;

      // Measure Cmd+0 again (Reset from zoomed state)
      const reset2Start = performance.now();
      hotkeys.trigger('cmd+0');
      const reset2End = performance.now();
      const reset2Duration = reset2End - reset2Start;

      // Log performance metrics
      console.log('\n📊 Zoom Shortcuts Performance (500 objects):');
      console.log(`  Cmd+0 (Reset):      ${reset1Duration.toFixed(2)}ms`);
      console.log(`  Cmd+1 (100%):       ${zoom100Duration.toFixed(2)}ms`);
      console.log(`  Cmd+2 (200%):       ${zoom200Duration.toFixed(2)}ms`);
      console.log(`  Cmd+0 (Reset x2):   ${reset2Duration.toFixed(2)}ms`);
      console.log(`  Average:            ${((reset1Duration + zoom100Duration + zoom200Duration + reset2Duration) / 4).toFixed(2)}ms`);

      // Performance assertions: All operations should complete in <50ms
      expect(reset1Duration).toBeLessThan(50);
      expect(zoom100Duration).toBeLessThan(50);
      expect(zoom200Duration).toBeLessThan(50);
      expect(reset2Duration).toBeLessThan(50);
    });

    it('should handle zoom-to-selection with 500 objects (<100ms)', () => {
      const canvas = canvasManager.getCanvas();

      // Create 500 objects
      const objects = [];
      for (let i = 0; i < 500; i++) {
        const row = Math.floor(i / 25);
        const col = i % 25;
        const rect = {
          type: 'rect',
          left: col * 80,
          top: row * 80,
          width: 60,
          height: 60,
          getBoundingRect: () => ({
            left: col * 80,
            top: row * 80,
            width: 60,
            height: 60,
          }),
        };
        objects.push(rect);
        canvas.add(rect as any);
      }

      // Select 10 objects
      canvas.setActiveObject(objects[0] as any);
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue(objects.slice(0, 10) as any);

      // Measure Cmd+9 (Zoom to Selection)
      const start = performance.now();
      hotkeys.trigger('cmd+9');
      const end = performance.now();
      const duration = end - start;

      console.log('\n📊 Zoom to Selection Performance (500 objects, 10 selected):');
      console.log(`  Cmd+9 duration:     ${duration.toFixed(2)}ms`);
      console.log(`  Target:             <100ms`);
      console.log(`  Status:             ${duration < 100 ? '✅ PASS' : '❌ FAIL'}`);

      // Should complete in <100ms for bounds calculation + zoom + pan
      expect(duration).toBeLessThan(100);

      // Verify correctness
      const zoom = canvas.getZoom();
      expect(zoom).toBeGreaterThan(0);
      expect(zoom).toBeLessThan(20);
    });

    it('should handle rapid sequential shortcuts with 500 objects', () => {
      const canvas = canvasManager.getCanvas();

      // Create 500 objects
      const objects = [];
      for (let i = 0; i < 500; i++) {
        const row = Math.floor(i / 25);
        const col = i % 25;
        const rect = {
          type: 'rect',
          left: col * 80,
          top: row * 80,
          width: 60,
          height: 60,
          getBoundingRect: () => ({
            left: col * 80,
            top: row * 80,
            width: 60,
            height: 60,
          }),
        };
        objects.push(rect);
        canvas.add(rect as any);
      }

      canvas.setActiveObject(objects[0] as any);
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue(objects.slice(0, 10) as any);

      // Measure 100 rapid shortcut operations
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        hotkeys.trigger('cmd+1'); // 100%
        hotkeys.trigger('cmd+2'); // 200%
        hotkeys.trigger('cmd+9'); // Zoom to selection
        hotkeys.trigger('cmd+0'); // Reset
      }

      const end = performance.now();
      const totalDuration = end - start;
      const avgDuration = totalDuration / (iterations * 4); // 4 shortcuts per iteration

      console.log('\n📊 Rapid Sequential Shortcuts (500 objects, 100 iterations):');
      console.log(`  Total operations:   ${iterations * 4}`);
      console.log(`  Total duration:     ${totalDuration.toFixed(2)}ms`);
      console.log(`  Avg per operation:  ${avgDuration.toFixed(2)}ms`);
      console.log(`  Throughput:         ${((iterations * 4) / (totalDuration / 1000)).toFixed(0)} ops/sec`);
      console.log(`  Target:             <5ms avg per operation`);
      console.log(`  Status:             ${avgDuration < 5 ? '✅ PASS' : '⚠️ ACCEPTABLE'}`);

      // Average per operation should be <5ms (allows caching and optimization)
      expect(avgDuration).toBeLessThan(10); // Relaxed for CI environments
    });
  });

  describe('Pan Performance with 500 Objects', () => {
    it('should measure manual pan performance with 500 objects', () => {
      const canvas = canvasManager.getCanvas();

      // Create 500 objects
      for (let i = 0; i < 500; i++) {
        const row = Math.floor(i / 25);
        const col = i % 25;
        const rect = {
          type: 'rect',
          left: col * 80,
          top: row * 80,
          width: 60,
          height: 60,
          getBoundingRect: () => ({
            left: col * 80,
            top: row * 80,
            width: 60,
            height: 60,
          }),
        };
        canvas.add(rect as any);
      }

      // Simulate 60 pan operations (1 second at 60fps)
      const panOps = 60;
      const start = performance.now();

      for (let i = 0; i < panOps; i++) {
        const x = Math.sin(i * 0.1) * 100;
        const y = Math.cos(i * 0.1) * 100;
        canvas.absolutePan({ x, y });
        canvas.requestRenderAll();
      }

      const end = performance.now();
      const totalDuration = end - start;
      const avgPerFrame = totalDuration / panOps;
      const fps = 1000 / avgPerFrame;

      console.log('\n📊 Pan Performance (500 objects, 60 operations):');
      console.log(`  Total duration:     ${totalDuration.toFixed(2)}ms`);
      console.log(`  Avg per frame:      ${avgPerFrame.toFixed(2)}ms`);
      console.log(`  Simulated FPS:      ${fps.toFixed(1)} fps`);
      console.log(`  Target (60fps):     16.67ms per frame`);
      console.log(`  Target (30fps):     33.33ms per frame`);
      console.log(`  Status:             ${fps >= 60 ? '✅ PASS (60fps)' : fps >= 30 ? '⚠️ ACCEPTABLE (30fps)' : '❌ FAIL (<30fps)'}`);

      // Should achieve at least 30fps (33.33ms per frame)
      expect(avgPerFrame).toBeLessThan(33.33);
    });
  });

  describe('Viewport Sync Performance', () => {
    it('should measure viewport sync overhead with 500 objects', () => {
      const canvas = canvasManager.getCanvas();

      // Create 500 objects
      for (let i = 0; i < 500; i++) {
        const row = Math.floor(i / 25);
        const col = i % 25;
        const rect = {
          type: 'rect',
          left: col * 80,
          top: row * 80,
          width: 60,
          height: 60,
          getBoundingRect: () => ({
            left: col * 80,
            top: row * 80,
            width: 60,
            height: 60,
          }),
        };
        canvas.add(rect as any);
      }

      // Measure sync operations
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        canvas.setZoom(1 + (i % 10) * 0.1);
        usePaperboxStore.getState().syncViewport(
          canvas.getZoom(),
          canvas.viewportTransform[4],
          canvas.viewportTransform[5]
        );
      }

      const end = performance.now();
      const totalDuration = end - start;
      const avgPerSync = totalDuration / iterations;

      console.log('\n📊 Viewport Sync Overhead (500 objects, 1000 syncs):');
      console.log(`  Total duration:     ${totalDuration.toFixed(2)}ms`);
      console.log(`  Avg per sync:       ${avgPerSync.toFixed(3)}ms`);
      console.log(`  Target:             <5ms per sync`);
      console.log(`  Status:             ${avgPerSync < 5 ? '✅ PASS' : '⚠️ REVIEW'}`);

      // Sync should be very fast (<5ms)
      expect(avgPerSync).toBeLessThan(5);
    });
  });

  describe('Memory Usage', () => {
    it('should track memory usage with 500 objects and shortcuts', () => {
      const canvas = canvasManager.getCanvas();

      // Measure initial memory (if available)
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : null;

      // Create 500 objects
      const objects = [];
      for (let i = 0; i < 500; i++) {
        const row = Math.floor(i / 25);
        const col = i % 25;
        const rect = {
          type: 'rect',
          left: col * 80,
          top: row * 80,
          width: 60,
          height: 60,
          getBoundingRect: () => ({
            left: col * 80,
            top: row * 80,
            width: 60,
            height: 60,
          }),
        };
        objects.push(rect);
        canvas.add(rect as any);
      }

      canvas.setActiveObject(objects[0] as any);
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue(objects.slice(0, 10) as any);

      // Execute multiple shortcut operations
      for (let i = 0; i < 50; i++) {
        hotkeys.trigger('cmd+0');
        hotkeys.trigger('cmd+1');
        hotkeys.trigger('cmd+2');
        hotkeys.trigger('cmd+9');
      }

      // Measure final memory
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : null;

      if (initialMemory !== null && finalMemory !== null) {
        const memoryIncrease = finalMemory - initialMemory;
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

        console.log('\n📊 Memory Usage (500 objects + 200 shortcuts):');
        console.log(`  Initial heap:       ${(initialMemory / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`  Final heap:         ${(finalMemory / (1024 * 1024)).toFixed(2)}MB`);
        console.log(`  Increase:           ${memoryIncreaseMB.toFixed(2)}MB`);
        console.log(`  Target:             <100MB increase`);
        console.log(`  Status:             ${memoryIncreaseMB < 100 ? '✅ PASS' : '⚠️ REVIEW'}`);

        // Memory increase should be reasonable (<100MB)
        expect(memoryIncreaseMB).toBeLessThan(100);
      } else {
        console.log('\n📊 Memory Usage: performance.memory not available in test environment');
        // Skip assertion if memory API not available
        expect(true).toBe(true);
      }
    });
  });

  describe('Performance Summary', () => {
    it('should generate comprehensive performance report', () => {
      const canvas = canvasManager.getCanvas();

      // Create 500 objects
      const objects = [];
      for (let i = 0; i < 500; i++) {
        const row = Math.floor(i / 25);
        const col = i % 25;
        const rect = {
          type: 'rect',
          left: col * 80,
          top: row * 80,
          width: 60,
          height: 60,
          getBoundingRect: () => ({
            left: col * 80,
            top: row * 80,
            width: 60,
            height: 60,
          }),
        };
        objects.push(rect);
        canvas.add(rect as any);
      }

      canvas.setActiveObject(objects[0] as any);
      vi.spyOn(canvas, 'getActiveObjects').mockReturnValue(objects.slice(0, 10) as any);

      // Measure all operations
      const metrics = {
        cmd0: [] as number[],
        cmd1: [] as number[],
        cmd2: [] as number[],
        cmd9: [] as number[],
      };

      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        // Cmd+0
        let start = performance.now();
        hotkeys.trigger('cmd+0');
        metrics.cmd0.push(performance.now() - start);

        // Cmd+1
        start = performance.now();
        hotkeys.trigger('cmd+1');
        metrics.cmd1.push(performance.now() - start);

        // Cmd+2
        start = performance.now();
        hotkeys.trigger('cmd+2');
        metrics.cmd2.push(performance.now() - start);

        // Cmd+9
        start = performance.now();
        hotkeys.trigger('cmd+9');
        metrics.cmd9.push(performance.now() - start);
      }

      // Calculate statistics
      const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
      const min = (arr: number[]) => Math.min(...arr);
      const max = (arr: number[]) => Math.max(...arr);

      console.log('\n' + '='.repeat(60));
      console.log('📊 NAVIGATION SHORTCUTS PERFORMANCE REPORT');
      console.log('='.repeat(60));
      console.log('\n🎯 Test Configuration:');
      console.log(`  Canvas size:        1920x1080`);
      console.log(`  Objects on canvas:  500`);
      console.log(`  Test iterations:    ${iterations}`);
      console.log(`  Selected objects:   10`);
      console.log('\n⚡ Performance Metrics:');
      console.log(`  Cmd+0 (Reset):      avg=${avg(metrics.cmd0).toFixed(2)}ms  min=${min(metrics.cmd0).toFixed(2)}ms  max=${max(metrics.cmd0).toFixed(2)}ms`);
      console.log(`  Cmd+1 (100%):       avg=${avg(metrics.cmd1).toFixed(2)}ms  min=${min(metrics.cmd1).toFixed(2)}ms  max=${max(metrics.cmd1).toFixed(2)}ms`);
      console.log(`  Cmd+2 (200%):       avg=${avg(metrics.cmd2).toFixed(2)}ms  min=${min(metrics.cmd2).toFixed(2)}ms  max=${max(metrics.cmd2).toFixed(2)}ms`);
      console.log(`  Cmd+9 (Selection):  avg=${avg(metrics.cmd9).toFixed(2)}ms  min=${min(metrics.cmd9).toFixed(2)}ms  max=${max(metrics.cmd9).toFixed(2)}ms`);
      console.log('\n✅ Performance Targets:');
      console.log(`  Target (60fps):     <16.67ms per operation`);
      console.log(`  Acceptable (30fps): <33.33ms per operation`);
      console.log(`  Warning:            >33.33ms per operation`);
      console.log('\n📈 Overall Status:');
      console.log(`  All operations:     ${Math.max(avg(metrics.cmd0), avg(metrics.cmd1), avg(metrics.cmd2), avg(metrics.cmd9)) < 33.33 ? '✅ PASS' : '⚠️ REVIEW'}`);
      console.log('='.repeat(60) + '\n');

      // All operations should be <33.33ms avg (30fps minimum)
      expect(avg(metrics.cmd0)).toBeLessThan(33.33);
      expect(avg(metrics.cmd1)).toBeLessThan(33.33);
      expect(avg(metrics.cmd2)).toBeLessThan(33.33);
      expect(avg(metrics.cmd9)).toBeLessThan(33.33);
    });
  });
});
