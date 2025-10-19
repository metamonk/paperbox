-- Add function for atomic batch z-index updates
-- This dramatically improves performance for layer reordering
-- by updating all layers in a single query with a single realtime broadcast

CREATE OR REPLACE FUNCTION batch_update_z_index(
  layer_ids UUID[],
  new_z_indices INTEGER[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Run with function creator's permissions
AS $$
DECLARE
  array_length_mismatch BOOLEAN;
BEGIN
  -- Validate input arrays have same length
  IF array_length(layer_ids, 1) != array_length(new_z_indices, 1) THEN
    RAISE EXCEPTION 'layer_ids and new_z_indices must have the same length';
  END IF;

  -- Atomic batch update using UNNEST
  -- This generates a single UPDATE statement that modifies all rows
  UPDATE canvas_objects
  SET 
    z_index = data.new_z_index,
    updated_at = NOW()
  FROM (
    SELECT 
      UNNEST(layer_ids) AS id,
      UNNEST(new_z_indices) AS new_z_index
  ) AS data
  WHERE canvas_objects.id = data.id;
  
  -- Log for debugging
  RAISE NOTICE 'Updated % layers z_index values', array_length(layer_ids, 1);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION batch_update_z_index(UUID[], INTEGER[]) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION batch_update_z_index IS 
'Atomically updates z_index for multiple canvas objects. 
Used for efficient layer reordering with single realtime broadcast.';

