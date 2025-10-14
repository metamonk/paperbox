import { describe, it, expect } from 'vitest';
import {
  getViewportCenter,
  clampZoom,
  screenToCanvas,
  canvasToScreen,
  constrainToBounds,
} from '../canvas-helpers';
import { MIN_ZOOM, MAX_ZOOM, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../lib/constants';

describe('Canvas Helpers', () => {
  describe('clampZoom', () => {
    it('should clamp zoom to minimum', () => {
      expect(clampZoom(0.05)).toBe(MIN_ZOOM);
      expect(clampZoom(0)).toBe(MIN_ZOOM);
      expect(clampZoom(-1)).toBe(MIN_ZOOM);
    });

    it('should clamp zoom to maximum', () => {
      expect(clampZoom(10)).toBe(MAX_ZOOM);
      expect(clampZoom(100)).toBe(MAX_ZOOM);
    });

    it('should not clamp valid zoom values', () => {
      expect(clampZoom(0.5)).toBe(0.5);
      expect(clampZoom(1)).toBe(1);
      expect(clampZoom(3)).toBe(3);
    });
  });

  describe('getViewportCenter', () => {
    it('should calculate center of viewport', () => {
      const stage = {
        width: () => 1000,
        height: () => 800,
        x: () => -500,
        y: () => -400,
        scaleX: () => 1,
        scaleY: () => 1,
      };

      const center = getViewportCenter(stage as any);
      expect(center.x).toBe(1000); // (1000/2 - (-500)) / 1
      expect(center.y).toBe(800); // (800/2 - (-400)) / 1
    });

    it('should account for zoom level', () => {
      const stage = {
        width: () => 1000,
        height: () => 800,
        x: () => 0,
        y: () => 0,
        scaleX: () => 2,
        scaleY: () => 2,
      };

      const center = getViewportCenter(stage as any);
      expect(center.x).toBe(250); // (1000/2) / 2
      expect(center.y).toBe(200); // (800/2) / 2
    });
  });

  describe('screenToCanvas', () => {
    it('should convert screen coordinates to canvas coordinates', () => {
      const result = screenToCanvas(100, 100, 1, { x: 0, y: 0 });
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should account for pan offset', () => {
      const result = screenToCanvas(100, 100, 1, { x: -50, y: -50 });
      expect(result.x).toBe(150);
      expect(result.y).toBe(150);
    });

    it('should account for zoom scale', () => {
      const result = screenToCanvas(100, 100, 2, { x: 0, y: 0 });
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
    });
  });

  describe('canvasToScreen', () => {
    it('should convert canvas coordinates to screen coordinates', () => {
      const result = canvasToScreen(100, 100, 1, { x: 0, y: 0 });
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should account for pan offset', () => {
      const result = canvasToScreen(100, 100, 1, { x: 50, y: 50 });
      expect(result.x).toBe(150);
      expect(result.y).toBe(150);
    });

    it('should account for zoom scale', () => {
      const result = canvasToScreen(100, 100, 2, { x: 0, y: 0 });
      expect(result.x).toBe(200);
      expect(result.y).toBe(200);
    });
  });

  describe('constrainToBounds', () => {
    it('should not constrain coordinates within bounds', () => {
      const result = constrainToBounds(100, 100, 50, 50);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('should constrain negative coordinates to 0', () => {
      const result = constrainToBounds(-10, -20, 50, 50);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should constrain coordinates beyond canvas width', () => {
      const result = constrainToBounds(CANVAS_WIDTH + 100, 100, 50, 50);
      expect(result.x).toBe(CANVAS_WIDTH - 50);
      expect(result.y).toBe(100);
    });

    it('should constrain coordinates beyond canvas height', () => {
      const result = constrainToBounds(100, CANVAS_HEIGHT + 100, 50, 50);
      expect(result.x).toBe(100);
      expect(result.y).toBe(CANVAS_HEIGHT - 50);
    });

    it('should handle objects at the edge', () => {
      const result = constrainToBounds(CANVAS_WIDTH - 50, CANVAS_HEIGHT - 50, 50, 50);
      expect(result.x).toBe(CANVAS_WIDTH - 50);
      expect(result.y).toBe(CANVAS_HEIGHT - 50);
    });

    it('should work without width and height', () => {
      const result = constrainToBounds(100, 100);
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });
  });
});

