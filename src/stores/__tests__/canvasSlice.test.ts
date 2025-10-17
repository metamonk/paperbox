/**
 * Canvas Slice Tests
 *
 * TDD [RED→GREEN] for canvasSlice
 * Tests canvas object CRUD operations and state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePaperboxStore } from '../index';
import type { CanvasObject } from '@/types/canvas';

describe('canvasSlice - Canvas Object Management', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = usePaperboxStore.getState();
    store.clearAllObjects();
  });

  describe('Initial State', () => {
    it('should have empty objects on initialization', () => {
      const { objects, loading, error } = usePaperboxStore.getState();

      expect(objects).toEqual({});
      expect(loading).toBe(false);
      expect(error).toBeNull();
    });
  });

  describe('addObject', () => {
    it('should add a rectangle object', () => {
      const { addObject, getObjectById } = usePaperboxStore.getState();

      const rectangle: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 2,
        type_properties: {},
      };

      addObject(rectangle);

      const retrieved = getObjectById('rect-1');
      expect(retrieved).toEqual(rectangle);
    });

    it('should add a circle object', () => {
      const { addObject, getObjectById } = usePaperboxStore.getState();

      const circle: CanvasObject = {
        id: 'circle-1',
        type: 'circle',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#00ff00',
        stroke_color: '#000000',
        stroke_width: 2,
        type_properties: {
          radius: 50,
        },
      };

      addObject(circle);

      const retrieved = getObjectById('circle-1');
      expect(retrieved).toEqual(circle);
      if (retrieved?.type === 'circle') {
        expect(retrieved.type_properties.radius).toBe(50);
      }
    });

    it('should add a text object', () => {
      const { addObject, getObjectById } = usePaperboxStore.getState();

      const text: CanvasObject = {
        id: 'text-1',
        type: 'text',
        x: 50,
        y: 50,
        width: 300,
        height: 40,
        rotation: 0,
        opacity: 1,
        fill_color: '#0000ff',
        stroke_color: undefined,
        stroke_width: 0,
        type_properties: {
          text_content: 'Hello World',
          font_size: 24,
          font_family: 'Arial',
        },
      };

      addObject(text);

      const retrieved = getObjectById('text-1');
      expect(retrieved).toEqual(text);
      if (retrieved?.type === 'text') {
        expect(retrieved.type_properties.text_content).toBe('Hello World');
        expect(retrieved.type_properties.font_size).toBe(24);
      }
    });

    it('should add multiple objects', () => {
      const { addObject, getAllObjects } = usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      const circle: CanvasObject = {
        id: 'circle-1',
        type: 'circle',
        x: 100,
        y: 100,
        width: 80,
        height: 80,
        rotation: 0,
        opacity: 1,
        fill_color: '#00ff00',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {
          radius: 40,
        },
      };

      addObject(rect);
      addObject(circle);

      const all = getAllObjects();
      expect(all).toHaveLength(2);
      expect(all.map((o) => o.id)).toContain('rect-1');
      expect(all.map((o) => o.id)).toContain('circle-1');
    });
  });

  describe('updateObject', () => {
    it('should update object position', () => {
      const { addObject, updateObject, getObjectById } =
        usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      addObject(rect);
      updateObject('rect-1', { x: 200, y: 300 });

      const updated = getObjectById('rect-1');
      expect(updated?.x).toBe(200);
      expect(updated?.y).toBe(300);
    });

    it('should update object size', () => {
      const { addObject, updateObject, getObjectById } =
        usePaperboxStore.getState();

      const circle: CanvasObject = {
        id: 'circle-1',
        type: 'circle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#00ff00',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {
          radius: 50,
        },
      };

      addObject(circle);
      updateObject('circle-1', { width: 200, height: 200 });

      const updated = getObjectById('circle-1');
      expect(updated?.width).toBe(200);
      expect(updated?.height).toBe(200);
    });

    it('should update object colors', () => {
      const { addObject, updateObject, getObjectById } =
        usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      addObject(rect);
      updateObject('rect-1', {
        fill_color: '#0000ff',
        stroke_color: '#ffffff',
      });

      const updated = getObjectById('rect-1');
      expect(updated?.fill_color).toBe('#0000ff');
      expect(updated?.stroke_color).toBe('#ffffff');
    });

    it('should update rotation and opacity', () => {
      const { addObject, updateObject, getObjectById } =
        usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      addObject(rect);
      updateObject('rect-1', { rotation: 45, opacity: 0.5 });

      const updated = getObjectById('rect-1');
      expect(updated?.rotation).toBe(45);
      expect(updated?.opacity).toBe(0.5);
    });

    it('should not update non-existent object', () => {
      const { updateObject, getObjectById } = usePaperboxStore.getState();

      updateObject('nonexistent', { x: 100 });

      const result = getObjectById('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should preserve other properties when updating', () => {
      const { addObject, updateObject, getObjectById } =
        usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 2,
        type_properties: {},
      };

      addObject(rect);
      updateObject('rect-1', { x: 200 }); // Only update x

      const updated = getObjectById('rect-1');
      expect(updated?.x).toBe(200);
      expect(updated?.y).toBe(100); // Preserved
      expect(updated?.fill_color).toBe('#ff0000'); // Preserved
      expect(updated?.stroke_width).toBe(2); // Preserved
    });
  });

  describe('removeObject', () => {
    it('should remove an object', () => {
      const { addObject, removeObject, getObjectById } =
        usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      addObject(rect);
      expect(getObjectById('rect-1')).toBeDefined();

      removeObject('rect-1');
      expect(getObjectById('rect-1')).toBeUndefined();
    });

    it('should handle removing non-existent object gracefully', () => {
      const { removeObject, getAllObjects } = usePaperboxStore.getState();

      expect(() => removeObject('nonexistent')).not.toThrow();
      expect(getAllObjects()).toHaveLength(0);
    });
  });

  describe('removeObjects (batch)', () => {
    it('should remove multiple objects', () => {
      const { addObject, removeObjects, getAllObjects } =
        usePaperboxStore.getState();

      const rect1: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      const rect2: CanvasObject = {
        id: 'rect-2',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#00ff00',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      const circle: CanvasObject = {
        id: 'circle-1',
        type: 'circle',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#0000ff',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {
          radius: 50,
        },
      };

      addObject(rect1);
      addObject(rect2);
      addObject(circle);

      expect(getAllObjects()).toHaveLength(3);

      removeObjects(['rect-1', 'rect-2']);

      const remaining = getAllObjects();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('circle-1');
    });

    it('should handle empty array', () => {
      const { addObject, removeObjects, getAllObjects } =
        usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      addObject(rect);
      removeObjects([]);

      expect(getAllObjects()).toHaveLength(1);
    });
  });

  describe('clearAllObjects', () => {
    it('should clear all objects', () => {
      const { addObject, clearAllObjects, getAllObjects } =
        usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      const circle: CanvasObject = {
        id: 'circle-1',
        type: 'circle',
        x: 100,
        y: 100,
        width: 80,
        height: 80,
        rotation: 0,
        opacity: 1,
        fill_color: '#00ff00',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {
          radius: 40,
        },
      };

      addObject(rect);
      addObject(circle);
      expect(getAllObjects()).toHaveLength(2);

      clearAllObjects();
      expect(getAllObjects()).toHaveLength(0);
    });

    it('should handle clearing empty store', () => {
      const { clearAllObjects, getAllObjects } = usePaperboxStore.getState();

      expect(() => clearAllObjects()).not.toThrow();
      expect(getAllObjects()).toHaveLength(0);
    });
  });

  describe('setObjects (batch)', () => {
    it('should replace all objects', () => {
      const { addObject, setObjects, getAllObjects } =
        usePaperboxStore.getState();

      const oldRect: CanvasObject = {
        id: 'old-rect',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      addObject(oldRect);

      const newObjects: Record<string, CanvasObject> = {
        'new-rect': {
          id: 'new-rect',
          type: 'rectangle',
          x: 200,
          y: 200,
          width: 50,
          height: 50,
          rotation: 0,
          opacity: 1,
          fill_color: '#00ff00',
          stroke_color: '#000000',
          stroke_width: 1,
          type_properties: {},
        },
        'new-circle': {
          id: 'new-circle',
          type: 'circle',
          x: 300,
          y: 300,
          width: 60,
          height: 60,
          rotation: 0,
          opacity: 1,
          fill_color: '#0000ff',
          stroke_color: '#000000',
          stroke_width: 1,
          type_properties: {
            radius: 30,
          },
        },
      };

      setObjects(newObjects);

      const all = getAllObjects();
      expect(all).toHaveLength(2);
      expect(all.map((o) => o.id)).toContain('new-rect');
      expect(all.map((o) => o.id)).toContain('new-circle');
      expect(all.map((o) => o.id)).not.toContain('old-rect');
    });

    it('should handle setting empty object map', () => {
      const { addObject, setObjects, getAllObjects } =
        usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      addObject(rect);
      setObjects({});

      expect(getAllObjects()).toHaveLength(0);
    });
  });

  describe('Utility Functions', () => {
    it('getObjectById should return object when exists', () => {
      const { addObject, getObjectById } = usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      addObject(rect);

      const result = getObjectById('rect-1');
      expect(result).toEqual(rect);
    });

    it('getObjectById should return undefined when not exists', () => {
      const { getObjectById } = usePaperboxStore.getState();

      const result = getObjectById('nonexistent');
      expect(result).toBeUndefined();
    });

    it('getAllObjects should return array of all objects', () => {
      const { addObject, getAllObjects } = usePaperboxStore.getState();

      const rect: CanvasObject = {
        id: 'rect-1',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        opacity: 1,
        fill_color: '#ff0000',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {},
      };

      const circle: CanvasObject = {
        id: 'circle-1',
        type: 'circle',
        x: 100,
        y: 100,
        width: 80,
        height: 80,
        rotation: 0,
        opacity: 1,
        fill_color: '#00ff00',
        stroke_color: '#000000',
        stroke_width: 1,
        type_properties: {
          radius: 40,
        },
      };

      addObject(rect);
      addObject(circle);

      const all = getAllObjects();
      expect(all).toBeInstanceOf(Array);
      expect(all).toHaveLength(2);
      expect(all).toContainEqual(rect);
      expect(all).toContainEqual(circle);
    });

    it('getAllObjects should return empty array for empty store', () => {
      const { getAllObjects } = usePaperboxStore.getState();

      const result = getAllObjects();
      expect(result).toEqual([]);
    });
  });
});
