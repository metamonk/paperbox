# Cursor Coordinate Data Flow Analysis

## Complete Data Flow

### 1. Sending Side (User A)

```
User A moves mouse
    ↓
handleMouseMove(e: MouseEvent)
    ↓
Calculate coordinates:
  - Get canvas.getBoundingClientRect() ← This changes as you scroll!
  - canvasX = e.clientX - canvasRect.left
  - canvasY = e.clientY - canvasRect.top
    ↓
sendCursorUpdate(canvasX, canvasY)
    ↓
Supabase Broadcast { x: canvasX, y: canvasY, userId, displayName, color }
```

### 2. Receiving Side (User B)

```
Supabase Broadcast received
    ↓
useBroadcastCursors hook
    ↓
setCursors(new Map with cursor data)
    ↓
CursorOverlay component
    ↓
Render cursor at:
  <div style={{ left: `${cursor.x}px`, top: `${cursor.y}px` }} />
  (inside 8000x8000 overlay container)
```

## The Key Insight: Why `getBoundingClientRect()` Accounts for Scroll

### DOM Structure
```
<div className="overflow-auto">  ← Scrollable container
  <canvas 
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '8000px',
      height: '8000px'
    }}
  />
</div>
```

### What Happens When You Scroll

**Before scrolling:**
```
Container scrollLeft: 0
Canvas getBoundingClientRect():
  - left: 200px (left edge of container in viewport)
  - top: 100px
  - width: 8000px
  - height: 8000px

Mouse at clientX: 500, clientY: 400
Calculation: 
  canvasX = 500 - 200 = 300px
  canvasY = 400 - 100 = 300px
```

**After scrolling right 1000px:**
```
Container scrollLeft: 1000
Canvas getBoundingClientRect():
  - left: -800px (canvas has moved LEFT out of viewport!)
  - top: 100px
  - width: 8000px
  - height: 8000px

Mouse at SAME viewport position clientX: 500, clientY: 400
Calculation:
  canvasX = 500 - (-800) = 1300px  ← Automatically includes scroll!
  canvasY = 400 - 100 = 300px
```

**This is why METHOD 1 works!**
- `getBoundingClientRect()` returns the **viewport-relative** position of the element
- When you scroll, the element moves in the viewport, so its rect changes
- Subtracting the rect from mouse clientX/Y automatically accounts for scroll!

## Two Calculation Methods

### METHOD 1: Canvas Bounding Rect (CORRECT ✅)
```typescript
const canvasRect = canvasElement.getBoundingClientRect();
const canvasX = e.clientX - canvasRect.left;  // Accounts for scroll automatically!
const canvasY = e.clientY - canvasRect.top;
```

**Why it works:**
- `canvasRect.left` changes as you scroll
- When you scroll right, canvas moves left, rect.left becomes negative
- `e.clientX - (negative value)` = larger coordinate = correct!

### METHOD 2: Container + Manual Scroll Addition (WRONG ❌)
```typescript
const containerRect = scrollContainer.getBoundingClientRect();
const scrollLeft = scrollContainer.scrollLeft;
const canvasX = (e.clientX - containerRect.left) + scrollLeft;  // Double-counts scroll!
```

**Why it fails:**
- If `canvasRect.left` already accounts for scroll...
- And we add `scrollLeft` manually...
- We're counting the scroll twice!

## Diagnostic Questions

The comprehensive debug log will answer:

### Q1: Is the container actually scrollable?
```javascript
container: {
  size: { width: 1200, height: 800 },      // Visible area
  scrollSize: { width: 8000, height: 8000 }  // Total content
}
```
If `scrollSize > size`, then container IS scrollable. ✅
If `scrollSize === size`, then container is NOT scrollable! ❌

### Q2: Is scroll actually happening?
```javascript
container: {
  scroll: { left: 0, top: 0 }  // If always 0, scroll isn't working!
}
```

### Q3: Does canvas rect change when scrolling?
```javascript
// Before scroll:
canvas: { rect: { left: 200, top: 100 } }

// After scrolling right 1000px:
canvas: { rect: { left: -800, top: 100 } }  // Should be negative!
```

### Q4: Do the two methods give different results?
```javascript
calculated: {
  method1_canvasRelative: { x: 1300, y: 300 },
  method2_withScroll: { x: 2300, y: 300 }  // Wrong! Double-counted
}
```

## Expected Debug Output

### Scenario: User scrolled right 1000px, mouse at viewport (500, 400)

```javascript
[🔍 FULL DEBUG] Cursor Analysis: {
  mouse: { clientX: 500, clientY: 400 },
  container: {
    rect: { left: 200, top: 100 },
    scroll: { left: 1000, top: 0 },         // ← Scroll IS happening
    size: { width: 1200, height: 800 },     // ← Visible area
    scrollSize: { width: 8000, height: 8000 }  // ← Total canvas size
  },
  canvas: {
    rect: { left: -800, top: 100 },         // ← Canvas moved left!
    size: { width: 8000, height: 8000 }
  },
  calculated: {
    method1_canvasRelative: { x: 1300, y: 300 },  // ← CORRECT
    method2_withScroll: { x: 2300, y: 300 }       // ← Wrong (double-counted)
  }
}
```

## Common Issues & Solutions

### Issue 1: Scroll always 0

**Possible causes:**
- Container doesn't have `overflow: auto` or `overflow: scroll`
- Canvas isn't larger than container
- Canvas has wrong positioning (should be `absolute`)

**Fix:**
- Verify container has `overflow-auto` class
- Verify canvas is 8000x8000
- Verify canvas is `position: absolute`

### Issue 2: Canvas rect doesn't change when scrolling

**Possible cause:**
- Canvas is `position: fixed` instead of `absolute`

**Fix:**
- Change canvas to `position: absolute`

### Issue 3: Cursors appear at wrong position

**Possible causes:**
- Using METHOD 2 (double-counting scroll)
- CursorOverlay not matching canvas size
- CursorOverlay not positioned correctly

**Fix:**
- Use METHOD 1 (canvas bounding rect only)
- Set CursorOverlay to 8000x8000
- Position CursorOverlay at top: 0, left: 0

## Current Implementation

**File:** `src/components/canvas/Canvas.tsx`

Using **METHOD 1** (canvas bounding rect):

```typescript
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const canvasElement = document.getElementById('fabric-canvas');
  const canvasRect = canvasElement.getBoundingClientRect();
  
  // This automatically accounts for scroll!
  const canvasX = e.clientX - canvasRect.left;
  const canvasY = e.clientY - canvasRect.top;
  
  sendCursorUpdate(canvasX, canvasY);  // ✅ Correct coordinates
};
```

## Testing Instructions

1. **Open console** and look for `[🔍 FULL DEBUG]` logs
2. **Scroll the canvas** right and down
3. **Move mouse slightly** to trigger a log
4. **Check the output:**
   - Is `container.scroll.left` > 0? (Scroll is working)
   - Is `canvas.rect.left` negative? (Canvas moved in viewport)
   - Do `method1_canvasRelative` values look correct?

## Expected Behavior

✅ **When scroll is working:**
- User A scrolls right 1000px
- User A's mouse at viewport (500, 400)
- Broadcasts coordinates (1300, 300)
- User B sees cursor at canvas position (1300, 300)
- Regardless of User B's scroll position, cursor appears in correct location

❌ **When scroll is NOT working:**
- Container `scrollLeft` always 0
- Canvas `rect.left` doesn't change
- Cursor coordinates are wrong for scrolled positions

