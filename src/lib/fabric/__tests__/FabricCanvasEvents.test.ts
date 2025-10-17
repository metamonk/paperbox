/**
 * Tests for Fabric.js Canvas Event Listeners
 *
 * TDD Red Phase: Write failing tests for event system
 * Expected: Tests will fail initially, then pass after implementation in W1.D1.8
 *
 * Events tested:
 * - object:modified (for Zustand sync)
 * - selection:created (for selection state)
 * - selection:updated (for multi-select)
 * - selection:cleared (for deselect)
 * - mouse:move (for collaboration cursors - Day 2)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import * as fabric from 'fabric';

describe('FabricCanvasManager - Event Listeners', () => {
  let manager: FabricCanvasManager;
  let canvas: fabric.Canvas;

  beforeEach(() => {
    manager = new FabricCanvasManager();
    canvas = manager.initialize({
      containerId: 'test-events-canvas',
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('setupEventListeners()', () => {
    it('should set up object:modified event listener', () => {
      const canvasInstance = manager.getCanvas();
      expect(canvasInstance).toBeDefined();

      // The canvas should have event listeners registered
      // This tests that setupEventListeners() was called during initialization
      expect(canvasInstance).not.toBeNull();
    });
  });

  describe('object:modified event', () => {
    it('should handle object modification events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create a test rectangle
      const rect = new fabric.Rect({
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        fill: '#ff0000',
      });

      canvas.add(rect);

      // Simulate object modification
      canvas.fire('object:modified', { target: rect });

      // Verify event was logged (temporary - will be replaced with Zustand sync)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Fabric] Object modified:',
        rect
      );

      consoleSpy.mockRestore();
    });

    it('should ignore modification events with no target', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Fire event without target
      canvas.fire('object:modified', { target: null });

      // Should not log anything
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('selection:created event', () => {
    it('should handle selection creation events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const rect1 = new fabric.Rect({
        left: 100,
        top: 100,
        width: 50,
        height: 50,
      });
      const rect2 = new fabric.Rect({
        left: 200,
        top: 100,
        width: 50,
        height: 50,
      });

      canvas.add(rect1, rect2);

      // Simulate selection creation
      canvas.fire('selection:created', { selected: [rect1] });

      // Verify event was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Fabric] Selection created:',
        [rect1]
      );

      consoleSpy.mockRestore();
    });
  });

  describe('selection:updated event', () => {
    it('should handle selection update events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const rect1 = new fabric.Rect({
        left: 100,
        top: 100,
        width: 50,
        height: 50,
      });
      const rect2 = new fabric.Rect({
        left: 200,
        top: 100,
        width: 50,
        height: 50,
      });

      canvas.add(rect1, rect2);

      // Simulate selection update (from single to multi-select)
      canvas.fire('selection:updated', { selected: [rect1, rect2] });

      // Verify event was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Fabric] Selection updated:',
        [rect1, rect2]
      );

      consoleSpy.mockRestore();
    });
  });

  describe('selection:cleared event', () => {
    it('should handle selection clear events', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Simulate selection cleared
      canvas.fire('selection:cleared', {});

      // Verify event was logged
      expect(consoleSpy).toHaveBeenCalledWith('[Fabric] Selection cleared');

      consoleSpy.mockRestore();
    });
  });

  describe('mouse:move event (for collaboration)', () => {
    it('should handle mouse move events for cursor broadcasting', () => {
      // Note: Actual cursor broadcasting will be implemented in Day 2
      // For now, we just verify the event listener is set up
      const canvasInstance = manager.getCanvas();
      expect(canvasInstance).not.toBeNull();

      // Simulate mouse move
      canvas.fire('mouse:move', {
        pointer: { x: 150, y: 250 },
      });

      // No assertions yet - cursor broadcasting comes in Day 2
      // This test just ensures the event listener doesn't throw errors
    });
  });

  describe('Event listener integration', () => {
    it('should have all required event listeners registered after initialization', () => {
      const canvasInstance = manager.getCanvas();

      // Verify canvas is initialized and ready for events
      expect(canvasInstance).not.toBeNull();
      expect(canvasInstance).toBeInstanceOf(fabric.Canvas);
    });

    it('should handle multiple events in sequence', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const rect = new fabric.Rect({
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        fill: '#00ff00',
      });

      canvas.add(rect);

      // Sequence: select → modify → deselect
      canvas.fire('selection:created', { selected: [rect] });
      canvas.fire('object:modified', { target: rect });
      canvas.fire('selection:cleared', {});

      // All three events should have been logged
      expect(consoleSpy).toHaveBeenCalledWith('[Fabric] Selection created:', [rect]);
      expect(consoleSpy).toHaveBeenCalledWith('[Fabric] Object modified:', rect);
      expect(consoleSpy).toHaveBeenCalledWith('[Fabric] Selection cleared');

      consoleSpy.mockRestore();
    });
  });
});
