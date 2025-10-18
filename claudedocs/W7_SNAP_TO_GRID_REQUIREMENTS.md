# W7.D2 Snap-to-Grid Requirements

**Feature**: Snap-to-Grid Functionality
**Scheduled**: Week 7, Day 2 (W7.D2.2-4)
**Dependencies**: Pixel grid visualization (W2.D8 ✅), Transform controls (W2-W3), Alignment tools (W7.D1)
**Documented**: 2025-10-17 (Week 2, Day 8)

## Overview

Snap-to-grid enables objects to automatically align to pixel boundaries when moved or resized at high zoom levels (>8x where pixel grid is visible). This feature enhances precision design work by ensuring pixel-perfect alignment.

## User Requirements

### Core Behavior
- **Automatic snapping** when pixel grid is visible (zoom > 8x)
- **Opt-in toggle** - Users can enable/disable snapping independently of grid visibility
- **Visual feedback** - Objects "snap" smoothly to nearest grid line during drag
- **Snap distance threshold** - Objects snap when within configurable distance (default: 5px)

### Interaction Patterns (Figma-style)
1. **Grid visible + snapping enabled** → Objects align to pixel boundaries
2. **Grid hidden OR snapping disabled** → Free-form positioning
3. **Keyboard modifier (Shift)** → Temporarily toggle snap behavior during drag
4. **Snap applies to**: Object position (x, y), resize handles, rotation center

## Technical Requirements

### Snap-to-Grid Configuration
```typescript
interface SnapToGridConfig {
  enabled: boolean;           // Global snap toggle
  threshold: number;          // Snap distance in canvas pixels (default: 5)
  snapToPixelGrid: boolean;   // Snap to pixel grid (vs custom grid)
  gridSpacing: number;        // Custom grid spacing (if not using pixel grid)
}
```

### Snap Calculation Algorithm
```typescript
/**
 * Calculate snapped coordinate for object position/size
 *
 * @param value - Current coordinate (x, y, width, height)
 * @param gridSpacing - Grid spacing (equals zoom level for pixel grid)
 * @param threshold - Max distance for snap to trigger
 * @returns Snapped coordinate or original value if outside threshold
 */
function snapToGrid(value: number, gridSpacing: number, threshold: number): number {
  const nearestGridLine = Math.round(value / gridSpacing) * gridSpacing;
  const distance = Math.abs(value - nearestGridLine);

  return distance <= threshold ? nearestGridLine : value;
}
```

### Integration Points

**1. FabricCanvasManager (src/lib/fabric/FabricCanvasManager.ts)**
- Add `snapConfig` property for snap configuration
- Add `setupSnapToGrid()` method to initialize snap system
- Hook into `object:moving` event to snap position during drag
- Hook into `object:scaling` event to snap dimensions during resize
- Hook into `object:rotating` event to snap rotation center

**2. Zustand Store (src/stores/slices/canvasSlice.ts)**
- Add `snapToGrid` state property (boolean, default: true)
- Add `snapThreshold` state property (number, default: 5)
- Add `toggleSnapToGrid()` action
- Add `setSnapThreshold()` action

