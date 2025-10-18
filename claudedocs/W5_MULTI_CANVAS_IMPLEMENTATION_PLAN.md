# Week 5: Multi-Canvas Architecture - Implementation Plan

**Date**: 2025-10-18
**Status**: 📋 **APPROVED** - Ready for implementation after W4.D5 complete
**Duration**: 5 days (W5.D1-D5)
**Phase**: Phase II - Week 5
**Priority**: 🔴 CRITICAL - Foundational architecture for Figma clone

## Executive Summary

Multi-canvas architecture enables Paperbox to function as a true Figma clone with multiple design files, workspace organization, and professional collaboration patterns. This **MUST** be implemented in Phase II (before AI integration) to:

1. Align with PRD: "Feature-complete Figma clone"
2. Prevent technical debt (adding after AI requires retrofitting commands)
3. Enable proper workspace organization
4. Provide clean foundation for Phase III AI

## Decision Context

**Analysis Document**: [CRITICAL_MULTI_CANVAS_ARCHITECTURE_GAP.md](./CRITICAL_MULTI_CANVAS_ARCHITECTURE_GAP.md)

**Key Decision**: Implement Option B (Multi-Canvas) in Phase II Week 5, NOT Phase III

**Rationale**:
- **Technical**: 3-5 days now vs 5-7 days + debt later
- **Product**: Figma without multi-canvas is fundamentally wrong
- **AI Integration**: Commands naturally scoped, no breaking changes
- **Timeline**: Feasible (8 weeks remaining, Week 3 skip = buffer)

## Implementation Schedule

### Day 1: Database Schema & Migrations (8 hours)

**Morning** (4 hours):
1. Fetch Supabase migration patterns (Context7)
2. Create `canvases` table migration
3. Add `canvas_id` to `canvas_objects` table
4. Update RLS policies for canvas scoping

**Afternoon** (4 hours):
5. Write default canvas migration (backfill existing objects)
6. Test migrations locally
7. Create TypeScript types
8. Document database schema changes

**Deliverables**:
- `supabase/migrations/003_canvases_table.sql`
- `supabase/migrations/004_canvas_objects_canvas_id.sql`
- `supabase/migrations/005_default_canvas_migration.sql`
- `src/types/canvas.ts`
- `claudedocs/W5_MULTI_CANVAS_DATABASE_SCHEMA.md`

### Day 2: State Management (Zustand) (8 hours)

**Morning** (4 hours):
1. Extend `canvasSlice` for canvas management
2. Implement canvas CRUD operations
3. Update object queries to filter by `canvas_id`
4. Update realtime subscription for canvas scoping

**Afternoon** (4 hours):
5. Write tests for canvas state management (>80% coverage)
6. Implement optimistic updates for canvas operations
7. Add canvas selection persistence (localStorage)
8. Document canvas state architecture

**Deliverables**:
- `src/stores/slices/canvasSlice.ts` (extended)
- `src/stores/slices/__tests__/canvasSlice.canvas.test.ts`
- `claudedocs/W5_CANVAS_STATE_MANAGEMENT.md`

### Day 3: UI Components (8 hours)

**Morning** (4 hours):
1. Fetch shadcn/ui command palette patterns (Context7)
2. Create `CanvasPicker` component
3. Create `CanvasManagementModal` component
4. Integrate `CanvasPicker` into AppLayout

**Afternoon** (4 hours):
5. Create `CanvasListView` (optional, time-permitting)
6. Add canvas context menu actions
7. Style canvas picker to match design system
8. Test canvas UI components

**Deliverables**:
- `src/components/canvas/CanvasPicker.tsx`
- `src/components/canvas/CanvasManagementModal.tsx`
- `src/components/canvas/CanvasListView.tsx` (optional)

### Day 4: Routing & Integration (8 hours)

**Morning** (4 hours):
1. Fetch React Router dynamic routing patterns (Context7)
2. Implement canvas routing (`/canvas/:canvasId`)
3. Sync active canvas with URL
4. Update Canvas component for canvas-aware initialization

**Afternoon** (4 hours):
5. Implement canvas switching logic
6. Handle edge cases (404, no canvases, deleted canvas)
7. Add canvas breadcrumb navigation (optional)
8. Test routing and navigation

**Deliverables**:
- Updated routing configuration
- Canvas-aware Canvas component
- Breadcrumb navigation (optional)

### Day 5: Testing, Polish & Documentation (8 hours)

**Morning** (4 hours):
1. Integration testing (multi-canvas flow, isolation)
2. Performance testing (10+ canvases, 100+ objects each)
3. Fix bugs discovered in testing
4. Accessibility audit

**Afternoon** (4 hours):
5. Polish canvas switcher UX (animations, loading states)
6. Create comprehensive documentation
7. Update AI Integration docs for canvas scoping
8. Commit with milestone tag

**Deliverables**:
- `claudedocs/W5_MULTI_CANVAS_COMPLETE.md`
- Updated `docs/PHASE_2_PRD.md` (AI section)
- Git commit: `feat(canvas): Add multi-canvas architecture`
- Git tag: `milestone-3-multi-canvas-complete`

