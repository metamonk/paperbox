-- Multi-Canvas Architecture: Canvases Table Migration
-- Creates the canvases table to support multiple design files per user (Figma-style workspace)

-- ============================================================================
-- CANVASES TABLE
-- ============================================================================
-- Stores canvas metadata - each canvas is an isolated design workspace
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT canvas_name_not_empty CHECK (char_length(trim(name)) > 0),
  CONSTRAINT canvas_name_max_length CHECK (char_length(name) <= 255)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Index for fetching user's canvases (most common query)
CREATE INDEX idx_canvases_owner_id ON canvases(owner_id);

-- Index for sorting by creation date
CREATE INDEX idx_canvases_created_at ON canvases(created_at DESC);

-- Composite index for owner + created_at (optimized for user canvas list)
CREATE INDEX idx_canvases_owner_created ON canvases(owner_id, created_at DESC);

-- ============================================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================================
-- Reuse existing update_updated_at_column function from 001_initial_schema.sql
CREATE TRIGGER update_canvases_updated_at
  BEFORE UPDATE ON canvases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on canvases table
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own canvases
CREATE POLICY "Users can view own canvases"
  ON canvases
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can create their own canvases
CREATE POLICY "Users can create own canvases"
  ON canvases
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own canvases
CREATE POLICY "Users can update own canvases"
  ON canvases
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can delete their own canvases
CREATE POLICY "Users can delete own canvases"
  ON canvases
  FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================
-- Add canvases table to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE canvases;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE canvases IS 'Multi-canvas architecture: Stores canvas metadata for workspace organization';
COMMENT ON COLUMN canvases.id IS 'Unique canvas identifier (UUID)';
COMMENT ON COLUMN canvases.name IS 'Canvas display name (1-255 characters)';
COMMENT ON COLUMN canvases.description IS 'Optional canvas description';
COMMENT ON COLUMN canvases.owner_id IS 'User who owns this canvas (references auth.users)';
COMMENT ON COLUMN canvases.created_at IS 'Canvas creation timestamp';
COMMENT ON COLUMN canvases.updated_at IS 'Canvas last update timestamp (auto-updated)';
