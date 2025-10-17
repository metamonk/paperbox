/**
 * Canvas Slice - Zustand Store
 *
 * Manages canvas objects state and Fabric.js integration
 * Part of 6-slice architecture for Phase II
 *
 * Responsibilities:
 * - Canvas objects storage (Record<id, CanvasObject>)
 * - Fabric.js canvas manager integration
 * - CRUD operations for canvas objects with Supabase sync
 * - Optimistic updates pattern with rollback on error
 *
 * PRD Architecture: Layer 2 (State Layer)
 * Coordinates with: Layer 3 (Sync Layer via SyncManager)
 */

import type { StateCreator } from 'zustand';
import { nanoid } from 'nanoid';
import { supabase } from '../../lib/supabase';
import type {
  CanvasObject,
  RectangleObject,
  CircleObject,
  TextObject,
} from '../../types/canvas';
import type { PaperboxStore } from '../index';
import type { Database } from '../../types/database';

type DbCanvasObject = Database['public']['Tables']['canvas_objects']['Row'];
type DbCanvasObjectInsert = Database['public']['Tables']['canvas_objects']['Insert'];

/**
 * Convert database row to CanvasObject discriminated union
 */
function dbToCanvasObject(row: DbCanvasObject): CanvasObject {
  const base = {
    id: row.id,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    rotation: row.rotation || 0,
    group_id: row.group_id,
    z_index: row.z_index,
    fill: row.fill,
    stroke: row.stroke,
    stroke_width: row.stroke_width,
    opacity: row.opacity,
    type_properties: row.type_properties || {},
    style_properties: row.style_properties || {},
    metadata: row.metadata || {},
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    locked_by: row.locked_by,
    lock_acquired_at: row.lock_acquired_at,
  };

  switch (row.type) {
    case 'rectangle':
      return { ...base, type: 'rectangle' } as RectangleObject;
    case 'circle':
      return { ...base, type: 'circle' } as CircleObject;
    case 'text':
      return { ...base, type: 'text' } as TextObject;
    default:
      throw new Error(`Unknown shape type: ${row.type}`);
  }
}

/**
 * Canvas slice state interface
 */
export interface CanvasSlice {
  // State
  objects: Record<string, CanvasObject>;
  loading: boolean;
  error: string | null;

  // Lifecycle
  initialize: (userId: string) => Promise<void>;
  cleanup: () => void;

  // CRUD Operations (Supabase-integrated)
  createObject: (object: Partial<CanvasObject>, userId: string) => Promise<string>;
  updateObject: (id: string, updates: Partial<CanvasObject>) => Promise<void>;
  deleteObjects: (ids: string[]) => Promise<void>;

  // Internal mutations (for SyncManager)
  _addObject: (object: CanvasObject) => void;
  _updateObject: (id: string, updates: Partial<CanvasObject>) => void;
  _removeObject: (id: string) => void;
  _removeObjects: (ids: string[]) => void;
  _setObjects: (objects: Record<string, CanvasObject>) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;

  // Utility
  getObjectById: (id: string) => CanvasObject | undefined;
  getAllObjects: () => CanvasObject[];
}

