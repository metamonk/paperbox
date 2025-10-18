-- Multi-Canvas Architecture: Migrate existing data to default canvas
-- Creates a default "My Canvas" for each user and assigns existing objects to it

-- ============================================================================
-- CREATE DEFAULT CANVAS FOR EXISTING USERS
-- ============================================================================
-- For each user who owns canvas objects but has no canvases yet,
-- create a default canvas called "My Canvas"
INSERT INTO canvases (owner_id, name, description)
SELECT DISTINCT
  COALESCE(co.created_by, co.locked_by) as owner_id,
  'My Canvas' as name,
  'Default canvas created during multi-canvas migration' as description
FROM canvas_objects co
WHERE COALESCE(co.created_by, co.locked_by) IS NOT NULL
  -- Only create if user doesn't already have a canvas
  AND NOT EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.owner_id = COALESCE(co.created_by, co.locked_by)
  );

-- ============================================================================
-- ASSIGN EXISTING OBJECTS TO DEFAULT CANVAS
-- ============================================================================
-- Update all canvas_objects without a canvas_id to point to their owner's default canvas
-- Uses COALESCE to handle objects created by different users (collaboration scenario)
UPDATE canvas_objects co
SET canvas_id = (
  SELECT c.id
  FROM canvases c
  WHERE c.owner_id = COALESCE(co.created_by, co.locked_by)
    AND c.name = 'My Canvas'
  LIMIT 1
)
WHERE co.canvas_id IS NULL
  AND COALESCE(co.created_by, co.locked_by) IS NOT NULL;

-- ============================================================================
-- MAKE CANVAS_ID REQUIRED
-- ============================================================================
-- Now that all existing objects have been assigned, make canvas_id NOT NULL
-- This ensures all future objects must belong to a canvas
ALTER TABLE canvas_objects
  ALTER COLUMN canvas_id SET NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON CONSTRAINT canvas_objects_canvas_id_fkey ON canvas_objects IS 'All objects must belong to a canvas (required after multi-canvas migration)';
