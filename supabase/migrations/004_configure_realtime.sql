-- Configure Realtime for canvas_objects table
-- This ensures proper replication and eliminates schema mismatch errors

-- ============================================================================
-- REPLICA IDENTITY
-- ============================================================================
-- Set replica identity to FULL to include all columns in realtime events
-- This is critical for UPDATE and DELETE events to work properly
ALTER TABLE canvas_objects REPLICA IDENTITY FULL;

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
-- Drop existing publication if it exists (to ensure clean state)
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

-- Create publication for realtime with explicit table configuration
CREATE PUBLICATION supabase_realtime FOR TABLE canvas_objects;

-- Verify the publication was created correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'Failed to create supabase_realtime publication';
  END IF;
END $$;

-- ============================================================================
-- REPLICATION SLOT
-- ============================================================================
-- Note: Supabase manages replication slots automatically
-- This comment documents that we rely on Supabase's slot management

-- Log successful configuration
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime configured successfully for canvas_objects';
  RAISE NOTICE '📡 Publication: supabase_realtime';
  RAISE NOTICE '🔄 Replica Identity: FULL';
END $$;

