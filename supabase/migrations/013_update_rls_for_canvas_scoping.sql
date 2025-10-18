-- Multi-Canvas Architecture: Update RLS policies for canvas scoping
-- Maintains collaborative model WITHIN each canvas, but scopes access by canvas ownership

-- ============================================================================
-- DROP OLD CANVAS_OBJECTS POLICIES
-- ============================================================================
-- Remove the existing fully-collaborative policies
DROP POLICY IF EXISTS "Canvas objects are viewable by everyone" ON canvas_objects;
DROP POLICY IF EXISTS "Authenticated users can insert canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Authenticated users can update any canvas object" ON canvas_objects;
DROP POLICY IF EXISTS "Authenticated users can delete any canvas object" ON canvas_objects;

-- ============================================================================
-- NEW CANVAS-SCOPED POLICIES
-- ============================================================================
-- Users can view objects in canvases they own
-- Maintains collaborative model: all objects in owned canvases are visible
CREATE POLICY "Users can view objects in own canvases"
  ON canvas_objects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvases c
      WHERE c.id = canvas_objects.canvas_id
        AND c.owner_id = auth.uid()
    )
  );

-- Users can insert objects into canvases they own
CREATE POLICY "Users can insert objects into own canvases"
  ON canvas_objects
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases c
      WHERE c.id = canvas_objects.canvas_id
        AND c.owner_id = auth.uid()
    )
  );

-- Users can update objects in canvases they own
-- Maintains collaborative model: any object in owned canvas can be updated
CREATE POLICY "Users can update objects in own canvases"
  ON canvas_objects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM canvases c
      WHERE c.id = canvas_objects.canvas_id
        AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvases c
      WHERE c.id = canvas_objects.canvas_id
        AND c.owner_id = auth.uid()
    )
  );

-- Users can delete objects in canvases they own
CREATE POLICY "Users can delete objects in own canvases"
  ON canvas_objects
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM canvases c
      WHERE c.id = canvas_objects.canvas_id
        AND c.owner_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON POLICY "Users can view objects in own canvases" ON canvas_objects IS 'Canvas-scoped: Users can view all objects in canvases they own';
COMMENT ON POLICY "Users can insert objects into own canvases" ON canvas_objects IS 'Canvas-scoped: Users can create objects only in canvases they own';
COMMENT ON POLICY "Users can update objects in own canvases" ON canvas_objects IS 'Canvas-scoped: Users can update any object in canvases they own (collaborative within canvas)';
COMMENT ON POLICY "Users can delete objects in own canvases" ON canvas_objects IS 'Canvas-scoped: Users can delete any object in canvases they own';
