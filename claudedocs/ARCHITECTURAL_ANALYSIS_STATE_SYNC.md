# Architectural Analysis: State Synchronization Gaps

**Date**: 2025-10-18
**Issue**: Deleted objects persist in UI components (layers panel, selection state)
**Severity**: Critical - Affects single-user and multi-user scenarios at scale
**Type**: Architectural Design Flaw - Inconsistent state cascade cleanup

---

## Problem Summary

When objects are deleted (either by user action or via real-time sync), the deletion does NOT cascade properly through all state slices and UI components. This creates "ghost" layers and stale selection states.

### Observed Symptoms

1. **Ghost Layers**: Deleted objects still appear in LayersPanel with controls
2. **Stale Selections**: Deleted objects remain in selectedIds array
3. **Inconsistent UI**: Layer controls render for non-existent objects
4. **Multi-User Desync**: Remote deletions don't clean up local state properly

---

## Root Cause Analysis

### Architectural Design Flaw

The 6-slice Zustand architecture has **NO centralized cleanup orchestration** for cross-slice state dependencies.

**Current Architecture**:
```
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│ objectsSlice│  │ layersSlice  │  │selectionSlice│
│   objects   │  │   layers     │  │ selectedIds │
│             │  │  layerOrder  │  │activeObjectId│
└─────────────┘  └──────────────┘  └─────────────┘
      ↓                ↓                  ↓
  Independent      Independent        Independent
   No cascade      No cascade         No cascade
```

**Problem**: Deleting an object from `objects` doesn't automatically clean up related state in `layers` or `selection`.

### Dual Code Paths with Inconsistent Cleanup

There are TWO deletion code paths with DIFFERENT cleanup logic:

#### Path 1: User-Initiated Deletion

