/**
 * Layers Slice - Zustand Store
 *
 * Manages layer ordering and visibility
 * Part of 6-slice architecture for Phase II
 *
 * Responsibilities:
 * - Z-index management for canvas objects
 * - Layer visibility toggles
 * - Layer reordering operations (moveToFront, moveToBack, etc.)
 * - Layer hierarchy utilities
 */

import type { StateCreator } from 'zustand';
import type { PaperboxStore } from '../index';

/**
 * Layer metadata interface
 */
export interface LayerMetadata {
  id: string;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  name?: string;
}

/**
 * Layers slice state interface
 */
export interface LayersSlice {
  // State
  layers: Record<string, LayerMetadata>;
  layerOrder: string[]; // Ordered list of layer IDs (bottom to top)

  // Actions - Z-index management
  moveToFront: (id: string) => void;
  moveToBack: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  setZIndex: (id: string, zIndex: number) => void;

  // Actions - Visibility
  setLayerVisibility: (id: string, visible: boolean) => void;
  toggleLayerVisibility: (id: string) => void;
  hideAllLayers: () => void;
  showAllLayers: () => void;

  // Actions - Lock state
  setLayerLock: (id: string, locked: boolean) => void;
  toggleLayerLock: (id: string) => void;

  // Actions - Layer management
  addLayer: (id: string, metadata?: Partial<LayerMetadata>) => void;
  removeLayer: (id: string) => void;
  renameLayer: (id: string, name: string) => void;

  // Utilities
  getLayerById: (id: string) => LayerMetadata | undefined;
  getLayerOrder: () => string[];
  getZIndex: (id: string) => number;
  isLayerVisible: (id: string) => boolean;
  isLayerLocked: (id: string) => boolean;
}

/**
 * Create layers slice
 *
 * Manages layer ordering (z-index) and visibility for canvas objects
 */
export const createLayersSlice: StateCreator<
  PaperboxStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  LayersSlice
