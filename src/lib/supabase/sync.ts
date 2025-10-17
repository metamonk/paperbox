/**
 * Supabase Sync Layer
 *
 * Synchronizes Zustand store with Supabase database
 * Handles CRUD operations and real-time subscriptions
 *
 * W1.D4 Integration layer between Zustand and Supabase
 */

import { supabase } from './client';
import type { CanvasObject } from '@/types/canvas';
import type { Database } from './types';

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
    x: Number(dbObject.x),
    y: Number(dbObject.y),
    width: Number(dbObject.width),
    height: Number(dbObject.height),
    rotation: Number(dbObject.rotation),
    opacity: Number(dbObject.opacity),
    fill_color: dbObject.fill_color,
    stroke_color: dbObject.stroke_color || undefined,
    stroke_width: Number(dbObject.stroke_width),
  };

  // Type-specific properties
  const typeProperties = dbObject.type_properties as Record<string, unknown>;

  switch (dbObject.type) {
    case 'rectangle':
      return {
        ...baseObject,
        type: 'rectangle',
        type_properties: typeProperties as object,
      };

    case 'circle':
      return {
        ...baseObject,
        type: 'circle',
        type_properties: {
          radius: (typeProperties.radius as number) || 50,
        },
      };

    case 'text':
      return {
        ...baseObject,
        type: 'text',
        type_properties: {
          text_content: (typeProperties.text_content as string) || '',
          font_size: (typeProperties.font_size as number) || 16,
          font_family: (typeProperties.font_family as string) || 'Arial',
        },
      };

    default:
      throw new Error(`Unknown object type: ${dbObject.type}`);
  }
}

/**
 * Convert CanvasObject to database insert
 */
export function canvasObjectToDb(
  canvasId: string,
  object: CanvasObject,
  zIndex: number = 0,
): DbCanvasObjectInsert {
  return {
    id: object.id,
    canvas_id: canvasId,
    type: object.type,
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation,
    opacity: object.opacity,
    fill_color: object.fill_color,
    stroke_color: object.stroke_color || null,
    stroke_width: object.stroke_width,
    type_properties: object.type_properties as unknown as
      | Database['public']['Tables']['canvas_objects']['Row']['type_properties'],
    z_index: zIndex,
  };
}

/**
 * Fetch all canvas objects for a canvas
 */
export async function fetchCanvasObjects(
  canvasId: string,
): Promise<CanvasObject[]> {
  const { data, error } = await supabase
    .from('canvas_objects')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('z_index', { ascending: true });

  if (error) {
    console.error('Error fetching canvas objects:', error);
    throw error;
  }

  return (data || []).map(dbToCanvasObject);
}

/**
 * Insert a new canvas object
 */
export async function insertCanvasObject(
  canvasId: string,
  object: CanvasObject,
  zIndex: number = 0,
): Promise<CanvasObject> {
  const dbObject = canvasObjectToDb(canvasId, object, zIndex);

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
 * Update a canvas object
 */
export async function updateCanvasObject(
  objectId: string,
  updates: Partial<CanvasObject>,
): Promise<CanvasObject> {
  const dbUpdates: DbCanvasObjectUpdate = {};

  // Map CanvasObject fields to database fields
  if (updates.x !== undefined) dbUpdates.x = updates.x;
  if (updates.y !== undefined) dbUpdates.y = updates.y;
  if (updates.width !== undefined) dbUpdates.width = updates.width;
  if (updates.height !== undefined) dbUpdates.height = updates.height;
  if (updates.rotation !== undefined) dbUpdates.rotation = updates.rotation;
  if (updates.opacity !== undefined) dbUpdates.opacity = updates.opacity;
  if (updates.fill_color !== undefined)
    dbUpdates.fill_color = updates.fill_color;
  if (updates.stroke_color !== undefined)
    dbUpdates.stroke_color = updates.stroke_color || null;
  if (updates.stroke_width !== undefined)
    dbUpdates.stroke_width = updates.stroke_width;
  if (updates.type_properties !== undefined) {
    dbUpdates.type_properties = updates.type_properties as unknown as
      | Database['public']['Tables']['canvas_objects']['Row']['type_properties'];
  }

  const { data, error } = await supabase
    .from('canvas_objects')
    .update(dbUpdates)
    .eq('id', objectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating canvas object:', error);
    throw error;
  }

  return dbToCanvasObject(data);
}

/**
 * Delete a canvas object
 */
export async function deleteCanvasObject(objectId: string): Promise<void> {
  const { error } = await supabase
    .from('canvas_objects')
    .delete()
    .eq('id', objectId);

  if (error) {
    console.error('Error deleting canvas object:', error);
    throw error;
  }
}

/**
 * Delete multiple canvas objects
 */
export async function deleteCanvasObjects(objectIds: string[]): Promise<void> {
  if (objectIds.length === 0) return;

  const { error } = await supabase
    .from('canvas_objects')
    .delete()
    .in('id', objectIds);

  if (error) {
    console.error('Error deleting canvas objects:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time canvas object changes
 *
 * Returns unsubscribe function
 */
export function subscribeToCanvasObjects(
  canvasId: string,
  callbacks: {
    onInsert?: (object: CanvasObject) => void;
    onUpdate?: (object: CanvasObject) => void;
    onDelete?: (objectId: string) => void;
  },
) {
  const channel = supabase
    .channel(`canvas-${canvasId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'canvas_objects',
        filter: `canvas_id=eq.${canvasId}`,
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
        filter: `canvas_id=eq.${canvasId}`,
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
        filter: `canvas_id=eq.${canvasId}`,
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
 * Batch update z-indexes for layer reordering
 */
export async function updateZIndexes(
  updates: Array<{ id: string; zIndex: number }>,
): Promise<void> {
  // Supabase doesn't have a native batch update, so we'll do them sequentially
  // In production, consider using a PostgreSQL function for better performance
  for (const update of updates) {
    const { error } = await supabase
      .from('canvas_objects')
      .update({ z_index: update.zIndex })
      .eq('id', update.id);

    if (error) {
      console.error(`Error updating z-index for ${update.id}:`, error);
      throw error;
    }
  }
}
