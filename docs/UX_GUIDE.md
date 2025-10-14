# CollabCanvas UX Guide

## New Figma-Style Interactions

### Overview
CollabCanvas now features professional, Figma-like interactions for text resizing and canvas navigation.

---

## 1. Text Resizing - Independent Control

### How It Works
Text objects now support **two types of resizing**:

#### Corner Handle Resize (Uniform Scaling)
- **Action:** Drag any corner handle (top-left, top-right, bottom-left, bottom-right)
- **Result:** Scales **BOTH** fontSize and width proportionally
- **Use Case:** Make text uniformly bigger or smaller
- **Technical:** Both scaleX and scaleY change

#### Side Handle Resize (Width Only)
- **Action:** Drag middle-left or middle-right handle
- **Result:** Scales **ONLY** width, fontSize stays constant
- **Use Case:** Make text box wider/narrower without changing font size
- **Technical:** Only scaleX changes, scaleY ≈ 1

### Detection Logic
```typescript
const isCornerResize = Math.abs(scaleY - 1) > 0.01;

if (isCornerResize) {
  // Scale both fontSize and width
  newFontSize = fontSize * scaleY;
  newWidth = width * scaleX;
} else {
  // Scale only width
  newWidth = width * scaleX;
  // fontSize unchanged
}
```

### Benefits
- ✅ Power users can control text box width independently
- ✅ No accidental fontSize changes when adjusting layout
- ✅ Corner resize still available for uniform scaling
- ✅ Matches Figma behavior

---

## 2. Canvas Interaction Modes

### Selection Tool (Default)
**Default behavior when canvas loads**

- **Stage:** NOT draggable
- **Click empty area:** Deselect all shapes
- **Click shape:** Select that shape (show transformer)
- **Cursor:** Default pointer
- **Use Case:** Selecting and manipulating shapes

### Hand Tool (Pan Mode)
**Activated by keyboard modifiers**

- **Stage:** IS draggable
- **Click-drag anywhere:** Pan the canvas
- **Cursor:** Grab cursor
- **Use Case:** Navigating around large canvas

---

## 3. Keyboard Shortcuts

### Panning Shortcuts

#### Space Key
```
Hold Space → Temporarily switch to hand tool
Release Space → Return to select tool
```
- **Behavior:** Temporary tool switch while held
- **Common in:** Figma, Sketch, Photoshop
- **Use Case:** Quick pan without changing active tool

#### Command Key (Mac) / Ctrl Key (Windows/Linux)
```
Hold Command/Ctrl → Temporarily switch to hand tool
Release Command/Ctrl → Return to select tool
```
- **Behavior:** Alternative panning modifier
- **Platform:** Cross-platform support
- **Use Case:** Pan while selecting objects

### Shape Creation Shortcuts
```
R → Create Rectangle
C → Create Circle
T → Create Text
```

---

## 4. Implementation Details

### Tool Mode State Management

```typescript
// State
const [toolMode, setToolMode] = useState<ToolMode>('select');
const [isSpacePressed, setIsSpacePressed] = useState(false);
const [isCommandPressed, setIsCommandPressed] = useState(false);

// Computed effective mode
const effectiveToolMode: ToolMode = 
  isSpacePressed || isCommandPressed ? 'hand' : toolMode;
```

### Keyboard Event Handling

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Space key for hand tool
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      setIsSpacePressed(true);
    }
    
    // Command/Ctrl key for hand tool
    if ((e.metaKey || e.ctrlKey) && !e.repeat) {
      setIsCommandPressed(true);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setIsSpacePressed(false);
    }
    if (!e.metaKey && !e.ctrlKey) {
      setIsCommandPressed(false);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []);
```

### Stage Interaction

```typescript
<Stage
  draggable={effectiveToolMode === 'hand'}
  style={{ cursor: effectiveToolMode === 'hand' ? 'grab' : 'default' }}
  onMouseDown={checkDeselect}
/>
```

---

## 5. User Experience Flow

### Scenario 1: Selecting Shapes
```
1. Default tool is 'select'
2. Click on a shape → Shape selected, transformer appears
3. Click on empty canvas → Shape deselected
4. Click on another shape → First deselected, new shape selected
```

### Scenario 2: Panning Canvas
```
Option A (Space key):
1. Hold Space key
2. Cursor changes to 'grab'
3. Click and drag anywhere → Canvas pans
4. Release Space → Return to select tool

