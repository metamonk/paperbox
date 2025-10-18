/**
 * Layers Slice Tests
 *
 * Tests for layer ordering and visibility management
 * Covers z-index operations, visibility controls, lock state, and utilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { usePaperboxStore } from '../index';
import type { LayerMetadata } from '../slices/layersSlice';

describe('layersSlice - Layer Ordering and Visibility Management', () => {
  beforeEach(() => {
    // Reset layers before each test by removing all layers
    const store = usePaperboxStore.getState();
    const layerOrder = store.getLayerOrder();
    layerOrder.forEach((layerId) => {
      store.removeLayer(layerId);
    });
  });

  describe('Initial State', () => {
    it('should have empty layers and layerOrder on initialization', () => {
      const { layers, layerOrder } = usePaperboxStore.getState();

      expect(layers).toEqual({});
      expect(layerOrder).toEqual([]);
    });
  });

  describe('addLayer()', () => {
    it('should add a layer with default metadata', () => {
      const store = usePaperboxStore.getState();

      store.addLayer('layer-1');

      const { layers, layerOrder } = usePaperboxStore.getState();
      expect(layers['layer-1']).toBeDefined();
      expect(layers['layer-1']).toEqual({
        id: 'layer-1',
        zIndex: 0,
        visible: true,
        locked: false,
        name: undefined,
      });
      expect(layerOrder).toEqual(['layer-1']);
    });

    it('should add a layer with custom metadata', () => {
      const store = usePaperboxStore.getState();

      store.addLayer('layer-1', {
        visible: false,
        locked: true,
        name: 'Background Layer',
      });

      const { layers } = usePaperboxStore.getState();
      expect(layers['layer-1']).toEqual({
        id: 'layer-1',
        zIndex: 0,
        visible: false,
        locked: true,
        name: 'Background Layer',
      });
    });

    it('should assign sequential z-index values', () => {
      const store = usePaperboxStore.getState();

      store.addLayer('layer-1');
      store.addLayer('layer-2');
      store.addLayer('layer-3');

      const { layers, layerOrder } = usePaperboxStore.getState();
      expect(layers['layer-1'].zIndex).toBe(0);
      expect(layers['layer-2'].zIndex).toBe(1);
      expect(layers['layer-3'].zIndex).toBe(2);
      expect(layerOrder).toEqual(['layer-1', 'layer-2', 'layer-3']);
    });
  });

  describe('removeLayer()', () => {
    it('should remove a layer', () => {
      const store = usePaperboxStore.getState();

      store.addLayer('layer-1');
      store.addLayer('layer-2');
      store.removeLayer('layer-1');

      const { layers, layerOrder } = usePaperboxStore.getState();
      expect(layers['layer-1']).toBeUndefined();
      expect(layerOrder).toEqual(['layer-2']);
    });

    it('should update z-index values after removal', () => {
      const store = usePaperboxStore.getState();

      store.addLayer('layer-1');
      store.addLayer('layer-2');
      store.addLayer('layer-3');
      store.removeLayer('layer-2'); // Remove middle layer

      const { layers } = usePaperboxStore.getState();
      expect(layers['layer-1'].zIndex).toBe(0);
      expect(layers['layer-3'].zIndex).toBe(1); // Should be re-indexed from 2 to 1
    });

    it('should handle removing non-existent layer gracefully', () => {
      const store = usePaperboxStore.getState();

      expect(() => store.removeLayer('non-existent')).not.toThrow();
    });
  });

  describe('renameLayer()', () => {
    it('should rename a layer', () => {
      const store = usePaperboxStore.getState();

      store.addLayer('layer-1', { name: 'Old Name' });
      store.renameLayer('layer-1', 'New Name');

      const { layers } = usePaperboxStore.getState();
      expect(layers['layer-1'].name).toBe('New Name');
    });

    it('should handle renaming non-existent layer gracefully', () => {
      const store = usePaperboxStore.getState();

      expect(() => store.renameLayer('non-existent', 'New Name')).not.toThrow();
    });
  });

  describe('Z-Index Management', () => {
    beforeEach(() => {
      const store = usePaperboxStore.getState();
      // Set up 3 layers for z-index testing
      store.addLayer('layer-1');
      store.addLayer('layer-2');
      store.addLayer('layer-3');
    });

    describe('moveToFront()', () => {
      it('should move layer to front (highest z-index)', () => {
        const store = usePaperboxStore.getState();

        store.moveToFront('layer-1'); // Move bottom to top

        const { layers, layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-2', 'layer-3', 'layer-1']);
        expect(layers['layer-2'].zIndex).toBe(0);
        expect(layers['layer-3'].zIndex).toBe(1);
        expect(layers['layer-1'].zIndex).toBe(2);
      });

      it('should handle moving already-front layer', () => {
        const store = usePaperboxStore.getState();

        store.moveToFront('layer-3'); // Already at front

        const { layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-1', 'layer-2', 'layer-3']); // Unchanged
      });

      it('should handle non-existent layer gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.moveToFront('non-existent')).not.toThrow();
      });
    });

    describe('moveToBack()', () => {
      it('should move layer to back (lowest z-index)', () => {
        const store = usePaperboxStore.getState();

        store.moveToBack('layer-3'); // Move top to bottom

        const { layers, layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-3', 'layer-1', 'layer-2']);
        expect(layers['layer-3'].zIndex).toBe(0);
        expect(layers['layer-1'].zIndex).toBe(1);
        expect(layers['layer-2'].zIndex).toBe(2);
      });

      it('should handle moving already-back layer', () => {
        const store = usePaperboxStore.getState();

        store.moveToBack('layer-1'); // Already at back

        const { layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-1', 'layer-2', 'layer-3']); // Unchanged
      });
    });

    describe('moveUp()', () => {
      it('should move layer up one position', () => {
        const store = usePaperboxStore.getState();

        store.moveUp('layer-2'); // Move middle up

        const { layers, layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-1', 'layer-3', 'layer-2']);
        expect(layers['layer-1'].zIndex).toBe(0);
        expect(layers['layer-3'].zIndex).toBe(1);
        expect(layers['layer-2'].zIndex).toBe(2);
      });

      it('should not move top layer up', () => {
        const store = usePaperboxStore.getState();

        store.moveUp('layer-3'); // Already at top

        const { layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-1', 'layer-2', 'layer-3']); // Unchanged
      });
    });

    describe('moveDown()', () => {
      it('should move layer down one position', () => {
        const store = usePaperboxStore.getState();

        store.moveDown('layer-2'); // Move middle down

        const { layers, layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-2', 'layer-1', 'layer-3']);
        expect(layers['layer-2'].zIndex).toBe(0);
        expect(layers['layer-1'].zIndex).toBe(1);
        expect(layers['layer-3'].zIndex).toBe(2);
      });

      it('should not move bottom layer down', () => {
        const store = usePaperboxStore.getState();

        store.moveDown('layer-1'); // Already at bottom

        const { layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-1', 'layer-2', 'layer-3']); // Unchanged
      });
    });

    describe('setZIndex()', () => {
      it('should set specific z-index', () => {
        const store = usePaperboxStore.getState();

        store.setZIndex('layer-1', 2); // Move bottom to top

        const { layers, layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-2', 'layer-3', 'layer-1']);
        expect(layers['layer-1'].zIndex).toBe(2);
      });

      it('should clamp z-index to valid range (upper bound)', () => {
        const store = usePaperboxStore.getState();

        store.setZIndex('layer-1', 999); // Beyond max

        const { layers, layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-2', 'layer-3', 'layer-1']);
        expect(layers['layer-1'].zIndex).toBe(2); // Clamped to max (2)
      });

      it('should clamp z-index to valid range (lower bound)', () => {
        const store = usePaperboxStore.getState();

        store.setZIndex('layer-3', -5); // Below min

        const { layers, layerOrder } = usePaperboxStore.getState();
        expect(layerOrder).toEqual(['layer-3', 'layer-1', 'layer-2']);
        expect(layers['layer-3'].zIndex).toBe(0); // Clamped to min (0)
      });

      it('should handle non-existent layer gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.setZIndex('non-existent', 1)).not.toThrow();
      });
    });
  });

  describe('Visibility Management', () => {
    beforeEach(() => {
      const store = usePaperboxStore.getState();
      store.addLayer('layer-1');
      store.addLayer('layer-2', { visible: false });
    });

    describe('setLayerVisibility()', () => {
      it('should set layer visibility to visible', () => {
        const store = usePaperboxStore.getState();

        store.setLayerVisibility('layer-2', true);

        expect(usePaperboxStore.getState().layers['layer-2'].visible).toBe(true);
      });

      it('should set layer visibility to hidden', () => {
        const store = usePaperboxStore.getState();

        store.setLayerVisibility('layer-1', false);

        expect(usePaperboxStore.getState().layers['layer-1'].visible).toBe(false);
      });

      it('should handle non-existent layer gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.setLayerVisibility('non-existent', true)).not.toThrow();
      });
    });

    describe('toggleLayerVisibility()', () => {
      it('should toggle visible layer to hidden', () => {
        const store = usePaperboxStore.getState();

        expect(usePaperboxStore.getState().layers['layer-1'].visible).toBe(true);

        store.toggleLayerVisibility('layer-1');

        expect(usePaperboxStore.getState().layers['layer-1'].visible).toBe(false);
      });

      it('should toggle hidden layer to visible', () => {
        const store = usePaperboxStore.getState();

        expect(usePaperboxStore.getState().layers['layer-2'].visible).toBe(false);

        store.toggleLayerVisibility('layer-2');

        expect(usePaperboxStore.getState().layers['layer-2'].visible).toBe(true);
      });

      it('should handle non-existent layer gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.toggleLayerVisibility('non-existent')).not.toThrow();
      });
    });

    describe('hideAllLayers()', () => {
      it('should hide all layers', () => {
        const store = usePaperboxStore.getState();

        store.hideAllLayers();

        const { layers } = usePaperboxStore.getState();
        expect(layers['layer-1'].visible).toBe(false);
        expect(layers['layer-2'].visible).toBe(false);
      });
    });

    describe('showAllLayers()', () => {
      it('should show all layers', () => {
        const store = usePaperboxStore.getState();

        store.showAllLayers();

        const { layers } = usePaperboxStore.getState();
        expect(layers['layer-1'].visible).toBe(true);
        expect(layers['layer-2'].visible).toBe(true);
      });
    });
  });

  describe('Lock State Management', () => {
    beforeEach(() => {
      const store = usePaperboxStore.getState();
      store.addLayer('layer-1');
      store.addLayer('layer-2', { locked: true });
    });

    describe('setLayerLock()', () => {
      it('should lock an unlocked layer', () => {
        const store = usePaperboxStore.getState();

        store.setLayerLock('layer-1', true);

        expect(usePaperboxStore.getState().layers['layer-1'].locked).toBe(true);
      });

      it('should unlock a locked layer', () => {
        const store = usePaperboxStore.getState();

        store.setLayerLock('layer-2', false);

        expect(usePaperboxStore.getState().layers['layer-2'].locked).toBe(false);
      });

      it('should handle non-existent layer gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.setLayerLock('non-existent', true)).not.toThrow();
      });
    });

    describe('toggleLayerLock()', () => {
      it('should toggle unlocked layer to locked', () => {
        const store = usePaperboxStore.getState();

        expect(usePaperboxStore.getState().layers['layer-1'].locked).toBe(false);

        store.toggleLayerLock('layer-1');

        expect(usePaperboxStore.getState().layers['layer-1'].locked).toBe(true);
      });

      it('should toggle locked layer to unlocked', () => {
        const store = usePaperboxStore.getState();

        expect(usePaperboxStore.getState().layers['layer-2'].locked).toBe(true);

        store.toggleLayerLock('layer-2');

        expect(usePaperboxStore.getState().layers['layer-2'].locked).toBe(false);
      });

      it('should handle non-existent layer gracefully', () => {
        const store = usePaperboxStore.getState();

        expect(() => store.toggleLayerLock('non-existent')).not.toThrow();
      });
    });
  });

  describe('Utility Functions', () => {
    beforeEach(() => {
      const store = usePaperboxStore.getState();
      store.addLayer('layer-1', { name: 'Background' });
      store.addLayer('layer-2', { visible: false, locked: true });
    });

    describe('getLayerById()', () => {
      it('should return layer metadata by ID', () => {
        const store = usePaperboxStore.getState();

        const layer = store.getLayerById('layer-1');

        expect(layer).toBeDefined();
        expect(layer?.id).toBe('layer-1');
        expect(layer?.name).toBe('Background');
      });

      it('should return undefined for non-existent layer', () => {
        const store = usePaperboxStore.getState();

        const layer = store.getLayerById('non-existent');

        expect(layer).toBeUndefined();
      });
    });

    describe('getLayerOrder()', () => {
      it('should return layer order array', () => {
        const store = usePaperboxStore.getState();

        const order = store.getLayerOrder();

        expect(order).toEqual(['layer-1', 'layer-2']);
      });
    });

    describe('getZIndex()', () => {
      it('should return z-index for existing layer', () => {
        const store = usePaperboxStore.getState();

        const zIndex = store.getZIndex('layer-2');

        expect(zIndex).toBe(1);
      });

      it('should return -1 for non-existent layer', () => {
        const store = usePaperboxStore.getState();

        const zIndex = store.getZIndex('non-existent');

        expect(zIndex).toBe(-1);
      });
    });

    describe('isLayerVisible()', () => {
      it('should return true for visible layer', () => {
        const store = usePaperboxStore.getState();

        const visible = store.isLayerVisible('layer-1');

        expect(visible).toBe(true);
      });

      it('should return false for hidden layer', () => {
        const store = usePaperboxStore.getState();

        const visible = store.isLayerVisible('layer-2');

        expect(visible).toBe(false);
      });

      it('should return true for non-existent layer (default)', () => {
        const store = usePaperboxStore.getState();

        const visible = store.isLayerVisible('non-existent');

        expect(visible).toBe(true);
      });
    });

    describe('isLayerLocked()', () => {
      it('should return false for unlocked layer', () => {
        const store = usePaperboxStore.getState();

        const locked = store.isLayerLocked('layer-1');

        expect(locked).toBe(false);
      });

      it('should return true for locked layer', () => {
        const store = usePaperboxStore.getState();

        const locked = store.isLayerLocked('layer-2');

        expect(locked).toBe(true);
      });

      it('should return false for non-existent layer (default)', () => {
        const store = usePaperboxStore.getState();

        const locked = store.isLayerLocked('non-existent');

        expect(locked).toBe(false);
      });
    });
  });

  describe('Layer Workflow Integration', () => {
    it('should handle complete layer management workflow', () => {
      const store = usePaperboxStore.getState();

      // 1. Add layers
      store.addLayer('background', { name: 'Background', locked: true });
      store.addLayer('content', { name: 'Content' });
      store.addLayer('overlay', { name: 'Overlay' });

      let { layerOrder } = usePaperboxStore.getState();
      expect(layerOrder).toEqual(['background', 'content', 'overlay']);

      // 2. Reorder layers
      store.moveToFront('background'); // Move background to top

      layerOrder = usePaperboxStore.getState().layerOrder;
      expect(layerOrder).toEqual(['content', 'overlay', 'background']);

      // 3. Toggle visibility
      store.setLayerVisibility('overlay', false);

      expect(store.isLayerVisible('overlay')).toBe(false);

      // 4. Unlock and rename
      store.setLayerLock('background', false);
      store.renameLayer('background', 'Top Layer');

      const background = store.getLayerById('background');
      expect(background?.locked).toBe(false);
      expect(background?.name).toBe('Top Layer');

      // 5. Remove layer
      store.removeLayer('content');

      layerOrder = usePaperboxStore.getState().layerOrder;
      expect(layerOrder).toEqual(['overlay', 'background']);
      expect(store.getLayerById('content')).toBeUndefined();
    });

    it('should maintain z-index consistency during complex operations', () => {
      const store = usePaperboxStore.getState();

      // Add 5 layers
      store.addLayer('layer-1');
      store.addLayer('layer-2');
      store.addLayer('layer-3');
      store.addLayer('layer-4');
      store.addLayer('layer-5');

      // Perform various reordering operations
      store.moveToFront('layer-1'); // 0→4
      store.moveToBack('layer-5'); // 4→0
      store.moveUp('layer-2'); // 0→1
      store.removeLayer('layer-3');

      const { layers, layerOrder } = usePaperboxStore.getState();

      // Verify z-index values match array positions
      layerOrder.forEach((layerId, expectedZIndex) => {
        expect(layers[layerId].zIndex).toBe(expectedZIndex);
      });
    });
  });
});
