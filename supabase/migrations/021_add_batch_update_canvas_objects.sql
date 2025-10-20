-- ============================================================================
-- Add Atomic Batch Update Function for Canvas Objects
-- ============================================================================
-- Purpose: Dramatically improve performance for group object movements
-- Impact: Single database query + single realtime broadcast (vs N queries + N broadcasts)
-- Pattern: Based on batch_update_z_index (migration 020) - proven 50x performance gain
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_update_canvas_objects(
  object_ids UUID[],
  x_values DOUBLE PRECISION[],
  y_values DOUBLE PRECISION[],
  width_values DOUBLE PRECISION[],
  height_values DOUBLE PRECISION[],
  rotation_values DOUBLE PRECISION[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run with function creator's permissions
AS $$
DECLARE
  array_count INTEGER;
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
  
  -- Log for debugging
  RAISE NOTICE 'Atomically updated % canvas objects (single query, single broadcast)', array_count;
END;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================
GRANT EXECUTE ON FUNCTION batch_update_canvas_objects(UUID[], DOUBLE PRECISION[], DOUBLE PRECISION[], DOUBLE PRECISION[], DOUBLE PRECISION[], DOUBLE PRECISION[]) TO authenticated;

-- ============================================================================
-- Add Documentation Comment
-- ============================================================================
COMMENT ON FUNCTION batch_update_canvas_objects IS 
'Atomically updates position and transform properties for multiple canvas objects.
Used for efficient group movement synchronization with single realtime broadcast.

Performance: 50x+ faster than N separate UPDATE queries for large groups.
Real-time: Triggers single postgres_changes event instead of N events.
Atomicity: All objects update or none (transaction safety).

Args:
  - object_ids: Array of canvas object UUIDs to update
  - x_values: Array of new x coordinates (center-origin)
  - y_values: Array of new y coordinates (center-origin)
  - width_values: Array of new widths
  - height_values: Array of new heights
  - rotation_values: Array of new rotation angles (degrees)

Example:
  SELECT batch_update_canvas_objects(
    ARRAY[''obj1-uuid'', ''obj2-uuid''],
    ARRAY[100.0, 200.0],  -- x positions
    ARRAY[150.0, 250.0],  -- y positions
    ARRAY[50.0, 75.0],    -- widths
    ARRAY[50.0, 75.0],    -- heights
    ARRAY[0.0, 45.0]      -- rotations
  );';

-- ============================================================================
-- Validation Query (for testing)
-- ============================================================================
-- Test 1: Verify function exists
-- SELECT proname, pronargs FROM pg_proc WHERE proname = 'batch_update_canvas_objects';
--
-- Test 2: Test with sample data (replace UUIDs with real object IDs)
-- SELECT batch_update_canvas_objects(
--   ARRAY['<uuid1>', '<uuid2>']::UUID[],
--   ARRAY[100.0, 200.0],
--   ARRAY[100.0, 200.0],
--   ARRAY[50.0, 50.0],
--   ARRAY[50.0, 50.0],
--   ARRAY[0.0, 0.0]
-- );
--
-- Test 3: Verify single UPDATE event in logs
-- EXPLAIN SELECT batch_update_canvas_objects(...);

-- ============================================================================
-- Migration Complete: Atomic Batch Canvas Object Updates
-- ============================================================================

