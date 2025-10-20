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
  Canvas,
} from '../../types/canvas';
import type { PaperboxStore } from '../index';
import type { Database } from '../../types/database';
import { dbToCanvasObject } from '../../lib/sync/coordinateConversion';
import { ConnectionMonitor, type ConnectionStatus } from '../../lib/sync/ConnectionMonitor';
import { OperationQueue } from '../../lib/sync/OperationQueue';

type DbCanvasObject = Database['public']['Tables']['canvas_objects']['Row'];

/**
 * Viewport state for infinite canvas
 * W2.D6.2: Hybrid approach - Fabric.js primary + Zustand snapshots
 * 
 * IMPORTANT: This is the ViewportTransform from Fabric.js
 * - zoom: vpt[0] and vpt[3] (uniform scale)
 * - panX: vpt[4] (screen pixel offset, NOT Fabric coordinates)
 * - panY: vpt[5] (screen pixel offset, NOT Fabric coordinates)
 * 
 * @see src/types/coordinates.ts for detailed coordinate system documentation
 */
export interface ViewportState {
  /** Zoom level (1.0 = 100%, 2.0 = 200%, etc.) */
  zoom: number;
  
  /** Horizontal pan offset in screen pixels (vpt[4]) - NOT Fabric canvas coordinates! */
  panX: number;
  
  /** Vertical pan offset in screen pixels (vpt[5]) - NOT Fabric canvas coordinates! */
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

  // Connection State (Network Resilience)
  connectionStatus: ConnectionStatus;
  offlineOperationsCount: number;
  _updateConnectionStatus: (status: ConnectionStatus) => void;
  _updateOfflineOperationsCount: (count: number) => void;

  // Lifecycle
  initialize: (userId: string) => Promise<void>;
  cleanup: () => void;

  // Canvas Management (W5.D2)
  loadCanvases: (userId: string) => Promise<void>;
  createCanvas: (name: string, description?: string) => Promise<Canvas>;
  updateCanvas: (id: string, updates: Partial<Pick<Canvas, 'name' | 'description'>>) => Promise<void>;
  deleteCanvas: (id: string) => Promise<void>;
  setActiveCanvas: (canvasId: string) => Promise<void>;
  toggleCanvasPublic: (canvasId: string, isPublic: boolean) => Promise<void>;

  // CRUD Operations (Supabase-integrated)
  createObject: (object: Partial<CanvasObject>, userId: string) => Promise<string>;
  updateObject: (id: string, updates: Partial<CanvasObject>) => Promise<void>;
  batchUpdateObjects: (updates: Array<{ id: string; updates: Partial<CanvasObject> }>) => Promise<void>;
  deleteObjects: (ids: string[]) => Promise<void>;
  duplicateObjects: (objectIds: string[], userId: string) => Promise<string[]>;

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

/**
 * W5.D5+++++ SIMPLE SNAP-BACK FIX: Compare objects with precision tolerance
 *
 * Prevents self-broadcast updates by detecting when broadcast data matches current state.
 * Uses 0.01 precision tolerance to handle database DOUBLE PRECISION rounding.
 *
 * @param current - Current object in Zustand state
 * @param updated - Updated object from database broadcast
 * @returns true if objects are meaningfully different, false if essentially same
 */
function hasSignificantChange(current: CanvasObject, updated: CanvasObject): boolean {
  // Helper: Round to 2 decimal places (0.01 pixel precision)
  const round = (n: number) => Math.round(n * 100) / 100;

  return (
    round(current.x) !== round(updated.x) ||
    round(current.y) !== round(updated.y) ||
    round(current.width) !== round(updated.width) ||
    round(current.height) !== round(updated.height) ||
    round(current.rotation) !== round(updated.rotation) ||
    current.opacity !== updated.opacity ||
    current.fill !== updated.fill ||
    current.stroke !== updated.stroke ||
    current.stroke_width !== updated.stroke_width ||
    current.locked_by !== updated.locked_by ||
    current.z_index !== updated.z_index || // ✅ Check z_index for layer order changes
    JSON.stringify(current.metadata) !== JSON.stringify(updated.metadata) || // ✅ Check metadata for layer names
    JSON.stringify(current.type_properties) !== JSON.stringify(updated.type_properties) ||
    JSON.stringify(current.style_properties) !== JSON.stringify(updated.style_properties)
  );
}

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