**3. UI Components**
- Add snap toggle button to toolbar/settings
- Add snap threshold slider to settings panel
- Add visual indicator when snap is active (icon state)
- Add keyboard shortcut (Cmd+Shift+') to toggle snap

## Implementation Plan (W7.D2)

### W7.D2.2: Snap-to-Grid Core [RED/GREEN/REFACTOR]
**Duration**: ~2 hours

1. **Tests (RED)**:
   - Test snap calculation algorithm at various zoom levels
   - Test snap applies when enabled and grid visible
   - Test no snap when disabled or grid hidden
   - Test snap threshold distance

2. **Implementation (GREEN)**:
   - Add `snapConfig` to FabricCanvasManager
   - Implement `snapToGrid()` calculation function
   - Add Zustand state for snap configuration
   - Implement snap toggle action

3. **Refactor**:
   - Extract snap logic into separate utility
   - Add JSDoc comments for snap configuration
   - Optimize snap calculation for performance

### W7.D2.3: Object Movement Snapping [RED/GREEN/REFACTOR]
**Duration**: ~2 hours

1. **Tests (RED)**:
   - Test object position snaps during drag
   - Test snap respects threshold distance
   - Test snap works at different zoom levels
   - Test no snap when threshold exceeded

2. **Implementation (GREEN)**:
   - Hook into `object:moving` Fabric.js event
   - Apply snap calculation to object.left and object.top
   - Update object position with snapped coordinates
   - Trigger canvas render after snap

3. **Refactor**:
   - Clean up event handler logic
   - Add performance optimizations (RAF throttling)

### W7.D2.4: Resize & Rotation Snapping [RED/GREEN/REFACTOR]
**Duration**: ~2 hours

1. **Tests (RED)**:
   - Test object dimensions snap during resize
   - Test rotation center snaps during rotation
   - Test snap applies to all transform modes

2. **Implementation (GREEN)**:
   - Hook into `object:scaling` event for dimension snapping
   - Hook into `object:rotating` event for rotation center snap
   - Apply snap to width, height, rotation center

3. **Refactor**:
   - Consolidate transform snap logic
   - Add edge case handling (min/max sizes)

### W7.D2.5-7: Smart Guides Integration
**Duration**: ~4 hours

Smart guides (object-to-object alignment) will be implemented alongside snap-to-grid:
- Snap to other object edges (left, right, top, bottom, center)
- Snap to canvas center lines
- Visual guide lines appear during snap
- Prioritize object snapping over grid snapping when both available

### W7.D2.8-10: Grid Customization
**Duration**: ~4 hours

Allow users to customize grid behavior:
- Custom grid spacing (override pixel grid spacing)
- Grid subdivision levels (major/minor grid lines)
- Grid color and opacity settings
- Persist grid preferences to localStorage

## Acceptance Criteria

✅ **Core Snapping**:
- Objects snap to pixel grid when zoom > 8x and snap enabled
- Snap applies to position (x, y) during object drag
- Snap applies to dimensions (width, height) during resize
- Snap applies to rotation center during rotation

✅ **Configuration**:
- Users can toggle snap on/off via UI button
- Users can adjust snap threshold (1-10px range)
- Snap state persists across sessions (localStorage)
- Keyboard shortcut (Cmd+Shift+') toggles snap

✅ **Visual Feedback**:
- Snap toggle button shows active/inactive state
- Objects "jump" smoothly to grid lines (no flickering)
- Snap distance indicator appears in settings
- Grid lines highlight during snap (optional enhancement)

✅ **Performance**:
- Snap calculation runs in <1ms per object
- No perceptible lag during rapid dragging
- Snap works smoothly with 50+ objects on canvas
- RAF throttling prevents excessive recalculation

## Future Enhancements (Post-W7)

1. **Angle Snapping**: Snap rotation to 15° increments (0°, 15°, 30°, 45°, etc.)
2. **Distribution Snapping**: Snap to equal spacing between multiple objects
3. **Margin Snapping**: Snap to maintain consistent margins between objects
4. **Magnetic Snap**: Stronger snap force near grid lines (ease-in effect)
5. **Snap Feedback Sound**: Optional audio cue when snap occurs

## Related Documentation

- [Pixel Grid Visualization](../src/lib/fabric/FabricCanvasManager.ts#L835-L1011) - W2.D8.4-5 ✅
- [Viewport Controls](../src/lib/fabric/FabricCanvasManager.ts#L597-L833) - W2.D6-D7 ✅
- [Transform Controls](./MASTER_TASK_LIST.md#W3) - Week 3 ⏳
- [Alignment Tools](./MASTER_TASK_LIST.md#W7.D1) - Week 7, Day 1 ⏳

## Questions for Week 7 Implementation

1. **Snap priority**: When object snaps to both grid AND another object, which takes precedence?
2. **Group snapping**: Do groups snap as a single entity or do individual objects snap?
3. **Constraint snapping**: How does snap interact with aspect ratio constraints during resize?
4. **Multi-select snapping**: Do all selected objects snap together or independently?

These questions should be answered during W7.D2 requirements review before implementation begins.

---

**Status**: 📋 Documented (W2.D8)
**Next Step**: Implement during W7.D2 (Week 7, Day 2)
**Dependencies**: ✅ Pixel grid (W2.D8), ⏳ Transform controls (W2-W3), ⏳ Alignment tools (W7.D1)
