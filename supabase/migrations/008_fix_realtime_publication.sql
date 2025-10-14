-- =============================================================================
-- Migration 008: Fix Realtime Publication for canvas_objects
-- =============================================================================
-- Problem: Migration 007 dropped canvas_objects, which removed it from the
-- supabase_realtime publication. When canvas_objects_new was renamed to
-- canvas_objects, it was never re-added to the publication.
--
-- Result: No real-time events are being broadcast for canvas_objects changes,
-- causing 20-30 second delays for other users to see updates.
--
-- Solution: Re-add canvas_objects to the publication.
-- =============================================================================

-- First, let's check what's currently in the publication
DO $$
DECLARE
  tables_in_pub TEXT;
BEGIN
  SELECT string_agg(tablename, ', ')
  INTO tables_in_pub
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime';
  
  RAISE NOTICE '📡 Tables currently in supabase_realtime publication: %', 
    COALESCE(tables_in_pub, 'NONE');
END $$;

-- =============================================================================
-- Add canvas_objects to publication
-- =============================================================================

-- Remove first if it exists (idempotent)
-- Note: ALTER PUBLICATION DROP TABLE doesn't support IF EXISTS syntax
DO $$
BEGIN
  -- Try to drop, ignore error if not in publication
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE canvas_objects;
    RAISE NOTICE '📤 Removed canvas_objects from publication (was present)';
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE '📝 canvas_objects not in publication (expected)';
    WHEN OTHERS THEN
      RAISE NOTICE '⚠️  Error removing: % (continuing anyway)', SQLERRM;
  END;
END $$;

-- Add canvas_objects to publication
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_objects;

-- Verify it was added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'canvas_objects'
  ) THEN
    RAISE EXCEPTION '❌ Failed to add canvas_objects to supabase_realtime publication';
  END IF;
  
  RAISE NOTICE '✅ canvas_objects successfully added to supabase_realtime publication';
END $$;

-- =============================================================================
-- Verify final state
-- =============================================================================

DO $$
DECLARE
  tables_in_pub TEXT;
BEGIN
  SELECT string_agg(tablename, ', ')
  INTO tables_in_pub
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime';
  
  RAISE NOTICE '📡 Final publication state: %', tables_in_pub;
  RAISE NOTICE '🔄 Replica Identity: FULL (already configured in migration 007)';
  RAISE NOTICE '✅ Real-time events should now broadcast for all operations';
END $$;

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- After running this migration:
-- 1. Real-time INSERT events will broadcast (< 100ms)
-- 2. Real-time UPDATE events will broadcast (< 100ms)
-- 3. Real-time DELETE events will broadcast (< 100ms)
-- 4. Other users will see changes in < 100ms (not 20-30 seconds!)
-- =============================================================================

