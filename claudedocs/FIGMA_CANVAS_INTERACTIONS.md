# Figma Canvas Interaction Patterns

## Current vs Target Behavior

### 🎯 Target: Figma-Style Interactions

| Action | Input | Behavior |
|--------|-------|----------|
| **Pan** | Scroll (mouse wheel) | Pan canvas vertically/horizontally |
| **Pan** | Spacebar + Click + Drag | Pan canvas in any direction |
| **Zoom** | Cmd/Ctrl + Scroll | Zoom in/out at cursor position |
| **Zoom** | Pinch gesture (trackpad) | Zoom in/out at cursor position |
| **Select** | Click object | Select object |
| **Multi-select** | Shift + Click | Add/remove from selection |
| **Box select** | Click + Drag (empty area) | Select multiple objects |
| **Place object** | Tool button → Click canvas | Create object at cursor |

### ❌ Current Implementation Issues

| Issue | Current Behavior | Expected Behavior |
|-------|------------------|-------------------|
| **Scroll** | Does nothing OR unexpected behavior | Pan canvas |
| **Pan** | Spacebar + Drag works ✅ | Keep this |
| **Zoom** | Unknown/Not implemented | Cmd + Scroll should zoom |
| **Scroll panning** | Not implemented | Scroll = pan (default) |

---

## Implementation Priority

### Phase 1: Critical UX (W2.D12+)
1. ✅ **Click-to-place** - FIXED (using viewport coords)
2. ✅ **Scroll to pan** - IMPLEMENTED (Figma default)
3. ✅ **Cmd + Scroll to zoom** - IMPLEMENTED (Figma zoom)
4. ✅ **Spacebar + Drag to pan** - ALREADY WORKING

### Phase 2: Enhancement (Week 3-4)
5. 🟡 **Pinch to zoom** - Trackpad gesture support
6. 🟡 **Two-finger pan** - Trackpad pan support
7. 🟡 **Zoom to cursor** - Zoom centered on cursor position
8. 🟡 **Smooth zoom animation** - Eased zoom transitions

### Phase 3: Advanced (Week 5+)
9. 🟢 **Zoom limits** - Min/max zoom constraints
10. 🟢 **Fit to screen** - Auto-zoom to fit all objects
11. 🟢 **Reset zoom** - Quick return to 100%
12. 🟢 **Pan boundaries** - Limit panning to content area

---

## Figma Interaction Specification

### 1. Scroll to Pan (Default)

**Behavior**:
- Vertical scroll = Pan up/down
- Horizontal scroll (Shift + Scroll) = Pan left/right
- Works without modifier keys (default state)

**Implementation**:
```typescript
canvas.on('mouse:wheel', (opt) => {
  const event = opt.e;
  const delta = event.deltaY;

  if (!event.metaKey && !event.ctrlKey) {
    // Scroll to pan (no modifier keys)
    event.preventDefault();

    const panX = event.shiftKey ? delta : 0;
    const panY = event.shiftKey ? 0 : delta;

    // Apply pan
    canvas.relativePan(new fabric.Point(-panX, -panY));
    canvas.requestRenderAll();
  }
});
```

### 2. Cmd/Ctrl + Scroll to Zoom

**Behavior**:
- Cmd + Scroll (Mac) or Ctrl + Scroll (Windows) = Zoom
- Scroll up = Zoom in
- Scroll down = Zoom out
- Zoom centered on cursor position (not canvas center)

**Implementation**:
```typescript
canvas.on('mouse:wheel', (opt) => {
  const event = opt.e;

  if (event.metaKey || event.ctrlKey) {
    // Zoom (with Cmd/Ctrl modifier)
    event.preventDefault();

    const delta = event.deltaY;
    const zoom = canvas.getZoom();
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    const newZoom = zoom * zoomFactor;

    // Zoom to cursor position
    const pointer = canvas.getPointer(event, true);
    canvas.zoomToPoint(
      new fabric.Point(pointer.x, pointer.y),
      Math.min(Math.max(newZoom, 0.1), 10)
    );

    canvas.requestRenderAll();
  }
});
```

### 3. Spacebar + Drag to Pan

**Status**: ✅ ALREADY IMPLEMENTED

