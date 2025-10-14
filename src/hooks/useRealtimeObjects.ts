/**
 * Real-time object synchronization hook
 * Manages Supabase Realtime subscription for canvas objects with locking mechanism
 */

import { useState, useEffect, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { CanvasObject } from '../types/canvas';
import type { Database } from '../types/database';

type DbCanvasObject = Database['public']['Tables']['canvas_objects']['Row'];

export function useRealtimeObjects() {
  const { user } = useAuth();
  const [objects, setObjects] = useState<CanvasObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert database row to CanvasObject
   */
  const dbToCanvasObject = useCallback((row: DbCanvasObject): CanvasObject => {
    const base = {
      id: row.id,
      x: row.x,
      y: row.y,
      fill: row.fill,
      created_by: row.created_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      locked_by: row.locked_by,
      lock_acquired_at: row.lock_acquired_at,
    };

    switch (row.type) {
      case 'rectangle':
        return { ...base, type: 'rectangle', width: row.width!, height: row.height! };
      case 'circle':
        return { ...base, type: 'circle', radius: row.radius! };
      case 'text':
        return { 
          ...base, 
          type: 'text', 
          text_content: row.text_content!, 
          font_size: row.font_size!,
          width: row.width ?? undefined,
          height: row.height ?? undefined,
        };
      default:
        throw new Error(`Unknown shape type: ${row.type}`);
    }
  }, []);

  /**
   * Create a new object in the database
   */
  const createObject = useCallback(async (shape: Partial<CanvasObject>): Promise<string | null> => {
    if (!user) {
      console.error('Cannot create object: user not authenticated');
      return null;
    }

    try {
      const insertData = {
        type: shape.type!,
        x: shape.x!,
        y: shape.y!,
        fill: shape.fill!,
        created_by: user.id,
        width: 'width' in shape ? (shape.width ?? null) : null,
        height: 'height' in shape ? (shape.height ?? null) : null,
        radius: 'radius' in shape ? (shape.radius ?? null) : null,
        text_content: 'text_content' in shape ? (shape.text_content ?? null) : null,
        font_size: 'font_size' in shape ? (shape.font_size ?? null) : null,
      } as Database['public']['Tables']['canvas_objects']['Insert'];

      const result = await (supabase
        .from('canvas_objects') as any)
        .insert(insertData)
        .select()
        .single();
      const { data, error: insertError } = result as { data: DbCanvasObject | null; error: any };

      if (insertError) throw insertError;
      
      console.log('✅ Object created:', data!.id);
      return data!.id;
    } catch (err) {
      console.error('❌ Error creating object:', err);
      setError('Failed to create object. Please try again.');
      
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
      return null;
    }
  }, [user]);

  /**
   * Update an existing object in the database
   */
  const updateObject = useCallback(async (id: string, updates: Partial<CanvasObject>): Promise<void> => {
    try {
      const updateData: Record<string, any> = {};

      // Only include fields that are actually being updated
      if (updates.x !== undefined) updateData.x = updates.x;
      if (updates.y !== undefined) updateData.y = updates.y;
      if ('width' in updates && updates.width !== undefined) updateData.width = updates.width;
      if ('height' in updates && updates.height !== undefined) updateData.height = updates.height;
      if ('radius' in updates && updates.radius !== undefined) updateData.radius = updates.radius;
      if ('text_content' in updates) updateData.text_content = updates.text_content;
      if ('font_size' in updates) updateData.font_size = updates.font_size;
      if (updates.locked_by !== undefined) updateData.locked_by = updates.locked_by;
      if (updates.lock_acquired_at !== undefined) updateData.lock_acquired_at = updates.lock_acquired_at;

      const updateResult = await (supabase
        .from('canvas_objects') as any)
        .update(updateData as Database['public']['Tables']['canvas_objects']['Update'])
        .eq('id', id);
      const { error: updateError } = updateResult as { error: any };

      if (updateError) throw updateError;
      
      console.log('✅ Object updated:', id);
    } catch (err) {
      console.error('❌ Error updating object:', err);
      // Silent retry - don't show error to user for transient update failures
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
      // Check if already locked
      const fetchResult = await (supabase
        .from('canvas_objects') as any)
        .select('locked_by')
        .eq('id', id)
        .single();
      const { data: current, error: fetchError} = fetchResult as { data: { locked_by: string | null } | null; error: any };

      if (fetchError) throw fetchError;

      // If locked by someone else, deny lock
      if (current && current.locked_by && current.locked_by !== user.id) {
        console.log('🔒 Object already locked by another user');
        return false;
      }

      // If already locked by us, allow (re-entrant lock)
      if (current && current.locked_by === user.id) {
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
        
        // Fetch initial objects - select only needed columns for better performance
        const { data, error: fetchError } = await supabase
          .from('canvas_objects')
          .select(`
            id,
            type,
            x,
            y,
            width,
            height,
            radius,
            fill,
            text_content,
            font_size,
            created_by,
            created_at,
            updated_at,
            locked_by,
            lock_acquired_at
          `)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const canvasObjects = data.map(dbToCanvasObject);
        setObjects(canvasObjects);
        setLoading(false);
        
        const fetchDuration = performance.now() - fetchStart;
        console.log(`✅ Loaded ${canvasObjects.length} canvas objects in ${fetchDuration.toFixed(0)}ms`);

        // Set up real-time subscription
        // Use shared channel name for postgres_changes (all users need to see same events)
        const channelName = 'canvas-objects-changes';
        console.log(`🔌 Creating channel: ${channelName}`);
        
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
                // Prevent duplicates
                if (prev.some(obj => obj.id === newObject.id)) {
                  return prev;
                }
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
  }, [user, dbToCanvasObject]);

  return {
    objects,
    loading,
    error,
    createObject,
    updateObject,
    acquireLock,
    releaseLock,
  };
}

