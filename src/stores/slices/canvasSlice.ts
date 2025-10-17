/**
 * Canvas Slice - Zustand Store
 *
 * Manages canvas objects state and Fabric.js integration
 * Part of 6-slice architecture for Phase II
 *
 * Responsibilities:
 * - Canvas objects storage (Record<id, CanvasObject>)
 * - Fabric.js canvas manager integration
 * - CRUD operations for canvas objects
 * - Optimistic updates pattern
 */

import type { StateCreator } from 'zustand';
import type { CanvasObject } from '../../types/canvas';
import type { PaperboxStore } from '../index';

/**
 * Canvas slice state interface
 */
export interface CanvasSlice {
  // State
  objects: Record<string, CanvasObject>;
  loading: boolean;
  error: string | null;

  // Actions
  addObject: (object: CanvasObject) => void;
  updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  removeObject: (id: string) => void;
  removeObjects: (ids: string[]) => void;
  clearAllObjects: () => void;
  setObjects: (objects: Record<string, CanvasObject>) => void;

  // Utility
  getObjectById: (id: string) => CanvasObject | undefined;
  getAllObjects: () => CanvasObject[];
}

/**
 * Create canvas slice
 *
 * Following Zustand slices pattern with Immer middleware
 */
export const createCanvasSlice: StateCreator<
  PaperboxStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  CanvasSlice
> = (set, get) => ({
  // Initial state
  objects: {},
  loading: false,
  error: null,

  // Actions

  /**
   * Add a new canvas object
   *
   * Pattern: Immutable update via Immer
   */
  addObject: (object: CanvasObject) =>
    set(
      (state) => {
        state.objects[object.id] = object;
      },
      undefined,
      'canvas/addObject',
    ),

  /**
   * Update existing canvas object
   *
   * Performs shallow merge of updates
   */
  updateObject: (id: string, updates: Partial<CanvasObject>) =>
    set(
      (state) => {
        const existing = state.objects[id];
        if (existing) {
          state.objects[id] = { ...existing, ...updates };
        }
      },
      undefined,
      'canvas/updateObject',
    ),

  /**
   * Remove single canvas object
   */
  removeObject: (id: string) =>
    set(
      (state) => {
        delete state.objects[id];
      },
      undefined,
      'canvas/removeObject',
    ),

  /**
   * Remove multiple canvas objects (batch operation)
   */
  removeObjects: (ids: string[]) =>
    set(
      (state) => {
        ids.forEach((id) => {
          delete state.objects[id];
        });
      },
      undefined,
      'canvas/removeObjects',
    ),

  /**
   * Clear all canvas objects
   */
  clearAllObjects: () =>
    set(
      (state) => {
        state.objects = {};
      },
      undefined,
      'canvas/clearAllObjects',
    ),

  /**
   * Set all canvas objects (bulk replacement)
   *
   * Used for initial load from database
   */
  setObjects: (objects: Record<string, CanvasObject>) =>
    set(
      (state) => {
        state.objects = objects;
      },
      undefined,
      'canvas/setObjects',
    ),

  /**
   * Get object by ID (selector)
   */
  getObjectById: (id: string) => {
    return get().objects[id];
  },

  /**
   * Get all objects as array (selector)
   */
  getAllObjects: () => {
    return Object.values(get().objects);
  },
});