## Architecture Changes

### Database Schema

```sql
-- New table for canvas metadata
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add canvas_id to canvas_objects
ALTER TABLE canvas_objects
  ADD COLUMN canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_canvases_owner_id ON canvases(owner_id);
CREATE INDEX idx_canvases_created_at ON canvases(created_at);
CREATE INDEX idx_canvas_objects_canvas_id ON canvas_objects(canvas_id);
```

### State Management Changes

**canvasSlice Extensions**:
```typescript
interface CanvasSliceState {
  // Existing
  objects: CanvasObject[];
  // ... other existing state

  // NEW for multi-canvas
  activeCanvasId: string | null;
  canvases: Canvas[];
}

interface CanvasSliceActions {
  // Existing
  addObject, updateObject, removeObject, ...

  // NEW for multi-canvas
  setActiveCanvas: (canvasId: string) => void;
  loadCanvases: (userId: string) => Promise<void>;
  createCanvas: (name: string, description?: string) => Promise<Canvas>;
  updateCanvas: (id: string, updates: Partial<Canvas>) => Promise<void>;
  deleteCanvas: (id: string) => Promise<void>;
}
```

**Query Changes**:
```typescript
// BEFORE (Week 4 - single global canvas):
const { data } = await supabase
  .from('canvas_objects')
  .select('*');

// AFTER (Week 5 - multi-canvas):
const { data } = await supabase
  .from('canvas_objects')
  .select('*')
  .eq('canvas_id', activeCanvasId);
```

### UI Components

**CanvasPicker** (Top-left, like Figma):
- Displays active canvas name
- Click to open dropdown with canvas list
- Search canvases by name
- "New Canvas" button
- Keyboard: ⌘K to open, arrow keys to navigate

**CanvasManagementModal**:
- Create new canvas (name required, description optional)
- Rename existing canvas
- Delete canvas (with confirmation)
- Show object count per canvas

**Routing**:
- `/canvas/:canvasId` - View specific canvas
- `/` - Redirect to last active or first canvas
- `/canvases` - Canvas list view (optional)

## Testing Strategy

### Unit Tests
- Canvas CRUD operations (canvasSlice)
- Object filtering by canvas_id
- Realtime subscription scoping
- Optimistic updates and rollbacks

### Integration Tests
- Create canvas → Add objects → Switch canvas → Verify isolation
- Delete canvas → Verify objects cascade deleted
- Realtime sync scoped to active canvas
- Multiple users on different canvases (independent)

### Performance Tests
- 10+ canvases with 100+ objects each
- Canvas switch latency < 500ms
- Query performance with indexes
- Realtime subscription efficiency

### Accessibility Tests
- Screen reader support for CanvasPicker
- Keyboard navigation for all canvas actions
- Focus management during canvas switch
- ARIA labels and roles

## Migration Strategy

### Existing Data Handling

**Problem**: Current `canvas_objects` have no `canvas_id`

**Solution**: Default Canvas Migration
```sql
-- For each user, create a "Default Canvas"
INSERT INTO canvases (name, owner_id)
SELECT 'Default Canvas', id
FROM auth.users;

-- Assign all existing objects to user's default canvas
UPDATE canvas_objects co
SET canvas_id = (
  SELECT c.id
  FROM canvases c
  WHERE c.owner_id = co.created_by
  AND c.name = 'Default Canvas'
);
```

**Result**: All existing objects preserved in user's default canvas

### Rollback Plan

If critical issues discovered:
1. Remove `canvas_id` NOT NULL constraint
2. Restore single-canvas queries (remove `.eq('canvas_id', ...)`)
3. Document issues in claudedocs
4. Defer multi-canvas to later week

## Success Criteria

### Functionality
- ✅ Users can create multiple canvases
- ✅ Objects isolated by canvas (no cross-canvas visibility)
- ✅ Canvas switching works smoothly
- ✅ Realtime sync scoped to active canvas
- ✅ Canvas CRUD operations work correctly

### Performance
- ✅ Canvas switch latency < 500ms
- ✅ Handles 10+ canvases per user
- ✅ Handles 100+ objects per canvas
- ✅ No performance degradation

### Quality
- ✅ >80% test coverage for new canvas code
- ✅ All accessibility tests pass
- ✅ No console errors or warnings
- ✅ Comprehensive documentation

### User Experience
- ✅ Intuitive canvas switcher (like Figma)
- ✅ Clear visual feedback for canvas operations
- ✅ Smooth animations and transitions
- ✅ Keyboard shortcuts work

## Risk Assessment

### Low Risk ✅
- Database schema changes (well-tested pattern)
- TypeScript type additions
- Documentation

### Medium Risk ⚠️
- State management changes (impacts core sync)
- Realtime subscription scoping
- UI component integration

### High Risk 🔴
- Data migration (existing objects → default canvas)
- Routing changes (URL structure)
- Breaking changes to collaboration

