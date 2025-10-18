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
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  CanvasObject,
  RectangleObject,
  CircleObject,
  TextObject,
} from '../../types/canvas';
import type { PaperboxStore } from '../index';
import type { Database } from '../../types/database';

type DbCanvasObject = Database['public']['Tables']['canvas_objects']['Row'];

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
      return { ...base, type: 'rectangle' } as unknown as RectangleObject;
    case 'circle':
      return { ...base, type: 'circle' } as unknown as CircleObject;
    case 'text':
      return { ...base, type: 'text' } as unknown as TextObject;
    default:
      throw new Error(`Unknown shape type: ${row.type}`);
  }
}

/**
 * Viewport state for infinite canvas
 * W2.D6.2: Hybrid approach - Fabric.js primary + Zustand snapshots
 */
export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Canvas slice state interface
 */
export interface CanvasSlice {
  // State
  objects: Record<string, CanvasObject>;
  loading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;
  viewport: ViewportState;

  // Lifecycle
  initialize: (userId: string) => Promise<void>;
  cleanup: () => void;

  // CRUD Operations (Supabase-integrated)
  createObject: (object: Partial<CanvasObject>, userId: string) => Promise<string>;
  updateObject: (id: string, updates: Partial<CanvasObject>) => Promise<void>;
  deleteObjects: (ids: string[]) => Promise<void>;

  // Realtime Subscriptions (W1.D4.7-4.9)
  setupRealtimeSubscription: (userId: string) => void;
  cleanupRealtimeSubscription: () => void;

  // Viewport Management (W2.D6.2)
  syncViewport: (zoom: number, panX: number, panY: number) => void;
  restoreViewport: () => ViewportState;

  // Viewport Persistence (W2.D7.2-7.4)
  resetViewport: () => void;
  loadViewportFromStorage: () => void;
  loadViewportFromPostgreSQL: () => Promise<void>;
  initializeViewport: () => Promise<void>;

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
// W2.D7.4: Debounce timer for PostgreSQL viewport saves (module-level)
let viewportSaveTimer: ReturnType<typeof setTimeout> | null = null;
const VIEWPORT_SAVE_DEBOUNCE_MS = 5000; // 5 seconds

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
  realtimeChannel: null,
  viewport: { zoom: 1, panX: 0, panY: 0 }, // W2.D6.2: Default viewport state

  // ─── Lifecycle ───

  /**
   * W1.D4.2-3: Initialize canvas store from Supabase
   *
   * Fetches all canvas_objects from database and populates store
   * W1.D4.8: Setup realtime subscription after data load
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

      console.log('[canvasSlice] Database query completed:', {
        rowCount: data?.length || 0,
        objectCount: Object.keys(objectsMap).length,
        objectIds: Object.keys(objectsMap),
        objectTypes: Object.values(objectsMap).map(o => `${o.type}:${o.id.slice(0, 6)}`),
      });

      set({ objects: objectsMap, loading: false }, undefined, 'canvas/initializeSuccess');

      console.log('[canvasSlice] Objects set in store, now adding layers...');

      // Add layer metadata for all loaded objects
      Object.values(objectsMap).forEach((obj) => {
        console.log('[canvasSlice] Adding layer for loaded object:', {
          id: obj.id.slice(0, 8),
          type: obj.type,
          position: `(${obj.x}, ${obj.y})`,
        });
        get().addLayer(obj.id, {
          name: `${obj.type} ${obj.id.slice(0, 6)}`,
          visible: true,
          locked: false,
        });
      });

      console.log('[canvasSlice] Layer metadata creation complete');

      // Setup realtime subscription after successful load
      get().setupRealtimeSubscription(userId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load canvas objects';
      set({ error: errorMessage, loading: false }, undefined, 'canvas/initializeError');
      console.error('Canvas initialize error:', error);
    }
  },

  /**
   * Cleanup (for unmount)
   * W1.D4.8: Cleanup realtime subscription
   */
  cleanup: () => {
    get().cleanupRealtimeSubscription();
    set({ objects: {}, loading: false, error: null }, undefined, 'canvas/cleanup');
  },