Option B (Command/Ctrl key):
1. Hold Command (Mac) or Ctrl (Win/Linux)
2. Cursor changes to 'grab'
3. Click and drag anywhere → Canvas pans
4. Release Command/Ctrl → Return to select tool
```

### Scenario 3: Resizing Text
```
Corner Resize (uniform scaling):
1. Select text
2. Drag corner handle
3. Both fontSize and width scale together
4. Release → Changes sync to all users

Side Resize (width only):
1. Select text
2. Drag middle-left or middle-right handle
3. Only width changes, fontSize stays same
4. Release → Changes sync to all users
```

---

## 6. Realtime Sync Behavior

All transformations sync in realtime:

- ✅ **Position changes:** Move → sync immediately
- ✅ **Rotation changes:** Rotate → sync immediately
- ✅ **Resize changes:** Resize → sync immediately
- ✅ **Text fontSize changes:** Corner resize → sync immediately
- ✅ **Text width changes:** Side resize → sync immediately

### Lock Mechanism
- First user to start transforming acquires lock
- Other users see visual feedback (lock indicators)
- Lock releases automatically on transform end
- Prevents simultaneous edits

---

## 7. Comparison with Other Tools

### Figma
- ✅ Space for hand tool → **Implemented**
- ✅ Independent text width resize → **Implemented**
- ❌ Marquee selection (click-drag to select multiple) → **Not yet**
- ❌ Tool palette UI → **Not yet**

### Sketch
- ✅ Space for hand tool → **Implemented**
- ✅ Command-drag for pan → **Implemented**
- ✅ Corner vs side resize → **Implemented**

### Adobe XD
- ✅ Space for hand tool → **Implemented**
- ✅ Selection tool default → **Implemented**

---

## 8. Future Enhancements (Not Implemented)

### Marquee Selection
- Click-drag empty area to draw selection rectangle
- Select multiple shapes at once
- Requires: Selection rectangle rendering + multi-select state

### Tool Indicator UI
- Visual indicator showing current tool
- Tool palette for explicit tool switching
- V/H keyboard shortcuts for tool switching

### Additional Tools
- Direct selection tool (edit shape points)
- Pen tool (draw custom shapes)
- Comments/annotations

---

## 9. Testing the New Features

### Test Text Resizing
```
1. Create a text object (press T)
2. Type some text
3. Select the text object

Test A - Corner Resize:
4. Drag a corner handle diagonally
5. Observe: Text gets bigger/smaller (fontSize + width scale)
6. Open another browser → fontSize and width synced ✅

Test B - Side Resize:
4. Drag middle-left or middle-right handle
5. Observe: Text box gets wider/narrower, fontSize stays same
6. Open another browser → width synced, fontSize unchanged ✅
```

### Test Tool Modes
```
Test A - Selection Tool:
1. Click on a shape → Selected ✅
2. Click empty area → Deselected ✅
3. Try to drag empty area → No panning ✅

Test B - Hand Tool (Space):
1. Hold Space key
2. Observe: Cursor changes to 'grab' ✅
3. Click-drag anywhere → Canvas pans ✅
4. Release Space → Cursor back to default ✅

Test C - Hand Tool (Command/Ctrl):
1. Hold Command (Mac) or Ctrl (Win/Linux)
2. Observe: Cursor changes to 'grab' ✅
3. Click-drag anywhere → Canvas pans ✅
4. Release Command/Ctrl → Cursor back to default ✅
```

---

## 10. Technical Notes

### Performance
- Keyboard listeners properly cleaned up on unmount
- No event listener leaks
- Modifier state updates efficiently
- Stage draggable prop toggles instantly

### Cross-Browser Compatibility
- `e.code === 'Space'` for reliable Space detection
- `e.metaKey || e.ctrlKey` for cross-platform Command/Ctrl
- Proper key repeat prevention with `!e.repeat`

### Edge Cases Handled
- Prevent Space key scrolling: `e.preventDefault()`
- Key repeat ignored: `!e.repeat` check
- Multiple modifiers: Priority to hand tool
- Transform during tool switch: Lock mechanism handles it

---

## Summary

### What Changed
1. ✅ Text resizing: Corner (uniform) vs Side (width-only)
2. ✅ Tool modes: Select (default) vs Hand (pan)
3. ✅ Keyboard shortcuts: Space and Command/Ctrl for panning
4. ✅ Dynamic cursor: Shows current tool mode
5. ✅ Stage draggable: Only in hand mode

### What Stayed the Same
- ✅ Real-time sync still works perfectly
- ✅ Locking mechanism unchanged
- ✅ Zoom with mouse wheel
- ✅ Shape creation shortcuts (R, C, T)
- ✅ All existing features intact

### Result
**Professional Figma-like UX with precise control over text and intuitive canvas navigation!** 🎉

