/**
 * Tests for Fabric.js Object Factory
 *
 * TDD Red Phase: Write failing tests for object creation
 * Expected: Tests will pass with existing template implementation
 *
 * Object types tested:
 * - Rectangle (with corner radius)
 * - Circle (with radius)
 * - Text (with font properties)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import * as fabric from 'fabric';
import type { RectangleObject, CircleObject, TextObject } from '../../../types/canvas';

describe('FabricCanvasManager - Object Factory', () => {
  let manager: FabricCanvasManager;
  let canvas: fabric.Canvas;

  beforeEach(() => {
    manager = new FabricCanvasManager();
    canvas = manager.initialize({
      containerId: 'test-factory-canvas',
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('createFabricObject()', () => {
    describe('Rectangle creation', () => {
      it('should create a rectangle with correct properties', () => {
        const rectObject: RectangleObject = {
          id: 'rect-1',
          type: 'rectangle',
          x: 100,
          y: 150,
          width: 200,
          height: 100,
          rotation: 45,
          fill: '#ff0000',
          stroke: '#000000',
          stroke_width: 2,
          opacity: 0.8,
          group_id: null,
          z_index: 1,
          type_properties: { corner_radius: 5 },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        };

        const fabricRect = manager.createFabricObject(rectObject);

        expect(fabricRect).toBeDefined();
        expect(fabricRect).toBeInstanceOf(fabric.Rect);
        expect(fabricRect!.left).toBe(100);
        expect(fabricRect!.top).toBe(150);
        expect(fabricRect!.width).toBe(200);
        expect(fabricRect!.height).toBe(100);
        expect(fabricRect!.angle).toBe(45);
        expect(fabricRect!.fill).toBe('#ff0000');
        expect(fabricRect!.stroke).toBe('#000000');
        expect(fabricRect!.strokeWidth).toBe(2);
        expect(fabricRect!.opacity).toBe(0.8);
      });

      it('should store database ID in object data property', () => {
        const rectObject: RectangleObject = {
          id: 'rect-id-123',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#000000',
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
        };

        const fabricRect = manager.createFabricObject(rectObject);

        expect(fabricRect!.data).toBeDefined();
        expect(fabricRect!.data.id).toBe('rect-id-123');
      });
    });

    describe('Circle creation', () => {
      it('should create a circle with correct properties', () => {
        const circleObject: CircleObject = {
          id: 'circle-1',
          type: 'circle',
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#00ff00',
          stroke: '#0000ff',
          stroke_width: 3,
          opacity: 0.9,
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
        };

        const fabricCircle = manager.createFabricObject(circleObject);

        expect(fabricCircle).toBeDefined();
        expect(fabricCircle).toBeInstanceOf(fabric.Circle);
        expect(fabricCircle!.left).toBe(200);
        expect(fabricCircle!.top).toBe(200);
        expect((fabricCircle as any).radius).toBe(50);
        expect(fabricCircle!.fill).toBe('#00ff00');
        expect(fabricCircle!.stroke).toBe('#0000ff');
        expect(fabricCircle!.strokeWidth).toBe(3);
        expect(fabricCircle!.opacity).toBe(0.9);
      });

      it('should store database ID in circle data property', () => {
        const circleObject: CircleObject = {
          id: 'circle-id-456',
          type: 'circle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#000000',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 1,
          type_properties: { radius: 50 },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        };

        const fabricCircle = manager.createFabricObject(circleObject);

        expect(fabricCircle!.data.id).toBe('circle-id-456');
      });
    });

    describe('Text creation', () => {
      it('should create text with correct properties', () => {
        const textObject: TextObject = {
          id: 'text-1',
          type: 'text',
          x: 300,
          y: 400,
          width: 150,
          height: 40,
          rotation: 15,
          fill: '#0000ff',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 3,
          type_properties: {
            text_content: 'Hello Fabric.js!',
            font_size: 24,
            font_family: 'Arial',
            font_weight: 'bold',
          },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        };

        const fabricText = manager.createFabricObject(textObject);

        expect(fabricText).toBeDefined();
        expect(fabricText).toBeInstanceOf(fabric.Text);
        expect(fabricText!.left).toBe(300);
        expect(fabricText!.top).toBe(400);
        expect((fabricText as any).text).toBe('Hello Fabric.js!');
        expect((fabricText as any).fontSize).toBe(24);
        expect(fabricText!.fill).toBe('#0000ff');
        expect(fabricText!.opacity).toBe(1);
      });

      it('should store database ID in text data property', () => {
        const textObject: TextObject = {
          id: 'text-id-789',
          type: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 30,
          rotation: 0,
          fill: '#000000',
          stroke: null,
          stroke_width: null,
          opacity: 1,
          group_id: null,
          z_index: 1,
          type_properties: {
            text_content: 'Test',
            font_size: 16,
          },
          style_properties: {},
          metadata: {},
          created_by: 'user-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          locked_by: null,
          lock_acquired_at: null,
        };

        const fabricText = manager.createFabricObject(textObject);

        expect(fabricText!.data.id).toBe('text-id-789');
      });
    });

    describe('Edge cases', () => {
      it('should handle null stroke', () => {
        const rectObject: RectangleObject = {
          id: 'rect-no-stroke',
          type: 'rectangle',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
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
        };

        const fabricRect = manager.createFabricObject(rectObject);

        expect(fabricRect).toBeDefined();
        expect(fabricRect!.stroke).toBeUndefined();
      });

      it('should return null for unknown object types', () => {
        const unknownObject = {
          id: 'unknown-1',
          type: 'triangle' as any, // Invalid type
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#000000',
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
        };

        const fabricObj = manager.createFabricObject(unknownObject as any);

        expect(fabricObj).toBeNull();
      });
    });
  });

  describe('addObject()', () => {
    it('should add object to canvas', () => {
      const rectObject: RectangleObject = {
        id: 'rect-add-test',
        type: 'rectangle',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        rotation: 0,
        fill: '#ffaa00',
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
      };

      const fabricRect = manager.createFabricObject(rectObject);
      expect(fabricRect).not.toBeNull();

      manager.addObject(fabricRect!);

      const canvasObjects = canvas.getObjects();
      expect(canvasObjects).toHaveLength(1);
      expect(canvasObjects[0]).toBe(fabricRect);
    });
  });

  describe('findObjectById()', () => {
    it('should find object by database ID', () => {
      const rectObject: RectangleObject = {
        id: 'find-me',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        rotation: 0,
        fill: '#aa00ff',
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
      };

      const fabricRect = manager.createFabricObject(rectObject);
      manager.addObject(fabricRect!);

      const found = manager.findObjectById('find-me');

      expect(found).toBeDefined();
      expect(found).toBe(fabricRect);
      expect(found!.data.id).toBe('find-me');
    });

    it('should return null for non-existent ID', () => {
      const found = manager.findObjectById('does-not-exist');
      expect(found).toBeNull();
    });
  });
});
