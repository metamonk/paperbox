-- ============================================================================
-- Phase 1: Canvas Sharing - Public/Private Toggle
-- ============================================================================
-- Purpose: Enable public canvas sharing for multi-user collaboration demo
-- Impact: Allows users to share canvases via URL for real-time collaboration
-- PRD: PHASE_2_PRD.md - Multi-Canvas Architecture (Week 5+)
-- Documentation: W5_CANVAS_SHARING_IMPLEMENTATION.md
-- ============================================================================

-- Step 1: Add is_public column to canvases table
-- ============================================================================
ALTER TABLE canvases
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Step 2: Backfill existing canvases as private (defensive migration)
-- ============================================================================
UPDATE canvases
SET is_public = false
WHERE is_public IS NULL;

-- Step 3: Make column NOT NULL after backfill
-- ============================================================================
ALTER TABLE canvases
ALTER COLUMN is_public SET NOT NULL;

-- Step 4: Add index for efficient public canvas queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_canvases_public
ON canvases(is_public)
WHERE is_public = true;

-- Step 5: Add index for owner + public lookups
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_canvases_owner_public
ON canvases(owner_id, is_public);

-- ============================================================================
-- RLS Policy Updates: Allow viewing public canvases
-- ============================================================================

-- Policy 1: Users can view public canvases (in addition to owned canvases)
-- Replaces: "Users can only view own canvases" (010_create_canvases_table.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can only view own canvases" ON canvases;

CREATE POLICY "Users can view owned or public canvases"
ON canvases FOR SELECT
USING (
  auth.uid() = owner_id OR is_public = true
);

-- Policy 2: Only owners can update their canvases (includes is_public toggle)
-- Note: Existing "Users can only update own canvases" policy already handles this
-- ============================================================================
-- No changes needed - owner check in UPDATE policy prevents non-owners from toggling

-- Policy 3: Only owners can delete their canvases
-- Note: Existing "Users can only delete own canvases" policy already handles this
-- ============================================================================
-- No changes needed

-- ============================================================================
-- Canvas Objects RLS Updates: View objects on accessible canvases
-- ============================================================================

-- Policy 1: Users can view objects on canvases they can access
-- Replaces: "Users can view objects on own canvases" (013_update_rls_for_canvas_scoping.sql)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view objects on own canvases" ON canvas_objects;

CREATE POLICY "Users can view objects on accessible canvases"
ON canvas_objects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (c.owner_id = auth.uid() OR c.is_public = true)
  )
);

-- Policy 2: Users can insert objects on accessible canvases
-- Replaces: "Users can insert objects on own canvases"
-- ============================================================================
DROP POLICY IF EXISTS "Users can insert objects on own canvases" ON canvas_objects;

CREATE POLICY "Users can insert objects on accessible canvases"
ON canvas_objects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (c.owner_id = auth.uid() OR c.is_public = true)
  )
);

-- Policy 3: Users can update objects on accessible canvases
-- Replaces: "Users can update objects on own canvases"
-- ============================================================================
DROP POLICY IF EXISTS "Users can update objects on own canvases" ON canvas_objects;

CREATE POLICY "Users can update objects on accessible canvases"
ON canvas_objects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (c.owner_id = auth.uid() OR c.is_public = true)
  )
);

-- Policy 4: Users can delete objects on accessible canvases
-- Replaces: "Users can delete objects on own canvases"
-- ============================================================================
DROP POLICY IF EXISTS "Users can delete objects on own canvases" ON canvas_objects;

CREATE POLICY "Users can delete objects on accessible canvases"
ON canvas_objects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (c.owner_id = auth.uid() OR c.is_public = true)
  )
);

-- ============================================================================
-- Validation Query (for testing)
-- ============================================================================
-- Test 1: Verify is_public column exists with default false
-- Expected: All existing canvases have is_public = false
-- ============================================================================
-- SELECT id, name, owner_id, is_public FROM canvases LIMIT 5;

-- Test 2: Verify public canvas is visible to non-owner
-- Expected: Non-owner can SELECT public canvases
-- ============================================================================
-- UPDATE canvases SET is_public = true WHERE id = '<canvas_id>';
-- SELECT * FROM canvases WHERE is_public = true; -- Should work for all users

-- Test 3: Verify non-owner can view objects on public canvas
-- Expected: Non-owner can SELECT canvas_objects for public canvas
-- ============================================================================
-- SELECT * FROM canvas_objects WHERE canvas_id = '<public_canvas_id>'; -- Should work

-- Test 4: Verify only owner can toggle is_public
-- Expected: Non-owner UPDATE fails, owner UPDATE succeeds
-- ============================================================================
-- UPDATE canvases SET is_public = false WHERE id = '<canvas_id>'; -- Fails if not owner

-- ============================================================================
-- Migration Complete: Phase 1 Canvas Sharing
-- ============================================================================
-- Changes:
-- ✅ Added is_public column to canvases (indexed)
-- ✅ Updated RLS policies to allow viewing public canvases
-- ✅ Updated canvas_objects RLS to check canvas accessibility
-- ✅ Preserved owner-only control over canvas settings (update/delete)
--
-- Next Steps:
-- 1. Update TypeScript types (Canvas interface)
-- 2. Update Zustand canvasSlice (loadCanvases to include public canvases)
-- 3. Update CanvasManagementModal UI (public toggle)
-- ============================================================================