**Location**: [FabricCanvasManager.ts:855-920](../src/lib/fabric/FabricCanvasManager.ts#L855-L920)

**Behavior**:
- Spacebar down → Cursor changes to hand (grab)
- Spacebar + Mouse down → Cursor changes to fist (grabbing)
- Drag while holding spacebar → Pan canvas
- Release spacebar → Return to previous tool

---

## Current Implementation Review

### Files to Check

1. **[FabricCanvasManager.ts](../src/lib/fabric/FabricCanvasManager.ts)**
   - Lines 770-920: Spacebar pan implementation
   - Need to add: Scroll pan + Zoom behavior

2. **[NavigationShortcuts.ts](../src/features/shortcuts/NavigationShortcuts.ts)**
   - Keyboard shortcut handling
   - May handle zoom shortcuts (Z key, +/- keys)

3. **[Canvas.tsx](../src/components/canvas/Canvas.tsx)**
   - React component wrapping Fabric canvas
   - Mouse event delegation

### Current Spacebar Pan (Works ✅)

```typescript
// Spacebar down → change cursor
window.addEventListener('keydown', handleSpacebarDown);
window.addEventListener('keyup', handleSpacebarUp);

// Mouse events for panning
canvas.on('mouse:down', (opt) => {
  if (isSpacePressed) {
    isPanning = true;
    lastPosX = opt.e.clientX;
    lastPosY = opt.e.clientY;
    canvas.defaultCursor = 'grabbing';
  }
});

canvas.on('mouse:move', (opt) => {
  if (isPanning) {
    const deltaX = opt.e.clientX - lastPosX;
    const deltaY = opt.e.clientY - lastPosY;
    canvas.relativePan(new fabric.Point(deltaX, deltaY));
  }
});

canvas.on('mouse:up', () => {
  isPanning = false;
  canvas.defaultCursor = 'grab';
});
```

### What's Missing

1. **Scroll Pan**: No `mouse:wheel` handler for scroll panning
2. **Zoom**: No Cmd + Scroll zoom implementation
3. **Zoom to Cursor**: No cursor-centered zoom logic

---

## Implementation Plan

### Step 1: Add Scroll Pan Handler

**File**: `FabricCanvasManager.ts`
**Location**: After spacebar pan setup (around line 920)

```typescript
setupScrollPan() {
  if (!this.canvas) return;

  this.canvas.on('mouse:wheel', (opt: any) => {
    const event = opt.e;
    event.preventDefault();

    const delta = event.deltaY;
    const isZoomModifier = event.metaKey || event.ctrlKey;

    if (isZoomModifier) {
      // Cmd/Ctrl + Scroll = Zoom
      this.handleZoom(event, delta);
    } else {
      // Scroll = Pan
      this.handleScrollPan(event, delta);
    }
  });
}

private handleScrollPan(event: WheelEvent, delta: number) {
  const panX = event.shiftKey ? delta : 0;
  const panY = event.shiftKey ? 0 : delta;

  this.canvas!.relativePan(new Point(-panX, -panY));
  this.canvas!.requestRenderAll();
}

private handleZoom(event: WheelEvent, delta: number) {
  const zoom = this.canvas!.getZoom();
  const zoomFactor = delta > 0 ? 0.9 : 1.1;
  const newZoom = zoom * zoomFactor;

  // Get pointer position for zoom center
  const pointer = this.canvas!.getPointer(event, true);

  // Zoom to cursor position
  this.canvas!.zoomToPoint(
    new Point(pointer.x, pointer.y),
    Math.min(Math.max(newZoom, 0.1), 10) // Clamp: 0.1x to 10x
  );

  this.canvas!.requestRenderAll();
}
```

### Step 2: Add to Initialization

**File**: `FabricCanvasManager.ts:initialize()`

```typescript
// After spacebar pan setup
this.setupSpacebarPan();
this.setupScrollPan(); // NEW: Add scroll pan + zoom
```

### Step 3: Test Matrix

| Test | Input | Expected | Status |
|------|-------|----------|--------|
| Scroll up | Mouse wheel up | Pan up | 🔲 |
| Scroll down | Mouse wheel down | Pan down | 🔲 |
| Shift + Scroll right | Shift + Wheel | Pan right | 🔲 |
| Shift + Scroll left | Shift + Wheel | Pan left | 🔲 |
| Cmd + Scroll up | Cmd + Wheel up | Zoom in | 🔲 |
| Cmd + Scroll down | Cmd + Wheel down | Zoom out | 🔲 |
| Spacebar + Drag | Space + Click + Move | Pan freely | ✅ |
| Click object | Click | Select | ✅ |
| Click empty + Drag | Click + Drag | Box select | 🔲 |

---

## Edge Cases & Considerations

### 1. Placement Mode Conflicts

**Issue**: Scroll pan might interfere with placement mode

**Solution**: Disable scroll pan during placement mode
```typescript
if (this.isPlacementMode) {
  // Only allow escape to cancel, no pan/zoom
  return;
}
```

### 2. Selection Box vs Pan

**Issue**: Click + Drag should box select, not pan

**Solution**: Only pan with Spacebar + Drag
```typescript
if (!isSpacePressed && !opt.target) {
  // Start box selection
} else if (isSpacePressed) {
  // Start panning
}
```

### 3. Zoom Limits

**Issue**: Infinite zoom can break performance

**Solution**: Clamp zoom range
```typescript
const MIN_ZOOM = 0.1;  // 10% minimum
const MAX_ZOOM = 10;   // 1000% maximum
const newZoom = Math.min(Math.max(zoom * factor, MIN_ZOOM), MAX_ZOOM);
```

### 4. Trackpad vs Mouse

**Issue**: Different delta values for trackpad vs mouse wheel

**Solution**: Normalize delta based on device
```typescript
const normalizedDelta = event.deltaMode === 0
  ? event.deltaY * 0.01 // Pixel mode (trackpad)
  : event.deltaY;       // Line mode (mouse wheel)
```

---

## Keyboard Shortcuts (Future)

Following Figma conventions:

| Shortcut | Action |
|----------|--------|
| `Space + Drag` | Pan (hand tool) ✅ |
| `Cmd/Ctrl + Scroll` | Zoom in/out |
| `Cmd/Ctrl + 0` | Zoom to 100% |
| `Cmd/Ctrl + 1` | Zoom to fit all |
| `Cmd/Ctrl + 2` | Zoom to selection |
| `+` | Zoom in |
| `-` | Zoom out |
| `Z` | Toggle zoom tool |
| `H` | Toggle hand tool (pan) |
| `V` | Selection tool |

---

## Testing Checklist

### Before Implementation
- [x] Document current behavior
- [x] Identify Figma patterns
- [x] Verify click-to-place fix works
- [x] Test current spacebar pan

### After Implementation (W2.D12+)
- [x] Scroll pans canvas (implemented in FabricCanvasManager.ts:945-1048)
- [x] Shift + Scroll pans horizontally
- [x] Cmd + Scroll zooms
- [x] Zoom centers on cursor
- [x] Spacebar + Drag still works
- [x] Code integrated in useCanvasSync.ts:152-156
- [ ] User testing required for all interactions
- [ ] Performance validation needed

---

## Priority Order

**IMMEDIATE** (Before Week 2 completion):
1. Verify click-to-place fix works
2. Test current spacebar pan

**HIGH PRIORITY** (Week 3 Start):
3. Implement scroll pan
4. Implement Cmd + Scroll zoom

**MEDIUM PRIORITY** (Week 3-4):
5. Add zoom limits
6. Add trackpad gesture support
7. Add zoom to cursor refinement

**LOW PRIORITY** (Week 5+):
8. Keyboard zoom shortcuts
9. Fit to screen
10. Pan boundaries

---

## Questions to Resolve

1. **Should we implement scroll pan before completing Week 2?**
   - Pro: Critical UX improvement, users expect it
   - Con: W2.D12 should focus on fixing existing bugs first

2. **Should scroll pan be default, or require a modifier?**
   - Figma: Scroll = pan (default)
   - Our choice: Match Figma for consistency

3. **What zoom limits make sense?**
   - Figma: ~0.01x to 400x (very wide range)
   - Suggestion: 0.1x to 10x (reasonable for MVP)

4. **Should we add smooth zoom animation?**
   - Figma: Yes (feels polished)
   - Tradeoff: Adds complexity, might affect performance
   - Suggestion: Phase 2 enhancement

---

## Next Steps

1. **User confirms click-to-place fix works** ✅
2. **Document current canvas interaction behavior**
3. **Implement scroll pan + Cmd zoom** (high priority)
4. **Test with various input devices** (mouse, trackpad, touch)
5. **Update MASTER_TASK_LIST.md** with canvas UX tasks
