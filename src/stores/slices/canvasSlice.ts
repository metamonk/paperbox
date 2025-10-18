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
  Canvas,
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
    canvas_id: row.canvas_id!,  // Multi-canvas: canvas_id is required (NOT NULL after migration 012)
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
  // Multi-Canvas State (W5.D2)
  activeCanvasId: string | null;
  canvases: Canvas[];
  canvasesLoading: boolean;

  // Object State
  objects: Record<string, CanvasObject>;
  loading: boolean;
  error: string | null;
  realtimeChannel: RealtimeChannel | null;
  viewport: ViewportState;

  // Lifecycle
  initialize: (userId: string) => Promise<void>;
  cleanup: () => void;

  // Canvas Management (W5.D2)
  loadCanvases: (userId: string) => Promise<void>;
  createCanvas: (name: string, description?: string) => Promise<Canvas>;
  updateCanvas: (id: string, updates: Partial<Pick<Canvas, 'name' | 'description'>>) => Promise<void>;
  deleteCanvas: (id: string) => Promise<void>;
  setActiveCanvas: (canvasId: string) => Promise<void>;

  // CRUD Operations (Supabase-integrated)
  createObject: (object: Partial<CanvasObject>, userId: string) => Promise<string>;
  updateObject: (id: string, updates: Partial<CanvasObject>) => Promise<void>;
  deleteObjects: (ids: string[]) => Promise<void>;

  // Realtime Subscriptions (W1.D4.7-4.9)
  setupRealtimeSubscription: () => void;
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
  _cleanupDeletedObjects: (ids: string[]) => void;

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
  // Multi-Canvas Initial State (W5.D2)
  activeCanvasId: null,
  canvases: [],
  canvasesLoading: false,

  // Object Initial State
  objects: {},
  loading: false,
  error: null,
  realtimeChannel: null,
  viewport: { zoom: 1, panX: 0, panY: 0 }, // W2.D6.2: Default viewport state

  // ─── Lifecycle ───

  /**
   * W1.D4.2-3: Initialize canvas store from Supabase
   * W5.D2.3: DEPRECATED - Use loadCanvases() → setActiveCanvas() workflow instead
   *
   * This function is kept for backward compatibility during migration.
   * It will load canvases and select the first one automatically.
   */
  initialize: async (userId: string) => {
    set({ loading: true, error: null }, undefined, 'canvas/initialize');

    console.warn('[canvasSlice] initialize() is deprecated. Use loadCanvases() → setActiveCanvas() instead.');

    try {
      // W5.D2: Load user's canvases first
      await get().loadCanvases(userId);

      // Auto-select first canvas or create default if none exists
      const canvases = get().canvases;
      if (canvases.length === 0) {
        console.log('[canvasSlice] No canvases found, creating default canvas...');
        const defaultCanvas = await get().createCanvas('My Canvas', 'Default canvas');
        await get().setActiveCanvas(defaultCanvas.id);
        return;
      }

      // Select first canvas
      const firstCanvas = canvases[0];
      console.log('[canvasSlice] Auto-selecting first canvas:', firstCanvas.id.slice(0, 8));
      await get().setActiveCanvas(firstCanvas.id);

      // Note: setActiveCanvas handles object loading and realtime subscription
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

  // ─── Canvas Management (W5.D2) ───

  /**
   * Load all canvases for a user
   * W5.D2.2: Fetch canvases from Supabase
   */
  loadCanvases: async (userId: string) => {
    set({ canvasesLoading: true }, undefined, 'canvas/loadCanvasesStart');

    try {
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ canvases: data || [], canvasesLoading: false }, undefined, 'canvas/loadCanvasesSuccess');

      console.log('[canvasSlice] Loaded canvases:', {
        count: data?.length || 0,
        canvasIds: data?.map(c => c.id.slice(0, 8)) || [],
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load canvases';
      set({ error: errorMessage, canvasesLoading: false }, undefined, 'canvas/loadCanvasesError');
      console.error('Load canvases error:', error);
    }
  },

  /**
   * Create a new canvas
   * W5.D2.2: Create canvas with Supabase
   */
  createCanvas: async (name: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('canvases')
        .insert({
          name,
          description: description || null,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      set((state) => {
        state.canvases.push(data);
      }, undefined, 'canvas/createCanvasSuccess');

      console.log('[canvasSlice] Created canvas:', {
        id: data.id.slice(0, 8),
        name: data.name,
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create canvas';
      set({ error: errorMessage }, undefined, 'canvas/createCanvasError');
      console.error('Create canvas error:', error);
      throw error;
    }
  },

  /**
   * Update canvas metadata (name, description)
   * W5.D2.2: Update canvas in Supabase
   */
  updateCanvas: async (id: string, updates: Partial<Pick<Canvas, 'name' | 'description'>>) => {
    try {
      const { error } = await supabase
        .from('canvases')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      set((state) => {
        const index = state.canvases.findIndex(c => c.id === id);
        if (index !== -1) {
          state.canvases[index] = { ...state.canvases[index], ...updates, updated_at: new Date().toISOString() };
        }
      }, undefined, 'canvas/updateCanvasSuccess');

      console.log('[canvasSlice] Updated canvas:', {
        id: id.slice(0, 8),
        updates,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update canvas';
      set({ error: errorMessage }, undefined, 'canvas/updateCanvasError');
      console.error('Update canvas error:', error);
      throw error;
    }
  },

  /**
   * Delete a canvas (CASCADE deletes all objects)
   * W5.D2.2: Delete canvas from Supabase
   */
  deleteCanvas: async (id: string) => {
    try {
      const { error } = await supabase
        .from('canvases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      set((state) => {
        state.canvases = state.canvases.filter(c => c.id !== id);

        // If deleted canvas was active, clear active canvas
        if (state.activeCanvasId === id) {
          state.activeCanvasId = null;
          state.objects = {};
        }
      }, undefined, 'canvas/deleteCanvasSuccess');

      console.log('[canvasSlice] Deleted canvas:', {
        id: id.slice(0, 8),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete canvas';
      set({ error: errorMessage }, undefined, 'canvas/deleteCanvasError');
      console.error('Delete canvas error:', error);
      throw error;
    }
  },

  /**
   * Set active canvas and load its objects
   * W5.D2.3: Switch canvas context
   */
  setActiveCanvas: async (canvasId: string) => {
    set({ loading: true, activeCanvasId: canvasId }, undefined, 'canvas/setActiveCanvasStart');

    try {
      // Load objects for the new canvas
      const { data, error } = await supabase
        .from('canvas_objects')
        .select('*')
        .eq('canvas_id', canvasId);  // W5.D2.3: Canvas scoping

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

      set({ objects: objectsMap, loading: false }, undefined, 'canvas/setActiveCanvasSuccess');

      console.log('[canvasSlice] Switched to canvas:', {
        canvasId: canvasId.slice(0, 8),
        objectCount: Object.keys(objectsMap).length,
      });

      // Add layer metadata for all loaded objects
      Object.values(objectsMap).forEach((obj) => {
        get().addLayer(obj.id, {
          name: `${obj.type} ${obj.id.slice(0, 6)}`,
          visible: true,
          locked: false,
        });
      });

      // Setup realtime subscription for this canvas
      get().setupRealtimeSubscription();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch canvas';
      set({ error: errorMessage, loading: false }, undefined, 'canvas/setActiveCanvasError');
      console.error('Set active canvas error:', error);
    }
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

    // W5.D2.3: Ensure active canvas is set before creating objects
    const activeCanvasId = get().activeCanvasId;
    if (!activeCanvasId) {
      throw new Error('No active canvas selected. Please select or create a canvas first.');
    }

    // Create full object with defaults
    // Type assertion needed due to discriminated union complexity
    const fullObject = {
      id,
      type: object.type!,
      canvas_id: activeCanvasId, // W5.D2.3: Canvas scoping
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
        canvas_id: fullObject.canvas_id, // W5.D2.3: Canvas scoping
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
   * Pattern: Optimistic delete → Centralized cleanup → Database delete → Restore on error
   * USES: _cleanupDeletedObjects for consistent state cleanup
   */
  deleteObjects: async (ids: string[]) => {
    // Store objects for potential rollback
    const deletedObjects = ids.map((id) => get().objects[id]).filter(Boolean);

    if (deletedObjects.length === 0) {
      return;
    }

    // 1. Optimistic delete from objects
    set(
      (state) => {
        ids.forEach((id) => {
          delete state.objects[id];
        });
      },
      undefined,
      'canvas/deleteObjectsOptimistic',
    );

    // 2. Centralized cleanup (layers, selection, active object)
    get()._cleanupDeletedObjects(ids);

    try {
      // 3. Database delete
      const { error } = await supabase.from('canvas_objects').delete().in('id', ids);

      if (error) throw error;
    } catch (error) {
      // Rollback on error - restore objects AND layers
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
   * USES: _cleanupDeletedObjects for consistent state cleanup
   */
  _removeObject: (id: string) => {
    set(
      (state) => {
        delete state.objects[id];
      },
      undefined,
      'canvas/_removeObject',
    );
    // Centralized cleanup after state update
    get()._cleanupDeletedObjects([id]);
  },

  /**
   * Internal: Remove multiple objects
   * USES: _cleanupDeletedObjects for consistent state cleanup
   */
  _removeObjects: (ids: string[]) => {
    set(
      (state) => {
        ids.forEach((id) => {
          delete state.objects[id];
        });
      },
      undefined,
      'canvas/_removeObjects',
    );
    // Centralized cleanup after state update
    get()._cleanupDeletedObjects(ids);
  },

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

  /**
   * CRITICAL: Centralized cleanup for object deletion
   *
   * This function MUST be called by ALL deletion code paths to ensure
   * consistent state cleanup across all slices and components.
   *
   * Cleanup cascade order:
   * 1. Remove from layers slice (layers, layerOrder)
   * 2. Clean up selection slice (selectedIds, activeObjectId)
   * 3. (Fabric.js cleanup handled by CanvasSyncManager subscription)
   *
   * Called by:
   * - deleteObjects() - user-initiated deletion
   * - _removeObject() - real-time sync deletion (single)
   * - _removeObjects() - real-time sync deletion (bulk)
   */
  _cleanupDeletedObjects: (ids: string[]) => {
    if (ids.length === 0) return;

    // 1. Remove from layers slice
    ids.forEach(id => {
      get().removeLayer(id);
    });

    // 2. Clean up selection slice
    const currentSelectedIds = get().selectedIds;
    const validSelectedIds = currentSelectedIds.filter(id => !ids.includes(id));

    if (validSelectedIds.length !== currentSelectedIds.length) {
      // Selection changed - update it
      if (validSelectedIds.length === 0) {
        get().deselectAll();
      } else {
        get().selectObjects(validSelectedIds);
      }
    }

    // 3. Clean up active object if it was deleted
    const activeId = get().activeObjectId;
    if (activeId && ids.includes(activeId)) {
      get().setActiveObject(validSelectedIds[0] || null);
    }

    console.log('[canvasSlice] Cleaned up deleted objects:', {
      deletedIds: ids,
      cleanedSelections: currentSelectedIds.length - validSelectedIds.length,
      newActiveObject: get().activeObjectId,
    });
  },

  // ─── Realtime Subscriptions (W1.D4.7-4.9) ───

  /**
   * W1.D4.8: Setup realtime subscription for postgres_changes
   * W5.D2.3: Updated to filter by canvas_id for multi-canvas architecture
   *
   * Subscribes to INSERT, UPDATE, DELETE events on canvas_objects table
   * Filters by active canvas to only receive updates for current workspace
   */
  setupRealtimeSubscription: () => {
    // Cleanup existing subscription first
    get().cleanupRealtimeSubscription();

    // W5.D2.3: Get active canvas ID
    const activeCanvasId = get().activeCanvasId;
    if (!activeCanvasId) {
      console.warn('[canvasSlice] Cannot setup realtime subscription: no active canvas');
      return;
    }

    console.log('[canvasSlice] Setting up realtime subscription for canvas:', activeCanvasId.slice(0, 8));

    // W5.D2.3: Listen to canvas_objects changes for active canvas only
    const channel = supabase
      .channel(`canvas-changes-${activeCanvasId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'canvas_objects',
          filter: `canvas_id=eq.${activeCanvasId}`, // W5.D2.3: Canvas scoping
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
      // TODO W5.D3: Re-implement viewport persistence for multi-canvas architecture
      // Need to save viewport per canvas, not per user
      // Will be implemented as part of canvas-scoped viewport persistence
      console.log('[canvasSlice] Viewport persistence disabled - will be reimplemented for multi-canvas');

      // try {
      //   const { data: { user } } = await supabase.auth.getUser();
      //   if (!user) return;
      //
      //   await supabase
      //     .from('user_canvas_viewports')
      //     .upsert({
      //       user_id: user.id,
      //       viewport_state: { zoom, panX, panY },
      //     });
      // } catch (error) {
      //   console.warn('Failed to save viewport to PostgreSQL:', error);
      // }
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
   * TODO W5.D3: Re-implement for multi-canvas architecture
   *
   * Temporarily disabled - viewport persistence will be canvas-scoped
   * Falls back to localStorage only for now
   */
  loadViewportFromPostgreSQL: async () => {
    console.log('[canvasSlice] PostgreSQL viewport load disabled - will be reimplemented for multi-canvas');
    return;

    // try {
    //   const { data: { user } } = await supabase.auth.getUser();
    //   if (!user) return;
    //
    //   const { data, error } = await supabase
    //     .from('user_canvas_viewports')
    //     .select('viewport_state')
    //     .eq('user_id', user.id)
    //     .single();
    //
    //   if (error || !data) return;
    //
    //   const viewport = data.viewport_state as unknown as ViewportState;
    //   set(
    //     { viewport },
    //     undefined,
    //     'canvas/loadViewportFromPostgreSQL',
    //   );
    // } catch (error) {
    //   console.warn('Failed to load viewport from PostgreSQL:', error);
    // }
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
