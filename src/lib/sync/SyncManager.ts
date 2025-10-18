/**
 * SyncManager - Realtime Synchronization Layer
 *
 * PRD Architecture: Layer 3 (Sync Layer)
 * Coordinates: Layer 1 (Supabase) ↔ Layer 2 (Zustand Store)
 *
 * Responsibilities:
 * - W1.D4.7-8: Manage Supabase Realtime subscriptions
 * - Handle postgres_changes events (INSERT, UPDATE, DELETE)
 * - Sync remote changes to Zustand store
 * - Coordinate with Fabric.js canvas updates (Phase II Week 1-2)
 *
 * Pattern:
 * 1. Subscribe to canvas_objects table changes
 * 2. Convert database rows to CanvasObject discriminated unions
 * 3. Update Zustand store via internal mutations (_addObject, _updateObject, _removeObject)
 * 4. (Future) Update Fabric.js canvas for visual sync
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { usePaperboxStore } from '../../stores';
import type { Database } from '../../types/database';
import type { CanvasObject } from '../../types/canvas';

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
      return { ...base, type: 'rectangle' } as unknown as CanvasObject;
    case 'circle':
      return { ...base, type: 'circle' } as unknown as CanvasObject;
    case 'text':
      return { ...base, type: 'text' } as unknown as CanvasObject;
    default:
      throw new Error(`Unknown shape type: ${row.type}`);
  }
}

/**
 * SyncManager class
 *
 * Singleton pattern - only one instance per user session
 */
export class SyncManager {
  private channel: RealtimeChannel | null = null;
  private userId: string;
  private isSubscribed = false;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * W1.D4.8: Setup realtime subscription
   *
   * Subscribes to postgres_changes on canvas_objects table
   * Filters by created_by to only receive user's objects
   */
  async initialize(): Promise<void> {
    if (this.isSubscribed) {
      console.warn('SyncManager already initialized');
      return;
    }

    try {
      // Create unique channel name per user session
      const channelName = `canvas-sync-${this.userId}-${Date.now()}`;

      this.channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'canvas_objects',
            filter: `created_by=eq.${this.userId}`,
          },
          (payload) => {
            this.handleInsert(payload.new as DbCanvasObject);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'canvas_objects',
            filter: `created_by=eq.${this.userId}`,
          },
          (payload) => {
            this.handleUpdate(payload.new as DbCanvasObject);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'canvas_objects',
            filter: `created_by=eq.${this.userId}`,
          },
          (payload) => {
            this.handleDelete(payload.old as DbCanvasObject);
          },
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
            console.log('[SyncManager] Realtime subscription active');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[SyncManager] Subscription error');
            this.isSubscribed = false;
          } else if (status === 'TIMED_OUT') {
            console.error('[SyncManager] Subscription timed out');
            this.isSubscribed = false;
          }
        });
    } catch (error) {
      console.error('[SyncManager] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Handle INSERT event
   *
   * Adds new object to Zustand store via _addObject internal mutation
   */
  private handleInsert(row: DbCanvasObject): void {
    try {
      const obj = dbToCanvasObject(row);
      console.log('[SyncManager] INSERT event:', obj.id);

      // Update Zustand store
      usePaperboxStore.getState()._addObject(obj);

      // Add layer metadata for layers panel
      const store = usePaperboxStore.getState();
      if (!store.layers[obj.id]) {
        store.addLayer(obj.id, {
          name: `${obj.type} ${obj.id.slice(0, 6)}`,
          visible: true,
          locked: false,
        });
      }

      // TODO (Phase II W1-2): Update Fabric.js canvas
      // const fabricObj = ObjectFactory.fromCanvasObject(obj);
      // fabricCanvas.add(fabricObj);
    } catch (error) {
      console.error('[SyncManager] Insert handler error:', error);
    }
  }

  /**
   * Handle UPDATE event
   *
   * Updates existing object in Zustand store via _updateObject internal mutation
   */
  private handleUpdate(row: DbCanvasObject): void {
    try {
      const obj = dbToCanvasObject(row);
      console.log('[SyncManager] UPDATE event:', obj.id);

      // Update Zustand store
      usePaperboxStore.getState()._updateObject(obj.id, obj);

      // TODO (Phase II W1-2): Update Fabric.js canvas
      // const fabricObj = fabricCanvas.getObjects().find(o => o.data.id === obj.id);
      // if (fabricObj) {
      //   fabricObj.set(ObjectFactory.toFabricProps(obj));
      //   fabricCanvas.renderAll();
      // }
    } catch (error) {
      console.error('[SyncManager] Update handler error:', error);
    }
  }

  /**
   * Handle DELETE event
   *
   * Removes object from Zustand store via _removeObject internal mutation
   */
  private handleDelete(row: DbCanvasObject): void {
    try {
      console.log('[SyncManager] DELETE event:', row.id);

      // Update Zustand store
      usePaperboxStore.getState()._removeObject(row.id);

      // Remove layer metadata
      usePaperboxStore.getState().removeLayer(row.id);

      // TODO (Phase II W1-2): Update Fabric.js canvas
      // const fabricObj = fabricCanvas.getObjects().find(o => o.data.id === row.id);
      // if (fabricObj) {
      //   fabricCanvas.remove(fabricObj);
      //   fabricCanvas.renderAll();
      // }
    } catch (error) {
      console.error('[SyncManager] Delete handler error:', error);
    }
  }

  /**
   * Cleanup subscription
   *
   * Unsubscribes from Realtime channel and cleans up resources
   */
  async cleanup(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
      this.isSubscribed = false;
      console.log('[SyncManager] Subscription cleaned up');
    }
  }

  /**
   * Get subscription status
   */
  isActive(): boolean {
    return this.isSubscribed;
  }
}

/**
 * Singleton instance
 *
 * Access via getSyncManager(userId)
 */
let instance: SyncManager | null = null;

/**
 * Get or create SyncManager singleton
 */
export function getSyncManager(userId: string): SyncManager {
  if (!instance || instance['userId'] !== userId) {
    instance = new SyncManager(userId);
  }
  return instance;
}

/**
 * Cleanup singleton instance
 */
export async function cleanupSyncManager(): Promise<void> {
  if (instance) {
    await instance.cleanup();
    instance = null;
  }
}
