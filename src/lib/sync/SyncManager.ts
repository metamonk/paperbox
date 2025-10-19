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
import { dbToCanvasObject } from './coordinateConversion';
import { ConnectionMonitor } from './ConnectionMonitor';
import { OperationQueue } from './OperationQueue';

type DbCanvasObject = Database['public']['Tables']['canvas_objects']['Row'];

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
        .subscribe(async (status) => {
          // Notify ConnectionMonitor of status change
          ConnectionMonitor.getInstance().handleStatusChange(status);

          if (status === 'SUBSCRIBED') {
            this.isSubscribed = true;
            
            // Flush operation queue on successful connection
            const queue = OperationQueue.getInstance();
            if (queue.hasOperations()) {
              console.log('[SyncManager] Connection restored, flushing operation queue');
              await queue.flush();
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[SyncManager] Subscription ${status.toLowerCase().replace('_', ' ')}`);
            this.isSubscribed = false;
            
            // Start reconnection process
            ConnectionMonitor.getInstance().startReconnection();
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
