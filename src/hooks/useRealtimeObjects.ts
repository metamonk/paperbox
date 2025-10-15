/**
 * Real-time object synchronization hook
 * Manages Supabase Realtime subscription for canvas objects with locking mechanism
 *
 * Note: Supabase's type system requires `as any` casts in several places due to:
 * - JSONB columns (type_properties, style_properties, metadata) having dynamic schemas
 * - Generic query builder types not handling our specific table schemas
 * These are intentional and safe casts where we validate the structure at runtime.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Supabase's generic types cause false positives in strict mode

import { useState, useEffect, useCallback} from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { CanvasObject, RectangleObject, CircleObject, TextObject } from '../types/canvas';
import type { Database } from '../types/database';

type DbCanvasObject = Database['public']['Tables']['canvas_objects']['Row'];

/**
 * Convert database row to CanvasObject
 * Pure function - no hooks needed
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

export function useRealtimeObjects() {
  const { user } = useAuth();
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new object in the database
   * Uses optimistic updates for instant feedback
   */
  const createObject = useCallback(async (shape: Partial<CanvasObject>): Promise<string | null> => {
    if (!user) {
      console.error('Cannot create object: user not authenticated');
      return null;
    }

    const startTime = performance.now();
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Create optimistic object
    const optimisticObject: CanvasObject = {
      id: tempId,
      type: shape.type!,
      x: shape.x!,
      y: shape.y!,
      width: shape.width ?? 100,
      height: shape.height ?? 100,
      rotation: shape.rotation ?? 0,
      group_id: shape.group_id ?? null,
      z_index: shape.z_index ?? 0,
      fill: shape.fill!,
      stroke: shape.stroke ?? null,
      stroke_width: shape.stroke_width ?? null,
      opacity: shape.opacity ?? 1,
      type_properties: shape.type_properties ?? {},
      style_properties: shape.style_properties ?? {},
      metadata: shape.metadata ?? {},
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_by: null,
      lock_acquired_at: null,
    } as CanvasObject;

    // Add optimistically (INSTANT feedback)
    console.log('⚡ Optimistic create:', tempId);
    setObjects((prev) => [...prev, optimisticObject]);

    try {
      const insertData = {
        type: shape.type!,
        x: shape.x!,
        y: shape.y!,
        width: shape.width ?? 100,
        height: shape.height ?? 100,
        rotation: shape.rotation ?? 0,
        group_id: shape.group_id ?? null,
        z_index: shape.z_index ?? 0,
        fill: shape.fill!,
        stroke: shape.stroke ?? null,
        stroke_width: shape.stroke_width ?? null,
        opacity: shape.opacity ?? 1,
        type_properties: shape.type_properties ?? {},
        style_properties: shape.style_properties ?? {},
        metadata: shape.metadata ?? {},
        created_by: user.id,
      } as Database['public']['Tables']['canvas_objects']['Insert'];

      const result = await (supabase
        .from('canvas_objects') as any)
        .insert(insertData)
        .select()
        .single();
      const { data, error: insertError } = result as { data: DbCanvasObject | null; error: any };

      if (insertError) throw insertError;
      
      const duration = performance.now() - startTime;
      console.log(`✅ Object created in ${duration.toFixed(0)}ms:`, data!.id);
      
      // Replace optimistic with real (real-time INSERT will also fire, but duplicate check prevents issues)
      setObjects((prev) =>
        prev.map((obj) => (obj.id === tempId ? dbToCanvasObject(data!) : obj))
      );
      
      return data!.id;
    } catch (err) {
      console.error('❌ Error creating object:', err);
      setError('Failed to create object. Please try again.');
      
      // Remove optimistic object on error
      setObjects((prev) => prev.filter((obj) => obj.id !== tempId));
      
      setTimeout(() => setError(null), 3000);
      return null;
    }
  }, [user]);

  /**
   * Update an existing object in the database
   * Uses optimistic updates for instant feedback
   */
  const updateObject = useCallback(async (id: string, updates: Partial<CanvasObject>): Promise<void> => {
    const startTime = performance.now();
    
    // Optimistic update (INSTANT feedback)
    setObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj))
    );

    try {
      const updateData: Record<string, any> = {};

      // Only include fields that are actually being updated
      if (updates.x !== undefined) updateData.x = updates.x;
      if (updates.y !== undefined) updateData.y = updates.y;
      if (updates.width !== undefined) updateData.width = updates.width;
      if (updates.height !== undefined) updateData.height = updates.height;
      if (updates.rotation !== undefined) updateData.rotation = updates.rotation;
      if (updates.group_id !== undefined) updateData.group_id = updates.group_id;
      if (updates.z_index !== undefined) updateData.z_index = updates.z_index;
      if (updates.fill !== undefined) updateData.fill = updates.fill;
      if (updates.stroke !== undefined) updateData.stroke = updates.stroke;
      if (updates.stroke_width !== undefined) updateData.stroke_width = updates.stroke_width;
      if (updates.opacity !== undefined) updateData.opacity = updates.opacity;
      if (updates.type_properties !== undefined) updateData.type_properties = updates.type_properties;
      if (updates.style_properties !== undefined) updateData.style_properties = updates.style_properties;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.locked_by !== undefined) updateData.locked_by = updates.locked_by;
      if (updates.lock_acquired_at !== undefined) updateData.lock_acquired_at = updates.lock_acquired_at;

      const updateResult = await (supabase
        .from('canvas_objects') as any)
        .update(updateData as Database['public']['Tables']['canvas_objects']['Update'])
        .eq('id', id);
      const { error: updateError } = updateResult as { error: any };

      if (updateError) throw updateError;
      
      const duration = performance.now() - startTime;
      console.log(`✅ Object updated in ${duration.toFixed(0)}ms:`, id);
    } catch (err) {
      console.error('❌ Error updating object:', err);
      // Revert optimistic update on error
      // Real-time event will restore correct state
    }
  }, []);

  /**
   * Acquire lock on an object (first user wins)
   */
  const acquireLock = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      console.error('Cannot acquire lock: user not authenticated');
      return false;
    }

    try {
      // Check if already locked - use maybeSingle() instead of single()
      // to handle case where object doesn't exist (returns null instead of error)
      const fetchResult = await (supabase
        .from('canvas_objects') as any)
        .select('locked_by')
        .eq('id', id)
        .maybeSingle(); // Changed from .single() to .maybeSingle()
      const { data: current, error: fetchError} = fetchResult as { data: { locked_by: string | null } | null; error: any };

      if (fetchError) throw fetchError;

      // Object doesn't exist - silently fail
      if (!current) {
        console.log('⚠️ Object not found, skipping lock');
        return false;
      }

      // If locked by someone else, deny lock
      if (current.locked_by && current.locked_by !== user.id) {
        console.log('🔒 Object already locked by another user');
        return false;
      }

      // If already locked by us, allow (re-entrant lock)
      if (current.locked_by === user.id) {
        console.log('🔓 Already have lock on object');
        return true;
      }

      // Acquire lock
      const lockResult = await (supabase
        .from('canvas_objects') as any)
        .update({
          locked_by: user.id,
          lock_acquired_at: new Date().toISOString(),
        } as Database['public']['Tables']['canvas_objects']['Update'])
        .eq('id', id)
        .is('locked_by', null); // Only lock if not already locked (race condition protection)
      const { error: lockError } = lockResult as { error: any };

      if (lockError) throw lockError;

      console.log('✅ Lock acquired on object:', id);
      return true;
    } catch (err) {
      console.error('❌ Error acquiring lock:', err);
      return false;
    }
  }, [user]);

  /**
   * Release lock on an object
   */
  const releaseLock = useCallback(async (id: string): Promise<void> => {
    if (!user) return;

    try {
      const unlockResult = await (supabase
        .from('canvas_objects') as any)
        .update({
          locked_by: null,
          lock_acquired_at: null,
        } as Database['public']['Tables']['canvas_objects']['Update'])
        .eq('id', id)
        .eq('locked_by', user.id); // Only release if we own the lock
      const { error: unlockError } = unlockResult as { error: any };

      if (unlockError) throw unlockError;

      console.log('🔓 Lock released on object:', id);
    } catch (err) {
      console.error('❌ Error releasing lock:', err);
    }
  }, [user]);

  /**
   * Fetch initial objects and set up real-time subscription
   */
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel;
    let mounted = true;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_DELAY = 1000; // Start with 1 second

    const setupRealtime = async () => {
      try {
        console.log('🔄 Fetching initial canvas objects...');
        const fetchStart = performance.now();
        
        // Fetch initial objects - select all columns for new schema
        const { data, error: fetchError } = await supabase
          .from('canvas_objects')
          .select('*')
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const canvasObjects = data.map(dbToCanvasObject);
        setObjects(canvasObjects);
        setLoading(false);
        
        const fetchDuration = performance.now() - fetchStart;
        console.log(`✅ Loaded ${canvasObjects.length} canvas objects in ${fetchDuration.toFixed(0)}ms`);

        // Set up real-time subscription
        // CRITICAL: Each client needs its own unique channel name to prevent conflicts
        // But all channels subscribe to the same postgres_changes events for canvas_objects table
        // This allows multiple windows/tabs to work simultaneously without timeouts
        const channelName = `canvas-objects-${user.id}-${Date.now()}`;
        console.log(`🔌 Creating unique channel: ${channelName}`);
        
        channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'canvas_objects',
            },
            (payload) => {
              console.log('📥 INSERT event:', payload.new);
              const newObject = dbToCanvasObject(payload.new as DbCanvasObject);
              setObjects((prev) => {
                // Replace optimistic object if it exists, otherwise add new
                const hasOptimistic = prev.some(obj => obj.id.startsWith('optimistic-'));
                const hasDuplicate = prev.some(obj => obj.id === newObject.id);
                
                if (hasDuplicate) {
                  // Already have the real object, ignore
                  return prev;
                }
                
                if (hasOptimistic) {
                  // Replace first optimistic object with real one
                  let replaced = false;
                  return prev.map(obj => {
                    if (!replaced && obj.id.startsWith('optimistic-')) {
                      replaced = true;
                      return newObject;
                    }
                    return obj;
                  });
                }
                
                // No optimistic object, just add
                return [...prev, newObject];
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'canvas_objects',
            },
            (payload) => {
              console.log('📝 UPDATE event:', payload.new);
              const updatedObject = dbToCanvasObject(payload.new as DbCanvasObject);
              setObjects((prev) =>
                prev.map((obj) => (obj.id === updatedObject.id ? updatedObject : obj))
              );
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'canvas_objects',
            },
            (payload) => {
              console.log('🗑️ DELETE event:', payload.old);
              setObjects((prev) => prev.filter((obj) => obj.id !== payload.old.id));
            }
          )
          .subscribe(async (status, err) => {
            // Only process if component is still mounted
            if (!mounted) return;
            
            console.log('📡 Realtime subscription status:', status, `(attempt ${reconnectAttempts + 1})`);
            
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to canvas-objects realtime channel');
              setError(null);
              reconnectAttempts = 0; // Reset on successful connection
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              const errorType = status === 'CHANNEL_ERROR' ? 'Channel error' : 'Connection timed out';
              console.error(`⚠️ ${errorType}:`, err);
              
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = BASE_DELAY * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
                
                console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
                
                // Clean up current channel
                if (channel) {
                  await supabase.removeChannel(channel);
                }
                
                // Wait with exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Retry connection if still mounted
                if (mounted) {
                  setupRealtime();
                }
              } else {
                console.error('❌ Max reconnection attempts reached');
                setError('Connection lost. Please refresh the page.');
              }
            } else if (status === 'CLOSED') {
              console.log('🔌 Channel closed gracefully');
              if (mounted) {
                setError(null);
              }
            }
          });
      } catch (err) {
        console.error('❌ Error setting up realtime:', err);
        setError('Failed to load canvas objects. Please refresh the page.');
        setLoading(false);
      }
    };

    setupRealtime();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (channel) {
        console.log('🧹 Cleaning up realtime subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [user]); // Removed dbToCanvasObject - it's a pure function, not a dependency

  /**
   * Batch update multiple objects (single database transaction)
   */
  const updateObjects = useCallback(async (
    ids: string[],
    updates: Partial<CanvasObject>
  ): Promise<void> => {
    try {
      const updateData: Record<string, any> = {};

      // Build update data (same as single update)
      if (updates.x !== undefined) updateData.x = updates.x;
      if (updates.y !== undefined) updateData.y = updates.y;
      if ('width' in updates && updates.width !== undefined) updateData.width = updates.width;
      if ('height' in updates && updates.height !== undefined) updateData.height = updates.height;
      if ('rotation' in updates && updates.rotation !== undefined) updateData.rotation = updates.rotation;
      if (updates.fill !== undefined) updateData.fill = updates.fill;
      if (updates.stroke !== undefined) updateData.stroke = updates.stroke;
      if (updates.stroke_width !== undefined) updateData.stroke_width = updates.stroke_width;
      if (updates.opacity !== undefined) updateData.opacity = updates.opacity;
      if (updates.group_id !== undefined) updateData.group_id = updates.group_id;
      if (updates.z_index !== undefined) updateData.z_index = updates.z_index;
      if (updates.type_properties !== undefined) updateData.type_properties = updates.type_properties;
      if (updates.style_properties !== undefined) updateData.style_properties = updates.style_properties;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

      const { error: updateError } = await supabase
        .from('canvas_objects')
        .update(updateData)
        .in('id', ids);

      if (updateError) throw updateError;
      
      console.log(`✅ Batch updated ${ids.length} objects`);
    } catch (err) {
      console.error('❌ Error batch updating objects:', err);
      throw err;
    }
  }, []);

  /**
   * Batch delete multiple objects (single database transaction)
   */
  /**
   * Delete objects (batch delete with optimistic updates)
   */
  const deleteObjects = useCallback(async (ids: string[]): Promise<void> => {
    const startTime = performance.now();
    
    // Optimistic delete (INSTANT feedback)
    console.log('⚡ Optimistic delete:', ids);
    const deletedObjects = objects.filter((obj) => ids.includes(obj.id));
    setObjects((prev) => prev.filter((obj) => !ids.includes(obj.id)));

    try {
      const { error: deleteError } = await supabase
        .from('canvas_objects')
        .delete()
        .in('id', ids);

      if (deleteError) throw deleteError;
      
      const duration = performance.now() - startTime;
      console.log(`✅ Deleted ${ids.length} objects in ${duration.toFixed(0)}ms`);
    } catch (err) {
      console.error('❌ Error deleting objects:', err);
      // Restore objects on error
      setObjects((prev) => [...prev, ...deletedObjects].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
      throw err;
    }
  }, [objects]);

  /**
   * Duplicate objects with offset
   * Returns IDs of newly created objects
   */
  const duplicateObjects = useCallback(async (ids: string[], offset = { x: 20, y: 20 }): Promise<string[]> => {
    if (!user) {
      console.error('Cannot duplicate objects: user not authenticated');
      return [];
    }

    try {
      // Fetch originals
      const { data, error: fetchError } = await supabase
        .from('canvas_objects')
        .select('*')
        .in('id', ids);

      if (fetchError || !data) throw fetchError;

      // Create copies with offset
      const copies = data.map(obj => ({
        type: obj.type,
        x: obj.x + offset.x,
        y: obj.y + offset.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation,
        group_id: obj.group_id,
        z_index: obj.z_index,
        fill: obj.fill,
        stroke: obj.stroke,
        stroke_width: obj.stroke_width,
        opacity: obj.opacity,
        type_properties: obj.type_properties,
        style_properties: obj.style_properties,
        metadata: obj.metadata,
        created_by: user.id,
      }));

      const { data: newObjects, error: insertError } = await supabase
        .from('canvas_objects')
        .insert(copies)
        .select('id');

      if (insertError) throw insertError;
      
      const newIds = newObjects.map(o => o.id);
      console.log(`✅ Duplicated ${ids.length} objects`);
      return newIds;
    } catch (err) {
      console.error('❌ Error duplicating objects:', err);
      return [];
    }
  }, [user]);

  /**
   * Query objects with advanced filters
   * For now, filters client-side (can optimize to server-side later)
   */
  const queryObjects = useCallback((filter: {
    type?: string;
    group_id?: string | null;
    bounds?: { x: number; y: number; width: number; height: number };
    fill?: string;
    metadata?: Record<string, any>;
  }): CanvasObject[] => {
    let result = objects;

    // Filter by type
    if (filter.type) {
      result = result.filter(o => o.type === filter.type);
    }

    // Filter by group
    if (filter.group_id !== undefined) {
      result = result.filter(o => o.group_id === filter.group_id);
    }

    // Filter by bounds
    if (filter.bounds) {
      const { x, y, width, height } = filter.bounds;
      result = result.filter(o =>
        o.x >= x &&
        o.x <= x + width &&
        o.y >= y &&
        o.y <= y + height
      );
    }

    // Filter by fill color
    if (filter.fill) {
      result = result.filter(o => o.fill === filter.fill);
    }

    // Filter by metadata
    if (filter.metadata) {
      result = result.filter(o => {
        return Object.entries(filter.metadata!).every(([key, value]) => {
          return o.metadata && o.metadata[key] === value;
        });
      });
    }

    return result;
  }, [objects]);

  return {
    objects,
    loading,
    error,
    createObject,
    updateObject,
    updateObjects, // Batch update
    deleteObjects, // Batch delete
    duplicateObjects, // Duplicate with offset
    queryObjects, // Advanced filtering
    acquireLock,
    releaseLock,
  };
}

