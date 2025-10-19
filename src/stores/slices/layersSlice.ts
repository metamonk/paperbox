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
import { supabase } from '../../lib/supabase';

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
  moveToFront: (id: string) => Promise<void>;
  moveToBack: (id: string) => Promise<void>;
  moveUp: (id: string) => Promise<void>;
  moveDown: (id: string) => Promise<void>;
  setZIndex: (id: string, zIndex: number) => Promise<void>;

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
  renameLayer: (id: string, name: string) => Promise<void>;

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
   * Async: Persists via setZIndex
   */
  moveToFront: async (id: string) => {
    const state = get();
    const newZIndex = state.layerOrder.length - 1;
    await get().setZIndex(id, newZIndex);
  },

  /**
   * Move layer to back (lowest z-index)
   * Async: Persists via setZIndex
   */
  moveToBack: async (id: string) => {
    await get().setZIndex(id, 0);
  },

  /**
   * Move layer up one position
   * Async: Persists via setZIndex
   */
  moveUp: async (id: string) => {
    const state = get();
    const currentIndex = state.layerOrder.indexOf(id);
    if (currentIndex === -1 || currentIndex === state.layerOrder.length - 1) return;
    
    await get().setZIndex(id, currentIndex + 1);
  },

  /**
   * Move layer down one position
   * Async: Persists via setZIndex
   */
  moveDown: async (id: string) => {
    const state = get();
    const currentIndex = state.layerOrder.indexOf(id);
    if (currentIndex === -1 || currentIndex === 0) return;
    
    await get().setZIndex(id, currentIndex - 1);
  },

  /**
   * Set specific z-index for layer
   * Async: Persists to database with optimistic update
   * 
   * PERFORMANCE: Uses atomic batch_update_z_index RPC for:
   * - Single database query (vs N separate queries)
   * - Single realtime broadcast (vs N events)
   * - Atomic transaction (all layers update or none)
   * 
   * Result: 50x faster for 50 layers with 10 users (500 renders → 10 renders)
   */
  setZIndex: async (id: string, zIndex: number) => {
    const state = get();
    const layer = state.layers[id];
    if (!layer) return;

    const currentIndex = state.layerOrder.indexOf(id);
    if (currentIndex === -1) return;

    // Store for rollback
    const previousOrder = [...state.layerOrder];
    const previousLayers = JSON.parse(JSON.stringify(state.layers));

    // 1. Optimistic update (instant UI)
    set(
      (state) => {
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
      'layers/setZIndexOptimistic',
    );

    // 2. Persist ALL layers' z_index values to database (atomic batch operation)
    try {
      // Get the updated layer order after optimistic update
      const updatedOrder = get().layerOrder;
      
      // Prepare arrays for batch RPC call
      const layer_ids = updatedOrder;
      const new_z_indices = updatedOrder.map((_, index) => index);

      // Single RPC call updates all layers atomically
      // This triggers ONE realtime broadcast instead of N broadcasts
      const { error } = await supabase.rpc('batch_update_z_index', {
        layer_ids,
        new_z_indices,
      });

      if (error) throw error;

      console.log(
        '[layersSlice] ✅ Atomically updated z_index for',
        updatedOrder.length,
        'layers (single query, single broadcast)',
      );
    } catch (error) {
      // 3. Rollback on error
      set(
        (state) => {
          state.layerOrder = previousOrder;
          state.layers = previousLayers;
        },
        undefined,
        'layers/setZIndexRollback',
      );

      console.error('[layersSlice] Failed to persist z-index:', error);
      throw error;
    }
  },

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
   * Async: Persists to database metadata with optimistic update
   */
  renameLayer: async (id: string, name: string) => {
    const state = get();
    const layer = state.layers[id];
    if (!layer) return;

    // Store for rollback
    const previousName = layer.name;

    // 1. Optimistic update (instant UI)
    set(
      (state) => {
        const layer = state.layers[id];
        if (layer) {
          layer.name = name;
        }
      },
      undefined,
      'layers/renameLayerOptimistic',
    );

    // 2. Persist to database (store in metadata.layer_name)
    try {
      const object = state.objects[id];
      const updatedMetadata = {
        ...(object?.metadata || {}),
        layer_name: name,
      };

      const { error } = await supabase
        .from('canvas_objects')
        .update({ metadata: updatedMetadata })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // 3. Rollback on error
      set(
        (state) => {
          const layer = state.layers[id];
          if (layer) {
            layer.name = previousName;
          }
        },
        undefined,
        'layers/renameLayerRollback',
      );

      console.error('[layersSlice] Failed to persist layer name:', error);
      throw error;
    }
  },

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
