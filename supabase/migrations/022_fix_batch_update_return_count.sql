-- ============================================================================
-- Migration: Fix batch_update_canvas_objects to return row count
-- ============================================================================
-- 
-- Problem: The function returns void, so we can't tell if rows were actually updated
-- Fix: Return INTEGER with the number of rows updated
-- 
-- This helps diagnose issues where RPC succeeds but no rows match the WHERE clause
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_update_canvas_objects(
  object_ids UUID[],
  x_values DOUBLE PRECISION[],
  y_values DOUBLE PRECISION[],
  width_values DOUBLE PRECISION[],
  height_values DOUBLE PRECISION[],
  rotation_values DOUBLE PRECISION[]
)
RETURNS INTEGER -- Changed from void to INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with function creator's permissions
AS $$
DECLARE
  array_count INTEGER;
  rows_updated INTEGER;
BEGIN
  -- Validate all input arrays have the same length
  array_count := array_length(object_ids, 1);
  
  IF array_count IS NULL THEN
    RAISE EXCEPTION 'object_ids array cannot be NULL or empty';
  END IF;
  
  IF array_length(x_values, 1) != array_count OR
     array_length(y_values, 1) != array_count OR
     array_length(width_values, 1) != array_count OR
     array_length(height_values, 1) != array_count OR
     array_length(rotation_values, 1) != array_count THEN
    RAISE EXCEPTION 'All input arrays must have the same length';
  END IF;

  -- Atomic batch update using UNNEST
  -- This generates a single UPDATE statement that modifies all rows
  -- Result: Single postgres_changes broadcast instead of N separate events
  UPDATE canvas_objects
  SET 
    x = data.x_val,
    y = data.y_val,
    width = data.width_val,
    height = data.height_val,
    rotation = data.rotation_val,
    updated_at = NOW()
  FROM (
    SELECT 
      UNNEST(object_ids) AS id,
      UNNEST(x_values) AS x_val,
      UNNEST(y_values) AS y_val,
      UNNEST(width_values) AS width_val,
      UNNEST(height_values) AS height_val,
      UNNEST(rotation_values) AS rotation_val
  ) AS data
  WHERE canvas_objects.id = data.id;
  
  -- Get number of rows actually updated
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  -- Log for debugging
  RAISE NOTICE 'Attempted to update % objects, actually updated % rows', array_count, rows_updated;
  
  -- Return the count
  RETURN rows_updated;
END;
$$;

-- No need to re-grant permissions (already granted in 021)

COMMENT ON FUNCTION batch_update_canvas_objects IS 
'Atomically updates position and transform properties for multiple canvas objects.
Used for efficient group movement synchronization with single realtime broadcast.

Returns: Number of rows actually updated (helps diagnose WHERE clause mismatches)

Performance: 50x+ faster than N separate UPDATE queries for large groups.
Real-time: Triggers single postgres_changes event instead of N events.

Example:
  SELECT batch_update_canvas_objects(
    ARRAY[''uuid1'', ''uuid2''],  -- object_ids
    ARRAY[100.5, 200.3],           -- x_values  
    ARRAY[150.2, 250.8],           -- y_values
    ARRAY[100, 100],               -- width_values
    ARRAY[100, 100],               -- height_values
    ARRAY[0, 45]                   -- rotation_values
  );
  -- Returns: 2 (if both objects were found and updated)
';

