# W1.D4.9 - Realtime Sync Multi-Tab Testing

**Date**: 2025-10-17
**Objective**: Verify realtime synchronization works across multiple browser tabs using SyncManager + Zustand architecture

## Test Environment
- **Dev Server**: http://localhost:5173/
- **Architecture**: Layer 3 (SyncManager) → Layer 2 (Zustand canvasSlice)
- **Sync Mechanism**: Supabase postgres_changes events (INSERT, UPDATE, DELETE)

## Test Scenarios

### Test 1: CREATE Synchronization
**Steps**:
1. Open Tab 1 → Navigate to http://localhost:5173/
2. Open Tab 2 → Navigate to http://localhost:5173/
3. In Tab 1: Click rectangle tool (or press 'r')
4. Observe: New rectangle appears in Tab 1
5. **Expected Result**: Rectangle appears in Tab 2 within <100ms

**Success Criteria**:
- ✅ Object appears in Tab 2 automatically
- ✅ Object has same ID, position, and properties
- ✅ Latency < 100ms
- ✅ Console shows `[SyncManager] INSERT event: [object-id]`

### Test 2: UPDATE Synchronization
**Steps**:
1. In Tab 1: Select the rectangle
2. In Tab 1: Drag rectangle to new position
3. **Expected Result**: Rectangle moves in Tab 2 to match new position

**Success Criteria**:
- ✅ Position updates in Tab 2 automatically
- ✅ Transform handles update correctly
- ✅ Latency < 100ms
- ✅ Console shows `[SyncManager] UPDATE event: [object-id]`

### Test 3: DELETE Synchronization
**Steps**:
1. In Tab 2: Select the rectangle
2. In Tab 2: Press Delete or Backspace key
3. **Expected Result**: Rectangle disappears from both tabs

**Success Criteria**:
- ✅ Object removed from Tab 1 automatically
- ✅ Object removed from Tab 2 immediately
- ✅ Latency < 100ms
- ✅ Console shows `[SyncManager] DELETE event: [object-id]`

### Test 4: Multi-Object Synchronization
**Steps**:
1. In Tab 1: Create rectangle (press 'r')
2. In Tab 2: Create circle (press 'c')
3. In Tab 1: Create text (press 't')
4. **Expected Result**: All tabs show all 3 objects

**Success Criteria**:
- ✅ Tab 1 shows: rectangle, circle, text
- ✅ Tab 2 shows: rectangle, circle, text
- ✅ All objects have correct types and properties

### Test 5: Subscription Lifecycle
**Steps**:
1. Open browser DevTools console in both tabs
2. Check console logs for initialization messages
3. Close Tab 2
4. Reopen new Tab 3 → Navigate to http://localhost:5173/
5. **Expected Result**: Tab 3 loads existing objects and subscribes

**Success Criteria**:
- ✅ Console shows: `[useCanvasSync] Starting initialization for user: [user-id]`
- ✅ Console shows: `[useCanvasSync] Initialization complete`
- ✅ Console shows: `[SyncManager] Realtime subscription active`
- ✅ Tab 3 loads all existing objects from database
- ✅ On close: `[useCanvasSync] Cleaning up`
- ✅ On close: `[SyncManager] Subscription cleaned up`

## Expected Console Output

### On App Load
```
[useCanvasSync] Starting initialization for user: [uuid]
[SyncManager] Realtime subscription active
[useCanvasSync] Initialization complete
```

### On CREATE
```
[SyncManager] INSERT event: [object-id]
```

### On UPDATE
```
[SyncManager] UPDATE event: [object-id]
```

### On DELETE
```
[SyncManager] DELETE event: [object-id]
```

### On Tab Close
```
[useCanvasSync] Cleaning up
[SyncManager] Subscription cleaned up
```

## Manual Testing Instructions

1. **Open DevTools** in both tabs (Cmd+Option+I on Mac)
2. **Navigate to Console** tab to see SyncManager logs
3. **Execute test scenarios** in order (Test 1 → Test 5)
4. **Document results** below each test

## Test Results (To be filled during manual testing)

### Test 1 Results
- [ ] Rectangle appeared in Tab 2
- [ ] Latency: ___ ms
- [ ] Console logs present: Yes/No
- **Notes**:

### Test 2 Results
- [ ] Position updated in Tab 2
- [ ] Latency: ___ ms
- [ ] Console logs present: Yes/No
- **Notes**:

### Test 3 Results
- [ ] Object deleted in both tabs
- [ ] Latency: ___ ms
- [ ] Console logs present: Yes/No
- **Notes**:

### Test 4 Results
- [ ] All objects visible in both tabs
- [ ] Object types correct: Yes/No
- **Notes**:

### Test 5 Results
- [ ] Initialization logs present
- [ ] Cleanup logs present on tab close
- [ ] New tab loaded existing objects: Yes/No
- **Notes**:

## Architecture Validation

### Data Flow Check
```
User Action (Tab 1)
    ↓
canvasSlice.createObject() → Optimistic update
    ↓
Supabase INSERT
    ↓
postgres_changes broadcast
    ↓
SyncManager.handleInsert() (Tab 2)
    ↓
canvasSlice._addObject() → State update
    ↓
React re-render (Tab 2)
```

### Key Files Involved
- `/src/hooks/useCanvasSync.ts` - Orchestrates initialization
- `/src/lib/sync/SyncManager.ts` - Listens to postgres_changes
- `/src/stores/slices/canvasSlice.ts` - State management + CRUD
- `/src/components/canvas/Canvas.tsx` - UI integration

## Known Limitations
- Konva module warnings (pre-existing, not blocking)
- TypeScript errors in test files (pre-existing, not blocking)
- Supabase type issues (suppressed with @ts-expect-error)

## Next Steps After Testing
1. Document test results in this file
2. Fix any issues discovered during testing
3. Run automated tests: `pnpm test`
4. Run type checking: `pnpm typecheck`
5. Clean up redundant files (`/src/lib/supabase/sync.ts`)
6. Commit W1.D4 work: `feat(stores): Wire canvasStore to Supabase with realtime sync`
