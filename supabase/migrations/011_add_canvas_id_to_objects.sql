-- Multi-Canvas Architecture: Add canvas_id to canvas_objects
-- Links canvas objects to their parent canvas for proper scoping

-- ============================================================================
-- ADD CANVAS_ID COLUMN
-- ============================================================================
-- Add canvas_id foreign key to canvas_objects table
-- Initially nullable to allow existing objects to remain during migration
ALTER TABLE canvas_objects
  ADD COLUMN canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE;

-- ============================================================================
-- INDEX FOR CANVAS SCOPING
-- ============================================================================
-- Index for filtering objects by canvas (primary query pattern)
CREATE INDEX idx_canvas_objects_canvas_id ON canvas_objects(canvas_id);

-- Composite index for canvas + created_at (optimized for canvas object list)
CREATE INDEX idx_canvas_objects_canvas_created ON canvas_objects(canvas_id, created_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN canvas_objects.canvas_id IS 'Parent canvas identifier - scopes objects to specific canvas workspace';