  // ─── CRUD Operations (Supabase-integrated) ───

  /**
   * W1.D4.4: Create object with Supabase sync
   *
   * Pattern: Optimistic update → Database write → Rollback on error
   */
  createObject: async (object: Partial<CanvasObject>, userId: string) => {
    const id = crypto.randomUUID();
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

    // Optimistic update - add to objects AND layers
    set(
      (state) => {
        state.objects[id] = fullObject;
      },
      undefined,
      'canvas/createObjectOptimistic',
    );

    // Add layer metadata for layers panel
    get().addLayer(id, {
      name: `${fullObject.type} ${id.slice(0, 6)}`,
      visible: true,
      locked: false,
    });

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
          type_properties: updates.type_properties as any,
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

    // Optimistic delete from objects AND layers
    set(
      (state) => {
        ids.forEach((id) => {
          delete state.objects[id];
        });
      },
      undefined,
      'canvas/deleteObjectsOptimistic',
    );

    // Remove layers
    ids.forEach((id) => {
      get().removeLayer(id);
    });

    try {
      // Database delete
      const { error } = await supabase.from('canvas_objects').delete().in('id', ids);

      if (error) throw error;
    } catch (error) {
      // Rollback optimistic delete on error - restore objects AND layers
      set(
        (state) => {
          deletedObjects.forEach((obj) => {
            state.objects[obj.id] = obj;
          });
        },
        undefined,
        'canvas/deleteObjectsRollback',
      );

      // Restore layers
      deletedObjects.forEach((obj) => {
        get().addLayer(obj.id, {
          name: `${obj.type} ${obj.id.slice(0, 6)}`,
          visible: true,
          locked: false,
        });
      });

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

  // ─── Realtime Subscriptions (W1.D4.7-4.9) ───

  /**
   * W1.D4.8: Setup realtime subscription for postgres_changes
   *
   * Subscribes to INSERT, UPDATE, DELETE events on canvas_objects table
   * Filters by created_by = userId for multi-user support
   */
  setupRealtimeSubscription: (userId: string) => {
    // Cleanup existing subscription first
    get().cleanupRealtimeSubscription();

    // Create channel with postgres_changes subscription
    const channel = supabase
      .channel('canvas-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'canvas_objects',
          filter: `created_by=eq.${userId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          switch (eventType) {
            case 'INSERT': {
              // Add new object to state
              const insertedObj = dbToCanvasObject(newRecord as DbCanvasObject);
              get()._addObject(insertedObj);
              break;
            }

            case 'UPDATE': {
              // Update existing object
              const updatedObj = dbToCanvasObject(newRecord as DbCanvasObject);
              get()._updateObject(updatedObj.id, updatedObj);
              break;
            }

            case 'DELETE': {
              // Remove object from state
              get()._removeObject((oldRecord as { id: string }).id);
              break;
            }
          }
        },
      )
      .subscribe();

    set({ realtimeChannel: channel }, undefined, 'canvas/setupRealtime');
  },

  /**
   * W1.D4.8: Cleanup realtime subscription
   *
   * Unsubscribes from channel and clears reference
   */
  cleanupRealtimeSubscription: () => {
    const channel = get().realtimeChannel;
    if (channel) {
      channel.unsubscribe();
      set({ realtimeChannel: null }, undefined, 'canvas/cleanupRealtime');
    }
  },

  // ─── Viewport Management (W2.D6.2 + W2.D7.3-7.4) ───

  /**
   * W2.D6.2 + W2.D7.3-7.4: Sync viewport state from Fabric.js with persistence
   *
   * Called by FabricCanvasManager after pan/zoom events
   * W2.D7.3: Saves to localStorage immediately (synchronous)
   * W2.D7.4: Debounces PostgreSQL save by 5 seconds
   */
  syncViewport: (zoom: number, panX: number, panY: number) => {
    // Update store state
    set(
      {
        viewport: { zoom, panX, panY },
      },
      undefined,
      'canvas/syncViewport',
    );

    // W2.D7.3: Save to localStorage immediately (synchronous, non-blocking)
    try {
      localStorage.setItem(
        'canvas_viewport',
        JSON.stringify({ zoom, panX, panY }),
      );
    } catch (error) {
      // Handle QuotaExceededError or other localStorage errors silently
      console.warn('Failed to save viewport to localStorage:', error);
    }

    // W2.D7.4: Debounced save to PostgreSQL (5 second debounce)
    if (viewportSaveTimer) {
      clearTimeout(viewportSaveTimer);
    }

    viewportSaveTimer = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('user_canvas_viewports')
          .upsert({
            user_id: user.id,
            viewport_state: { zoom, panX, panY },
          });
      } catch (error) {
        console.warn('Failed to save viewport to PostgreSQL:', error);
      }
    }, VIEWPORT_SAVE_DEBOUNCE_MS);
  },

  /**
   * W2.D6.2: Get viewport state for restoration
   *
   * Called by FabricCanvasManager during initialization
   * Returns current viewport state to apply to Fabric.js
   */
  restoreViewport: () => {
    return get().viewport;
  },

  // ─── Viewport Persistence (W2.D7.2-7.4) ───

  /**
   * W2.D7.2: Reset viewport to default state
   */
  resetViewport: () =>
    set(
      {
        viewport: { zoom: 1, panX: 0, panY: 0 },
      },
      undefined,
      'canvas/resetViewport',
    ),

  /**
   * W2.D7.3: Load viewport from localStorage
   *
   * Called during canvas initialization
   * Falls back to default viewport if localStorage is empty/invalid
   */
  loadViewportFromStorage: () => {
    try {
      const stored = localStorage.getItem('canvas_viewport');
      if (stored) {
        const viewport = JSON.parse(stored) as ViewportState;
        set(
          { viewport },
          undefined,
          'canvas/loadViewportFromStorage',
        );
      }
    } catch (error) {
      // Invalid JSON or localStorage error - use default viewport
      console.warn('Failed to load viewport from localStorage:', error);
    }
  },

  /**
   * W2.D7.4: Load viewport from PostgreSQL
   *
   * Called during canvas initialization (after auth)
   * Falls back to localStorage/default if PostgreSQL unavailable
   */
  loadViewportFromPostgreSQL: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_canvas_viewports')
        .select('viewport_state')
        .eq('user_id', user.id)
        .single();

      if (error || !data) return;

      const viewport = data.viewport_state as unknown as ViewportState;
      set(
        { viewport },
        undefined,
        'canvas/loadViewportFromPostgreSQL',
      );
    } catch (error) {
      console.warn('Failed to load viewport from PostgreSQL:', error);
    }
  },

  /**
   * W2.D7.4: Initialize viewport with cross-device sync
   *
   * Priority: PostgreSQL > localStorage > default
   * Call this during app/canvas initialization
   */
  initializeViewport: async () => {
    // W4.D1 TEMP FIX: Disable viewport persistence to start at origin
    // TODO: Re-enable once viewport persistence is properly tested
    // Try PostgreSQL first (cross-device sync)
    // await get().loadViewportFromPostgreSQL();

    // If PostgreSQL didn't load anything, fall back to localStorage
    // if (
    //   get().viewport.zoom === 1 &&
    //   get().viewport.panX === 0 &&
    //   get().viewport.panY === 0
    // ) {
    //   get().loadViewportFromStorage();
    // }

    // Always start at origin for now
    console.log('[canvasSlice] Viewport initialized to origin (0, 0)');
  },

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
