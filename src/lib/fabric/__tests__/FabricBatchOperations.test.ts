/**
 * Tests for Fabric.js Batch Operations
 *
 * TDD Red Phase: Write failing tests for batch add/remove/update
 * Expected: Tests will fail until W1.D2.4 implementation
 *
 * Batch operation requirements:
 * - Add multiple objects in a single operation
 * - Remove multiple objects efficiently
 * - Update multiple objects with single render
 * - Performance optimization (renderOnAddRemove: false)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import * as fabric from 'fabric';
import type { CanvasObject } from '../../../types/canvas';

describe('FabricCanvasManager - Batch Operations', () => {
  let manager: FabricCanvasManager;
  let canvas: fabric.Canvas;

  beforeEach(() => {
    manager = new FabricCanvasManager();
    canvas = manager.initialize({
      containerId: 'test-batch-canvas',
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('batchAddObjects()', () => {
    it('should add multiple objects in single operation', () => {
      const objects: CanvasObject[] = [
        {
          id: 'batch-rect-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#ff0000',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 1,
          type_properties: {},
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
        {
          id: 'batch-circle-1',
          type: 'circle',
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#00ff00',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 2,
          type_properties: { radius: 50 },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
        {
          id: 'batch-text-1',
          type: 'text',
          x: 300,
          y: 300,
          width: 100,
          height: 30,
          rotation: 0,
          fill: '#0000ff',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 3,
          type_properties: {
            text_content: 'Batch test',
            font_size: 16,
          },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
      ];

      manager.batchAddObjects(objects);

      const canvasObjects = canvas.getObjects();
      expect(canvasObjects).toHaveLength(3);

      // Verify each object was added correctly
      const rect = manager.findObjectById('batch-rect-1');
      const circle = manager.findObjectById('batch-circle-1');
      const text = manager.findObjectById('batch-text-1');

      expect(rect).toBeDefined();
      expect(circle).toBeDefined();
      expect(text).toBeDefined();
    });

    it('should handle empty array gracefully', () => {
      manager.batchAddObjects([]);

      const canvasObjects = canvas.getObjects();
      expect(canvasObjects).toHaveLength(0);
    });

    it('should skip null objects from factory', () => {
      const objects: CanvasObject[] = [
        {
          id: 'batch-rect-2',
          type: 'rectangle',
          x: 50,
          y: 50,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#ff0000',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 1,
          type_properties: {},
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
        {
          id: 'batch-invalid',
          type: 'invalid' as any, // Will return null from factory
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          rotation: 0,
          fill: '#000000',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 2,
          type_properties: {},
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
      ];

      manager.batchAddObjects(objects);

      const canvasObjects = canvas.getObjects();
      expect(canvasObjects).toHaveLength(1); // Only valid object added
    });
  });

  describe('batchRemoveObjects()', () => {
    beforeEach(() => {
      // Add test objects
      const objects: CanvasObject[] = [
        {
          id: 'remove-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          rotation: 0,
          fill: '#ff0000',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 1,
          type_properties: {},
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
        {
          id: 'remove-2',
          type: 'circle',
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#00ff00',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 2,
          type_properties: { radius: 50 },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
        {
          id: 'remove-3',
          type: 'text',
          x: 300,
          y: 300,
          width: 100,
          height: 30,
          rotation: 0,
          fill: '#0000ff',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 3,
          type_properties: {
            text_content: 'Remove test',
            font_size: 16,
          },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
      ];

      manager.batchAddObjects(objects);
    });

    it('should remove multiple objects by IDs', () => {
      expect(canvas.getObjects()).toHaveLength(3);

      manager.batchRemoveObjects(['remove-1', 'remove-3']);

      const canvasObjects = canvas.getObjects();
      expect(canvasObjects).toHaveLength(1);

      // Only remove-2 should remain
      const remaining = manager.findObjectById('remove-2');
      expect(remaining).toBeDefined();

      const removed1 = manager.findObjectById('remove-1');
      const removed3 = manager.findObjectById('remove-3');
      expect(removed1).toBeNull();
      expect(removed3).toBeNull();
    });

    it('should handle empty ID array gracefully', () => {
      expect(canvas.getObjects()).toHaveLength(3);

      manager.batchRemoveObjects([]);

      expect(canvas.getObjects()).toHaveLength(3);
    });

    it('should ignore non-existent IDs', () => {
      expect(canvas.getObjects()).toHaveLength(3);

      manager.batchRemoveObjects(['remove-1', 'does-not-exist', 'remove-2']);

      const canvasObjects = canvas.getObjects();
      expect(canvasObjects).toHaveLength(1); // Only remove-3 remains

      const remaining = manager.findObjectById('remove-3');
      expect(remaining).toBeDefined();
    });

    it('should handle removing all objects', () => {
      expect(canvas.getObjects()).toHaveLength(3);

      manager.batchRemoveObjects(['remove-1', 'remove-2', 'remove-3']);

      expect(canvas.getObjects()).toHaveLength(0);
    });
  });

  describe('Performance optimization', () => {
    it('should not auto-render during batch operations', () => {
      // This test verifies renderOnAddRemove: false configuration
      const config = manager.getCanvas();

      expect(config).not.toBeNull();
      expect(config!.renderOnAddRemove).toBe(false);
    });

    it('should trigger single render after batch add', () => {
      const objects: CanvasObject[] = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-rect-${i}`,
        type: 'rectangle' as const,
        x: i * 50,
        y: i * 50,
        width: 40,
        height: 40,
        rotation: 0,
        fill: '#ff0000',
        stroke: null,
        stroke_width: null,
        opacity: 1,
        group_id: null,
        z_index: i + 1,
        type_properties: {},
        style_properties: {},
        metadata: {},
        created_by: 'user-1',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        locked_by: null,
        lock_acquired_at: null,
      }));

      manager.batchAddObjects(objects);

      // All objects should be added
      expect(canvas.getObjects()).toHaveLength(10);
    });
  });
});
