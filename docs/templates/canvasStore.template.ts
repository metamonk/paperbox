/**
 * TEMPLATE: Canvas Zustand Store
 *
 * Purpose: Central state management for canvas objects
 * Location: src/stores/slices/canvasStore.ts
 *
 * Created: Day 3 of Phase II Implementation
 *
 * This template provides the structure for the main canvas store slice.
 * Integrates with Supabase Realtime and Fabric.js.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { CanvasObject } from '../../types/canvas';
import { supabase } from '../../lib/supabase';
import { getFabricCanvasManager } from '../../lib/fabric/FabricCanvasManager';

interface CanvasState {
  // State
  objects: Map<string, CanvasObject>;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  createObject: (obj: Partial<CanvasObject>) => Promise<string | null>;
  updateObject: (id: string, updates: Partial<CanvasObject>) => Promise<void>;
  deleteObjects: (ids: string[]) => Promise<void>;

  // Sync operations
  syncFromDatabase: (objects: CanvasObject[]) => void;
  syncFromRealtime: (payload: any) => void;
}

export const useCanvasStore = create<CanvasState>()(
  immer((set, get) => ({
    // Initial state
    objects: new Map(),
    loading: false,
    error: null,

    /**
     * Initialize store - load objects from database
     *
     * TODO Day 4: Implement database load
     */
    initialize: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        // TODO: Load from Supabase
        const { data, error } = await supabase
          .from('canvas_objects')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // TODO: Convert to Map and sync to Fabric.js
        const objectsMap = new Map<string, CanvasObject>();
        data?.forEach((obj) => {
          objectsMap.set(obj.id, obj as CanvasObject);

          // TODO: Create Fabric.js object
          const fabricManager = getFabricCanvasManager();
          const fabricObj = fabricManager.createFabricObject(obj as CanvasObject);
          if (fabricObj) {
            fabricManager.addObject(fabricObj);
          }
        });

        set((state) => {
          state.objects = objectsMap;
          state.loading = false;
        });

        // TODO Day 5: Setup realtime subscription
        get().setupRealtimeSubscription();

      } catch (error) {
        console.error('[CanvasStore] Initialize error:', error);
        set((state) => {
          state.error = (error as Error).message;
          state.loading = false;
        });
      }
    },

    /**
     * Create new object with optimistic update
     *
     * Pattern: Update local state → Update Fabric.js → Sync to database
     *
     * TODO Day 4: Implement optimistic create
     */
    createObject: async (obj) => {
      const id = nanoid();
      const userId = 'TODO'; // Get from auth context

      // Full object with defaults
      const fullObject: CanvasObject = {
        id,
        type: obj.type || 'rectangle',
        x: obj.x || 0,
        y: obj.y || 0,
        width: obj.width || 100,
        height: obj.height || 100,
        rotation: obj.rotation || 0,
        group_id: obj.group_id || null,
        z_index: obj.z_index || 0,
        fill: obj.fill || '#3b82f6',
        stroke: obj.stroke || null,
        stroke_width: obj.stroke_width || null,
        opacity: obj.opacity || 1,
        type_properties: obj.type_properties || {},
        style_properties: obj.style_properties || {},
        metadata: obj.metadata || {},
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        locked_by: null,
        lock_acquired_at: null,
      };

      // STEP 1: Optimistic update (immediate UI feedback)
      set((state) => {
        state.objects.set(id, fullObject);
      });

      // STEP 2: Update Fabric.js canvas
      const fabricManager = getFabricCanvasManager();
      const fabricObj = fabricManager.createFabricObject(fullObject);
      if (fabricObj) {
        fabricManager.addObject(fabricObj);
      }

      // STEP 3: Sync to database (background)
      try {
        const { error } = await supabase
          .from('canvas_objects')
          .insert(fullObject);

        if (error) throw error;

        console.log('[CanvasStore] Object created:', id);
        return id;

      } catch (error) {
        console.error('[CanvasStore] Create error:', error);

        // Rollback optimistic update
        set((state) => {
          state.objects.delete(id);
        });

        if (fabricObj) {
          fabricManager.removeObject(fabricObj);
        }

        return null;
      }
    },

    /**
     * Update existing object with optimistic update
     *
     * TODO Day 4: Implement optimistic update
     */
    updateObject: async (id, updates) => {
      const current = get().objects.get(id);
      if (!current) return;

      const updated = { ...current, ...updates, updated_at: new Date().toISOString() };

      // STEP 1: Optimistic update
      set((state) => {
        state.objects.set(id, updated);
      });

      // STEP 2: Update Fabric.js
      const fabricManager = getFabricCanvasManager();
      const fabricObj = fabricManager.findObjectById(id);
      if (fabricObj) {
        // TODO: Update Fabric.js object properties
        fabricObj.set({
          left: updated.x,
          top: updated.y,
          width: updated.width,
          height: updated.height,
          angle: updated.rotation,
          fill: updated.fill,
          opacity: updated.opacity,
        });
        fabricManager.render();
      }

      // STEP 3: Sync to database
      try {
        const { error } = await supabase
          .from('canvas_objects')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

      } catch (error) {
        console.error('[CanvasStore] Update error:', error);

        // Rollback optimistic update
        set((state) => {
          state.objects.set(id, current);
        });

        // TODO: Rollback Fabric.js changes
      }
    },

    /**
     * Delete objects with optimistic update
     *
     * TODO Day 4: Implement optimistic delete
     */
    deleteObjects: async (ids) => {
      const deletedObjects = new Map<string, CanvasObject>();

      // STEP 1: Optimistic delete
      ids.forEach((id) => {
        const obj = get().objects.get(id);
        if (obj) {
          deletedObjects.set(id, obj);
        }
      });

      set((state) => {
        ids.forEach((id) => state.objects.delete(id));
      });

      // STEP 2: Update Fabric.js
      const fabricManager = getFabricCanvasManager();
      ids.forEach((id) => {
        const fabricObj = fabricManager.findObjectById(id);
        if (fabricObj) {
          fabricManager.removeObject(fabricObj);
        }
      });

      // STEP 3: Sync to database
      try {
        const { error } = await supabase
          .from('canvas_objects')
          .delete()
          .in('id', ids);

        if (error) throw error;

      } catch (error) {
        console.error('[CanvasStore] Delete error:', error);

        // Rollback optimistic delete
        set((state) => {
          deletedObjects.forEach((obj, id) => {
            state.objects.set(id, obj);
          });
        });

        // TODO: Rollback Fabric.js changes
      }
    },

    /**
     * Sync objects from database (initial load)
     *
     * TODO Day 5: Implement database sync
     */
    syncFromDatabase: (objects) => {
      const objectsMap = new Map<string, CanvasObject>();
      objects.forEach((obj) => {
        objectsMap.set(obj.id, obj);
      });

      set((state) => {
        state.objects = objectsMap;
      });
    },

    /**
     * Sync realtime changes from Supabase
     *
     * TODO Day 5: Implement realtime sync
     */
    syncFromRealtime: (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      switch (eventType) {
        case 'INSERT':
          // TODO: Add object if not already present (avoid duplicate from optimistic update)
          if (!get().objects.has(newRecord.id)) {
            set((state) => {
              state.objects.set(newRecord.id, newRecord as CanvasObject);
            });

            // Add to Fabric.js
            const fabricManager = getFabricCanvasManager();
            const fabricObj = fabricManager.createFabricObject(newRecord as CanvasObject);
            if (fabricObj) {
              fabricManager.addObject(fabricObj);
            }
          }
          break;

        case 'UPDATE':
          // TODO: Update object
          set((state) => {
            state.objects.set(newRecord.id, newRecord as CanvasObject);
          });

          // Update Fabric.js
          // TODO: Implement Fabric.js update logic
          break;

        case 'DELETE':
          // TODO: Remove object
          set((state) => {
            state.objects.delete(oldRecord.id);
          });

          // Remove from Fabric.js
          const fabricManager = getFabricCanvasManager();
          const fabricObj = fabricManager.findObjectById(oldRecord.id);
          if (fabricObj) {
            fabricManager.removeObject(fabricObj);
          }
          break;
      }
    },

    /**
     * Setup realtime subscription
     *
     * TODO Day 5: Implement realtime subscription
     */
    setupRealtimeSubscription: () => {
      // TODO: Subscribe to canvas_objects changes
      const channel = supabase
        .channel('canvas_objects_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'canvas_objects',
          },
          (payload) => {
            console.log('[CanvasStore] Realtime event:', payload);
            get().syncFromRealtime(payload);
          }
        )
        .subscribe();

      console.log('[CanvasStore] Realtime subscription active');
    },
  }))
);
