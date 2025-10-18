# CRITICAL: Multi-Canvas Architecture Gap

**Date**: 2025-10-18
**Updated**: 2025-10-18
**Severity**: 🔴 **BLOCKING** - Core collaboration was broken
**Status**: ✅ **IMMEDIATE FIX APPLIED** - Single global canvas now working
**Next Step**: ✅ **Multi-canvas architecture APPROVED for Phase II Week 5**
**Decision**: Implement BEFORE AI integration to prevent technical debt

## Problem Statement

**User Report**: "Even if multiple users are looking at the same canvas, each user can only see the objects they placed on the canvas."

**Root Cause**: Missing canvas/workspace/room architecture + incorrect query filtering

## Current Broken Architecture

### Database Schema
```sql
-- ✅ CORRECT: Global objects table
CREATE TABLE canvas_objects (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  -- ... object properties
);

-- ✅ CORRECT: RLS policy allows viewing all objects
CREATE POLICY "Canvas objects are viewable by everyone"
  ON canvas_objects FOR SELECT
  TO authenticated
  USING (true);  -- All users can see all objects!
```

### Frontend Implementation (FIXED)
```typescript
// ✅ FIXED: canvasSlice.ts:167
initialize: async (userId: string) => {
  const { data, error } = await supabase
    .from('canvas_objects')
    .select('*');
    // Removed: .eq('created_by', userId) - was breaking collaboration!

// ✅ FIXED: canvasSlice.ts:613
setupRealtimeSubscription: (userId: string) => {
  const channel = supabase
    .channel('canvas-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'canvas_objects',
      // Removed: filter: `created_by=eq.${userId}` - was breaking collaboration!
    },
```

**The Bug**: Two locations in [canvasSlice.ts](../src/stores/slices/canvasSlice.ts) filtered objects to only those created by current user, **completely breaking collaboration**.

**The Fix**: ✅ Removed both user filters (lines 167 and 613) to enable single global canvas collaboration.

## Missing Architecture: Canvas/Workspace/Room Concept

### What's Missing

**No concept of**:
- Canvas/Workspace/Room/Board (shared collaboration space)
- Canvas ID to scope objects
- Multi-canvas support (users working on different canvases)
- Canvas permissions/access control
- Canvas metadata (name, owner, created_at)

### Current PRD Analysis

Searching PRD for multi-canvas architecture...

**Finding**: ❌ **PRD does NOT specify multi-canvas architecture**

