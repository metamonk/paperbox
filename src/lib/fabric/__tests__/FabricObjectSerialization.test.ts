/**
 * Tests for Fabric.js Object Serialization
 *
 * TDD Red Phase: Write failing tests for toCanvasObject() serialization
 * Expected: Tests will fail until W1.D2.2 implementation
 *
 * Serialization requirements:
 * - Convert Fabric.js objects back to CanvasObject database format
 * - Preserve all geometric properties (position, size, rotation)
 * - Maintain type-specific properties (radius, text content, font size)
 * - Handle optional properties (stroke, stroke width)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FabricCanvasManager } from '../FabricCanvasManager';
import * as fabric from 'fabric';

describe('FabricCanvasManager - Object Serialization', () => {
  let manager: FabricCanvasManager;
  let canvas: fabric.Canvas;

  beforeEach(() => {
    manager = new FabricCanvasManager();
    canvas = manager.initialize({
      containerId: 'test-serialization-canvas',
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('toCanvasObject()', () => {
    describe('Rectangle serialization', () => {
      it('should serialize rectangle with all properties', () => {
        const fabricRect = new fabric.Rect({
          left: 100,
          top: 150,
          width: 200,
          height: 100,
          fill: '#ff0000',
          stroke: '#000000',
          strokeWidth: 2,
          angle: 45,
          opacity: 0.8,
        });

        const canvasObject = manager.toCanvasObject(fabricRect);

        expect(canvasObject.type).toBe('rectangle');
        expect(canvasObject.x).toBe(100);
        expect(canvasObject.y).toBe(150);
        expect(canvasObject.width).toBe(200);
        expect(canvasObject.height).toBe(100);
        expect(canvasObject.fill).toBe('#ff0000');
        expect(canvasObject.stroke).toBe('#000000');
        expect(canvasObject.stroke_width).toBe(2);
        expect(canvasObject.rotation).toBe(45);
        expect(canvasObject.opacity).toBe(0.8);
      });

      it('should serialize rectangle with null stroke', () => {
        const fabricRect = new fabric.Rect({
          left: 50,
          top: 50,
          width: 100,
          height: 100,
          fill: '#00ff00',
        });

        const canvasObject = manager.toCanvasObject(fabricRect);

        expect(canvasObject.stroke).toBeNull();
        expect(canvasObject.stroke_width).toBeNull();
      });

      it('should handle default opacity and rotation', () => {
        const fabricRect = new fabric.Rect({
          left: 0,
          top: 0,
          width: 50,
          height: 50,
          fill: '#0000ff',
        });

        const canvasObject = manager.toCanvasObject(fabricRect);

        expect(canvasObject.rotation).toBe(0);
        expect(canvasObject.opacity).toBe(1);
      });
    });

    describe('Circle serialization', () => {
      it('should serialize circle with radius property', () => {
        const fabricCircle = new fabric.Circle({
          left: 200,
          top: 200,
          radius: 50,
          fill: '#00ff00',
          stroke: '#0000ff',
          strokeWidth: 3,
          angle: 0,
          opacity: 0.9,
        });

        const canvasObject = manager.toCanvasObject(fabricCircle);

        expect(canvasObject.type).toBe('circle');
        expect(canvasObject.x).toBe(200);
        expect(canvasObject.y).toBe(200);
        expect(canvasObject.fill).toBe('#00ff00');
        expect(canvasObject.stroke).toBe('#0000ff');
        expect(canvasObject.stroke_width).toBe(3);
        expect(canvasObject.rotation).toBe(0);
        expect(canvasObject.opacity).toBe(0.9);
        expect(canvasObject.type_properties).toEqual({ radius: 50 });
      });

      it('should handle circle with default radius', () => {
        const fabricCircle = new fabric.Circle({
          left: 100,
          top: 100,
          fill: '#ff00ff',
        });

        const canvasObject = manager.toCanvasObject(fabricCircle);

        expect(canvasObject.type).toBe('circle');
        expect(canvasObject.type_properties).toHaveProperty('radius');
        expect(canvasObject.type_properties.radius).toBeGreaterThan(0);
      });
    });

    describe('Text serialization', () => {
      it('should serialize text with content and font properties', () => {
        const fabricText = new fabric.Text('Hello Fabric.js!', {
          left: 300,
          top: 400,
          fontSize: 24,
          fill: '#0000ff',
          angle: 15,
          opacity: 1,
        });

        const canvasObject = manager.toCanvasObject(fabricText);

        expect(canvasObject.type).toBe('text');
        expect(canvasObject.x).toBe(300);
        expect(canvasObject.y).toBe(400);
        expect(canvasObject.fill).toBe('#0000ff');
        expect(canvasObject.rotation).toBe(15);
        expect(canvasObject.opacity).toBe(1);
        expect(canvasObject.type_properties.text_content).toBe('Hello Fabric.js!');
        expect(canvasObject.type_properties.font_size).toBe(24);
      });

      it('should handle default font size', () => {
        const fabricText = new fabric.Text('Test', {
          left: 0,
          top: 0,
          fill: '#000000',
        });

        const canvasObject = manager.toCanvasObject(fabricText);

        expect(canvasObject.type).toBe('text');
        if (canvasObject.type === 'text') {
          expect(canvasObject.type_properties?.font_size).toBe(16);
        }
      });

      it('should handle empty text content', () => {
        const fabricText = new fabric.Text('', {
          left: 0,
          top: 0,
          fill: '#000000',
        });

        const canvasObject = manager.toCanvasObject(fabricText);

        expect(canvasObject.type).toBe('text');
        if (canvasObject.type === 'text') {
          expect(canvasObject.type_properties?.text_content).toBe('');
        }
      });
    });

    describe('Round-trip serialization', () => {
      it('should preserve rectangle properties through create → serialize cycle', () => {
        const original = {
          id: 'round-trip-rect',
          type: 'rectangle' as const,
          x: 100,
          y: 100,
          width: 150,
          height: 75,
          rotation: 30,
          fill: '#ff5500',
          stroke: '#003366',
          stroke_width: 2,
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
        };

        const fabricObject = manager.createFabricObject(original);
        expect(fabricObject).not.toBeNull();

        const serialized = manager.toCanvasObject(fabricObject!);

        expect(serialized.type).toBe(original.type);
        expect(serialized.x).toBe(original.x);
        expect(serialized.y).toBe(original.y);
        expect(serialized.width).toBe(original.width);
        expect(serialized.height).toBe(original.height);
        expect(serialized.rotation).toBe(original.rotation);
        expect(serialized.fill).toBe(original.fill);
        expect(serialized.stroke).toBe(original.stroke);
        expect(serialized.stroke_width).toBe(original.stroke_width);
        expect(serialized.opacity).toBe(original.opacity);
      });

      it('should preserve circle properties through create → serialize cycle', () => {
        const original = {
          id: 'round-trip-circle',
          type: 'circle' as const,
          x: 200,
          y: 200,
          width: 100,
          height: 100,
          rotation: 0,
          fill: '#00aaff',
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
        };

        const fabricObject = manager.createFabricObject(original);
        expect(fabricObject).not.toBeNull();

        const serialized = manager.toCanvasObject(fabricObject!);

        expect(serialized.type).toBe(original.type);
        expect(serialized.x).toBe(original.x);
        expect(serialized.y).toBe(original.y);
        expect(serialized.fill).toBe(original.fill);
        if (serialized.type === 'circle') {
          expect(serialized.type_properties?.radius).toBe(original.type_properties.radius);
        }
      });

      it('should preserve text properties through create → serialize cycle', () => {
        const original = {
          id: 'round-trip-text',
          type: 'text' as const,
          x: 300,
          y: 300,
          width: 200,
          height: 50,
          rotation: 45,
          fill: '#663399',
          stroke: null,
          stroke_width: null,
          opacity: 0.9,
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
        };

        const fabricObject = manager.createFabricObject(original);
        expect(fabricObject).not.toBeNull();

        const serialized = manager.toCanvasObject(fabricObject!);

        expect(serialized.type).toBe(original.type);
        expect(serialized.x).toBe(original.x);
        expect(serialized.y).toBe(original.y);
        expect(serialized.fill).toBe(original.fill);
        expect(serialized.rotation).toBe(original.rotation);
        expect(serialized.opacity).toBe(original.opacity);
        if (serialized.type === 'text') {
          expect(serialized.type_properties?.text_content).toBe(original.type_properties.text_content);
          expect(serialized.type_properties?.font_size).toBe(original.type_properties.font_size);
        }
      });
    });
  });
});
