/**
 * Database↔Store Coordinate Conversion Utilities
 * 
 * Consolidates all database conversion logic to eliminate DRY violations.
 * 
 * Previously, `dbToCanvasObject` was duplicated in:
 * - useRealtimeObjects.ts
 * - SyncManager.ts
 * - canvasSlice.ts
 * 
 * Now: Single source of truth for database conversions.
 * 
 * Coordinate System Notes:
 * - Database stores center-origin coordinates (-4000 to +4000)
 * - Zustand store uses center-origin coordinates (-4000 to +4000)
 * - No translation needed here (database ↔ store use same system)
 * - Translation to Fabric.js coordinates happens in FabricCanvasManager
 */

import type { Database } from '../../types/database';
import type { CanvasObject, RectangleObject, CircleObject, TextObject } from '../../types/canvas';

type DbCanvasObject = Database['public']['Tables']['canvas_objects']['Row'];

/**
 * Convert database row to CanvasObject discriminated union
 * 
 * This is a pure mapping function - no coordinate translation needed.
 * Both database and Zustand store use center-origin coordinates.
 * 
 * @param row - Database canvas_objects row
 * @returns Typed CanvasObject (RectangleObject | CircleObject | TextObject)
 * @throws Error if shape type is unknown
 */
export function dbToCanvasObject(row: DbCanvasObject): CanvasObject {
  const base = {
    id: row.id,
    canvas_id: row.canvas_id!,  // Multi-canvas: canvas_id is required (NOT NULL after migration 012)
    x: row.x,  // Center-origin coordinates from database
    y: row.y,  // Center-origin coordinates from database
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
 * Convert CanvasObject to database insert format
 * 
 * Removes runtime-only fields and ensures proper typing for database insertion.
 * No coordinate translation needed - both use center-origin coordinates.
 * 
 * @param obj - CanvasObject from Zustand store
 * @param userId - User ID for created_by field
 * @returns Database insert object
 */
export function canvasObjectToDb(
  obj: Partial<CanvasObject>,
  userId: string
): Database['public']['Tables']['canvas_objects']['Insert'] {
  return {
    id: obj.id,  // Optional - database will generate if not provided
    canvas_id: obj.canvas_id!,  // Required - must be set by caller
    type: obj.type!,  // Required
    x: obj.x!,  // Required - center-origin coordinates
    y: obj.y!,  // Required - center-origin coordinates
    width: obj.width ?? 100,
    height: obj.height ?? 100,
    rotation: obj.rotation ?? 0,
    group_id: obj.group_id ?? null,
    z_index: obj.z_index ?? 0,
    fill: obj.fill!,  // Required
    stroke: obj.stroke ?? null,
    stroke_width: obj.stroke_width ?? null,
    opacity: obj.opacity ?? 1,
    type_properties: (obj.type_properties ?? {}) as unknown as Database['public']['Tables']['canvas_objects']['Insert']['type_properties'],
    style_properties: obj.style_properties ?? {},
    metadata: obj.metadata ?? {},
    created_by: userId,
    // locked_by and lock_acquired_at are excluded (set by lock operations)
  };
}

/**
 * Convert CanvasObject to database update format
 * 
 * Only includes fields that are actually being updated.
 * No coordinate translation needed - both use center-origin coordinates.
 * 
 * @param updates - Partial CanvasObject with fields to update
 * @returns Database update object
 */
export function canvasObjectUpdatesToDb(
  updates: Partial<CanvasObject>
): Database['public']['Tables']['canvas_objects']['Update'] {
  const dbUpdates: Record<string, any> = {};

  // Only include fields that are explicitly provided
  if (updates.x !== undefined) dbUpdates.x = updates.x;  // Center-origin
  if (updates.y !== undefined) dbUpdates.y = updates.y;  // Center-origin
  if (updates.width !== undefined) dbUpdates.width = updates.width;
  if (updates.height !== undefined) dbUpdates.height = updates.height;
  if (updates.rotation !== undefined) dbUpdates.rotation = updates.rotation;
  if (updates.group_id !== undefined) dbUpdates.group_id = updates.group_id;
  if (updates.z_index !== undefined) dbUpdates.z_index = updates.z_index;
  if (updates.fill !== undefined) dbUpdates.fill = updates.fill;
  if (updates.stroke !== undefined) dbUpdates.stroke = updates.stroke;
  if (updates.stroke_width !== undefined) dbUpdates.stroke_width = updates.stroke_width;
  if (updates.opacity !== undefined) dbUpdates.opacity = updates.opacity;
  if (updates.type_properties !== undefined) dbUpdates.type_properties = updates.type_properties;
  if (updates.style_properties !== undefined) dbUpdates.style_properties = updates.style_properties;
  if (updates.metadata !== undefined) dbUpdates.metadata = updates.metadata;
  if (updates.locked_by !== undefined) dbUpdates.locked_by = updates.locked_by;
  if (updates.lock_acquired_at !== undefined) dbUpdates.lock_acquired_at = updates.lock_acquired_at;

  return dbUpdates as Database['public']['Tables']['canvas_objects']['Update'];
}

