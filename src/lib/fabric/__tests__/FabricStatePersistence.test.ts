/**
 * Tests for Fabric.js Canvas State Persistence
 *
 * TDD Red Phase: Write failing tests for saveState/loadState
 * Expected: Tests will fail until W1.D2.6 implementation
 *
 * State persistence requirements:
 * - Save canvas state to JSON
 * - Load canvas state from JSON
 * - Preserve all objects and properties
 * - Handle empty canvas gracefully
 * - Support state recovery after errors
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import * as fabric from 'fabric';
import type { CanvasObject } from '../../../types/canvas';

describe('FabricCanvasManager - State Persistence', () => {
  let manager: FabricCanvasManager;
  let canvas: fabric.Canvas;

  beforeEach(() => {
    manager = new FabricCanvasManager();
    canvas = manager.initialize({
      containerId: 'test-state-canvas',
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('saveState()', () => {
    it('should save empty canvas state', () => {
      const state = manager.saveState();

      expect(state).toBeDefined();
      expect(state.objects).toEqual([]);
      expect(state.backgroundColor).toBe('#ffffff');
      expect(state.width).toBe(800);
      expect(state.height).toBe(600);
    });

    it('should save canvas with multiple objects', () => {
      const objects: CanvasObject[] = [
        {
          id: 'state-rect-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 150,
          height: 75,
          rotation: 30,
          fill: '#ff0000',
          stroke: '#000000',
          stroke_width: 2,
          opacity: 0.8,
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
          id: 'state-circle-1',
          type: 'circle',
          x: 300,
          y: 300,
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
      ];

      manager.batchAddObjects(objects);

      const state = manager.saveState();

      expect(state.objects).toHaveLength(2);
      expect(state.objects[0].type).toBe('rectangle');
      expect(state.objects[1].type).toBe('circle');
    });

    it('should preserve object order in state', () => {
      const objects: CanvasObject[] = [
        {
          id: 'order-1',
          type: 'text',
          x: 100,
          y: 100,
          width: 100,
          height: 30,
          rotation: 0,
          fill: '#0000ff',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 1,
          type_properties: { text_content: 'First', font_size: 16 },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
        {
          id: 'order-2',
          type: 'text',
          x: 200,
          y: 200,
          width: 100,
          height: 30,
          rotation: 0,
          fill: '#ff0000',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 2,
          type_properties: { text_content: 'Second', font_size: 16 },
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

      const state = manager.saveState();

      expect(state.objects[0].type_properties.text_content).toBe('First');
      expect(state.objects[1].type_properties.text_content).toBe('Second');
    });
  });

  describe('loadState()', () => {
    it('should load empty canvas state', () => {
      // Add some objects first
      const objects: CanvasObject[] = [
        {
          id: 'temp-rect',
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
      ];
      manager.batchAddObjects(objects);
      expect(canvas.getObjects()).toHaveLength(1);

      // Load empty state
      const emptyState = {
        objects: [],
        backgroundColor: '#ffffff',
        width: 800,
        height: 600,
      };

      manager.loadState(emptyState);

      expect(canvas.getObjects()).toHaveLength(0);
    });

    it('should load canvas state with objects', () => {
      const state = {
        objects: [
          {
            id: 'load-rect-1',
            type: 'rectangle' as const,
            x: 100,
            y: 100,
            width: 150,
            height: 75,
            rotation: 30,
            fill: '#ff0000',
            stroke: '#000000',
            stroke_width: 2,
            opacity: 0.8,
            type_properties: {},
          },
          {
            id: 'load-circle-1',
            type: 'circle' as const,
            x: 300,
            y: 300,
            width: 100,
            height: 100,
            rotation: 0,
            fill: '#00ff00',
            stroke: null,
            stroke_width: null,
            opacity: 1,
            type_properties: { radius: 50 },
          },
        ],
        backgroundColor: '#f0f0f0',
        width: 1024,
        height: 768,
      };

      manager.loadState(state);

      const canvasObjects = canvas.getObjects();
      expect(canvasObjects).toHaveLength(2);

      const rect = manager.findObjectById('load-rect-1');
      const circle = manager.findObjectById('load-circle-1');

      expect(rect).toBeDefined();
      expect(circle).toBeDefined();
    });

    it('should restore object properties correctly', () => {
      const state = {
        objects: [
          {
            id: 'restore-text-1',
            type: 'text' as const,
            x: 200,
            y: 200,
            width: 150,
            height: 40,
            rotation: 15,
            fill: '#0000ff',
            stroke: '#ff0000',
            stroke_width: 1,
            opacity: 0.9,
            type_properties: {
              text_content: 'Restored text',
              font_size: 24,
            },
          },
        ],
        backgroundColor: '#ffffff',
        width: 800,
        height: 600,
      };

      manager.loadState(state);

      const text = manager.findObjectById('restore-text-1');
      expect(text).toBeDefined();

      const serialized = manager.toCanvasObject(text);
      expect(serialized.type).toBe('text');
      expect(serialized.x).toBe(200);
      expect(serialized.y).toBe(200);
      expect(serialized.fill).toBe('#0000ff');
      expect(serialized.stroke).toBe('#ff0000');
      expect(serialized.stroke_width).toBe(1);
      expect(serialized.rotation).toBe(15);
      expect(serialized.opacity).toBe(0.9);
      expect(serialized.type_properties.text_content).toBe('Restored text');
      expect(serialized.type_properties.font_size).toBe(24);
    });
  });

  describe('State round-trip', () => {
    it('should preserve complete canvas state through save/load cycle', () => {
      const originalObjects: CanvasObject[] = [
        {
          id: 'roundtrip-rect',
          type: 'rectangle',
          x: 100,
          y: 150,
          width: 200,
          height: 100,
          rotation: 45,
          fill: '#ff5500',
          stroke: '#003366',
          stroke_width: 3,
          opacity: 0.7,
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
          id: 'roundtrip-circle',
          type: 'circle',
          x: 400,
          y: 400,
          width: 120,
          height: 120,
          rotation: 0,
          fill: '#00aaff',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 2,
          type_properties: { radius: 60 },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        },
        {
          id: 'roundtrip-text',
          type: 'text',
          x: 250,
          y: 500,
          width: 180,
          height: 35,
          rotation: 10,
          fill: '#663399',
          stroke: null,
          stroke_width: null,
          opacity: 0.95,
          group_id: null,
          z_index: 3,
          type_properties: {
            text_content: 'Round-trip test',
            font_size: 20,
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

      manager.batchAddObjects(originalObjects);

      // Save state
      const savedState = manager.saveState();

      // Clear canvas
      manager.batchRemoveObjects(['roundtrip-rect', 'roundtrip-circle', 'roundtrip-text']);
      expect(canvas.getObjects()).toHaveLength(0);

      // Restore state
      manager.loadState(savedState);

      // Verify all objects restored
      expect(canvas.getObjects()).toHaveLength(3);

      const rect = manager.findObjectById('roundtrip-rect');
      const circle = manager.findObjectById('roundtrip-circle');
      const text = manager.findObjectById('roundtrip-text');

      expect(rect).toBeDefined();
      expect(circle).toBeDefined();
      expect(text).toBeDefined();

      // Verify properties match original
      const rectSerialized = manager.toCanvasObject(rect);
      expect(rectSerialized.x).toBe(originalObjects[0].x);
      expect(rectSerialized.y).toBe(originalObjects[0].y);
      expect(rectSerialized.fill).toBe(originalObjects[0].fill);
      expect(rectSerialized.rotation).toBe(originalObjects[0].rotation);
    });
  });

  describe('Error handling', () => {
    it('should handle invalid state gracefully', () => {
      const invalidState = {
        objects: [
          {
            id: 'invalid-obj',
            type: 'unknown' as any,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            fill: '#000000',
            stroke: null,
            stroke_width: null,
            opacity: 1,
            type_properties: {},
          },
        ],
        backgroundColor: '#ffffff',
        width: 800,
        height: 600,
      };

      manager.loadState(invalidState);

      // Should skip invalid objects
      expect(canvas.getObjects()).toHaveLength(0);
    });

    it('should handle missing state properties', () => {
      const partialState = {
        objects: [],
      };

      // Should not throw
      expect(() => {
        manager.loadState(partialState as any);
      }).not.toThrow();
    });
  });
});
