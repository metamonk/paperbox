# Viewport Transform Fix - Cursor & Selection Positioning

## The Problem

Cursors and selections were not appearing in the correct positions because we were trying to use **DOM scrolling** when the system actually uses **Fabric's viewport transform** (zoom/pan).

### Symptoms

1. ✅ Minimap worked correctly (showing pan position)
2. ❌ `scrollLeft` and `scrollTop` always reported as `0`
3. ❌ Remote cursors appeared in wrong positions
4. ❌ Remote selections didn't appear or were positioned incorrectly

### Root Cause

The system uses **Fabric.js viewport transform** for navigation, not DOM scrolling. This means:

```typescript
// The canvas has zoom and pan via Fabric's viewportTransform
canvas.setZoom(2.0);  // 200% zoom
canvas.absolutePan({ x: 100, y: 200 });  // Pan position

// DOM scroll is NOT used - always 0!
scrollContainer.scrollLeft;  // Always 0 ❌
scrollContainer.scrollTop;   // Always 0 ❌
```

## The Solution

**Use Fabric's viewport transform** for all coordinate calculations, not DOM scroll.

### Key Formula

Transform between **canvas coordinates** (absolute position on infinite canvas) and **viewport coordinates** (position on screen):

```typescript
// Canvas → Viewport (for rendering overlays)
viewportX = (canvasX * zoom) + panX
viewportY = (canvasY * zoom) + panY

// Viewport → Canvas (for mouse events)
canvasX = (viewportX - panX) / zoom
canvasY = (viewportY - panY) / zoom
```

Where:
- `zoom` = `canvas.getZoom()`
- `panX` = `canvas.viewportTransform[4]`
- `panY` = `canvas.viewportTransform[5]`

## Implementation

### 1. Cursor Sending (Canvas.tsx)

**User A moves mouse** → Convert to canvas coordinates → Broadcast

```typescript
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const canvas = fabricManager.getCanvas();
  const canvasElement = canvas.getElement();
  const rect = canvasElement.getBoundingClientRect();
  
  // Get mouse position in viewport
  const viewportX = e.clientX - rect.left;
  const viewportY = e.clientY - rect.top;
  
  // Get Fabric's viewport transform
  const vpt = canvas.viewportTransform;
  const zoom = canvas.getZoom();
  
  // Transform viewport → canvas
  const canvasX = (viewportX - vpt[4]) / zoom;
  const canvasY = (viewportY - vpt[5]) / zoom;
  
  // Broadcast canvas coordinates
  sendCursorUpdate(canvasX, canvasY);
};
```

**Why this works:**
- `canvasX/canvasY` are absolute positions on the infinite canvas
- These coordinates are **viewport-independent**
- User B can apply their own viewport transform to display correctly

### 2. Cursor Rendering (CursorOverlay.tsx)

**User B receives cursor** → Transform to their viewport → Render

```typescript
function CursorOverlayComponent({ cursors, fabricManager }) {
  const canvas = fabricManager.getCanvas();
  const vpt = canvas.viewportTransform;
  const zoom = canvas.getZoom();

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from(cursors.values()).map((cursor) => {
        // Transform canvas → viewport using User B's transform
        const viewportX = (cursor.x * zoom) + vpt[4];
        const viewportY = (cursor.y * zoom) + vpt[5];
        
        return (
          <div
            key={cursor.userId}
            className="absolute"
            style={{
              left: `${viewportX}px`,
              top: `${viewportY}px`,
            }}
          >
            {/* Cursor SVG */}
          </div>
        );
      })}
    </div>
  );
}
```

**Why this works:**
- User B's viewport transform converts canvas coords to their screen position
- Even if User B is zoomed/panned differently, cursor appears at correct location

### 3. Selection Rendering (RemoteSelectionOverlay.tsx)

**User B displays User A's selection** → Transform object coords to viewport → Render

```typescript
export function RemoteSelectionOverlay() {
  const fabricManager = useCanvas();
  const canvas = fabricManager.getCanvas();
  const vpt = canvas.viewportTransform;
  const zoom = canvas.getZoom();
  
  // For each selected object
  const canvasLeft = obj.x - (obj.width / 2);
  const canvasTop = obj.y - (obj.height / 2);
  
  // Transform to viewport
  const viewportLeft = (canvasLeft * zoom) + vpt[4];
  const viewportTop = (canvasTop * zoom) + vpt[5];
  const viewportWidth = obj.width * zoom;
  const viewportHeight = obj.height * zoom;
  
  return (
    <div
      style={{
        left: `${viewportLeft}px`,
        top: `${viewportTop}px`,
        width: `${viewportWidth}px`,
        height: `${viewportHeight}px`,
      }}
    />
  );
}
```

**Why this works:**
- Objects are stored in canvas coordinates
- Viewer's viewport transform positions them correctly on screen
- Zoom is applied to dimensions (selection box scales with zoom)

## Data Flow

### Scenario: User A and User B at different viewports