The PRD mentions:
- "Canvas frames/artboards" (Feature #23) - **NOT the same as separate canvases**
- "Infinite canvas" - **Single canvas per application**
- "Collaboration" features - **Assumes single shared canvas**

**Architectural Assumption**: The PRD assumes a **single global canvas** where all users collaborate on the same workspace (like a shared whiteboard).

## Two Possible Architectural Directions

### Option A: Single Global Canvas (Simplest - Matches Current PRD)

**Concept**: All authenticated users collaborate on ONE shared canvas (like Miro public board)

**Changes Required**:
```typescript
// Fix canvasSlice.ts:167
.select('*')  // ✅ Remove .eq('created_by', userId)
```

**Database**: No changes needed (already supports this!)

**Pros**:
- ✅ Minimal code changes (1 line fix)
- ✅ Matches existing PRD architecture
- ✅ Simplest collaboration model
- ✅ Works with existing RLS policies

**Cons**:
- ❌ No privacy (all users see all objects)
- ❌ Can't have multiple projects
- ❌ Doesn't scale for multi-tenant use

**Use Cases**:
- Team whiteboard sessions
- Single-project design collaboration
- MVP validation

### Option B: Multi-Canvas Architecture (Production-Ready)

**Concept**: Multiple canvases/workspaces, users join specific canvases (like Figma files)

**Database Changes Required**:
```sql
-- New table: canvases (workspaces)
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_public BOOLEAN DEFAULT false
);

-- Update canvas_objects to reference canvas
ALTER TABLE canvas_objects
  ADD COLUMN canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE;

-- Update RLS policies
CREATE POLICY "Users can view objects in their canvases"
  ON canvas_objects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvas_members
      WHERE canvas_members.canvas_id = canvas_objects.canvas_id
        AND canvas_members.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM canvases
      WHERE canvases.id = canvas_objects.canvas_id
        AND canvases.is_public = true
    )
  );

-- Canvas membership table
CREATE TABLE canvas_members (
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (canvas_id, user_id)
);
```

**Frontend Changes Required**:
```typescript
// 1. Add canvas context
interface CanvasSlice {
  currentCanvasId: string | null;
  canvases: Record<string, Canvas>;
  switchCanvas: (canvasId: string) => Promise<void>;
}

// 2. Update initialize to scope by canvas
initialize: async (userId: string, canvasId: string) => {
  const { data } = await supabase
    .from('canvas_objects')
    .select('*')
    .eq('canvas_id', canvasId);  // ✅ Scope to canvas, not user
}

// 3. Update realtime subscriptions
supabase
  .channel('canvas-sync')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'canvas_objects',
    filter: `canvas_id=eq.${canvasId}`  // ✅ Only subscribe to current canvas
  })
```

**Routing Changes**:
```typescript
// Routes: /canvas/:canvasId
<Route path="/canvas/:canvasId" element={<Canvas />} />

// Canvas component reads canvasId from URL
const { canvasId } = useParams();
```

**Pros**:
- ✅ Production-ready architecture
- ✅ Multi-tenant support
- ✅ Privacy and permissions
- ✅ Scalable for many projects
- ✅ Matches Figma/Miro model

**Cons**:
- ❌ Significant code changes (3-5 days)
- ❌ Database migration required
- ❌ Requires canvas management UI
- ❌ More complex collaboration model

## Immediate Fix vs Long-Term Architecture

### Immediate Fix (Option A - 30 minutes)

**Goal**: Unblock collaboration testing NOW

**Implementation**:
```typescript
// canvasSlice.ts:167
- .eq('created_by', userId)
+ // All users see all objects (single global canvas)
```

**Testing**: Multiple users can now see each other's objects ✅

**Limitations**: Single global canvas, no multi-project support

### Long-Term Migration (Option B - Phase III)

**Timeline**: Week 1 of Phase III (after Week 4.D5 complete)

**Phases**:
1. **Database Migration**: Add canvases table + canvas_id column
2. **Backend**: Update RLS policies + realtime filters
3. **Frontend**: Add canvas context + routing
4. **UI**: Canvas list/switcher + create/join flows
5. **Migration**: Backfill existing objects into default canvas

**Effort**: 3-5 days of focused development

## Recommendation

### ✅ DECISION MADE: Option B in Phase II Week 5

After systematic analysis (see [W4.D4_COMPLETION_AND_NEXT_STEPS.md](./W4.D4_COMPLETION_AND_NEXT_STEPS.md)), **multi-canvas architecture MUST be implemented in Phase II Week 5**, BEFORE AI integration.

**Rationale**:
1. **PRD Alignment**: "Feature-complete Figma clone" requires multi-canvas (core, not optional)
2. **Technical Efficiency**: 3-5 days now vs 5-7 days + debt later
3. **AI Integration**: Commands naturally scoped, no retrofitting needed
4. **Timeline Feasibility**: 8 weeks remaining, Week 3 skip provided buffer
5. **Risk Mitigation**: Adding before AI prevents breaking changes

### Immediate Action (COMPLETED ✅)

**Option A fix applied** to unblock collaboration:

```typescript
// src/stores/slices/canvasSlice.ts:167 - FIXED
const { data, error } = await supabase
  .from('canvas_objects')
  .select('*');
  // Removed: .eq('created_by', userId) - was breaking collaboration!

// src/stores/slices/canvasSlice.ts:613 - FIXED
const channel = supabase
  .channel('canvas-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'canvas_objects',
    // Removed: filter: `created_by=eq.${userId}` - was breaking realtime!
  },
```

**Result**: Single global canvas collaboration now working ✅

### Phase II Implementation (Week 5)

**Schedule**: Week 5, Days 1-5 (immediately after W4.D5 Testing & Polish)

**Implementation Plan**: See [MASTER_TASK_LIST.md](../docs/MASTER_TASK_LIST.md#week-5-multi-canvas-architecture)

**Key Deliverables**:
- Day 1: Database schema (canvases table, canvas_id column, migrations)
- Day 2: State management (canvasSlice extensions, CRUD operations)
- Day 3: UI components (CanvasPicker, CanvasManagementModal)
- Day 4: Routing (/canvas/:canvasId, URL sync)
- Day 5: Testing, polish, documentation

**Impact**: 12 files modified, clean architecture, professional UX

## Master Task List Updates

### ✅ COMPLETED
- **W4.D4**: Collaboration fix applied (single global canvas working)
- **W4.D5**: Testing & Polish (Week 4 complete)

### 🔜 NEXT
- **Week 5**: Multi-Canvas Architecture (NEW - inserted into Phase II)
  - Replaces original "Week 5-6: Styling & Formatting"
  - Styling/Formatting moves to Week 6-7

### 📋 UPDATED TIMELINE
- Week 5: Multi-Canvas Architecture (5 days) - CRITICAL FOUNDATION
- Weeks 6-7: Styling & Formatting (pushed from Week 5-6)
- Weeks 8-12: Remaining 57 features (35 days available)

## Architecture Validation Questions

### Question 1: Multi-Canvas Intent

**User asks**: "Does the PRD and the task list outline a plan in which we have multiple canvases, and users can collaborate on different ones?"

**Answer**: ❌ **NO** - Current PRD assumes single global canvas

**Evidence**:
- No `canvases` table in schema
- No canvas_id in canvas_objects
- RLS policies allow viewing ALL objects globally
- No routing for /canvas/:id
- PRD references "canvas" singular, not "canvases" plural

### Question 2: Architecture Suitability

**User asks**: "Assess our existing codebase for suitability, consistency, and compatibility with our plans."

**Assessment**:

**✅ Suitable for Single-Canvas Model**:
- Current RLS policies work for global collaboration
- Realtime sync broadcasts to all users
- State management handles shared objects
- Fabric.js supports collaborative editing

**❌ NOT Suitable for Multi-Canvas Model**:
- Missing database schema for canvases
- No canvas_id foreign key in objects
- No canvas-scoped subscriptions
- No routing infrastructure
- No canvas permissions system

**Migration Path**: Clean refactor, well-isolated change
- Add canvases table (new)
- Add canvas_id column (schema migration)
- Update 1-2 queries in canvasSlice
- Add routing (already using react-router)
- Add canvas UI components (new)

## Files Requiring Changes

### Immediate Fix (Option A)

1. **src/stores/slices/canvasSlice.ts:167** - Remove user filter

### Long-Term Migration (Option B)

**Database** (3 files):
1. `supabase/migrations/XXX_add_canvases_table.sql` - New canvases table
2. `supabase/migrations/XXX_add_canvas_id_to_objects.sql` - Add canvas_id column
3. `supabase/migrations/XXX_update_canvas_rls.sql` - Canvas-scoped RLS policies

**Types** (2 files):
1. `src/types/canvas.ts` - Add Canvas interface
2. `src/types/database.ts` - Regenerate from Supabase

**State** (2 files):
1. `src/stores/slices/canvasSlice.ts` - Add canvas context
2. `src/stores/slices/collaborationSlice.ts` - Update for canvas-scoped presence

**Components** (3 files):
1. `src/pages/Canvas.tsx` - Read canvasId from URL params
2. `src/components/canvas/CanvasSwitcher.tsx` - New: canvas list/switcher
3. `src/components/canvas/CreateCanvasDialog.tsx` - New: canvas creation

**Routing** (1 file):
1. `src/App.tsx` - Update routes to /canvas/:canvasId

**Sync** (1 file):
1. `src/lib/sync/CanvasSyncManager.ts` - Add canvas filter to realtime

**Total**: ~12 files + 3 migrations

## Testing Requirements

### Immediate Fix Validation

1. User A creates object → User B sees it immediately ✅
2. User B modifies object → User A sees update ✅
3. Cursor presence works for all users ✅
4. No RLS policy violations ✅

### Multi-Canvas Migration Validation

1. Multiple canvases exist in database ✅
2. Users can switch between canvases ✅
3. Objects scoped to correct canvas ✅
4. Realtime only broadcasts to canvas members ✅
5. Permissions enforced (owner/editor/viewer) ✅
6. Canvas list shows accessible canvases ✅

## Recommended Next Steps

1. **TODAY**: Apply Option A fix (30 minutes)
2. **W4.D5**: Complete current testing & polish
3. **Post-W4**: Create Phase III backlog item
4. **Phase III W1**: Implement Option B architecture

## Documentation Requirements

- [ ] Update PRD with multi-canvas architecture plans
- [ ] Create migration guide for single→multi canvas
- [ ] Document canvas permissions model
- [ ] Update API documentation for canvas endpoints
- [ ] Add canvas management user guide

## Related Issues

- Collaboration testing blocked until fix applied
- No project isolation (all users see everything)
- Cannot support multi-tenant SaaS model
- No privacy controls for sensitive designs

## References

- **Current PRD**: [PHASE_2_PRD.md](../docs/PHASE_2_PRD.md)
- **Database Schema**: [001_initial_schema.sql](../supabase/migrations/001_initial_schema.sql)
- **Canvas Slice**: [canvasSlice.ts](../src/stores/slices/canvasSlice.ts#L167)
- **RLS Policies**: [002_rls_policies.sql](../supabase/migrations/002_rls_policies.sql)
