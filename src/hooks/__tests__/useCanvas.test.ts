import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvas } from '../useCanvas';
import { MIN_ZOOM, MAX_ZOOM } from '../../lib/constants';

describe('useCanvas', () => {
  it('should initialize with default scale and position', () => {
    const { result } = renderHook(() => useCanvas());

    expect(result.current.scale).toBe(1);
    expect(result.current.position).toEqual({ x: 0, y: 0 });
  });

  it('should update zoom within limits', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.setScale(2);
    });

    expect(result.current.scale).toBe(2);

    act(() => {
      result.current.setScale(10);
    });

    expect(result.current.scale).toBe(MAX_ZOOM);

    act(() => {
      result.current.setScale(0.01);
    });

    expect(result.current.scale).toBe(MIN_ZOOM);
  });

  it('should update position on pan', () => {
    const { result } = renderHook(() => useCanvas());

    act(() => {
      result.current.setPosition({ x: 100, y: 200 });
    });

    expect(result.current.position).toEqual({ x: 100, y: 200 });
  });

  it('should have a stage ref', () => {
    const { result } = renderHook(() => useCanvas());

    expect(result.current.stageRef).toBeDefined();
    expect(result.current.stageRef.current).toBeNull();
  });

  it('should provide wheel and drag handlers', () => {
    const { result } = renderHook(() => useCanvas());

    expect(typeof result.current.handleWheel).toBe('function');
    expect(typeof result.current.handleDragEnd).toBe('function');
  });
});

