-- =============================================================================
-- Migration 009: Add Viewport Persistence
-- =============================================================================
-- W2.D7.1: Create user_canvas_viewports table for cross-device viewport sync
-- Stores per-user viewport state (zoom, panX, panY) in JSONB for flexibility
-- =============================================================================

-- =============================================================================
-- STEP 1: Create user_canvas_viewports table
-- =============================================================================
CREATE TABLE user_canvas_viewports (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Viewport State (JSONB for flexibility)
  viewport_state JSONB NOT NULL DEFAULT '{"zoom": 1, "panX": 0, "panY": 0}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one viewport per user
  CONSTRAINT unique_user_viewport UNIQUE (user_id)
);

-- =============================================================================
-- STEP 2: Add indexes for performance
-- =============================================================================
-- Index for fast user lookup
CREATE INDEX idx_user_canvas_viewports_user_id
  ON user_canvas_viewports(user_id);

-- GIN index for JSONB queries (if we ever query by zoom level, etc.)
CREATE INDEX idx_user_canvas_viewports_viewport_state
  ON user_canvas_viewports USING GIN (viewport_state);

-- =============================================================================
-- STEP 3: Add auto-update timestamp trigger
-- =============================================================================
CREATE TRIGGER update_user_canvas_viewports_updated_at
  BEFORE UPDATE ON user_canvas_viewports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 4: Add RLS policies
-- =============================================================================
-- Enable RLS
ALTER TABLE user_canvas_viewports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own viewport
CREATE POLICY "Users can read own viewport"
  ON user_canvas_viewports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own viewport
CREATE POLICY "Users can insert own viewport"
  ON user_canvas_viewports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own viewport
CREATE POLICY "Users can update own viewport"
  ON user_canvas_viewports
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own viewport
CREATE POLICY "Users can delete own viewport"
  ON user_canvas_viewports
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- STEP 5: Add realtime publication
-- =============================================================================
-- Enable realtime for cross-device sync
ALTER PUBLICATION supabase_realtime ADD TABLE user_canvas_viewports;

-- =============================================================================
-- NOTES:
-- =============================================================================
-- - viewport_state JSONB format: {"zoom": number, "panX": number, "panY": number}
-- - One viewport per user (enforced by unique constraint)
-- - RLS ensures users can only access their own viewport
-- - Realtime enables instant sync across devices
-- - Auto-update timestamp trigger tracks last modification time
-- =============================================================================
