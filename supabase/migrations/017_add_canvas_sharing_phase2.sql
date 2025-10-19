-- ============================================================================
-- Phase 2: Canvas Sharing - Granular Permissions
-- ============================================================================
-- Purpose: Add permission levels (owner/editor/viewer) for fine-grained access control
-- Impact: Enables per-user permission management beyond public/private
-- PRD: PHASE_2_PRD.md - Multi-Canvas Architecture (Week 5+)
-- Documentation: W5_CANVAS_SHARING_IMPLEMENTATION.md
-- ============================================================================

-- Step 1: Create canvas_permission ENUM type
-- ============================================================================
CREATE TYPE canvas_permission AS ENUM ('owner', 'editor', 'viewer');

-- Step 2: Create canvas_permissions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS canvas_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canvas_id UUID NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission canvas_permission NOT NULL DEFAULT 'viewer',
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),

  -- Ensure one permission record per user per canvas
  UNIQUE(canvas_id, user_id)
);

-- Step 3: Add indexes for efficient permission lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_canvas_permissions_canvas
ON canvas_permissions(canvas_id);

CREATE INDEX IF NOT EXISTS idx_canvas_permissions_user
ON canvas_permissions(user_id);

-- Composite index for fast user+canvas lookups
CREATE INDEX IF NOT EXISTS idx_canvas_permissions_lookup
ON canvas_permissions(canvas_id, user_id);

-- Step 4: Enable realtime for permission changes
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE canvas_permissions;

-- ============================================================================
-- RLS Policies: Permission Management
-- ============================================================================

-- Enable RLS
ALTER TABLE canvas_permissions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view permissions for canvases they can access
-- ============================================================================
CREATE POLICY "Users can view permissions for accessible canvases"
ON canvas_permissions FOR SELECT
USING (
  -- Can see permissions if you own the canvas OR have permission to it OR it's public
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_permissions.canvas_id
    AND (
      c.owner_id = auth.uid()
      OR c.is_public = true
      OR EXISTS (
        SELECT 1 FROM canvas_permissions cp2
        WHERE cp2.canvas_id = c.id
        AND cp2.user_id = auth.uid()
      )
    )
  )
);

-- Policy 2: Only canvas owners can grant permissions
-- ============================================================================
CREATE POLICY "Canvas owners can grant permissions"
ON canvas_permissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_permissions.canvas_id
    AND c.owner_id = auth.uid()
  )
);

-- Policy 3: Only canvas owners can update permissions
-- ============================================================================
CREATE POLICY "Canvas owners can update permissions"
ON canvas_permissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_permissions.canvas_id
    AND c.owner_id = auth.uid()
  )
);

-- Policy 4: Only canvas owners can revoke permissions
-- ============================================================================
CREATE POLICY "Canvas owners can revoke permissions"
ON canvas_permissions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_permissions.canvas_id
    AND c.owner_id = auth.uid()
  )
);

-- ============================================================================
-- Update Canvases RLS: Include permission-based access
-- ============================================================================

-- Policy: Users can view canvases they own, public canvases, or canvases shared with them
-- Replaces: "Users can view owned or public canvases" (016_add_canvas_sharing_phase1.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view owned or public canvases" ON canvases;

CREATE POLICY "Users can view accessible canvases via permissions"
ON canvases FOR SELECT
USING (
  auth.uid() = owner_id
  OR is_public = true
  OR EXISTS (
    SELECT 1 FROM canvas_permissions cp
    WHERE cp.canvas_id = canvases.id
    AND cp.user_id = auth.uid()
  )
);

-- ============================================================================
-- Update Canvas Objects RLS: Include permission-based editing
-- ============================================================================

-- Policy: Users can insert objects on canvases they own or have editor+ permission
-- Replaces: "Users can insert objects on accessible canvases" (016_add_canvas_sharing_phase1.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert objects on accessible canvases" ON canvas_objects;

CREATE POLICY "Users can insert objects with edit permission"
ON canvas_objects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (
      c.owner_id = auth.uid() -- Owner can edit
      OR c.is_public = true -- Public canvases allow editing (Phase 1 compatibility)
      OR EXISTS (
        SELECT 1 FROM canvas_permissions cp
        WHERE cp.canvas_id = c.id
        AND cp.user_id = auth.uid()
        AND cp.permission IN ('owner', 'editor') -- Only editor+ can insert
      )
    )
  )
);

-- Policy: Users can update objects on canvases they own or have editor+ permission
-- Replaces: "Users can update objects on accessible canvases" (016_add_canvas_sharing_phase1.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can update objects on accessible canvases" ON canvas_objects;

CREATE POLICY "Users can update objects with edit permission"
ON canvas_objects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (
      c.owner_id = auth.uid()
      OR c.is_public = true
      OR EXISTS (
        SELECT 1 FROM canvas_permissions cp
        WHERE cp.canvas_id = c.id
        AND cp.user_id = auth.uid()
        AND cp.permission IN ('owner', 'editor')
      )
    )
  )
);

-- Policy: Users can delete objects on canvases they own or have editor+ permission
-- Replaces: "Users can delete objects on accessible canvases" (016_add_canvas_sharing_phase1.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete objects on accessible canvases" ON canvas_objects;

CREATE POLICY "Users can delete objects with edit permission"
ON canvas_objects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (
      c.owner_id = auth.uid()
      OR c.is_public = true
      OR EXISTS (
        SELECT 1 FROM canvas_permissions cp
        WHERE cp.canvas_id = c.id
        AND cp.user_id = auth.uid()
        AND cp.permission IN ('owner', 'editor')
      )
    )
  )
);

-- Policy: Users can view objects on canvases they can access (read permission)
-- Note: Keep SELECT policy from Phase 1, it allows viewing for all accessible canvases
-- ============================================================================
-- No changes to SELECT policy - viewers can see objects, just can't edit

-- ============================================================================
-- Validation Query (for testing)
-- ============================================================================
-- Test 1: Verify canvas_permission type exists
-- SELECT enum_range(NULL::canvas_permission);

-- Test 2: Grant editor permission
-- INSERT INTO canvas_permissions (canvas_id, user_id, permission, granted_by)
-- VALUES ('<canvas_id>', '<user_id>', 'editor', '<owner_id>');

-- Test 3: Verify user with editor permission can view canvas
-- SELECT * FROM canvases WHERE id = '<canvas_id>'; -- Should work for user with permission

-- Test 4: Verify user with viewer permission cannot edit objects
-- UPDATE canvas_objects SET fill = '#FF0000' WHERE canvas_id = '<canvas_id>'; -- Fails for viewer

-- Test 5: Verify owner can revoke permission
-- DELETE FROM canvas_permissions WHERE canvas_id = '<canvas_id>' AND user_id = '<user_id>';

-- ============================================================================
-- Migration Complete: Phase 2 Canvas Sharing
-- ============================================================================
-- Changes:
-- ✅ Created canvas_permission ENUM type
-- ✅ Created canvas_permissions table with UNIQUE constraint
-- ✅ Added indexes for efficient permission lookups
-- ✅ Enabled realtime for permission changes
-- ✅ Updated RLS policies to honor permission levels
-- ✅ Viewer permission: read-only (can view objects, cannot edit)
-- ✅ Editor permission: can insert/update/delete objects
-- ✅ Owner permission: full control (via canvases.owner_id)
--
-- Next Steps:
-- 1. Regenerate TypeScript types (supabase gen types)
-- 2. Test permission scenarios in UI
-- 3. Add real-time permission sync in CanvasPage
-- ============================================================================
