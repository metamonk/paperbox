import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvas } from '../useCanvas';
import { SHAPE_DEFAULTS } from '../../lib/constants';

describe('useCanvas - Shape Creation', () => {
  beforeEach(() => {
    // Mock window dimensions for tests
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it('should initialize with empty shapes array', () => {
    const { result } = renderHook(() => useCanvas());

    expect(result.current.shapes).toEqual([]);
  });

  it('should create rectangle with correct defaults', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('rectangle');
    });

    const shape = result.current.shapes[0];
    expect(shape.type).toBe('rectangle');
    if (shape.type === 'rectangle') {
      expect(shape.width).toBe(SHAPE_DEFAULTS.rectangle.width);
      expect(shape.height).toBe(SHAPE_DEFAULTS.rectangle.height);
    }
    expect(shape.fill).toBe(SHAPE_DEFAULTS.rectangle.fill);
    expect(shape.id).toBeDefined();
    expect(shape.created_by).toBe('local-user');
  });

  it('should create circle with correct defaults', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('circle');
    });

    const shape = result.current.shapes[0];
    expect(shape.type).toBe('circle');
    if (shape.type === 'circle') {
      expect(shape.radius).toBe(SHAPE_DEFAULTS.circle.radius);
    }
    expect(shape.fill).toBe(SHAPE_DEFAULTS.circle.fill);
    expect(shape.id).toBeDefined();
  });

  it('should create text with correct defaults', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('text');
    });

    const shape = result.current.shapes[0];
    expect(shape.type).toBe('text');
    if (shape.type === 'text') {
      expect(shape.text_content).toBe(SHAPE_DEFAULTS.text.textContent);
      expect(shape.font_size).toBe(SHAPE_DEFAULTS.text.fontSize);
    }
    expect(shape.fill).toBe(SHAPE_DEFAULTS.text.fill);
    expect(shape.id).toBeDefined();
  });

  it('should update shape position', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('rectangle');
    });

    const shapeId = result.current.shapes[0].id;

    act(() => {
      result.current.updateShape(shapeId, { x: 200, y: 300 });
    });

    const updatedShape = result.current.shapes[0];
    expect(updatedShape.x).toBe(200);
    expect(updatedShape.y).toBe(300);
  });

  it('should update shape properties', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('text');
    });

    const shapeId = result.current.shapes[0].id;

    act(() => {
      result.current.updateShape(shapeId, { text_content: 'Updated Text' });
    });

    const updatedShape = result.current.shapes[0];
    if (updatedShape.type === 'text') {
      expect(updatedShape.text_content).toBe('Updated Text');
    }
  });

  it('should handle multiple shapes', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('rectangle');
      result.current.addShape('circle');
      result.current.addShape('text');
    });

    expect(result.current.shapes).toHaveLength(3);
    expect(result.current.shapes[0].type).toBe('rectangle');
    expect(result.current.shapes[1].type).toBe('circle');
    expect(result.current.shapes[2].type).toBe('text');
  });

  it('should generate unique IDs for each shape', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('rectangle');
      result.current.addShape('rectangle');
      result.current.addShape('rectangle');
    });

    const ids = result.current.shapes.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('should set created_at and updated_at timestamps', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('circle');
    });

    const shape = result.current.shapes[0];
    expect(shape.created_at).toBeDefined();
    expect(shape.updated_at).toBeDefined();
    expect(new Date(shape.created_at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should update updated_at timestamp on shape update', async () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.addShape('rectangle');
    });

    const originalTimestamp = result.current.shapes[0].updated_at;

    // Wait a tiny bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    act(() => {
      result.current.updateShape(result.current.shapes[0].id, { x: 100 });
    });

    const newTimestamp = result.current.shapes[0].updated_at;
    expect(newTimestamp).not.toBe(originalTimestamp);
  });
});

