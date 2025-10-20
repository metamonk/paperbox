# Fix Layers Panel Unnecessary Rerendering

## Problem Analysis

The LayersPanel is re-rendering every time objects move on the canvas because:

1. **Full Objects State Subscription** (line 43 of `LayersPanel.tsx`):
   ```typescript
   const objects = usePaperboxStore((state) => state.objects);
   ```


   - Subscribes to entire `objects` state
   - When objects move, their x/y coordinates update
   - This triggers re-render of LayersPanel even though layer order doesn't change

2. **Minimal Data Actually Needed**:

   - Only uses `object.type` from the objects state (line 233)
   - Everything else comes from `layers` metadata (name, visible, locked) and `layerOrder`

3. **Z-Index Not Affected**:

   - Verified that object movement does NOT change z-index/layer order
   - Z-index only changes via explicit `setZIndex` calls

## Solution: Dual Optimization Approach

Apply both Zustand selector optimization AND useMemo to maximize performance.

### Step 1: Add Optimized Selector to Canvas Slice

**File**: `src/stores/slices/canvasSlice.ts`

Add a new selector that only returns the object types mapping:

```typescript
// Around line 120, add to CanvasState interface:
getObjectTypes: () => Record<string, string>;
```

Implement it (around line 1200, after other selectors):

```typescript
// Selector: Get only object types (doesn't trigger re-render on x/y changes)
getObjectTypes: () => {
  const objects = get().objects;
  const types: Record<string, string> = {};
  Object.keys(objects).forEach(id => {
    types[id] = objects[id].type;
  });
  return types;
},
```

### Step 2: Update LayersPanel with Both Optimizations

**File**: `src/components/layers/LayersPanel.tsx`

**2a. Add useMemo import** (line 39):

```typescript
import { useState, useRef, useEffect, useMemo } from 'react';
```

**2b. Replace full objects subscription** (line 43):

```typescript
// OLD:
const objects = usePaperboxStore((state) => state.objects);

// NEW - optimized selector:
const objectTypes = usePaperboxStore((state) => state.getObjectTypes());
```

**2c. Wrap layerNodes in useMemo** (lines 221-238):

```typescript
// Create layer nodes from objects (reversed for top-to-bottom display)
const layerNodes = useMemo(() => {
  return [...layerOrder].reverse().map((objectId) => {
    const objectType = objectTypes[objectId];
    const layerMeta = layers[objectId];

    if (!objectType) return null;

    const displayName = layerMeta?.name || `${objectType} ${objectId.slice(0, 6)}`;

    return {
      id: objectId,
      name: displayName,
      type: objectType,
      visible: layerMeta?.visible ?? true,
      locked: layerMeta?.locked ?? false,
      isSelected: selectedIds.includes(objectId),
    };
  }).filter(Boolean);
}, [layerOrder, objectTypes, layers, selectedIds]);
```

**2d. Update duplicate handler** (line 183):

```typescript
const handleDuplicate = (objectId: string) => {
  // Get full object from store for duplication (direct access, not subscription)
  const object = usePaperboxStore.getState().objects[objectId];
  if (!object) return;
  // ... rest stays the same
```

### Step 3: Test & Verify

Build and test to ensure:

- LayersPanel no longer re-renders during object movement
- Layer selection, visibility, locking still work correctly
- Drag-drop reordering still works correctly
- Context menu operations still work correctly
- Canvas rendering is unaffected

Commands:

```bash
pnpm run build
# Manual testing in browser with React DevTools Profiler
```

## Expected Impact

**Before**: LayersPanel re-renders on every object movement (x/y coordinate change)

**After**: LayersPanel only re-renders when:

- Layer order changes (`layerOrder`)
- Layer metadata changes (`layers` - name, visibility, lock)
- Selection changes (`selectedIds`)
- Object types change (rare - only when objects added/removed)

**Performance gain**: With 500+ layers, this should eliminate hundreds of unnecessary re-renders during drag operations, significantly reducing CPU load.

## Safety

- Uses read-only selector that doesn't modify state
- useMemo only prevents recalculation, doesn't change behavior
- Duplicate handler uses direct store access (getState()) to avoid subscription
- No changes to canvas rendering pipeline or sync logic