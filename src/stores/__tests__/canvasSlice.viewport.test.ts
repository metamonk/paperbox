/**
 * Canvas Slice Viewport Tests
 *
 * W2.D6.3: RED phase - Tests for viewport state management
 *
 * Tests:
 * - syncViewport() stores zoom and pan values
 * - restoreViewport() returns current viewport state
 * - Viewport state initializes with defaults (zoom: 1, panX: 0, panY: 0)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePaperboxStore } from '../index';

describe('canvasSlice - Viewport Management', () => {
  beforeEach(() => {
    // Reset store before each test
    usePaperboxStore.setState({
      objects: {},
      loading: false,
      error: null,
      realtimeChannel: null,
      viewport: { zoom: 1, panX: 0, panY: 0 },
    });
  });

  describe('Default Viewport State', () => {
    it('should initialize with default viewport values', () => {
      const { viewport } = usePaperboxStore.getState();

      expect(viewport).toEqual({
        zoom: 1,
        panX: 0,
        panY: 0,
      });
    });
  });

  describe('syncViewport()', () => {
    it('should update viewport state with provided values', () => {
      const { syncViewport } = usePaperboxStore.getState();

      // Simulate pan/zoom from Fabric.js
      syncViewport(2.5, 100, 200);

      const { viewport } = usePaperboxStore.getState();
      expect(viewport.zoom).toBe(2.5);
      expect(viewport.panX).toBe(100);
      expect(viewport.panY).toBe(200);
    });

    it('should handle zoom values between 0.01 and 20', () => {
      const { syncViewport } = usePaperboxStore.getState();

      // Test minimum zoom
      syncViewport(0.01, 0, 0);
      expect(usePaperboxStore.getState().viewport.zoom).toBe(0.01);

      // Test maximum zoom
      syncViewport(20, 0, 0);
      expect(usePaperboxStore.getState().viewport.zoom).toBe(20);

      // Test mid-range zoom
      syncViewport(5.5, 0, 0);
      expect(usePaperboxStore.getState().viewport.zoom).toBe(5.5);
    });

    it('should handle negative pan values', () => {
      const { syncViewport } = usePaperboxStore.getState();

      syncViewport(1, -150, -300);

      const { viewport } = usePaperboxStore.getState();
      expect(viewport.panX).toBe(-150);
      expect(viewport.panY).toBe(-300);
    });

    it('should handle very large pan values (infinite canvas)', () => {
      const { syncViewport } = usePaperboxStore.getState();

      syncViewport(1, 10000, -5000);

      const { viewport } = usePaperboxStore.getState();
      expect(viewport.panX).toBe(10000);
      expect(viewport.panY).toBe(-5000);
    });

    it('should overwrite previous viewport state', () => {
      const { syncViewport } = usePaperboxStore.getState();

      // Set initial viewport
      syncViewport(2, 50, 100);
      expect(usePaperboxStore.getState().viewport).toEqual({
        zoom: 2,
        panX: 50,
        panY: 100,
      });

      // Update to new viewport
      syncViewport(1.5, 75, 125);
      expect(usePaperboxStore.getState().viewport).toEqual({
        zoom: 1.5,
        panX: 75,
        panY: 125,
      });
    });

    it('should handle decimal zoom values', () => {
      const { syncViewport } = usePaperboxStore.getState();

      syncViewport(1.234567, 0, 0);
      expect(usePaperboxStore.getState().viewport.zoom).toBe(1.234567);
    });

    it('should handle zero pan values', () => {
      const { syncViewport } = usePaperboxStore.getState();

      syncViewport(3, 0, 0);

      const { viewport } = usePaperboxStore.getState();
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
    });
  });

  describe('restoreViewport()', () => {
    it('should return current viewport state', () => {
      const { syncViewport, restoreViewport } = usePaperboxStore.getState();

      // Set viewport
      syncViewport(3, 200, 400);

      // Restore should return the same values
      const restored = restoreViewport();
      expect(restored).toEqual({
        zoom: 3,
        panX: 200,
        panY: 400,
      });
    });

    it('should return default viewport when no changes made', () => {
      const { restoreViewport } = usePaperboxStore.getState();

      const restored = restoreViewport();
      expect(restored).toEqual({
        zoom: 1,
        panX: 0,
        panY: 0,
      });
    });

    it('should return updated viewport after multiple syncs', () => {
      const { syncViewport, restoreViewport } = usePaperboxStore.getState();

      syncViewport(2, 50, 100);
      syncViewport(2.5, 75, 150);
      syncViewport(3, 100, 200);

      const restored = restoreViewport();
      expect(restored).toEqual({
        zoom: 3,
        panX: 100,
        panY: 200,
      });
    });

    it('should not modify viewport state when called', () => {
      const { syncViewport, restoreViewport } = usePaperboxStore.getState();

      syncViewport(2, 100, 200);

      const before = usePaperboxStore.getState().viewport;
      restoreViewport();
      const after = usePaperboxStore.getState().viewport;

      expect(before).toEqual(after);
    });
  });

  describe('Viewport State Integration', () => {
    it('should maintain viewport state independently of objects', () => {
      const { syncViewport } = usePaperboxStore.getState();

      // Update objects and viewport separately
      usePaperboxStore.setState({
        objects: {
          'test-id': {
            id: 'test-id',
            type: 'rectangle',
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            rotation: 0,
            group_id: null,
            z_index: 0,
            fill: '#000000',
            stroke: null,
            stroke_width: null,
            opacity: 1,
            type_properties: {},
            style_properties: {},
            metadata: {},
            created_by: 'test-user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            locked_by: null,
            lock_acquired_at: null,
          },
        },
      });

      syncViewport(2, 100, 100);

      const { viewport, objects } = usePaperboxStore.getState();
      expect(viewport.zoom).toBe(2);
      expect(Object.keys(objects).length).toBe(1);
    });

    it('should persist viewport through object CRUD operations', () => {
      const { syncViewport } = usePaperboxStore.getState();

      // Set viewport
      syncViewport(3, 150, 250);

      // Simulate object operations
      usePaperboxStore.setState({
        objects: {},
      });

      // Viewport should remain unchanged
      const { viewport } = usePaperboxStore.getState();
      expect(viewport).toEqual({
        zoom: 3,
        panX: 150,
        panY: 250,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small zoom values', () => {
      const { syncViewport } = usePaperboxStore.getState();

      syncViewport(0.001, 0, 0);
      expect(usePaperboxStore.getState().viewport.zoom).toBe(0.001);
    });

    it('should handle very large zoom values', () => {
      const { syncViewport } = usePaperboxStore.getState();

      syncViewport(100, 0, 0);
      expect(usePaperboxStore.getState().viewport.zoom).toBe(100);
    });

    it('should handle floating point precision for pan values', () => {
      const { syncViewport } = usePaperboxStore.getState();

      syncViewport(1, 123.456789, 987.654321);

      const { viewport } = usePaperboxStore.getState();
      expect(viewport.panX).toBe(123.456789);
      expect(viewport.panY).toBe(987.654321);
    });

    it('should handle rapid successive updates', () => {
      const { syncViewport } = usePaperboxStore.getState();

      // Simulate rapid pan/zoom updates
      for (let i = 0; i < 100; i++) {
        syncViewport(1 + i * 0.1, i * 10, i * 20);
      }

      const { viewport } = usePaperboxStore.getState();
      expect(viewport.zoom).toBe(1 + 99 * 0.1);
      expect(viewport.panX).toBe(99 * 10);
      expect(viewport.panY).toBe(99 * 20);
    });
  });
});
