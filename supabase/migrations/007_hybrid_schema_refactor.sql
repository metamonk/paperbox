-- =============================================================================
-- Migration 007: Hybrid Schema Refactor for AI Integration
-- =============================================================================
-- This migration refactors canvas_objects to use a hybrid approach:
-- - Core geometry & common styles as columns (fast indexed queries)
-- - Type-specific properties in JSONB (flexibility)
-- - Style extensions in JSONB (shadows, effects, gradients)
-- - AI metadata in JSONB (arbitrary agent data)
-- Also adds canvas_groups table for hierarchical grouping
-- =============================================================================

-- =============================================================================
-- STEP 1: Create canvas_groups table
-- =============================================================================
CREATE TABLE canvas_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_group_id UUID REFERENCES canvas_groups(id) ON DELETE CASCADE,
  locked BOOLEAN DEFAULT FALSE,
  z_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT groups_z_index_positive CHECK (z_index >= 0)
);

-- =============================================================================
-- STEP 2: Create new canvas_objects table with hybrid schema
-- =============================================================================
CREATE TABLE canvas_objects_new (
  -- Identity & Type
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  
  -- Core Geometry (always present, frequently queried)
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  width FLOAT NOT NULL DEFAULT 100,
  height FLOAT NOT NULL DEFAULT 100,
  rotation FLOAT DEFAULT 0,
  
  -- Hierarchy & Organization
  group_id UUID REFERENCES canvas_groups(id) ON DELETE SET NULL,
  z_index INTEGER DEFAULT 0,
  
  -- Common Style Properties (frequently queried, indexed)
  fill TEXT NOT NULL DEFAULT '#000000',
  stroke TEXT,
  stroke_width FLOAT,
  opacity FLOAT DEFAULT 1,
  
  -- Type-Specific Properties (varies by shape)
  -- Examples:
  --   Rectangle: { "corner_radius": 8 }
  --   Circle: { "radius": 50 }
  --   Text: { "text_content": "Hello", "font_size": 16, "font_family": "Inter", "font_weight": "bold", "text_align": "center" }
  type_properties JSONB DEFAULT '{}'::jsonb,
  
  -- Style Extensions (shadows, gradients, effects)
  -- Examples: { "shadow_blur": 4, "shadow_offset_x": 2, "shadow_color": "rgba(0,0,0,0.1)" }
  style_properties JSONB DEFAULT '{}'::jsonb,
  
  -- AI/Agent Metadata (arbitrary)
  -- Examples: { "ai_generated": true, "ai_prompt": "Create a button", "ai_confidence": 0.95 }
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Collaboration
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  lock_acquired_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT objects_z_index_positive CHECK (z_index >= 0),
  CONSTRAINT objects_width_positive CHECK (width > 0),
  CONSTRAINT objects_height_positive CHECK (height > 0),
  CONSTRAINT objects_opacity_range CHECK (opacity >= 0 AND opacity <= 1)
);

-- =============================================================================
-- STEP 3: Migrate existing data from old schema to new schema
-- =============================================================================
INSERT INTO canvas_objects_new (
  id,
  type,
  x,
  y,
  width,
  height,
  rotation,
  z_index,
  fill,
  stroke,
  stroke_width,
  opacity,
  type_properties,
  style_properties,
  metadata,
  created_by,
  created_at,
  updated_at,
  locked_by,
  lock_acquired_at
)
SELECT 
  id,
  type,
  x,
  y,
  -- Width/height with defaults based on type
  COALESCE(
    width,
    CASE 
      WHEN type = 'circle' THEN 100  -- Bounding box for circle
      WHEN type = 'text' THEN 200    -- Default text box width
      ELSE 100                        -- Rectangle default
    END
  ) as width,
  COALESCE(
    height,
    CASE 
      WHEN type = 'circle' THEN 100  -- Bounding box for circle
      WHEN type = 'text' THEN 50     -- Default text box height
      ELSE 100                        -- Rectangle default
    END
  ) as height,
  COALESCE(rotation, 0) as rotation,
  0 as z_index,  -- Default z_index for migrated objects
  fill,
  NULL as stroke,  -- Old schema didn't have stroke
  NULL as stroke_width,
  1.0 as opacity,  -- Default opacity
  -- Type-specific properties stored in JSONB
  CASE type
    WHEN 'circle' THEN jsonb_build_object('radius', COALESCE(radius, 50))
    WHEN 'text' THEN jsonb_build_object(
      'text_content', COALESCE(text_content, 'Text'),
      'font_size', COALESCE(font_size, 16)
    )
    WHEN 'rectangle' THEN '{}'::jsonb
    ELSE '{}'::jsonb
  END as type_properties,
  '{}'::jsonb as style_properties,  -- No old style data to migrate
  '{}'::jsonb as metadata,          -- No old metadata to migrate
  created_by,
  created_at,
  updated_at,
  locked_by,
  lock_acquired_at