    // Connection State Initial Values
    connectionStatus: 'connecting',
    offlineOperationsCount: 0,

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
        // console.log('[canvasSlice] No canvases found, creating default canvas...');
        const defaultCanvas = await get().createCanvas('My Canvas', 'Default canvas');
        await get().setActiveCanvas(defaultCanvas.id);
        return;
      }

      // Select first canvas
      const firstCanvas = canvases[0];
      // console.log('[canvasSlice] Auto-selecting first canvas:', firstCanvas.id.slice(0, 8));
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
      // W5.D5+ PHASE 1: Load owned canvases AND public canvases
      // This enables URL-based canvas sharing
      const { data, error } = await supabase
        .from('canvases')
        .select('*')
        .or(`owner_id.eq.${userId},is_public.eq.true`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ canvases: data || [], canvasesLoading: false }, undefined, 'canvas/loadCanvasesSuccess');

      // console.log('[canvasSlice] Loaded canvases:', {
      //   count: data?.length || 0,
      //   owned: data?.filter(c => c.owner_id === userId).length || 0,
      //   public: data?.filter(c => c.is_public && c.owner_id !== userId).length || 0,
      //   canvasIds: data?.map(c => c.id.slice(0, 8)) || [],
      // });
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

      // console.log('[canvasSlice] Created canvas:', {
      //   id: data.id.slice(0, 8),
      //   name: data.name,
      // });

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

      // console.log('[canvasSlice] Updated canvas:', {
      //   id: id.slice(0, 8),
      //   updates,
      // });
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

      // console.log('[canvasSlice] Deleted canvas:', {
      //   id: id.slice(0, 8),
      // });
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

      // console.log('[canvasSlice] Switched to canvas:', {
      //   canvasId: canvasId.slice(0, 8),
      //   objectCount: Object.keys(objectsMap).length,
      // });

      // LAYER ORDERING FIX: Add layer metadata for all loaded objects in z_index order
      // Sort objects by z_index before adding layers to ensure consistent ordering
      const sortedObjects = Object.values(objectsMap).sort((a, b) => (a.z_index || 0) - (b.z_index || 0));
      sortedObjects.forEach((obj) => {
        // Load layer name from metadata or use default
        const layerName = obj.metadata?.layer_name || `${obj.type} ${obj.id.slice(0, 6)}`;
        
        get().addLayer(obj.id, {
          name: layerName,
          zIndex: obj.z_index || 0,
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

  /**
   * Toggle canvas public/private status
   * W5.D5+ Phase 1: Public canvas sharing via URL
   *
   * Enables multi-user real-time synchronization testing by allowing
   * users to share canvas URLs with public access.
   */
  toggleCanvasPublic: async (canvasId: string, isPublic: boolean) => {
    try {
      const { error } = await supabase
        .from('canvases')
        .update({ is_public: isPublic })
        .eq('id', canvasId);

      if (error) throw error;

      // Update local state (Immer middleware handles immutability)
      set((state) => {
        const canvas = state.canvases.find(c => c.id === canvasId);
        if (canvas) {
          canvas.is_public = isPublic;
          canvas.updated_at = new Date().toISOString();
        }
      }, undefined, 'canvas/toggleCanvasPublicSuccess');

      // console.log('[canvasSlice] Toggled canvas public status:', {
      //   canvasId: canvasId.slice(0, 8),
      //   isPublic,
      // });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle canvas public status';
      set({ error: errorMessage }, undefined, 'canvas/toggleCanvasPublicError');
      console.error('Toggle canvas public error:', error);
      throw error;
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

    // Check connection status - queue if offline
    const connectionStatus = get().connectionStatus;
    if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
      console.log('[canvasSlice] Offline - queuing create operation');
      OperationQueue.getInstance().enqueue({
        type: 'create',
        objectId: id,
        canvasId: activeCanvasId,
        payload: fullObject,
      });
      
      // Update offline operations count
      get()._updateOfflineOperationsCount(OperationQueue.getInstance().getCount());
      
      return id;
    }

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
      // On error, queue operation and mark as disconnected
      console.error('[canvasSlice] Database error - queuing operation:', error);
      ConnectionMonitor.getInstance().handleSyncFailure(error);
      
      OperationQueue.getInstance().enqueue({
        type: 'create',
        objectId: id,
        canvasId: activeCanvasId,
        payload: fullObject,
      });
      
      get()._updateOfflineOperationsCount(OperationQueue.getInstance().getCount());
      
      // Keep optimistic update - don't rollback since we queued
      return id;
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

    // Check connection status - queue if offline
    const connectionStatus = get().connectionStatus;
    if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
      console.log('[canvasSlice] Offline - queuing update operation');
      const activeCanvasId = get().activeCanvasId;
      if (activeCanvasId) {
        OperationQueue.getInstance().enqueue({
          type: 'update',
          objectId: id,
          canvasId: activeCanvasId,
          payload: updates,
        });
        
        get()._updateOfflineOperationsCount(OperationQueue.getInstance().getCount());
      }
      return;
    }

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
      // On error, queue operation and mark as disconnected
      console.error('[canvasSlice] Database error - queuing update operation:', error);
      ConnectionMonitor.getInstance().handleSyncFailure(error);
      
      const activeCanvasId = get().activeCanvasId;
      if (activeCanvasId) {
        OperationQueue.getInstance().enqueue({
          type: 'update',
          objectId: id,
          canvasId: activeCanvasId,
          payload: updates,
        });
        
        get()._updateOfflineOperationsCount(OperationQueue.getInstance().getCount());
      }
      
      // Keep optimistic update - don't rollback since we queued
    }
  },

  /**
   * W5.D5++++ Batch Update Objects - Unified State Management for Groups
   *
   * CRITICAL FIX for group movement synchronization issues:
   * - Single atomic database transaction for all updates
   * - Single optimistic state update (no intermediate states)
   * - Single broadcast event (prevents stale state conflicts)
   * - Coordinated rollback on error
   *
   * Pattern: Batch optimistic update → Single DB transaction → Rollback all on error
   *
   * Use Cases:
   * - Group/multi-select movements (ActiveSelection in Fabric.js)
   * - Synchronized property changes across multiple objects
   * - Any operation requiring atomic multi-object updates
   *
   * @param updates - Array of {id, updates} for each object to update
   */
  batchUpdateObjects: async (updates: Array<{ id: string; updates: Partial<CanvasObject> }>) => {
    if (updates.length === 0) return;

    // console.log(`[canvasSlice] Batch updating ${updates.length} objects`);

    // Store previous states for rollback
    const previousStates: Record<string, CanvasObject> = {};
    updates.forEach(({ id }) => {
      const existing = get().objects[id];
      if (existing) {
        previousStates[id] = { ...existing };
      }
    });

    // Single atomic optimistic update for all objects
    const now = new Date().toISOString();
    set(
      (state) => {
        updates.forEach(({ id, updates: objectUpdates }) => {
          const existing = state.objects[id];
          if (existing) {
            state.objects[id] = {
              ...existing,
              ...objectUpdates,
              updated_at: now,
            } as CanvasObject;
          }
        });
      },
      undefined,
      'canvas/batchUpdateObjectsOptimistic',
    );

    try {
      // PERFORMANCE OPTIMIZATION: Use atomic batch_update_canvas_objects RPC
      // Benefits:
      // - Single database query (vs N separate UPDATE queries)
      // - Single realtime broadcast (vs N postgres_changes events)
      // - Atomic transaction (all objects update or none)
      // Result: 50x+ performance improvement for group movements
      // Based on: batch_update_z_index pattern (migration 020)
      
      // Prepare arrays for RPC function
      // Use existing values as fallback if update doesn't specify them
      const object_ids = updates.map(u => u.id);
      const x_values = updates.map(u => u.updates.x ?? get().objects[u.id]?.x ?? 0);
      const y_values = updates.map(u => u.updates.y ?? get().objects[u.id]?.y ?? 0);
      const width_values = updates.map(u => u.updates.width ?? get().objects[u.id]?.width ?? 100);
      const height_values = updates.map(u => u.updates.height ?? get().objects[u.id]?.height ?? 100);
      const rotation_values = updates.map(u => u.updates.rotation ?? get().objects[u.id]?.rotation ?? 0);

      // Call atomic RPC function
      const { error } = await supabase.rpc('batch_update_canvas_objects', {
        object_ids,
        x_values,
        y_values,
        width_values,
        height_values,
        rotation_values,
      });

      if (error) {
        throw new Error(`Batch update RPC failed: ${error.message}`);
      }

      // console.log(`[canvasSlice] ✅ Batch update successful: ${updates.length} objects (single query, single broadcast)`);
    } catch (error) {
      // Rollback ALL optimistic updates on error
      console.error('[canvasSlice] ❌ Batch update failed, rolling back:', error);

      set(
        (state) => {
          Object.entries(previousStates).forEach(([id, previousState]) => {
            state.objects[id] = previousState;
          });
        },
        undefined,
        'canvas/batchUpdateObjectsRollback',
      );

      const errorMessage = error instanceof Error ? error.message : 'Failed to batch update objects';
      console.error('Batch update error:', error);
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

    // Check connection status - queue if offline
    const connectionStatus = get().connectionStatus;
    if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
      console.log('[canvasSlice] Offline - queuing delete operations');
      const activeCanvasId = get().activeCanvasId;
      if (activeCanvasId) {
        ids.forEach((id) => {
          OperationQueue.getInstance().enqueue({
            type: 'delete',
            objectId: id,
            canvasId: activeCanvasId,
            payload: {},
          });
        });
        
        get()._updateOfflineOperationsCount(OperationQueue.getInstance().getCount());
      }
      return;
    }

    try {
      // 3. Database delete
      const { error } = await supabase.from('canvas_objects').delete().in('id', ids);

      if (error) throw error;
    } catch (error) {
      // On error, queue operations and mark as disconnected
      console.error('[canvasSlice] Database error - queuing delete operations:', error);
      ConnectionMonitor.getInstance().handleSyncFailure(error);
      
      const activeCanvasId = get().activeCanvasId;
      if (activeCanvasId) {
        ids.forEach((id) => {
          OperationQueue.getInstance().enqueue({
            type: 'delete',
            objectId: id,
            canvasId: activeCanvasId,
            payload: {},
          });
        });
        
        get()._updateOfflineOperationsCount(OperationQueue.getInstance().getCount());
      }
      
      // Keep optimistic delete - don't rollback since we queued
    }
  },

  /**
   * Duplicate selected objects
   * Creates clones with new UUIDs, preserves group structure, places at same position
   * Uses efficient batch operations for performance
   */
  duplicateObjects: async (objectIds: string[], userId: string) => {
    const activeCanvasId = get().activeCanvasId;
    if (!activeCanvasId) {
      console.error('[canvasSlice] No active canvas');
      return [];
    }

    // 1. Validate objects exist and filter valid ones
    const objectsToDuplicate = objectIds
      .map((id) => get().objects[id])
      .filter(Boolean);

    if (objectsToDuplicate.length === 0) {
      console.warn('[canvasSlice] No valid objects to duplicate');
      return [];
    }

    // 2. Build group ID map for preserving group structure
    // Map old group_id -> new group_id
    const groupIdMap = new Map<string, string>();
    
    objectsToDuplicate.forEach((obj) => {
      if (obj.group_id && !groupIdMap.has(obj.group_id)) {
        groupIdMap.set(obj.group_id, crypto.randomUUID());
      }
    });

    // 3. Clone all objects with new IDs and updated group_ids
    const now = new Date().toISOString();
    const clones: CanvasObject[] = objectsToDuplicate.map((original) => {
      const newId = crypto.randomUUID();
      
      // Update group_id if object was in a group
      let newGroupId = original.group_id;
      if (newGroupId) {
        newGroupId = groupIdMap.get(newGroupId) || null;
      }

      return {
        ...original,
        id: newId,
        group_id: newGroupId,
        canvas_id: activeCanvasId,
        created_by: userId,
        created_at: now,
        updated_at: now,
        locked_by: null,
        lock_acquired_at: null,
      };
    });

    const newIds = clones.map((clone) => clone.id);

    // 4. Optimistic update - add all clones to state at once
    set(
      (state) => {
        clones.forEach((clone) => {
          state.objects[clone.id] = clone;
        });
      },
      undefined,
      'canvas/duplicateObjects',
    );

    // 5. Add layers for each duplicate
    clones.forEach((clone) => {
      get().addLayer(clone.id, {
        name: `${clone.type} ${clone.id.slice(0, 6)} (copy)`,
        visible: true,
        locked: false,
      });
    });

    // 6. Select the new duplicates (deselect originals)
    get().selectObjects(newIds);

    // 7. Handle offline mode - queue all create operations
    const connectionStatus = get().connectionStatus;
    if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
      console.log('[canvasSlice] Offline - queuing duplicate operations');
      
      clones.forEach((clone) => {
        OperationQueue.getInstance().enqueue({
          type: 'create',
          objectId: clone.id,
          canvasId: activeCanvasId,
          payload: clone,
        });
      });
      
      get()._updateOfflineOperationsCount(OperationQueue.getInstance().getCount());
      return newIds;
    }

    // 8. Batch insert to database
    try {
      const { error } = await supabase
        .from('canvas_objects')
        .insert(clones as any);

      if (error) throw error;

      return newIds;
    } catch (error) {
      // On error, queue operations and mark as disconnected
      console.error('[canvasSlice] Database error - queuing duplicate operations:', error);
      ConnectionMonitor.getInstance().handleSyncFailure(error);
      
      clones.forEach((clone) => {
        OperationQueue.getInstance().enqueue({
          type: 'create',
          objectId: clone.id,
          canvasId: activeCanvasId,
          payload: clone,
        });
      });
      
      get()._updateOfflineOperationsCount(OperationQueue.getInstance().getCount());
      
      // Keep optimistic update - don't rollback since we queued
      return newIds;
    }
  },

  // ─── Internal mutations (for SyncManager) ───

  /**
   * Internal: Add object (called by SyncManager on realtime INSERT)
   * 
   * REALTIME LAYERS FIX: Also add layer so other users see it in layers panel
   */
  _addObject: (object: CanvasObject) => {
    set(
      (state) => {
        state.objects[object.id] = object;
      },
      undefined,
      'canvas/_addObject',
    );
    
    // REALTIME LAYERS FIX: Sync layer to other users
    // Add layer metadata for layers panel (checks for duplicates internally)
    get().addLayer(object.id, {
      name: `${object.type} ${object.id.slice(0, 6)}`,
      visible: true,
      locked: false,
    });
  },

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

    // console.log('[canvasSlice] Cleaned up deleted objects:', {
    //   deletedIds: ids,
    //   cleanedSelections: currentSelectedIds.length - validSelectedIds.length,
    //   newActiveObject: get().activeObjectId,
    // });
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

    // console.log('[canvasSlice] Setting up realtime subscription for canvas:', activeCanvasId.slice(0, 8));

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
              const insertedObj = dbToCanvasObject(newRecord as DbCanvasObject);
              
              // Skip if object already exists (self-broadcast from optimistic update)
              if (get().objects[insertedObj.id]) {
                // Object already added optimistically, skip realtime duplicate
                return;
              }
              
              // Add new object to state (from other users or initial load)
              // NOTE: _addObject already calls addLayer internally (line 805)
              get()._addObject(insertedObj);
              break;
            }

            case 'UPDATE': {
              // W5.D5+++++ SIMPLE SNAP-BACK FIX: Skip if broadcast matches current state
              // This prevents self-broadcasts from triggering State→Canvas sync
              const updatedObj = dbToCanvasObject(newRecord as DbCanvasObject);
              const currentObj = get().objects[updatedObj.id];

              // Only update if data meaningfully changed (with precision tolerance)
              if (currentObj && !hasSignificantChange(currentObj, updatedObj)) {
                // No-op: self-broadcast or duplicate data
                return;
              }

              // Apply update from other users or genuinely different data
              get()._updateObject(updatedObj.id, updatedObj);
              
              // Sync layer metadata (z-index and name) in a single state update
              set((state) => {
                const layer = state.layers[updatedObj.id];
                if (!layer) return;
                
                let shouldRebuildOrder = false;
                
                // Update layer name if changed
                const newName = updatedObj.metadata?.layer_name;
                if (newName && layer.name !== newName) {
                  layer.name = newName;
                }
                
                // Update z-index if changed
                if (updatedObj.z_index !== undefined && layer.zIndex !== updatedObj.z_index) {
                  layer.zIndex = updatedObj.z_index;
                  shouldRebuildOrder = true;
                }
                
                // Rebuild entire layer order from all layers' z_index values
                // This is necessary because batch updates send multiple events
                // and splicing during intermediate states causes inconsistencies
                if (shouldRebuildOrder) {
                  const allLayers = Object.entries(state.layers)
                    .map(([id, layer]) => ({ id, zIndex: layer.zIndex }))
                    .sort((a, b) => a.zIndex - b.zIndex);
                  
                  state.layerOrder = allLayers.map(l => l.id);
                  
                  // console.log('[canvasSlice] 🔄 Rebuilt layer order from realtime z_index update:', state.layerOrder);
                }
              }, undefined, 'layers/syncLayerOrderFromRealtime');
              
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
      // console.log('[canvasSlice] Viewport persistence disabled - will be reimplemented for multi-canvas');

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
    // console.log('[canvasSlice] PostgreSQL viewport load disabled - will be reimplemented for multi-canvas');
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
    // console.log('[canvasSlice] Viewport initialized to origin (0, 0)');
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


  // ─── Connection State Management ───

  /**
   * Internal method to update connection status
   * Called by ConnectionMonitor via subscription
   */
  _updateConnectionStatus: (status: ConnectionStatus) => {
    set((state) => {
      state.connectionStatus = status;
    });
  },

  /**
   * Internal method to update offline operations count
   * Called by ConnectionMonitor/OperationQueue
   */
  _updateOfflineOperationsCount: (count: number) => {
    set((state) => {
      state.offlineOperationsCount = count;
    });
  },
});