/**
 * Create canvas slice
 *
 * Following Zustand slices pattern with Immer middleware
 * PRD Pattern: W1.D4 - Zustand + Supabase Integration
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

  // ─── Lifecycle ───

  /**
   * W1.D4.2-3: Initialize canvas store from Supabase
   *
   * Fetches all canvas_objects from database and populates store
   */
  initialize: async (userId: string) => {
    set({ loading: true, error: null }, undefined, 'canvas/initialize');

    try {
      const { data, error } = await supabase
        .from('canvas_objects')
        .select('*')
        .eq('created_by', userId);

      if (error) throw error;

      // Convert array to Record<id, CanvasObject>
      const objectsMap = (data || []).reduce(
        (acc, row) => {
          const obj = dbToCanvasObject(row as DbCanvasObject);
          acc[obj.id] = obj;
          return acc;
        },
        {} as Record<string, CanvasObject>,
      );

      set({ objects: objectsMap, loading: false }, undefined, 'canvas/initializeSuccess');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load canvas objects';
      set({ error: errorMessage, loading: false }, undefined, 'canvas/initializeError');
      console.error('Canvas initialize error:', error);
    }
  },

  /**
   * Cleanup (for unmount)
   */
  cleanup: () => {
    set({ objects: {}, loading: false, error: null }, undefined, 'canvas/cleanup');
  },

  // ─── CRUD Operations (Supabase-integrated) ───

  /**
   * W1.D4.4: Create object with Supabase sync
   *
   * Pattern: Optimistic update → Database write → Rollback on error
   */
  createObject: async (object: Partial<CanvasObject>, userId: string) => {
    const id = nanoid();
    const now = new Date().toISOString();

    // Create full object with defaults
    // Type assertion needed due to discriminated union complexity
    const fullObject = {
      id,
      type: object.type!,
      x: object.x ?? 100,
      y: object.y ?? 100,
      width: object.width ?? 100,
      height: object.height ?? 100,
      rotation: object.rotation ?? 0,
      group_id: object.group_id ?? null,
      z_index: object.z_index ?? 0,
      fill: object.fill ?? '#000000',
      stroke: object.stroke ?? null,
      stroke_width: object.stroke_width ?? null,
      opacity: object.opacity ?? 1,
      type_properties: object.type_properties ?? {},
      style_properties: object.style_properties ?? {},
      metadata: object.metadata ?? {},
      created_by: userId,
      created_at: now,
      updated_at: now,
      locked_by: null,
      lock_acquired_at: null,
    } as CanvasObject;

    // Optimistic update
    set(
      (state) => {
        state.objects[id] = fullObject;
      },
      undefined,
      'canvas/createObjectOptimistic',
    );

    try {
      // Database write
      // @ts-expect-error - Supabase generated types have issues with discriminated unions
      const { error } = await supabase.from('canvas_objects').insert({
        id: fullObject.id,
        type: fullObject.type,
        x: fullObject.x,
        y: fullObject.y,
        width: fullObject.width,
        height: fullObject.height,
        rotation: fullObject.rotation,
        group_id: fullObject.group_id,
        z_index: fullObject.z_index,
        fill: fullObject.fill,
        stroke: fullObject.stroke,
        stroke_width: fullObject.stroke_width,
        opacity: fullObject.opacity,
        type_properties: fullObject.type_properties,
        style_properties: fullObject.style_properties,
        metadata: fullObject.metadata,
        created_by: userId,
      });

      if (error) throw error;

      return id;
    } catch (error) {
      // Rollback optimistic update on error
      set(
        (state) => {
          delete state.objects[id];
        },
        undefined,
        'canvas/createObjectRollback',
      );

      const errorMessage = error instanceof Error ? error.message : 'Failed to create object';
      console.error('Create object error:', error);
      throw new Error(errorMessage);
    }
  },

  /**
   * W1.D4.5: Update object with Supabase sync
   *
   * Pattern: Optimistic update → Database write → Rollback on error
   */
  updateObject: async (id: string, updates: Partial<CanvasObject>) => {
    const existing = get().objects[id];
    if (!existing) {
      throw new Error(`Object ${id} not found`);
    }

    // Store previous state for rollback
    const previousState = { ...existing };

    // Optimistic update
    set(
      (state) => {
        state.objects[id] = {
          ...existing,
          ...updates,
          updated_at: new Date().toISOString(),
        } as CanvasObject;
      },
      undefined,
      'canvas/updateObjectOptimistic',
    );

    try {
      // Database write
      // @ts-expect-error - Supabase generated types have issues with partial updates
      const { error } = await supabase
        .from('canvas_objects')
        .update({
          x: updates.x,
          y: updates.y,
          width: updates.width,
          height: updates.height,
          rotation: updates.rotation,
          group_id: updates.group_id,
          z_index: updates.z_index,
          fill: updates.fill,
          stroke: updates.stroke,
          stroke_width: updates.stroke_width,
          opacity: updates.opacity,
          type_properties: updates.type_properties,
          style_properties: updates.style_properties,
          metadata: updates.metadata,
          locked_by: updates.locked_by,
          lock_acquired_at: updates.lock_acquired_at,
        })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      // Rollback optimistic update on error
      set(
        (state) => {
          state.objects[id] = previousState;
        },
        undefined,
        'canvas/updateObjectRollback',
      );

      const errorMessage = error instanceof Error ? error.message : 'Failed to update object';
      console.error('Update object error:', error);
      throw new Error(errorMessage);
    }
  },

  /**
   * W1.D4.6: Delete objects with Supabase sync
   *
   * Pattern: Optimistic delete → Database delete → Restore on error
   */
  deleteObjects: async (ids: string[]) => {
    // Store objects for potential rollback
    const deletedObjects = ids.map((id) => get().objects[id]).filter(Boolean);

    if (deletedObjects.length === 0) {
      return;
    }

    // Optimistic delete
    set(
      (state) => {
        ids.forEach((id) => {
          delete state.objects[id];
        });
      },
      undefined,
      'canvas/deleteObjectsOptimistic',
    );

    try {
      // Database delete
      const { error } = await supabase.from('canvas_objects').delete().in('id', ids);

      if (error) throw error;
    } catch (error) {
      // Rollback optimistic delete on error
      set(
        (state) => {
          deletedObjects.forEach((obj) => {
            state.objects[obj.id] = obj;
          });
        },
        undefined,
        'canvas/deleteObjectsRollback',
      );

      const errorMessage = error instanceof Error ? error.message : 'Failed to delete objects';
      console.error('Delete objects error:', error);
      throw new Error(errorMessage);
    }
  },

  // ─── Internal mutations (for SyncManager) ───

  /**
   * Internal: Add object (called by SyncManager on realtime INSERT)
   */
  _addObject: (object: CanvasObject) =>
    set(
      (state) => {
        state.objects[object.id] = object;
      },
      undefined,
      'canvas/_addObject',
    ),

  /**
   * Internal: Update object (called by SyncManager on realtime UPDATE)
   */
  _updateObject: (id: string, updates: Partial<CanvasObject>) =>
    set(
      (state) => {
        const existing = state.objects[id];
        if (existing) {
          state.objects[id] = { ...existing, ...updates } as CanvasObject;
        }
      },
      undefined,
      'canvas/_updateObject',
    ),

  /**
   * Internal: Remove object (called by SyncManager on realtime DELETE)
   */
  _removeObject: (id: string) =>
    set(
      (state) => {
        delete state.objects[id];
      },
      undefined,
      'canvas/_removeObject',
    ),

  /**
   * Internal: Remove multiple objects
   */
  _removeObjects: (ids: string[]) =>
    set(
      (state) => {
        ids.forEach((id) => {
          delete state.objects[id];
        });
      },
      undefined,
      'canvas/_removeObjects',
    ),

  /**
   * Internal: Set all objects (bulk replacement)
   */
  _setObjects: (objects: Record<string, CanvasObject>) =>
    set(
      (state) => {
        state.objects = objects;
      },
      undefined,
      'canvas/_setObjects',
    ),

  /**
   * Internal: Set loading state
   */
  _setLoading: (loading: boolean) =>
    set({ loading }, undefined, 'canvas/_setLoading'),

  /**
   * Internal: Set error state
   */
  _setError: (error: string | null) =>
    set({ error }, undefined, 'canvas/_setError'),

  // ─── Utility selectors ───

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