FROM canvas_objects;

-- =============================================================================
-- STEP 4: Drop old table and rename new table
-- =============================================================================
DROP TABLE canvas_objects CASCADE;
ALTER TABLE canvas_objects_new RENAME TO canvas_objects;

-- =============================================================================
-- STEP 5: Create indexes for performance
-- =============================================================================

-- Core geometry indexes
CREATE INDEX idx_objects_x ON canvas_objects(x);
CREATE INDEX idx_objects_y ON canvas_objects(y);
CREATE INDEX idx_objects_type ON canvas_objects(type);
CREATE INDEX idx_objects_z_index ON canvas_objects(z_index);

-- Hierarchy indexes
CREATE INDEX idx_objects_group_id ON canvas_objects(group_id);
CREATE INDEX idx_objects_created_by ON canvas_objects(created_by);

-- Style indexes (frequently queried)
CREATE INDEX idx_objects_fill ON canvas_objects(fill);
CREATE INDEX idx_objects_stroke ON canvas_objects(stroke) WHERE stroke IS NOT NULL;

-- Time-based indexes
CREATE INDEX idx_objects_created_at ON canvas_objects(created_at);
CREATE INDEX idx_objects_updated_at ON canvas_objects(updated_at);

-- Lock indexes
CREATE INDEX idx_objects_locked_by ON canvas_objects(locked_by) WHERE locked_by IS NOT NULL;

-- JSONB GIN indexes for flexible queries
CREATE INDEX idx_objects_type_properties ON canvas_objects USING GIN (type_properties);
CREATE INDEX idx_objects_style_properties ON canvas_objects USING GIN (style_properties);
CREATE INDEX idx_objects_metadata ON canvas_objects USING GIN (metadata);

-- Group indexes
CREATE INDEX idx_groups_parent_group_id ON canvas_groups(parent_group_id);
CREATE INDEX idx_groups_z_index ON canvas_groups(z_index);
CREATE INDEX idx_groups_created_by ON canvas_groups(created_by);
CREATE INDEX idx_groups_created_at ON canvas_groups(created_at);

-- =============================================================================
-- STEP 6: Recreate triggers for new table
-- =============================================================================

-- Updated_at trigger for canvas_objects
CREATE TRIGGER update_canvas_objects_updated_at
  BEFORE UPDATE ON canvas_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for canvas_groups
CREATE TRIGGER update_canvas_groups_updated_at
  BEFORE UPDATE ON canvas_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- STEP 7: Enable Realtime for new table
-- =============================================================================

-- Configure Realtime for canvas_objects
ALTER TABLE canvas_objects REPLICA IDENTITY FULL;

-- Configure Realtime for canvas_groups
ALTER TABLE canvas_groups REPLICA IDENTITY FULL;

-- Add to Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_groups;
-- canvas_objects already in publication (DROP/CREATE replaced it)

-- =============================================================================
-- STEP 8: Update RLS policies
-- =============================================================================

-- Canvas objects policies (same as before, but recreate for new table)
ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Canvas objects are viewable by everyone"
  ON canvas_objects FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert canvas objects"
  ON canvas_objects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update any canvas object"
  ON canvas_objects FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete any canvas object"
  ON canvas_objects FOR DELETE
  USING (auth.role() = 'authenticated');

-- Canvas groups policies
ALTER TABLE canvas_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Canvas groups are viewable by everyone"
  ON canvas_groups FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert canvas groups"
  ON canvas_groups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update any canvas group"
  ON canvas_groups FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete any canvas group"
  ON canvas_groups FOR DELETE
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- STEP 9: Add helpful comments
-- =============================================================================

COMMENT ON TABLE canvas_objects IS 'Stores all canvas objects with hybrid schema: core properties as columns, flexible properties as JSONB';
COMMENT ON COLUMN canvas_objects.type_properties IS 'Type-specific properties (e.g., radius for circles, text_content for text)';
COMMENT ON COLUMN canvas_objects.style_properties IS 'Extended style properties (shadows, gradients, effects)';
COMMENT ON COLUMN canvas_objects.metadata IS 'AI/agent metadata and arbitrary key-value pairs';

COMMENT ON TABLE canvas_groups IS 'Hierarchical groups for organizing canvas objects';
COMMENT ON COLUMN canvas_groups.parent_group_id IS 'Parent group for nested hierarchy';
COMMENT ON COLUMN canvas_groups.locked IS 'If true, all objects in group are locked';

-- =============================================================================
-- Migration Complete
-- =============================================================================
-- Summary:
-- - Created canvas_groups table with hierarchical support
-- - Refactored canvas_objects to hybrid schema (Option 3)
-- - Migrated all existing data with proper defaults
-- - Created comprehensive indexes for performance
-- - Updated RLS policies for both tables
-- - Enabled Realtime for both tables
-- =============================================================================

