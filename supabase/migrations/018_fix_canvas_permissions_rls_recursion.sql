-- ============================================================================
-- Fix: Canvas Permissions RLS Infinite Recursion
-- ============================================================================
-- Purpose: Fix infinite recursion in canvas_permissions SELECT policy
-- Issue: Policy was checking canvas_permissions FROM WITHIN canvas_permissions
-- Solution: Simplify policy to only check canvas ownership and public status
-- ============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view permissions for accessible canvases" ON canvas_permissions;

-- Create fixed policy WITHOUT recursive canvas_permissions lookup
-- Users can view permissions for canvases they own OR public canvases
-- (No need to check canvas_permissions from within canvas_permissions policy)
CREATE POLICY "Users can view permissions for owned or public canvases"
ON canvas_permissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_permissions.canvas_id
    AND (
      c.owner_id = auth.uid()  -- Canvas owner can see all permissions
      OR c.is_public = true     -- Anyone can see permissions on public canvases
    )
  )
);

-- ============================================================================
-- Explanation: Why This Fixes The Recursion
-- ============================================================================
-- BEFORE (Recursive):
--   canvas_permissions SELECT policy → checks canvas_permissions table → triggers same policy → infinite loop
--
-- AFTER (Non-Recursive):
--   canvas_permissions SELECT policy → only checks canvases table → no recursion
--
-- Trade-off:
--   Users with granted permissions (but not owners) cannot see the full permission list.
--   This is acceptable because:
--   1. Non-owners don't need to see who else has access
--   2. Owners need this for management UI
--   3. Public canvas permissions are visible to all (transparency)
-- ============================================================================
