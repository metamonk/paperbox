# Coordinate Systems Analysis - Paperbox Canvas

**Created**: 2025-10-19
**Purpose**: Comprehensive analysis of all coordinate systems, transformations, and their interactions
**Goal**: Diagnose minimap viewport lag and mismatch issues

---

## Executive Summary

### Critical Issues Identified

🔴 **ROOT CAUSE - Minimap Lag & Viewport Mismatch**:

1. **Timing Mismatch**: Minimap reads viewport from Zustand store which updates via RAF-throttled callback, while actual Fabric viewport updates immediately
2. **Stale Viewport Data**: Minimap renders with `viewport` from store (lines 148-189 in Minimap.tsx), but this is ~16-33ms behind Fabric's actual viewportTransform
3. **Inconsistent Transform Source**: Minimap calculates viewport using Fabric's `viewportTransform` directly (line 151) but should use same source of truth as main canvas

**Impact**: Minimap viewport indicator lags 1-2 frames behind actual viewport, creating visual mismatch

---

## Coordinate Systems Inventory

### 1. **Center-Origin System** (User-Facing, Database)
- **Range**: -4000 to +4000 in both X and Y
- **Origin**: (0, 0) at canvas center
- **Used By**:
  - Database storage ([coordinateConversion.ts:37-39](../src/lib/sync/coordinateConversion.ts#L37-L39))
  - Zustand store (canvasSlice.ts)
  - User input/output
  - AI agent placement
  - Cursor broadcasts ([useBroadcastCursors.ts:48-54](../src/hooks/useBroadcastCursors.ts#L48-L54))

### 2. **Fabric.js Canvas System** (Rendering Internal)
- **Range**: 0 to 8000 in both X and Y
- **Origin**: (0, 0) at top-left corner
- **Center Point**: (4000, 4000)
- **Used By**:
  - Fabric.js rendering engine
  - FabricCanvasManager internal operations
  - Object placement calculations

### 3. **Viewport/Screen System** (Display to User)
- **Range**: Variable based on browser window size
- **Origin**: (0, 0) at top-left of visible canvas container
- **Transform**: Applies zoom and pan from Fabric's viewportTransform
- **Formula**: `screenCoord = (fabricCoord × zoom) + pan`
- **Used By**:
  - Cursor overlay rendering ([CursorOverlay.tsx:47-48](../src/components/collaboration/CursorOverlay.tsx#L47-L48))
  - Minimap viewport indicator ([Minimap.tsx:164-172](../src/components/canvas/Minimap.tsx#L164-L172))
  - User mouse interactions

### 4. **Minimap System** (Minimap-specific)
- **Range**: 0 to 150 (150×150px minimap canvas)
- **Scale Factor**: SCALE = 150 / 8000 = 0.01875
- **Formula**: `minimapCoord = fabricCoord × SCALE`
- **Used By**:
  - Minimap.tsx rendering ([Minimap.tsx:89-92](../src/components/canvas/Minimap.tsx#L89-L92))

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    COORDINATE FLOW                            │
└──────────────────────────────────────────────────────────────┘

User Input (mouse click)
    ↓
Screen Coordinates (viewport-relative)
    ↓
[Mouse Event Handler] → getPointer(e, false)
    ↓
Fabric Coordinates (0-8000) ← APPLIES zoom + pan transform
    ↓
[coordinateTranslation.ts] → fabricToCenter()
    ↓
Center-Origin Coordinates (-4000 to +4000)
    ↓
[Database / Zustand Store]
    ↓
[Realtime Broadcast] → Supabase
    ↓
[Other Users] → Receive center-origin coords
    ↓
[CursorOverlay] → centerToFabric() → Apply viewport transform
    ↓
Screen Coordinates (rendered to user)
```

### Viewport Transform Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 VIEWPORT SYNCHRONIZATION                     │
└─────────────────────────────────────────────────────────────┘

User pans/zooms
    ↓
Fabric.js updates viewportTransform matrix immediately
    |
    ├→ [FabricCanvasManager] Reads vpt via getViewport()
    |      ↓
    |  requestViewportSync() → RAF throttling
    |      ↓
    |  viewportSyncCallback(zoom, panX, panY) ← ~16-33ms delay
    |      ↓
    |  [canvasSlice.ts:1073-1081] syncViewport()
    |      ↓
    |  Zustand store updates viewport state
    |      ↓
    |  localStorage.setItem() ← Immediate persistence
    |
    ├→ [Canvas] Direct re-render with new vpt
    |
    └→ [Minimap] PROBLEM: Uses Zustand viewport (stale)
           ↓
       Reads vpt from Fabric directly (line 151)
           ↓
       Calculates viewport position
           ↓
       Renders with ~1-2 frame lag
```

**KEY INSIGHT**: The minimap has a timing inconsistency:
- It reads `vpt` from Fabric directly (line 151): `const vpt = canvas.viewportTransform;`
- But this `vpt` might not match the viewport dimensions it's using from the useEffect dependency
- The minimap re-renders on `renderKey` and `fabricManager` changes, NOT on viewport changes
- This creates a lag where minimap shows old viewport position with new object positions

---

## File Inventory

### Core Coordinate Translation

#### [src/lib/fabric/coordinateTranslation.ts](../src/lib/fabric/coordinateTranslation.ts)
- **Purpose**: Single source of truth for coordinate translations
- **Functions**:
  - `centerToFabric(x, y)`: Center → Fabric (lines 37-42)
  - `fabricToCenter(x, y)`: Fabric → Center (lines 56-61)
  - `getFabricCenterPoint()`: Returns (4000, 4000)
  - Validation and clamping utilities
- **No State**: Pure transformation functions

#### [src/lib/sync/coordinateConversion.ts](../src/lib/sync/coordinateConversion.ts)
- **Purpose**: Database ↔ Zustand conversions
- **Key**: NO coordinate translation (both use center-origin)
- **Functions**:
  - `dbToCanvasObject()`: Database row → CanvasObject
  - `canvasObjectToDb()`: CanvasObject → Database insert
  - `canvasObjectUpdatesToDb()`: Partial updates → Database update

### Viewport Management

####  [src/lib/fabric/FabricCanvasManager.ts](../src/lib/fabric/FabricCanvasManager.ts)
- **Lines 1047-1525**: Viewport management system
- **Viewport State**: Managed via Fabric's `viewportTransform` matrix
- **Key Methods**:
  - `setupMousewheelZoom()` (1106-1135): Zoom to cursor
  - `setupSpacebarPan()` (1148-1297): Pan with spacebar+drag
  - `setupScrollPanAndZoom()` (1309-1438): Figma-style scroll
  - `getViewport()` (1448-1461): Read zoom + pan from vpt matrix
  - `restoreViewport()` (1473-1486): Apply saved viewport
  - `centerViewportOnOrigin()` (1498-1524): Initial centering

- **Viewport Sync Pattern**:
  ```typescript
  // Line 1059: Callback registration
  setViewportSyncCallback(callback: (zoom, panX, panY) => void)

  // Line 1073-1097: RAF-throttled sync
  private requestViewportSync(): void {
    if (this.rafId !== null) {
      this.pendingViewportSync = true;
      return;
    }
    this.rafId = requestAnimationFrame(() => {
      if (this.viewportSyncCallback && this.canvas) {
        const viewport = this.getViewport();
        this.viewportSyncCallback(viewport.zoom, viewport.panX, viewport.panY);
      }
      this.rafId = null;
      if (this.pendingViewportSync) {
        this.pendingViewportSync = false;
        this.requestViewportSync();
      }
    });
  }
  ```

- **Coordinate Transformations** (Object Creation):
  ```typescript
  // Line 519-520: Database → Fabric
  const fabricCoords = centerToFabric(canvasObject.x, canvasObject.y);

  // Line 643-644: Fabric → Database
  const centerCoords = fabricToCenter(obj.left || 0, obj.top || 0);
  ```

- **Mouse Click Transformation** (Placement Mode):
  ```typescript
  // Line 1194: Get pointer WITH viewport transform applied
  const pointer = this.canvas.getPointer(opt.e, false);

  // Line 1199: Fabric → Center for storage
  const centerCoords = fabricToCenter(fabricX, fabricY);
  ```

#### [src/stores/slices/canvasSlice.ts](../src/stores/slices/canvasSlice.ts)
- **Lines 30-38**: ViewportState interface
- **Lines 54, 161**: Viewport state storage
- **Lines 1073-1118**: `syncViewport()` - receives from FabricCanvasManager
  - Updates Zustand store (line 1076-1081)
  - Saves to localStorage immediately (line 1084-1092)
  - Debounced PostgreSQL save (line 1095-1118, currently disabled for multi-canvas)
- **Lines 1127-1129**: `restoreViewport()` - returns viewport for Fabric restoration
- **Lines 1151-1166**: `loadViewportFromStorage()` - localStorage → Zustand
- **Lines 1208-1225**: `initializeViewport()` - Initialization priority (currently disabled)

### Minimap Implementation

#### [src/components/canvas/Minimap.tsx](../src/components/canvas/Minimap.tsx)
- **Size**: 150×150px minimap, 8000×8000 canvas
- **Scale**: `SCALE = 150 / 8000 = 0.01875` (line 23)

- **Rendering** (lines 41-190):
  1. Gets objects from Zustand: `const objectsMap = usePaperboxStore((state) => state.objects)` (line 31)
  2. Creates render key from objects: `const renderKey = objects.map(obj => \`${obj.id}-${obj.updated_at}\`).join(',')` (line 36)
  3. useEffect dependency: `[renderKey, fabricManager, objects]` (line 190)
  4. **PROBLEM**: NO viewport in dependencies → doesn't re-render on pan/zoom!

- **Viewport Indicator Drawing** (lines 148-189):
  ```typescript
  if (fabricManager) {
    const canvas = fabricManager.getCanvas();
    if (canvas) {
      const vpt = canvas.viewportTransform; // Direct Fabric access

      // Get viewport dimensions from scroll container
      const canvasEl = canvas.getElement();
      const scrollContainer = canvasEl.parentElement;
      const viewportWidthPx = scrollContainer?.clientWidth || 1920;
      const viewportHeightPx = scrollContainer?.clientHeight || 1080;

      // Convert to canvas units (unzoom)
      const viewportWidthCanvas = viewportWidthPx / vpt[0]; // vpt[0] = zoom
      const viewportHeightCanvas = viewportHeightPx / vpt[3]; // vpt[3] = zoom

      // Get top-left position in Fabric coords
      const fabricX = -vpt[4] / vpt[0]; // vpt[4] = panX
      const fabricY = -vpt[5] / vpt[3]; // vpt[5] = panY

      // Scale to minimap coords
      const vpX = fabricX * SCALE;
      const vpY = fabricY * SCALE;
      const vpW = viewportWidthCanvas * SCALE;
      const vpH = viewportHeightCanvas * SCALE;

      // Draw viewport rectangle
      ctx.strokeRect(vpX, vpY, vpW, vpH);
    }
  }
  ```

- **Navigation** (lines 210-245):
  - Converts minimap click → Fabric coords: `canvasX = minimapX / SCALE`
  - Centers viewport: `newPan = -(canvasX - viewportWidth/2) * zoom`
  - Applies via Fabric: `canvas.absolutePan(new Point(newPanX, newPanY))`

### Collaboration Components

#### [src/hooks/useBroadcastCursors.ts](../src/hooks/useBroadcastCursors.ts)
- **Purpose**: Real-time cursor position broadcasting
- **Coordinate System**: Center-origin (-4000 to +4000)
- **Throttling**: 30 FPS (33ms) via `throttle()` utility
- **Channel Scoping**: Canvas-specific (`canvas-cursors-${canvasId}`)
- **Broadcast Payload** (lines 48-56):
  ```typescript
  {
    userId,
    displayName,
    x,  // Center-origin coordinate
    y,  // Center-origin coordinate
    color,
    timestamp
  }
  ```

#### [src/components/collaboration/CursorOverlay.tsx](../src/components/collaboration/CursorOverlay.tsx)
- **Coordinate Transform Flow**:
  1. Receives center-origin coords from broadcast
  2. Translates to Fabric: `centerToFabric(cursor.x, cursor.y)` (line 43)
  3. Applies viewer's viewport transform:
     ```typescript
     const viewportX = (fabricCoords.x * zoom) + vpt[4]; // line 47
     const viewportY = (fabricCoords.y * zoom) + vpt[5]; // line 48
     ```
  4. Positions cursor SVG at screen coordinates

- **Memoization** (lines 101-113): Custom comparison prevents re-renders unless cursor positions actually change

---

## Connection Points & Data Flow

### 1. **Object Creation Flow**

```
User clicks canvas
    ↓
[FabricCanvasManager.setupEventListeners] mouse:down event (line 1191)
    ↓
getPointer(opt.e, false) → Fabric coords WITH zoom/pan applied
    ↓
fabricToCenter() → Center-origin coords (line 1199)
    ↓
onPlacementClick(centerX, centerY) → Canvas.tsx handler
    ↓
[canvasSlice.createObject] → Database insert with center coords (line 456)
    ↓
[Supabase Realtime] → Broadcast INSERT event
    ↓
[canvasSlice._addObject] → Add to Zustand store (line 794)
    ↓
[CanvasSyncManager] → Creates Fabric object via createFabricObject()
    ↓
centerToFabric() → Fabric coords for rendering (line 520)
    ↓
Fabric.js renders object
```

### 2. **Object Movement Flow**

```
User drags object
    ↓
Fabric.js 'object:moving' event fires (line 462)
    ↓
SNAP-TO-GRID: Apply grid snapping to obj.left/top (lines 466-469)
    ↓
onObjectMoving(target) → Broadcasts to other users (line 474)
    ↓
User releases object
    ↓
Fabric.js 'object:modified' event fires (line 453)
    ↓
onObjectModified(target) → CanvasSyncManager handler
    ↓
fabricToCenter() → Convert coordinates (line 643)
    ↓
canvasSlice.updateObject() → Database update + optimistic Zustand (line 557)
    ↓
[Supabase Realtime] → Broadcast UPDATE event
    ↓
hasSignificantChange() check → Prevent self-broadcast snap-back (line 994)
    ↓
Other users receive update and render
```

### 3. **Viewport Pan/Zoom Flow**

```
User scrolls or pans
    ↓
Fabric.js updates viewportTransform matrix immediately
    ↓
[Canvas] Re-renders with new viewport ← IMMEDIATE
    |
    ├→ [FabricCanvasManager.requestViewportSync] RAF-throttled (line 1073)
    |     ↓
    |  viewportSyncCallback(zoom, panX, panY) ← 16-33ms delay
    |     ↓
    |  [canvasSlice.syncViewport] (line 1073)
    |     ↓
    |  Zustand store update
    |     ↓
    |  localStorage save (immediate)
    |
    └→ [Minimap useEffect] ← PROBLEM: Doesn't trigger on viewport change!
          Dependencies: [renderKey, fabricManager, objects] (line 190)
          Missing: viewport state from Zustand or vpt change detection
```

**ROOT CAUSE IDENTIFIED**:
- Minimap useEffect doesn't depend on viewport state
- When user pans/zooms, minimap doesn't re-render
- Minimap only re-renders when objects change (renderKey)
- This creates the lag: viewport indicator stays at old position until next object update

### 4. **Cursor Broadcasting Flow**

```
User moves mouse on canvas
    ↓
[Canvas.tsx] onMouseMove handler
    ↓
getPointer(opt.e, false) → Fabric coords WITH viewport transform
    ↓
fabricToCenter() → Center-origin coords
    ↓
sendCursorUpdate(x, y) ← Throttled 30 FPS (line 40)
    ↓
Supabase Broadcast channel → canvas-cursors-${canvasId}
    ↓
Other users receive broadcast
    ↓
[CursorOverlay] Renders cursor:
    centerToFabric() → Fabric coords
    Apply viewer's viewport transform → Screen coords
    Position SVG cursor element
```

---

## Single Source of Truth Assessment

### ✅ **GOOD: Coordinate Translation**
- **Single Module**: `coordinateTranslation.ts` for all center ↔ Fabric conversions
- **Consistent Usage**: All files import from same module
- **Clear Separation**: Database/Zustand use center, Fabric uses Fabric coords
- **No Duplication**: No alternative coordinate conversion logic found

### ✅ **GOOD: Viewport State Storage**
- **Primary Source**: Fabric.js `viewportTransform` matrix
- **Secondary Store**: Zustand canvasSlice.viewport (synchronized snapshot)
- **Clear Hierarchy**: Fabric is source of truth, Zustand is synchronized cache
- **Persistence**: localStorage (immediate) + PostgreSQL (debounced, currently disabled)

### ❌ **PROBLEM: Viewport Synchronization Timing**

**Issue**: Minimap reads viewport from two sources with different timing:
1. **For viewport indicator**: Reads `canvas.viewportTransform` directly (line 151)
2. **For re-render triggering**: Depends on object changes, NOT viewport changes (line 190)

**Result**:
- Viewport indicator uses latest `vpt` from Fabric (correct coords)
- But minimap only re-renders when objects change (stale timing)
- Creates 1-2 frame lag between actual viewport and minimap display

### ❌ **PROBLEM: Missing Viewport Reactivity**

**Current Dependencies**:
```typescript
useEffect(() => {
  // Render minimap
}, [renderKey, fabricManager, objects]); // Line 190
```

**Missing**: Viewport state change detection

**Should Be**:
```typescript
// Option A: Add Zustand viewport dependency
const viewport = usePaperboxStore((state) => state.viewport);
useEffect(() => {
  // Render minimap
}, [renderKey, fabricManager, objects, viewport]);

// Option B: Add Fabric vpt change detection
useEffect(() => {
  if (!fabricManager) return;
  const canvas = fabricManager.getCanvas();
  if (!canvas) return;

  const handleViewportChange = () => {
    // Trigger re-render
    setRenderTrigger(prev => prev + 1);
  };

  canvas.on('after:render', handleViewportChange);
  return () => {
    canvas.off('after:render', handleViewportChange);
  };
}, [fabricManager]);
```

---

## Root Cause Diagnosis

### Issue: Minimap Viewport Lag

**Symptoms**:
1. Minimap viewport indicator lags 1-2 frames behind actual canvas viewport
2. Lag is most visible during rapid pan/zoom operations
3. Viewport indicator position doesn't match what user sees on main canvas

**Root Causes**:

#### 1. **Missing Viewport Dependency** (Primary Cause)
- **Location**: [Minimap.tsx:190](../src/components/canvas/Minimap.tsx#L190)
- **Problem**: useEffect doesn't depend on viewport state
- **Impact**: Minimap only re-renders when objects change, not when viewport changes
- **Evidence**:
  ```typescript
  useEffect(() => {
    // Draw minimap
  }, [renderKey, fabricManager, objects]); // ← Missing viewport!
  ```

#### 2. **RAF Throttling Delay** (Secondary Cause)
- **Location**: [FabricCanvasManager.ts:1073-1097](../src/lib/fabric/FabricCanvasManager.ts#L1073-L1097)
- **Problem**: Viewport sync to Zustand delayed by requestAnimationFrame
- **Impact**: 16-33ms delay before Zustand viewport updates
- **Interaction**: Even if minimap depended on Zustand viewport, would still lag by 1-2 frames
- **Evidence**:
  ```typescript
  private requestViewportSync(): void {
    if (this.rafId !== null) {
      this.pendingViewportSync = true;
      return; // ← Delay until next frame
    }
    this.rafId = requestAnimationFrame(() => {
      // ← 16-33ms delay
      this.viewportSyncCallback(...);
    });
  }
  ```

#### 3. **Inconsistent Transform Source** (Design Issue)
- **Problem**: Minimap reads `vpt` directly from Fabric but doesn't know when it changes
- **Location**: [Minimap.tsx:151](../src/components/canvas/Minimap.tsx#L151)
- **Pattern**: Direct Fabric access without change detection
- **Evidence**:
  ```typescript
  const vpt = canvas.viewportTransform; // ← Direct read, no reactivity
  ```

### Issue: Viewport Mismatch

**Symptoms**:
1. Minimap viewport rectangle doesn't accurately represent visible area
2. Clicking minimap doesn't always center correctly
3. Viewport indicator size/position slightly off from actual view

**Root Causes**:

#### 1. **Viewport Dimension Calculation**
- **Location**: [Minimap.tsx:156-172](../src/components/canvas/Minimap.tsx#L156-L172)
- **Issue**: Uses parent element dimensions which may not match actual visible viewport
- **Code**:
  ```typescript
  const scrollContainer = canvasEl.parentElement;
  const viewportWidthPx = scrollContainer?.clientWidth || 1920;
  const viewportHeightPx = scrollContainer?.clientHeight || 1080;
  ```
- **Problem**: Fallback values (1920×1080) used if scroll container not found
- **Impact**: Incorrect viewport rectangle dimensions in minimap

#### 2. **Transform Calculation Assumptions**
- **Assumption**: `vpt[0] === vpt[3]` (scaleX === scaleY)
- **Reality**: Usually true but not guaranteed
- **Location**: Lines 164, 166, 171, 172
- **Risk**: Potential mismatch if non-uniform scaling ever introduced

---

## Recommendations

### HIGH PRIORITY - Fix Minimap Lag

**Solution 1**: Add Zustand viewport dependency
```typescript
// In Minimap.tsx
const viewport = usePaperboxStore((state) => state.viewport);

useEffect(() => {
  // Render minimap
}, [renderKey, fabricManager, objects, viewport]); // ← Add viewport
```
**Pros**: Simple, leverages existing sync mechanism
**Cons**: Still has 16-33ms RAF delay

**Solution 2**: Subscribe to Fabric 'after:render' event
```typescript
// In Minimap.tsx
const [vptTrigger, setVptTrigger] = useState(0);

useEffect(() => {
  if (!fabricManager) return;
  const canvas = fabricManager.getCanvas();
  if (!canvas) return;

  const handleRender = () => {
    setVptTrigger(prev => prev + 1);
  };

  canvas.on('after:render', handleRender);
  return () => canvas.off('after:render', handleRender);
}, [fabricManager]);

useEffect(() => {
  // Render minimap
}, [renderKey, fabricManager, objects, vptTrigger]); // ← Immediate updates
```
**Pros**: Zero lag, immediate viewport updates
**Cons**: More renders (every canvas render triggers minimap render)

**Recommendation**: Use Solution 2 for zero-lag performance

### MEDIUM PRIORITY - Optimize Minimap Render Frequency

**Current**: Renders on every 'after:render' event (potentially 60 FPS)

**Optimization**: Throttle minimap updates to 30 FPS
```typescript
const throttledSetVptTrigger = useMemo(
  () => throttle((val: number) => setVptTrigger(val), 33),
  []
);

canvas.on('after:render', () => {
  throttledSetVptTrigger(Date.now());
});
```

### LOW PRIORITY - Viewport Dimension Accuracy

**Current Issue**: Fallback to 1920×1080 if container not found

**Fix**: Get dimensions from canvas element itself
```typescript
const viewportWidthPx = canvasEl.clientWidth;
const viewportHeightPx = canvasEl.clientHeight;
```

---

## Efficiency Assessment

### ✅ **Efficient Patterns**

1. **Coordinate Translation**: Pure functions, zero overhead
2. **Object Culling**: FabricCanvasManager hides off-screen objects ([lines 305-379](../src/lib/fabric/FabricCanvasManager.ts#L305-L379))
3. **RAF Throttling**: Prevents excessive Zustand updates during pan/zoom
4. **Cursor Throttling**: 30 FPS broadcast prevents network flooding
5. **Minimap Object Rendering**: Simplified shapes (no text rendering, basic fills)
6. **Memoization**: CursorOverlay uses custom memo to prevent unnecessary re-renders

### ❌ **Inefficient Patterns**

1. **Missing Viewport Reactivity**: Minimap doesn't update on viewport changes
2. **Render Key Computation**: Creates new string on every render:
   ```typescript
   const renderKey = objects.map(obj => `${obj.id}-${obj.updated_at}`).join(',');
   ```
   **Fix**: Use useMemo to cache render key

3. **Direct DOM Access**: Minimap reads scroll container dimensions on every render
   **Fix**: Cache dimensions, update only on window resize

---

## Performance Metrics

### Viewport Update Latency

| Operation | Fabric Canvas | Zustand Store | Minimap Display |
|-----------|--------------|---------------|-----------------|
| Pan/Zoom | **0ms** (immediate) | 16-33ms (RAF) | **No update** (missing dependency) |
| Object Move | 0ms | 16-33ms (RAF) | 0ms (renderKey changes) |

### Coordinate Transform Overhead

| Transform | Calls per Operation | Overhead |
|-----------|-------------------|----------|
| centerToFabric() | 1-2 | ~0.01ms (addition) |
| fabricToCenter() | 1-2 | ~0.01ms (subtraction) |
| Total | Negligible | < 0.1ms |

### Real-time Broadcast Latency

| Component | Throttle | Network RTT | Total Latency |
|-----------|----------|-------------|---------------|
| Cursor Position | 33ms (30 FPS) | 20-100ms | 53-133ms |
| Object Updates | None | 20-100ms | 20-100ms |
| Selection Sync | None | 20-100ms | 20-100ms |

---

## Testing Recommendations

### 1. Minimap Lag Verification

**Test**: Pan canvas rapidly, observe minimap viewport indicator

**Expected After Fix**:
- Minimap viewport rectangle moves in sync with main canvas
- No visible lag or "snap" behavior
- Smooth updates during continuous pan/zoom

### 2. Coordinate Accuracy

**Test**:
1. Create object at center (0, 0) via UI
2. Check database: Should store x=0, y=0
3. Check Fabric: Object at left=4000, top=4000
4. Check minimap: Object at 75, 75 (center of 150px minimap)

**Verification Queries**:
```sql
SELECT id, x, y FROM canvas_objects WHERE id = '<test_object_id>';
-- Expected: x=0, y=0
```

```javascript
fabricManager.getCanvas().getObjects().find(o => o.data.id === '<test_object_id>')
// Expected: { left: 4000, top: 4000 }
```

### 3. Multi-User Cursor Sync

**Test**:
1. Open canvas in two browsers
2. Move cursor in Browser A
3. Observe cursor position in Browser B

**Expected**:
- Cursor appears at correct position (accounting for different viewports)
- Smooth movement with < 150ms latency
- Cursor disappears after 3 seconds of inactivity

---

## Future Considerations

### Multi-Canvas Viewport Persistence (W5.D3)

**Current State**: Viewport persistence disabled for multi-canvas migration
**Location**: [canvasSlice.ts:1100-1117](../src/stores/slices/canvasSlice.ts#L1100-L1117)

**TODO**:
- Re-implement per-canvas viewport storage
- Database schema: Add viewport_state column to canvases table
- Load/save viewport when switching canvases

### Coordinate System Extensions

**Potential Future Systems**:
1. **Group Coordinate Space**: Relative coordinates within groups
2. **Component Instance Space**: Template coordinates for reusable components
3. **Export Coordinate Space**: Different origin for export (SVG, PNG)

**Design Principle**: Continue using center-origin as database/store standard, add transformation layers as needed

---

## Glossary

| Term | Definition |
|------|------------|
| **Center-Origin** | Coordinate system with (0,0) at canvas center, range -4000 to +4000 |
| **Fabric Coordinates** | Coordinate system with (0,0) at top-left, range 0 to 8000 |
| **Viewport Transform** | 6-element matrix `[scaleX, skewY, skewX, scaleY, translateX, translateY]` |
| **vpt** | Short for viewportTransform |
| **RAF** | requestAnimationFrame - browser API for smooth 60 FPS updates |
| **Zustand** | State management library used for Paperbox store |
| **Fabric.js** | HTML5 canvas library for object rendering and interaction |

---

## Conclusion

The Paperbox coordinate system is well-architected with clear separation of concerns and a single source of truth for transformations. The primary issue causing minimap lag is a **missing viewport dependency in the minimap's useEffect**, which prevents it from updating when the viewport changes. This is a straightforward fix that will eliminate the lag and viewport mismatch issues.

Secondary optimizations around render frequency throttling and dimension caching will further improve performance without changing the core architecture.

The existing RAF-throttled viewport synchronization to Zustand is appropriate for reducing state update frequency during rapid pan/zoom operations and should be maintained.