```
User A:
  - Zoomed 200% (zoom = 2.0)
  - Panned to (100, 50)
  - Mouse at viewport position (300, 400)

Calculate canvas coordinates:
  canvasX = (300 - 100) / 2.0 = 100
  canvasY = (400 - 50) / 2.0 = 175

Broadcast: { x: 100, y: 175 }

─────────────────────────────

User B:
  - Zoomed 100% (zoom = 1.0)
  - Panned to (0, 0)
  - Receives cursor: { x: 100, y: 175 }

Calculate viewport position for rendering:
  viewportX = (100 * 1.0) + 0 = 100
  viewportY = (175 * 1.0) + 0 = 175

Result: User B sees cursor at (100, 175) on their screen
        This is the SAME canvas position as User A, just different viewport! ✅
```

## Why Minimap Always Worked

The minimap never had this problem because it was reading from the **Zustand store's viewport state**, not DOM scroll:

```typescript
const zoom = usePaperboxStore((state) => state.viewport.zoom);
const panX = usePaperboxStore((state) => state.viewport.panX);
const panY = usePaperboxStore((state) => state.viewport.panY);

const scrollX = -panX / zoom;  // ✅ Correct
const scrollY = -panY / zoom;  // ✅ Correct
```

This state is synced from Fabric's viewport transform, so it always reflected the actual navigation state.

## Before vs After

### Before (Wrong ❌)

```typescript
// Trying to use DOM scroll (always 0)
const scrollLeft = scrollContainer.scrollLeft;  // Always 0!
const canvasX = viewportX + scrollLeft;  // Wrong!
```

**Result:** Cursors appear at viewport position, not canvas position.

### After (Correct ✅)

```typescript
// Using Fabric's viewport transform
const vpt = canvas.viewportTransform;
const zoom = canvas.getZoom();
const canvasX = (viewportX - vpt[4]) / zoom;  // Correct!
```

**Result:** Cursors appear at correct canvas position, transformed to each user's viewport.

## Key Concepts

### Coordinate Systems

1. **Viewport Coordinates**: Position on user's screen (pixels from top-left of visible area)
   - Example: Mouse at (300, 400) on screen

2. **Canvas Coordinates**: Absolute position on infinite canvas (independent of zoom/pan)
   - Example: Object at (1000, 2000) on canvas

3. **Transform**: Viewport ↔ Canvas conversion using zoom and pan
   - Allows multiple users to view same canvas from different perspectives

### Fabric's viewportTransform

A 6-element transformation matrix:

```typescript
canvas.viewportTransform = [
  scaleX,      // [0] - Horizontal scale (usually zoom)
  skewY,       // [1] - Vertical skew (usually 0)
  skewX,       // [2] - Horizontal skew (usually 0)
  scaleY,      // [3] - Vertical scale (usually zoom)
  translateX,  // [4] - Horizontal pan (panX)
  translateY,  // [5] - Vertical pan (panY)
]
```

For our purposes:
- `zoom = canvas.getZoom()` (equivalent to `vpt[0]` and `vpt[3]`)
- `panX = vpt[4]`
- `panY = vpt[5]`

## Testing Checklist

### Test 1: Cursor Position
- [ ] User A pans/zooms to different area
- [ ] User A moves cursor
- [ ] User B sees cursor at **same canvas location**
- [ ] User B can pan/zoom independently
- [ ] Cursor stays at correct canvas position regardless of User B's viewport

### Test 2: Selection Position
- [ ] User A selects object
- [ ] User B sees selection box around **same object**
- [ ] Selection box scales with User B's zoom
- [ ] Selection box moves with User B's pan
- [ ] Multiple objects selected show multiple boxes

### Test 3: Zoom/Pan Independence
- [ ] User A at 200% zoom, panned right
- [ ] User B at 100% zoom, centered
- [ ] Both see cursors/selections at correct positions
- [ ] Positions update smoothly as users navigate

### Test 4: Debug Logs
Look for these logs to verify correct calculation:

```javascript
[✅ FIXED] Cursor with Fabric Viewport: {
  viewport: { x: 300, y: 400 },
  transform: { zoom: "2.00", panX: 100, panY: 50 },
  canvas: { x: 100, y: 175 }  // ← Correct canvas coords
}

[CursorOverlay] Rendering cursor: {
  canvas: { x: 100, y: 175 },
  viewport: { x: 100, y: 175 },  // ← Transformed to viewer's viewport
  transform: { zoom: "1.00", panX: 0, panY: 0 }
}
```

## Related Files

- `src/components/canvas/Canvas.tsx` - Cursor sending (mouse → canvas coords)
- `src/components/collaboration/CursorOverlay.tsx` - Cursor rendering (canvas → viewport)
- `src/components/collaboration/RemoteSelectionOverlay.tsx` - Selection rendering
- `src/lib/fabric/FabricCanvasManager.ts` - Viewport transform management

## See Also

- `docs/STATIC_CANVAS_MIGRATION.md` - Original canvas architecture
- `docs/COLLABORATIVE_EDITING_IMPLEMENTATION.md` - Selection sync system
- `docs/CURSOR_DATA_FLOW_ANALYSIS.md` - Previous analysis (now outdated)