**Location**: [canvasSlice.ts:393-447](../src/stores/slices/canvasSlice.ts#L393-L447)

```typescript
deleteObjects: async (ids: string[]) => {
  // 1. Remove from objects
  set((state) => {
    ids.forEach((id) => {
      delete state.objects[id];
    });
  }, undefined, 'canvas/deleteObjectsOptimistic');

  // 2. Remove layers ✓
  ids.forEach((id) => {
    get().removeLayer(id);
  });

  // 3. Clean up selection? ✗ MISSING

  // 4. Database delete
  await supabase.from('canvas_objects').delete().in('id', ids);
}
```

**Cleanup Status**:
- ✓ Removes from `objects`
- ✓ Calls `removeLayer()` → cleans `layers` and `layerOrder`
- ✗ Does NOT clean up `selectedIds`
- ✗ Does NOT clean up `activeObjectId`

#### Path 2: Real-Time Sync Deletion

**Location**: [canvasSlice.ts:481-502](../src/stores/slices/canvasSlice.ts#L481-L502)

```typescript
// Called when DELETE event arrives from Supabase real-time
_removeObject: (id: string) =>
  set(
    (state) => {
      delete state.objects[id];  // Only removes from objects
    },
    undefined,
    'canvas/_removeObject',
  ),

_removeObjects: (ids: string[]) =>
  set(
    (state) => {
      ids.forEach((id) => {
        delete state.objects[id];  // Only removes from objects
      });
    },
    undefined,
    'canvas/_removeObjects',
  ),
```

**Cleanup Status**:
- ✓ Removes from `objects`
- ✗ Does NOT call `removeLayer()`
- ✗ Does NOT clean up `selectedIds`
- ✗ Does NOT clean up `activeObjectId`

**Critical Gap**: Real-time deletions perform ZERO cleanup of dependent state!

---

## State Dependency Graph

```
When object 'xyz' is deleted, these states must be cleaned:

objects['xyz']          → delete state.objects['xyz'] ✓
  ├─ layers['xyz']      → delete state.layers['xyz'] (Path 1 only)
  ├─ layerOrder[]       → remove 'xyz' from array (Path 1 only)
  ├─ selectedIds[]      → filter out 'xyz' (NEVER cleaned)
  ├─ activeObjectId     → set to null if === 'xyz' (NEVER cleaned)
  └─ Fabric.js canvas   → remove canvas object (handled by CanvasSyncManager)
```

### Missing Cleanup Locations

1. **selectionSlice.selectedIds** - NEVER cleaned in any path
2. **selectionSlice.activeObjectId** - NEVER cleaned in any path
3. **layersSlice** - Only cleaned in Path 1 (user deletion)
4. **UI component caches** - No cleanup hooks or effects

---

## Impact Assessment

### Single-User Impact

- ✗ Ghost layers persist in LayersPanel
- ✗ Deleted objects remain selected (selection handles on empty space)
- ✗ Layer controls (visibility, lock) render for non-existent objects
- ✗ Z-index operations may target deleted objects

### Multi-User Impact (CRITICAL)

When User A deletes an object:
1. User A: `deleteObjects()` → partial cleanup (layers only)
2. User B: `_removeObject()` → NO cleanup (via real-time sync)
3. User B sees: Ghost layer + stale selection + visual inconsistency
4. User B interacts: Errors, crashes, or undefined behavior

**Scale Problem**: As object count and user count increase, state desync compounds.

---

## Solution Architecture

### Design: Centralized Cleanup Orchestration

Create a single, centralized cleanup function that ALL deletion paths must call:

```typescript
/**
 * CRITICAL: Centralized cleanup for object deletion
 *
 * This function MUST be called by ALL deletion code paths to ensure
 * consistent state cleanup across all slices and components.
 *
 * Cleanup cascade order:
 * 1. Remove from layers slice (layers, layerOrder)
 * 2. Clean up selection slice (selectedIds, activeObjectId)
 * 3. (Fabric.js cleanup handled by CanvasSyncManager subscription)
 */
_cleanupDeletedObjects: (ids: string[]) => {
  // 1. Remove from layers slice
  ids.forEach(id => get().removeLayer(id));

  // 2. Clean up selection slice
  const currentSelectedIds = get().selectedIds;
  const validSelectedIds = currentSelectedIds.filter(id => !ids.includes(id));

  if (validSelectedIds.length !== currentSelectedIds.length) {
    // Selection changed - update it
    if (validSelectedIds.length === 0) {
      get().deselectAll();
    } else {
      get().selectObjects(validSelectedIds);
    }
  }

  // 3. Clean up active object if it was deleted
  const activeId = get().activeObjectId;
  if (activeId && ids.includes(activeId)) {
    get().setActiveObject(validSelectedIds[0] || null);
  }
}
```

### Implementation: Unify Both Deletion Paths

**Modified deleteObjects (User deletion)**:
```typescript
deleteObjects: async (ids: string[]) => {
  const deletedObjects = ids.map((id) => get().objects[id]).filter(Boolean);
  if (deletedObjects.length === 0) return;

  // 1. Optimistic delete from objects
  set((state) => {
    ids.forEach((id) => {
      delete state.objects[id];
    });
  }, undefined, 'canvas/deleteObjectsOptimistic');

  // 2. Centralized cleanup ✓ NEW
  get()._cleanupDeletedObjects(ids);

  try {
    // 3. Database delete
    await supabase.from('canvas_objects').delete().in('id', ids);
  } catch (error) {
    // Rollback on error
    set((state) => {
      deletedObjects.forEach((obj) => {
        state.objects[obj.id] = obj;
      });
    }, undefined, 'canvas/deleteObjectsRollback');

    // Restore layers
    deletedObjects.forEach((obj) => {
      get().addLayer(obj.id, {
        name: `${obj.type} ${obj.id.slice(0, 6)}`,
        visible: true,
        locked: false,
      });
    });

    throw error;
  }
}
```

**Modified _removeObject (Real-time deletion)**:
```typescript
_removeObject: (id: string) =>
  set(
    (state) => {
      delete state.objects[id];
    },
    undefined,
    'canvas/_removeObject',
    () => {
      // Centralized cleanup ✓ NEW
      get()._cleanupDeletedObjects([id]);
    }
  ),
```

**Modified _removeObjects (Bulk real-time deletion)**:
```typescript
_removeObjects: (ids: string[]) =>
  set(
    (state) => {
      ids.forEach((id) => {
        delete state.objects[id];
      });
    },
    undefined,
    'canvas/_removeObjects',
    () => {
      // Centralized cleanup ✓ NEW
      get()._cleanupDeletedObjects(ids);
    }
  ),
```

---

## Benefits of Centralized Cleanup

### Consistency

- ✓ Single source of truth for deletion cleanup logic
- ✓ ALL deletion paths perform SAME cleanup operations
- ✓ Eliminates dual-path inconsistency bug class

### Maintainability

- ✓ Changes to cleanup logic only need to happen in ONE place
- ✓ Easy to add new cleanup steps (e.g., clear undo history)
- ✓ Clear documentation of what gets cleaned when

### Scalability

- ✓ Works correctly for single-user scenarios
- ✓ Works correctly for multi-user real-time sync
- ✓ Handles both single and bulk deletions
- ✓ Foundation for future state dependencies

### Testability

- ✓ Single function to unit test for cleanup correctness
- ✓ Can verify all state slices are cleaned properly
- ✓ Can test both deletion paths with same assertions

---

## Testing Strategy

### Unit Tests

```typescript
describe('_cleanupDeletedObjects', () => {
  it('should remove from layers', () => {
    // Test layer cleanup
  });

  it('should clean up selection', () => {
    // Test selection cleanup
  });

  it('should update active object', () => {
    // Test active object cleanup
  });

  it('should handle bulk deletions', () => {
    // Test multiple IDs
  });
});
```

### Integration Tests

```typescript
describe('Object deletion consistency', () => {
  it('user deletion cleans all state', () => {
    // Test deleteObjects path
  });

  it('real-time deletion cleans all state', () => {
    // Test _removeObject path
  });

  it('multi-user deletion maintains consistency', () => {
    // Test real-time sync scenario
  });
});
```

---

## Future Architectural Improvements

### 1. State Dependency Registry

Create a registry of state dependencies that get automatically cleaned up:

```typescript
const STATE_DEPENDENCIES = {
  'objects': {
    onDelete: ['layers', 'selection'],
    onUpdate: ['fabric'],
  }
};
```

### 2. Event Bus Pattern

Implement an event bus for cross-slice coordination:

```typescript
eventBus.emit('object:deleted', { ids: ['xyz'] });
// Auto-triggers: layers cleanup, selection cleanup, UI updates
```

### 3. Zustand Middleware

Create Zustand middleware that automatically maintains referential integrity:

```typescript
const referentialIntegrityMiddleware = (config) => (set, get, api) => {
  // Intercept state changes
  // Automatically cascade cleanup
};
```

---

## Recommendations

### Immediate (This Session)

1. ✓ Implement `_cleanupDeletedObjects` centralized function
2. ✓ Modify `deleteObjects` to use centralized cleanup
3. ✓ Modify `_removeObject` to use centralized cleanup
4. ✓ Modify `_removeObjects` to use centralized cleanup
5. ✓ Test single-user and multi-user deletion scenarios

### Short-Term (Next Sprint)

1. Add comprehensive integration tests for deletion paths
2. Document state dependency graph in architecture docs
3. Add monitoring/logging for state desync detection
4. Review other operations (update, create) for similar issues

### Long-Term (Architectural Refactor)

1. Implement event bus pattern for cross-slice coordination
2. Create state dependency registry with auto-cleanup
3. Add Zustand middleware for referential integrity
4. Consider migrating to state machine pattern for complex flows

---

## Conclusion

The ghost layers and stale selection issue is not an isolated component bug - it's a **systemic architectural gap** in how our multi-slice state management handles cross-slice dependencies.

The root cause is **dual code paths with inconsistent cleanup logic**:
- User deletions partially clean up state
- Real-time deletions perform NO cleanup

The solution is **centralized cleanup orchestration**:
- Single cleanup function called by ALL deletion paths
- Guarantees consistent state across all slices
- Provides foundation for scale and future dependencies

This fix is CRITICAL for:
- Single-user correctness (no ghost UI elements)
- Multi-user consistency (reliable real-time sync)
- System scalability (clean state at any object/user count)

**Implementation Status**: Ready to implement centralized cleanup solution.