> = (set, get) => ({
  // Initial state
  layers: {},
  layerOrder: [],

  // Z-index management actions

  /**
   * Move layer to front (highest z-index)
   */
  moveToFront: (id: string) =>
    set(
      (state) => {
        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex === -1) return;

        // Remove from current position
        state.layerOrder.splice(currentIndex, 1);

        // Add to end (top layer)
        state.layerOrder.push(id);

        // Update z-index values
        state.layerOrder.forEach((layerId, index) => {
          if (state.layers[layerId]) {
            state.layers[layerId].zIndex = index;
          }
        });
      },
      undefined,
      'layers/moveToFront',
    ),

  /**
   * Move layer to back (lowest z-index)
   */
  moveToBack: (id: string) =>
    set(
      (state) => {
        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex === -1) return;

        // Remove from current position
        state.layerOrder.splice(currentIndex, 1);

        // Add to beginning (bottom layer)
        state.layerOrder.unshift(id);

        // Update z-index values
        state.layerOrder.forEach((layerId, index) => {
          if (state.layers[layerId]) {
            state.layers[layerId].zIndex = index;
          }
        });
      },
      undefined,
      'layers/moveToBack',
    ),

  /**
   * Move layer up one position
   */
  moveUp: (id: string) =>
    set(
      (state) => {
        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex === -1 || currentIndex === state.layerOrder.length - 1)
          return;

        // Swap with layer above
        [state.layerOrder[currentIndex], state.layerOrder[currentIndex + 1]] = [
          state.layerOrder[currentIndex + 1],
          state.layerOrder[currentIndex],
        ];

        // Update z-index values
        if (state.layers[state.layerOrder[currentIndex]]) {
          state.layers[state.layerOrder[currentIndex]].zIndex = currentIndex;
        }
        if (state.layers[state.layerOrder[currentIndex + 1]]) {
          state.layers[state.layerOrder[currentIndex + 1]].zIndex =
            currentIndex + 1;
        }
      },
      undefined,
      'layers/moveUp',
    ),

  /**
   * Move layer down one position
   */
  moveDown: (id: string) =>
    set(
      (state) => {
        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex <= 0) return;

        // Swap with layer below
        [state.layerOrder[currentIndex], state.layerOrder[currentIndex - 1]] = [
          state.layerOrder[currentIndex - 1],
          state.layerOrder[currentIndex],
        ];

        // Update z-index values
        if (state.layers[state.layerOrder[currentIndex]]) {
          state.layers[state.layerOrder[currentIndex]].zIndex = currentIndex;
        }
        if (state.layers[state.layerOrder[currentIndex - 1]]) {
          state.layers[state.layerOrder[currentIndex - 1]].zIndex =
            currentIndex - 1;
        }
      },
      undefined,
      'layers/moveDown',
    ),

  /**
   * Set specific z-index for layer
   */
  setZIndex: (id: string, zIndex: number) =>
    set(
      (state) => {
        const layer = state.layers[id];
        if (!layer) return;

        const currentIndex = state.layerOrder.indexOf(id);
        if (currentIndex === -1) return;

        // Clamp to valid range
        const newIndex = Math.max(
          0,
          Math.min(zIndex, state.layerOrder.length - 1),
        );

        // Remove from current position
        state.layerOrder.splice(currentIndex, 1);

        // Insert at new position
        state.layerOrder.splice(newIndex, 0, id);

        // Update all z-index values
        state.layerOrder.forEach((layerId, index) => {
          if (state.layers[layerId]) {
            state.layers[layerId].zIndex = index;
          }
        });
      },
      undefined,
      'layers/setZIndex',
    ),

  // Visibility actions

  /**
   * Set layer visibility
   */
  setLayerVisibility: (id: string, visible: boolean) =>
    set(
      (state) => {
        const layer = state.layers[id];
        if (layer) {
          layer.visible = visible;
        }
      },
      undefined,
      'layers/setLayerVisibility',
    ),

  /**
   * Toggle layer visibility
   */
  toggleLayerVisibility: (id: string) =>
    set(
      (state) => {
        const layer = state.layers[id];
        if (layer) {
          layer.visible = !layer.visible;
        }
      },
      undefined,
      'layers/toggleLayerVisibility',
    ),

  /**
   * Hide all layers
   */
  hideAllLayers: () =>
    set(
      (state) => {
        Object.values(state.layers).forEach((layer) => {
          layer.visible = false;
        });
      },
      undefined,
      'layers/hideAllLayers',
    ),

  /**
   * Show all layers
   */
  showAllLayers: () =>
    set(
      (state) => {
        Object.values(state.layers).forEach((layer) => {
          layer.visible = true;
        });
      },
      undefined,
      'layers/showAllLayers',
    ),

  // Lock state actions

  /**
   * Set layer lock state
   */
  setLayerLock: (id: string, locked: boolean) =>
    set(
      (state) => {
        const layer = state.layers[id];
        if (layer) {
          layer.locked = locked;
        }
      },
      undefined,
      'layers/setLayerLock',
    ),

  /**
   * Toggle layer lock state
   */
  toggleLayerLock: (id: string) =>
    set(
      (state) => {
        const layer = state.layers[id];
        if (layer) {
          layer.locked = !layer.locked;
        }
      },
      undefined,
      'layers/toggleLayerLock',
    ),

  // Layer management actions

  /**
   * Add new layer
   *
   * CRITICAL FIX: Prevents duplicate layer entries that cause rendering issues
   * When setObjects is called multiple times (real-time sync), it would call
   * addLayer for all objects, creating duplicates in layerOrder array.
   */
  addLayer: (id: string, metadata: Partial<LayerMetadata> = {}) =>
    set(
      (state) => {
        // PREVENT DUPLICATES: Check if layer already exists
        if (state.layers[id]) {
          console.warn(`[layersSlice] Layer ${id} already exists, skipping duplicate add`);
          return;
        }

        const zIndex = state.layerOrder.length;

        state.layers[id] = {
          id,
          zIndex,
          visible: metadata.visible ?? true,
          locked: metadata.locked ?? false,
          name: metadata.name,
        };

        state.layerOrder.push(id);
      },
      undefined,
      'layers/addLayer',
    ),

  /**
   * Remove layer
   */
  removeLayer: (id: string) =>
    set(
      (state) => {
        delete state.layers[id];

        const index = state.layerOrder.indexOf(id);
        if (index !== -1) {
          state.layerOrder.splice(index, 1);
        }

        // Update z-index values for remaining layers
        state.layerOrder.forEach((layerId, idx) => {
          if (state.layers[layerId]) {
            state.layers[layerId].zIndex = idx;
          }
        });
      },
      undefined,
      'layers/removeLayer',
    ),

  /**
   * Rename layer
   */
  renameLayer: (id: string, name: string) =>
    set(
      (state) => {
        const layer = state.layers[id];
        if (layer) {
          layer.name = name;
        }
      },
      undefined,
      'layers/renameLayer',
    ),

  // Utility functions

  /**
   * Get layer by ID
   */
  getLayerById: (id: string) => {
    return get().layers[id];
  },

  /**
   * Get layer order (bottom to top)
   */
  getLayerOrder: () => {
    return get().layerOrder;
  },

  /**
   * Get z-index for layer
   */
  getZIndex: (id: string) => {
    return get().layers[id]?.zIndex ?? -1;
  },

  /**
   * Check if layer is visible
   */
  isLayerVisible: (id: string) => {
    return get().layers[id]?.visible ?? true;
  },

  /**
   * Check if layer is locked
   */
  isLayerLocked: (id: string) => {
    return get().layers[id]?.locked ?? false;
  },
});
