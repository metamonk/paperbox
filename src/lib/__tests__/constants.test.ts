import { describe, it, expect } from 'vitest';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  MIN_ZOOM,
  MAX_ZOOM,
  SHAPE_DEFAULTS,
} from '../constants';

describe('Canvas Constants', () => {
  it('should have correct canvas dimensions', () => {
    expect(CANVAS_WIDTH).toBe(5000);
    expect(CANVAS_HEIGHT).toBe(5000);
  });

  it('should have valid zoom limits', () => {
    expect(MIN_ZOOM).toBe(0.1);
    expect(MAX_ZOOM).toBe(5);
    expect(MIN_ZOOM).toBeLessThan(MAX_ZOOM);
  });

  it('should have correct shape defaults', () => {
    expect(SHAPE_DEFAULTS.rectangle).toEqual({
      width: 100,
      height: 100,
      fill: '#3B82F6',
    });
    expect(SHAPE_DEFAULTS.circle).toEqual({
      radius: 50,
      fill: '#EF4444',
    });
    expect(SHAPE_DEFAULTS.text).toEqual({
      textContent: 'Text',
      fontSize: 16,
      fill: '#000000',
    });
  });
});

