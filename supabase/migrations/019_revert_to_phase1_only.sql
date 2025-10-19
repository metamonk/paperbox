-- ============================================================================
-- CRITICAL FIX: Revert to Phase 1 Only (Remove Circular RLS Dependencies)
-- ============================================================================
-- Purpose: Remove Phase 2 RLS policies that create circular dependencies
-- Issue: canvases policy checks canvas_permissions → canvas_permissions checks canvases → INFINITE LOOP
-- Solution: Keep Phase 1 (public/private) only, defer Phase 2 permission checks to UI layer
-- ============================================================================

-- ============================================================================
-- Step 1: Restore Phase 1 Canvases Policy (Public/Private Only)
-- ============================================================================

-- Remove Phase 2 policy that checks canvas_permissions (causes recursion)
DROP POLICY IF EXISTS "Users can view accessible canvases via permissions" ON canvases;

-- Restore Phase 1 policy (no canvas_permissions lookup)
CREATE POLICY "Users can view owned or public canvases"
ON canvases FOR SELECT
USING (
  auth.uid() = owner_id       -- Owner can view
  OR is_public = true          -- Anyone can view public canvases
  -- Phase 2 permission checks REMOVED to avoid recursion
);

-- ============================================================================
-- Step 2: Restore Phase 1 Canvas Objects Policies (Public/Private Only)
-- ============================================================================

-- Remove Phase 2 INSERT policy
DROP POLICY IF EXISTS "Users can insert objects with edit permission" ON canvas_objects;

-- Restore Phase 1 INSERT policy (no canvas_permissions lookup)
CREATE POLICY "Users can insert objects on accessible canvases"
ON canvas_objects FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (
      c.owner_id = auth.uid()   -- Owner can insert
      OR c.is_public = true      -- Anyone can insert on public canvases
    )
  )
);

-- Remove Phase 2 UPDATE policy
DROP POLICY IF EXISTS "Users can update objects with edit permission" ON canvas_objects;

-- Restore Phase 1 UPDATE policy (no canvas_permissions lookup)
CREATE POLICY "Users can update objects on accessible canvases"
ON canvas_objects FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (
      c.owner_id = auth.uid()
      OR c.is_public = true
    )
  )
);

-- Remove Phase 2 DELETE policy
DROP POLICY IF EXISTS "Users can delete objects with edit permission" ON canvas_objects;

-- Restore Phase 1 DELETE policy (no canvas_permissions lookup)
CREATE POLICY "Users can delete objects on accessible canvases"
ON canvas_objects FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM canvases c
    WHERE c.id = canvas_objects.canvas_id
    AND (
      c.owner_id = auth.uid()
      OR c.is_public = true
    )
  )
);

-- ============================================================================
-- Step 3: Keep canvas_permissions Table (for Phase 2 UI later)
-- ============================================================================
-- NOTE: We're keeping the canvas_permissions table and its Phase 2 structure.
-- The table can store permission data, but RLS policies won't use it yet.
-- This allows Phase 2 UI to be built later without schema changes.

-- The canvas_permissions SELECT policy from migration 018 is fine
-- because it only reads from canvases (no recursion).
-- We just removed the canvases policies that read canvas_permissions.

-- ============================================================================
-- Explanation: Why This Fixes The Circular Dependency
-- ============================================================================
-- BEFORE (Circular):
--   canvases SELECT policy → checks canvas_permissions table
--     ↓
--   canvas_permissions SELECT policy → checks canvases table
--     ↓
--   canvases SELECT policy → checks canvas_permissions table  ← INFINITE LOOP!
--
-- AFTER (Non-Circular):
--   canvases SELECT policy → only checks is_public and owner_id (NO canvas_permissions)
--     ✅ No recursion possible
--
--   canvas_permissions SELECT policy → checks canvases table
--     ✅ One-way dependency, no recursion
--
-- ============================================================================
-- Trade-offs and Phase 2 Strategy
-- ============================================================================
-- What We're Deferring:
--   - Granular viewer/editor permissions (Phase 2 feature)
--   - Permission-based canvas access beyond public/private
--   - Database-level enforcement of viewer vs editor distinction
--
-- What Still Works (Phase 1):
--   ✅ Public/private canvas toggle
--   ✅ Multi-user real-time collaboration on public canvases
--   ✅ Owner-only access to private canvases
--   ✅ Canvas sharing via URL
--
-- Phase 2 Implementation Strategy:
--   When ready for Phase 2:
--   1. Option A: Application-layer permission checks (recommended)
--      - Zustand state tracks permissions
--      - UI enforces viewer vs editor behavior
--      - canvas_permissions stores data but RLS stays simple
--
--   2. Option B: Materialized view approach
--      - Create materialized view with pre-computed permissions
--      - RLS policies query view instead of recursive tables
--      - Refresh view on permission changes
--
--   3. Option C: PostgreSQL security definer functions
--      - Create SECURITY DEFINER functions to check permissions
--      - Functions bypass RLS for controlled queries
--      - Policies call functions instead of direct table queries
--
-- ============================================================================
-- Validation Queries
-- ============================================================================
-- Test 1: Load canvases (should work without recursion)
-- SELECT * FROM canvases;
--
-- Test 2: Create canvas (should work)
-- INSERT INTO canvases (name, owner_id, is_public)
-- VALUES ('Test Canvas', auth.uid(), false);
--
-- Test 3: Toggle canvas to public (should work)
-- UPDATE canvases SET is_public = true WHERE id = '<canvas_id>';
--
-- Test 4: Create object on public canvas (should work)
-- INSERT INTO canvas_objects (canvas_id, fabric_object, created_by)
-- VALUES ('<public_canvas_id>', '{"type": "rect"}', auth.uid());
--
-- Test 5: Verify no circular dependencies
-- EXPLAIN SELECT * FROM canvases WHERE auth.uid() = owner_id OR is_public = true;
-- (Should not reference canvas_permissions table)
--
-- ============================================================================
-- Migration Complete: Phase 1 Only (Circular Dependency Removed)
-- ============================================================================
