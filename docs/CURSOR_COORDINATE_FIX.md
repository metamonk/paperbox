# Cursor Coordinate Fix - Static Canvas

## Problem

Remote cursors were appearing in incorrect positions because the scroll position was always reported as `(0, 0)` even when users had scrolled the canvas.

### Debug Output
```javascript
Cursor Coords: {
  viewport: { x: 209, y: 776 },
  scroll: { x: 0, y: 0 },        // ❌ Always zero!
  canvas: { x: 209, y: 776 }     // ❌ Same as viewport
}
```

## Root Cause

In `Canvas.tsx`, the `handleMouseMove` function was getting the scroll container incorrectly:

```typescript
// ❌ WRONG: Getting parent of canvas element
const canvasElement = document.getElementById('fabric-canvas');
const scrollContainer = canvasElement.parentElement;
const scrollLeft = scrollContainer?.scrollLeft || 0;  // Always 0!
```

The issue was that `canvasElement.parentElement` might not be the **scrollable div** - it could be a wrapper div or other intermediate element.

## Solution

Use `e.currentTarget` instead, which is the **exact div** where the `onMouseMove` event handler is attached (the scrollable div):

```typescript
// ✅ CORRECT: e.currentTarget is the scrollable div
const scrollContainer = e.currentTarget;
const scrollLeft = scrollContainer.scrollLeft;  // Actual scroll position!
```

## Code Changes

**File:** `src/components/canvas/Canvas.tsx`

### Before
```typescript
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const canvasElement = document.getElementById('fabric-canvas');
  if (!canvasElement) return;

  const rect = canvasElement.getBoundingClientRect();
  const scrollContainer = canvasElement.parentElement;  // ❌ Wrong element
  
  const scrollLeft = scrollContainer?.scrollLeft || 0;  // Always 0
  const scrollTop = scrollContainer?.scrollTop || 0;
  
  const canvasX = viewportX + scrollLeft;
  const canvasY = viewportY + scrollTop;
  
  sendCursorUpdate(canvasX, canvasY);  // ❌ Wrong coordinates sent
};
```

### After
```typescript
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const canvasElement = document.getElementById('fabric-canvas');
  if (!canvasElement) return;

  const rect = canvasElement.getBoundingClientRect();
  const scrollContainer = e.currentTarget;  // ✅ Correct scrollable div
  
  const scrollLeft = scrollContainer.scrollLeft;  // ✅ Actual scroll value
  const scrollTop = scrollContainer.scrollTop;
  
  const canvasX = viewportX + scrollLeft;
  const canvasY = viewportY + scrollTop;
  
  sendCursorUpdate(canvasX, canvasY);  // ✅ Correct canvas-absolute coords
};
```

## DOM Structure

The `onMouseMove` handler is attached to the scrollable container:

```tsx
<div 
  className="overflow-auto"  // ← This is e.currentTarget
  onMouseMove={handleMouseMove}
>
  <canvas id="fabric-canvas" />  // ← This is canvasElement
  <CursorOverlay />
  <RemoteSelectionOverlay />
</div>
```

## Expected Behavior After Fix

### Debug Output (Scrolled Canvas)
```javascript
Cursor Coords: {
  viewport: { x: 209, y: 776 },
  scroll: { x: 1243, y: 856 },      // ✅ Actual scroll position!
  canvas: { x: 1452, y: 1632 },     // ✅ Correct canvas coords
  scrollContainer: "overflow-auto"  // ✅ Confirms correct element
}
```

### Remote Cursor Positioning
1. **User A** moves cursor at viewport position `(209, 776)` with scroll `(1243, 856)`
2. **Canvas-absolute coordinates** calculated: `(209 + 1243, 776 + 856) = (1452, 1632)`
3. **Coordinates broadcast** via Supabase: `{ x: 1452, y: 1632 }`
4. **User B** receives coordinates and renders cursor at `(1452, 1632)` on their 8000×8000 canvas
5. **Result:** Cursor appears at correct position regardless of User B's scroll position ✅

## Key Concepts

### e.currentTarget vs e.target vs element.parentElement

| Method | Element | Use Case |
|--------|---------|----------|
| `e.currentTarget` | The element where the event handler is attached | ✅ Get the scrollable div in `onMouseMove` |
| `e.target` | The actual element that triggered the event | ❌ Could be canvas, overlay, or child element |
| `element.parentElement` | The direct parent in the DOM tree | ❌ May not be the scrollable ancestor |

### Coordinate Systems

```
┌─────────────────────────────────┐
│ Viewport (User's screen)        │
│  mouseX = 209                   │
│  mouseY = 776                   │
│                                 │
│  ┌─────────────────────┐       │
│  │ Visible Canvas      │       │
│  │  scrollLeft = 1243   │       │
│  │  scrollTop = 856     │       │
│  └─────────────────────┘       │
└─────────────────────────────────┘

        ↓ Transform to Canvas Space

┌──────────────────────────────────────┐
│ 8000×8000 Static Canvas              │
│                                      │
│      Cursor at canvas-absolute:      │
│      canvasX = 209 + 1243 = 1452    │
│      canvasY = 776 + 856 = 1632     │
│                                      │
└──────────────────────────────────────┘
```

## Related Components

### CursorOverlay.tsx
Renders cursors using canvas-absolute coordinates:

```tsx
<div style={{
  width: '8000px',    // Match canvas size
  height: '8000px',
}}>
  <div style={{
    left: `${cursor.x}px`,  // Direct canvas coordinate
    top: `${cursor.y}px`,
  }}>
    {/* Cursor SVG */}
  </div>
</div>
```

### RemoteSelectionOverlay.tsx
Same principle - uses canvas-absolute coordinates:

```tsx
<div style={{
  width: '8000px',
  height: '8000px',
}}>
  <div style={{
    left: `${obj.x - halfWidth}px`,
    top: `${obj.y - halfHeight}px`,
  }}>
    {/* Selection box */}
  </div>
</div>
```

## Testing Checklist

- [x] Scroll position reported correctly in debug logs
- [ ] Remote cursors appear at correct positions
- [ ] Cursors follow correctly when remote user scrolls
- [ ] Cursors remain stationary when local user scrolls (expected)
- [ ] Multiple users see each other's cursors correctly

## See Also

- `docs/STATIC_CANVAS_MIGRATION.md` - Overview of static canvas system
- `docs/COLLABORATIVE_EDITING_IMPLEMENTATION.md` - Selection sync system
- `docs/REMOTE_SELECTION_DEBUG.md` - Debugging remote selections

