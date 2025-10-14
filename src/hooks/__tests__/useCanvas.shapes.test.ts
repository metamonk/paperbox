import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvas } from '../useCanvas';
import { SHAPE_DEFAULTS } from '../../lib/constants';
import type { CanvasObject } from '../../types/canvas';

// Mock the realtime objects hook
const mockObjects: CanvasObject[] = [];
const mockCreateObject = vi.fn();
const mockUpdateObject = vi.fn();
const mockAcquireLock = vi.fn();
const mockReleaseLock = vi.fn();

vi.mock('../useRealtimeObjects', () => ({
  useRealtimeObjects: () => ({
    objects: mockObjects,
    loading: false,
    error: null,
    createObject: mockCreateObject,
    updateObject: mockUpdateObject,
    acquireLock: mockAcquireLock,
    releaseLock: mockReleaseLock,
  }),
}));

describe('useCanvas - Shape Creation', () => {
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
    mockObjects.length = 0;
    
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
    
    // Mock createObject to simulate adding to objects array
    mockCreateObject.mockImplementation(async (shape: Partial<CanvasObject>) => {
      const newShape = {
        ...shape,
        id: `test-${Date.now()}-${Math.random()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'test-user',
        locked_by: null,
        lock_acquired_at: null,
      } as CanvasObject;
      mockObjects.push(newShape);
      return newShape.id;
    });
  });

  it('should initialize with empty shapes array', () => {
    const { result } = renderHook(() => useCanvas());

    expect(result.current.shapes).toEqual([]);
  });

  it('should create rectangle with correct defaults', async () => {
    const { result } = renderHook(() => useCanvas());

    await act(async () => {
      await result.current.addShape('rectangle');
    });

    expect(mockCreateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'rectangle',
        width: SHAPE_DEFAULTS.rectangle.width,
        height: SHAPE_DEFAULTS.rectangle.height,
        fill: SHAPE_DEFAULTS.rectangle.fill,
      })
    );

    const shape = result.current.shapes[0];
    expect(shape.type).toBe('rectangle');
    if (shape.type === 'rectangle') {
      expect(shape.width).toBe(SHAPE_DEFAULTS.rectangle.width);
      expect(shape.height).toBe(SHAPE_DEFAULTS.rectangle.height);
    }
    expect(shape.fill).toBe(SHAPE_DEFAULTS.rectangle.fill);
    expect(shape.id).toBeDefined();
  });

  it('should create circle with correct defaults', async () => {
    const { result } = renderHook(() => useCanvas());

    await act(async () => {
      await result.current.addShape('circle');
    });

    expect(mockCreateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'circle',
        radius: SHAPE_DEFAULTS.circle.radius,
        fill: SHAPE_DEFAULTS.circle.fill,
      })
    );

    const shape = result.current.shapes[0];
    expect(shape.type).toBe('circle');
    if (shape.type === 'circle') {
      expect(shape.radius).toBe(SHAPE_DEFAULTS.circle.radius);
    }
    expect(shape.fill).toBe(SHAPE_DEFAULTS.circle.fill);
    expect(shape.id).toBeDefined();
  });

  it('should create text with correct defaults', async () => {
    const { result } = renderHook(() => useCanvas());

    await act(async () => {
      await result.current.addShape('text');
    });

    expect(mockCreateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text',
        text_content: SHAPE_DEFAULTS.text.textContent,
        font_size: SHAPE_DEFAULTS.text.fontSize,
        fill: SHAPE_DEFAULTS.text.fill,
      })
    );

    const shape = result.current.shapes[0];
    expect(shape.type).toBe('text');
    if (shape.type === 'text') {
      expect(shape.text_content).toBe(SHAPE_DEFAULTS.text.textContent);
      expect(shape.font_size).toBe(SHAPE_DEFAULTS.text.fontSize);
    }
    expect(shape.fill).toBe(SHAPE_DEFAULTS.text.fill);
    expect(shape.id).toBeDefined();
  });

  it('should update shape position', async () => {
    const { result } = renderHook(() => useCanvas());

    await act(async () => {
      await result.current.addShape('rectangle');
    });

    const shapeId = result.current.shapes[0].id;

    act(() => {
      result.current.updateShape(shapeId, { x: 200, y: 300 });
    });

    expect(mockUpdateObject).toHaveBeenCalledWith(shapeId, { x: 200, y: 300 });
  });

  it('should update shape properties', async () => {
    const { result } = renderHook(() => useCanvas());

    await act(async () => {
      await result.current.addShape('text');
    });

    const shapeId = result.current.shapes[0].id;

    act(() => {
      result.current.updateShape(shapeId, { text_content: 'Updated Text' });
    });

    expect(mockUpdateObject).toHaveBeenCalledWith(shapeId, { text_content: 'Updated Text' });
  });

  it('should handle multiple shapes', async () => {
    const { result } = renderHook(() => useCanvas());

    await act(async () => {
      await result.current.addShape('rectangle');
      await result.current.addShape('circle');
      await result.current.addShape('text');
    });

    expect(result.current.shapes).toHaveLength(3);
    expect(result.current.shapes[0].type).toBe('rectangle');
    expect(result.current.shapes[1].type).toBe('circle');
    expect(result.current.shapes[2].type).toBe('text');
  });

  it('should generate unique IDs for each shape', async () => {
    const { result } = renderHook(() => useCanvas());

    await act(async () => {
      await result.current.addShape('rectangle');
      await result.current.addShape('rectangle');
      await result.current.addShape('rectangle');
    });

    const ids = result.current.shapes.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('should set created_at and updated_at timestamps', async () => {
    const { result } = renderHook(() => useCanvas());

    await act(async () => {
      await result.current.addShape('circle');
    });

    const shape = result.current.shapes[0];
    expect(shape.created_at).toBeDefined();
    expect(shape.updated_at).toBeDefined();
    expect(new Date(shape.created_at).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should call realtime hooks for locking', () => {
    const { result } = renderHook(() => useCanvas());

    expect(result.current.acquireLock).toBe(mockAcquireLock);
    expect(result.current.releaseLock).toBe(mockReleaseLock);
  });
});

