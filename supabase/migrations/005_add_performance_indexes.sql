-- Add performance indexes for canvas_objects table
-- Improves query performance for initial load and filtering

-- ============================================================================
-- CREATED_AT INDEX
-- ============================================================================
-- Index on created_at for faster ordering on initial fetch
-- This is used in: .select('*').order('created_at', { ascending: true })
CREATE INDEX IF NOT EXISTS idx_canvas_objects_created_at 
  ON canvas_objects(created_at);

-- ============================================================================
-- LOCKED_BY INDEX
-- ============================================================================
-- Index on locked_by for faster lock status checks
-- Useful for queries filtering by lock status
CREATE INDEX IF NOT EXISTS idx_canvas_objects_locked_by 
  ON canvas_objects(locked_by) 
  WHERE locked_by IS NOT NULL;

-- ============================================================================
-- CREATED_BY INDEX
-- ============================================================================
-- Index on created_by for user-specific queries (future feature)
CREATE INDEX IF NOT EXISTS idx_canvas_objects_created_by 
  ON canvas_objects(created_by);

-- ============================================================================
-- COMPOSITE INDEX
-- ============================================================================
-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_canvas_objects_created_locked 
  ON canvas_objects(created_at, locked_by);

-- Analyze table to update statistics
ANALYZE canvas_objects;

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'canvas_objects'
ORDER BY indexname;

