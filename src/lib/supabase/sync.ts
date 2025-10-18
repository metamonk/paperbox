/**
 * Supabase Sync Layer
 *
 * Bridge between Zustand store and Supabase database
 * Handles type conversions and real-time subscriptions
 *
 * Features:
 * - CRUD operations for canvas objects
 * - Type conversion: Zustand CanvasObject ↔ Supabase Row
 * - Real-time subscriptions with callbacks
 * - Batch z-index updates for layer management
 */

import { supabase } from '../supabase';
import type { CanvasObject } from '@/types/canvas';
import type { Database } from '@/types/database';

type DbCanvasObject =
  Database['public']['Tables']['canvas_objects']['Row'];
type DbCanvasObjectInsert =
  Database['public']['Tables']['canvas_objects']['Insert'];
type DbCanvasObjectUpdate =
  Database['public']['Tables']['canvas_objects']['Update'];

/**
 * Convert database row to CanvasObject
 */
export function dbToCanvasObject(dbObject: DbCanvasObject): CanvasObject {
  const baseObject = {
    id: dbObject.id,
    canvas_id: dbObject.canvas_id!, // W5.D2: Multi-canvas - canvas_id is required (NOT NULL after migration 012)
    x: Number(dbObject.x),
    y: Number(dbObject.y),
    width: Number(dbObject.width),
    height: Number(dbObject.height),
    rotation: Number(dbObject.rotation),
    opacity: Number(dbObject.opacity),
    fill: dbObject.fill,
    stroke: dbObject.stroke || undefined,
    stroke_width: dbObject.stroke_width ? Number(dbObject.stroke_width) : 0,
    group_id: dbObject.group_id || null,
    z_index: dbObject.z_index,
    type_properties: dbObject.type_properties || {},
    style_properties: dbObject.style_properties || {},
    metadata: dbObject.metadata || {},
    created_by: dbObject.created_by,
    created_at: dbObject.created_at,
    updated_at: dbObject.updated_at,
    locked_by: dbObject.locked_by,
    lock_acquired_at: dbObject.lock_acquired_at,
  };

  // Discriminated union based on type
  if (dbObject.type === 'rectangle') {
    return {
      ...baseObject,
      type: 'rectangle',
    } as CanvasObject;
  } else if (dbObject.type === 'circle') {
    return {
      ...baseObject,
      type: 'circle',
    } as unknown as CanvasObject;
  } else if (dbObject.type === 'text') {
    return {
      ...baseObject,
      type: 'text',
    } as unknown as CanvasObject;
  }

  throw new Error(`Unknown object type: ${dbObject.type}`);
}

/**
 * Convert CanvasObject to database insert payload
 */
export function canvasObjectToDb(
  object: CanvasObject,
  userId: string,
): DbCanvasObjectInsert {
  return {
    id: object.id,
    type: object.type,
    canvas_id: object.canvas_id, // W5.D2: Multi-canvas - canvas_id is required
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation,
    opacity: object.opacity,
    fill: object.fill,
    stroke: object.stroke || null,
    stroke_width: object.stroke_width || null,
    group_id: object.group_id,
    z_index: object.z_index || 0,
    type_properties: (object.type_properties || {}) as any,
    style_properties: object.style_properties || {},
    metadata: object.metadata || {},
    created_by: userId,
  };
}

/**
 * Convert CanvasObject to database update payload
 */