### Mitigation
- Comprehensive testing before production
- Rollback plan documented
- Incremental implementation (5 days)
- Daily commits for easy rollback
- User testing after W5.D3 (UI ready)

## Files Modified (12 Total)

### New Files (8)
1. `supabase/migrations/003_canvases_table.sql`
2. `supabase/migrations/004_canvas_objects_canvas_id.sql`
3. `supabase/migrations/005_default_canvas_migration.sql`
4. `src/types/canvas.ts`
5. `src/components/canvas/CanvasPicker.tsx`
6. `src/components/canvas/CanvasManagementModal.tsx`
7. `src/components/canvas/CanvasListView.tsx` (optional)
8. `claudedocs/W5_MULTI_CANVAS_COMPLETE.md`

### Modified Files (4)
9. `src/stores/slices/canvasSlice.ts` (extend for canvas management)
10. `src/App.tsx` or `src/Router.tsx` (add canvas routing)
11. `src/components/layout/AppLayout.tsx` (integrate CanvasPicker)
12. `docs/PHASE_2_PRD.md` (update AI Integration section)

## Dependencies

### Required Before W5.D1
- ✅ W4.D5 complete (Testing & Polish)
- ✅ Design system integrated (shadcn/ui)
- ✅ Single global canvas collaboration working

### Context7 Documentation Fetches
- Day 1: Supabase migration patterns
- Day 3: shadcn/ui command palette patterns
- Day 4: React Router dynamic routing patterns

## Phase III Impact

### AI Integration Benefits

**WITH multi-canvas in Phase II**:
```typescript
// AI commands naturally scoped to active canvas
"Create a circle" → adds to activeCanvasId automatically
"Switch to Design System canvas" → AI can manage canvases
"Create new canvas called Marketing" → AI creates canvas

// Command structure clean from start
interface CreateObjectCommand {
  type: string;
  properties: object;
  // canvas_id implicit from activeCanvasId
}
```

**WITHOUT multi-canvas (if deferred to Phase III)**:
```typescript
// Would need to retrofit ALL commands
interface CreateObjectCommand {
  type: string;
  properties: object;
  canvas_id: string; // ❌ BREAKING CHANGE to add this later
}

// All AI parsers need updating
// All command executors need canvas_id handling
// Technical debt + migration effort
```

**Conclusion**: Multi-canvas in Phase II ENABLES clean AI integration in Phase III

## Timeline Impact

### Phase II Remaining (After Week 5)

**Week 5**: Multi-Canvas Architecture (5 days)
**Weeks 6-7**: Styling & Formatting (10 days, pushed from Week 5-6)
**Weeks 8-12**: Remaining 57 features (25 days)

**Total**: 40 days for 57 features + multi-canvas = Feasible

### Buffer Analysis

**Week 3 Skip**: Saved 5 days (Selection/Transform via Fabric.js defaults)
**Week 5 Multi-Canvas**: Uses 5 days
**Net Impact**: Zero (skip + add = balanced)

**Conclusion**: Timeline remains on track

## Next Steps

### Immediate (After W4.D5 Complete)
1. Begin Week 5 Day 1: Database schema & migrations
2. Follow detailed task list in [MASTER_TASK_LIST.md](../docs/MASTER_TASK_LIST.md#week-5-multi-canvas-architecture)
3. Use Context7 for documentation fetches
4. Daily commits with clear messages

### During Week 5
1. Daily standup notes in claudedocs
2. Test coverage >80% for new code
3. Document decisions and trade-offs
4. User testing after Day 3 (UI ready)

### After Week 5 Complete
1. Mark W5 milestone complete
2. Update MASTER_TASK_LIST progress
3. Begin Week 6: Styling & Formatting
4. Continue Phase II features implementation

## References

### Planning Documents
- [CRITICAL_MULTI_CANVAS_ARCHITECTURE_GAP.md](./CRITICAL_MULTI_CANVAS_ARCHITECTURE_GAP.md) - Architecture analysis
- [W4.D4_COMPLETION_AND_NEXT_STEPS.md](./W4.D4_COMPLETION_AND_NEXT_STEPS.md) - Context and decision
- [PHASE_2_PRD.md](../docs/PHASE_2_PRD.md) - Updated requirements

### Implementation Guides
- [MASTER_TASK_LIST.md](../docs/MASTER_TASK_LIST.md#week-5-multi-canvas-architecture) - Detailed tasks
- Supabase migrations: Context7 fetch on W5.D1
- shadcn/ui patterns: Context7 fetch on W5.D3
- React Router patterns: Context7 fetch on W5.D4

### Testing Resources
- [W4.D4_COLLABORATION_FIX_TESTING.md](./W4.D4_COLLABORATION_FIX_TESTING.md) - Collaboration testing patterns
- [ARCHITECTURE_DATA_FLOW_ANALYSIS.md](./ARCHITECTURE_DATA_FLOW_ANALYSIS.md) - System architecture validation