export function canvasObjectToDbUpdate(
  object: Partial<CanvasObject>,
): DbCanvasObjectUpdate {
  const update: DbCanvasObjectUpdate = {};

  if (object.type !== undefined) update.type = object.type;
  if (object.x !== undefined) update.x = object.x;
  if (object.y !== undefined) update.y = object.y;
  if (object.width !== undefined) update.width = object.width;
  if (object.height !== undefined) update.height = object.height;
  if (object.rotation !== undefined) update.rotation = object.rotation;
  if (object.opacity !== undefined) update.opacity = object.opacity;
  if (object.fill !== undefined) update.fill = object.fill;
  if (object.stroke !== undefined) update.stroke = object.stroke || null;
  if (object.stroke_width !== undefined)
    update.stroke_width = object.stroke_width || null;
  if (object.group_id !== undefined) update.group_id = object.group_id;
  if (object.z_index !== undefined) update.z_index = object.z_index;
  if (object.type_properties !== undefined)
    update.type_properties = object.type_properties as any;
  if (object.style_properties !== undefined)
    update.style_properties = object.style_properties;
  if (object.metadata !== undefined) update.metadata = object.metadata;

  return update;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Fetch all canvas objects from database
 */
export async function fetchCanvasObjects(): Promise<CanvasObject[]> {
  const { data, error } = await supabase
    .from('canvas_objects')
    .select('*')
    .order('z_index', { ascending: true });

  if (error) {
    console.error('Error fetching canvas objects:', error);
    throw error;
  }

  return data.map(dbToCanvasObject);
}

/**
 * Insert single canvas object
 */
export async function insertCanvasObject(
  object: CanvasObject,
  userId: string,
): Promise<CanvasObject> {
  const dbObject = canvasObjectToDb(object, userId);

  const { data, error } = await supabase
    .from('canvas_objects')
    .insert(dbObject)
    .select()
    .single();

  if (error) {
    console.error('Error inserting canvas object:', error);
    throw error;
  }

  return dbToCanvasObject(data);
}

/**
 * Update single canvas object
 */
export async function updateCanvasObject(
  id: string,
  updates: Partial<CanvasObject>,
): Promise<CanvasObject> {
  const dbUpdate = canvasObjectToDbUpdate(updates);

  const { data, error } = await supabase
    .from('canvas_objects')
    .update(dbUpdate)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating canvas object:', error);
    throw error;
  }

  return dbToCanvasObject(data);
}

/**
 * Delete single canvas object
 */
export async function deleteCanvasObject(id: string): Promise<void> {
  const { error } = await supabase.from('canvas_objects').delete().eq('id', id);

  if (error) {
    console.error('Error deleting canvas object:', error);
    throw error;
  }
}

/**
 * Delete multiple canvas objects
 */
export async function deleteCanvasObjects(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('canvas_objects')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('Error deleting canvas objects:', error);
    throw error;
  }
}

/**
 * Batch update z-index for multiple objects
 */
export async function updateZIndexes(
  updates: Array<{ id: string; z_index: number }>,
): Promise<void> {
  // Supabase doesn't support batch updates directly
  // Use Promise.all for parallel updates
  const promises = updates.map(({ id, z_index }) =>
    supabase.from('canvas_objects').update({ z_index }).eq('id', id),
  );

  const results = await Promise.all(promises);

  // Check for errors
  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    console.error('Error updating z-indexes:', errors);
    throw errors[0].error;
  }
}

// ============================================================================
// Real-time Subscriptions
// ============================================================================

/**
 * Subscribe to canvas objects changes
 *
 * @param callbacks - Event handlers for INSERT, UPDATE, DELETE
 * @returns Unsubscribe function
 */
export function subscribeToCanvasObjects(callbacks: {
  onInsert?: (object: CanvasObject) => void;
  onUpdate?: (object: CanvasObject) => void;
  onDelete?: (objectId: string) => void;
}) {
  const channel = supabase
    .channel('canvas-objects-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'canvas_objects',
      },
      (payload) => {
        if (callbacks.onInsert) {
          const object = dbToCanvasObject(payload.new as DbCanvasObject);
          callbacks.onInsert(object);
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'canvas_objects',
      },
      (payload) => {
        if (callbacks.onUpdate) {
          const object = dbToCanvasObject(payload.new as DbCanvasObject);
          callbacks.onUpdate(object);
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'canvas_objects',
      },
      (payload) => {
        if (callbacks.onDelete) {
          callbacks.onDelete((payload.old as DbCanvasObject).id);
        }
      },
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to presence for real-time collaboration
 * (Placeholder for Phase II collaboration features)
 */
export function subscribeToPresence(
  roomId: string,
  callbacks: {
    onUserJoin?: (userId: string, metadata: unknown) => void;
    onUserLeave?: (userId: string) => void;
    onCursorMove?: (userId: string, x: number, y: number) => void;
  },
) {
  const channel = supabase.channel(`presence-${roomId}`, {
    config: {
      presence: {
        key: 'user-presence',
      },
    },
  });

  channel
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      if (callbacks.onUserJoin && newPresences.length > 0) {
        const presence = newPresences[0];
        callbacks.onUserJoin(key, presence);
      }
    })
    .on('presence', { event: 'leave' }, ({ key }) => {
      if (callbacks.onUserLeave) {
        callbacks.onUserLeave(key);
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
