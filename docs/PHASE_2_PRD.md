# Phase II Product Requirements Document (PRD)
## Paperbox: Feature-Complete Figma Clone with AI-Ready Architecture

**Document Version**: 1.2
**Last Updated**: 2025-10-18
**Phase**: II - Feature-Complete Implementation
**Migration**: Konva.js → Fabric.js (Big Bang) ✅ COMPLETE
**Timeline**: 12 weeks (adjusted)
**Critical Update**: Multi-Canvas Architecture added to Phase II (Week 5)

**Implementation Updates**:
- ✅ Week 1-2 Complete: Fabric.js + Zustand + Infinite Canvas + Figma-style interactions
- ⏭️ Week 3 Skipped: Selection/Transform (Fabric.js defaults sufficient)
- ✅ Week 4 Complete: Design System (shadcn/ui + Kibo UI)
  - ✅ W4.D0 Complete: Foundation installed (11 shadcn components + Kibo UI + react-colorful)
  - ✅ W4.D1 Complete: Toolbar/Sidebar migrated to shadcn, Toast replaced with Sonner, Click-to-place fixes
  - ✅ W4.D2 Complete: Property panels with real-time Zustand sync + **CRITICAL sync pipeline fix**
  - ✅ W4.D3 Complete: Layers Panel with drag-drop reordering, rename, and context menu operations
  - ✅ W4.D4 Complete: Advanced UI components + **CRITICAL collaboration fix** (selection persistence + multi-user object visibility)
  - ✅ W4.D5 Complete: Testing & Polish (accessibility, keyboard nav, final integration)
- ✅ **Week 5 Complete**: Multi-Canvas Architecture (CRITICAL - Figma clone foundation)
  - ✅ W5.D1 Complete: Database schema & migrations (canvases table, canvas_id scoping, RLS policies)
  - ✅ W5.D2 Complete: State Management (Zustand canvas CRUD, canvas-scoped queries, realtime filtering)
  - ✅ W5.D3 Complete: UI Components (CanvasPicker with ⌘K shortcut, CanvasManagementModal)
  - ✅ W5.D4 Complete: Routing & Integration (/canvas/:canvasId with URL-state bidirectional sync)
  - ✅ W5.D5 Complete: Testing, Polish & Documentation (W5_MULTI_CANVAS_COMPLETE.md + AI Integration)
  - ✅ **CRITICAL FIX**: Production infinite loop resolved (Commit 3497033)
    - **Issue**: Circular useEffect dependency causing 80K-114K console logs in 5-10s
    - **Solution**: Architectural separation - CanvasRedirect (routing) + CanvasPage (rendering)
    - **Documentation**: [W5_ROUTING_FIX.md](../claudedocs/W5_ROUTING_FIX.md) (8 fix attempts documented)
- 🔜 **Week 6 In Progress**: Color & Text Styling (Color picker ✅ complete, Text formatting next)
- 📋 **TDD Approach Abandoned**: Direct implementation → Testing → Documentation (faster delivery)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Phase II Goals & Success Criteria](#phase-ii-goals--success-criteria)
4. [System Architecture](#system-architecture)
5. [Technical Stack](#technical-stack)
6. [Feature Requirements (57 Features)](#feature-requirements)
7. [Implementation Strategy](#implementation-strategy)
8. [Migration Plan: Konva → Fabric.js](#migration-plan)
9. [State Management Architecture](#state-management-architecture)
10. [Conflict Resolution Strategy](#conflict-resolution-strategy)
11. [AI Integration Preparation (Phase III)](#ai-integration-preparation)
12. [Testing Strategy](#testing-strategy)
13. [Performance Requirements](#performance-requirements)
14. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

Phase II transforms Paperbox from an MVP Figma clone into a **feature-complete collaborative design tool** with 57 production-ready features. This phase focuses on:

1. **Big Bang Migration**: Complete replacement of Konva.js with Fabric.js for superior canvas capabilities ✅
2. **State Management**: Full Zustand integration with Supabase Realtime for optimized state synchronization ✅
3. **Multi-Canvas Architecture**: Foundational workspace organization enabling multiple design files (Week 5)
4. **Feature-Complete**: All 57 features from FOUNDATION.md implemented using DRY principles
5. **AI-Ready Architecture**: Command pattern system enabling Phase III AI integration with minimal refactoring
6. **Production Quality**: Performance optimization for 500+ objects and 5+ concurrent users

**Key Architectural Decisions**:
- Pattern-based implementation using 8 core engines instead of 57 separate features (DRY principles)
- Multi-canvas architecture in Phase II (before AI) to prevent technical debt and enable proper Figma-like workspace organization

---

## Current State Analysis

### ✅ Implemented (MVP)
- Real-time sync: Supabase Realtime with optimistic updates (sub-100ms)
- Data model: Hybrid schema (columns + JSONB) prepared for AI metadata
- Canvas: Konva.js with pan/zoom, basic shapes (rectangle, circle, text)
- Collaboration: Multi-user cursors, object locking mechanism
- Authentication: Supabase Auth with protected routes
- Database: PostgreSQL with RLS policies

### ❌ Not Implemented (Phase II Scope - Remaining)
- **Multi-canvas architecture** (Week 5 - CRITICAL FOUNDATION)
- Multi-select system
- Undo/redo with history
- Keyboard shortcuts framework
- Layer/Z-index management (partially complete)
- Advanced selection tools (lasso, drag-select)
- Component system, alignment tools
- Export (PNG/SVG), copy/paste, grouping
- Text formatting, color picker (partially complete), design tokens
- Snap-to-grid, smart guides, frames/artboards
- Auto-layout, comments, version history
- Vector path editing, blend modes

---

## Phase II Goals & Success Criteria

### Primary Goals
1. ✅ **Complete Fabric.js Migration**: 100% removal of Konva.js dependencies
2. ✅ **Zustand State Management**: Full integration with 6 specialized store slices
3. 🔜 **Multi-Canvas Architecture**: Multiple design files with canvas_id scoping (Week 5)
4. 📋 **57 Features Implemented**: All FOUNDATION.md requirements delivered
5. ✅ **AI-Ready Architecture**: Command pattern enabling Phase III natural language commands
6. ✅ **Performance Targets**: 500+ objects, 5+ concurrent users, <100ms sync

### Success Criteria
- **Functionality**: All 57 features working as specified in FOUNDATION.md
- **Performance**: Smooth interactions with 500+ objects, no degradation
- **Collaboration**: Multiple users editing simultaneously with conflict resolution
- **Code Quality**: DRY principles, >80% test coverage, TypeScript strict mode
- **AI Readiness**: Command system supporting all Phase III AI command categories

---

## System Architecture

### Layered Architecture (5 Layers)

```
┌─────────────────────────────────────────────────────┐
│              LAYER 5: FEATURE LAYER                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Commands   │  │    Tools     │  │  Panels  │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│          LAYER 4: CANVAS LAYER (Fabric.js)          │
│  ┌──────────────────────────────────────────────┐  │
│  │  FabricCanvasManager | ObjectFactory        │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│            LAYER 3: SYNC LAYER                      │
│  ┌──────────────────────────────────────────────┐  │
│  │  SyncManager | ConflictResolver | Optimistic│  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│          LAYER 2: STATE LAYER (Zustand)             │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│  │Canvas  │ │Selection │ │History │ │Layers    │  │
│  │Store   │ │Store     │ │Store   │ │Store     │  │
│  └────────┘ └──────────┘ └────────┘ └──────────┘  │
│  ┌────────┐ ┌──────────┐                          │
│  │Tools   │ │Collab    │                          │
│  │Store   │ │Store     │                          │
│  └────────┘ └──────────┘                          │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│        LAYER 1: DATA LAYER (Supabase)               │
│  ┌──────────────────────────────────────────────┐  │
│  │  PostgreSQL | Realtime | Auth | Storage     │  │
│  │  Tables: canvases, canvas_objects, locks    │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Multi-Canvas Architecture (Week 5)

**Canvas Model**: Multiple design files, each with isolated object space

```
User's Workspace
├── Canvas 1: "Homepage Design"
│   ├── Object 1 (canvas_id: canvas-1)
│   ├── Object 2 (canvas_id: canvas-1)
│   └── Object 3 (canvas_id: canvas-1)
├── Canvas 2: "Mobile App"
│   ├── Object 4 (canvas_id: canvas-2)
│   └── Object 5 (canvas_id: canvas-2)
└── Canvas 3: "Design System"
    └── Object 6 (canvas_id: canvas-3)
```

**Database Schema Changes**:
```sql
-- New table for canvas metadata
CREATE TABLE canvases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add canvas_id to canvas_objects
ALTER TABLE canvas_objects
  ADD COLUMN canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE;
```

**Scoping Changes**:
- Queries filter by `canvas_id` instead of no filter
- Realtime subscriptions scoped to active canvas
- RLS policies include canvas ownership/permissions

### Data Flow

**User Action → Execution**
```
User Click/Keyboard
    ↓
Command.execute()
    ↓
Zustand Store Update (optimistic)
    ↓
Fabric.js Canvas Update (immediate)
    ↓
Supabase Database Write
    ↓
Realtime Broadcast to Other Users
```

**Remote Change → Rendering**
```
Supabase Realtime Event
    ↓
Zustand Store Update
    ↓
Fabric.js Canvas Update
    ↓
Visual Rendering
```

### Architecture Improvements (W2.D12)

**Critical Sync Architecture Fixes**: Two fundamental issues affecting property updates and multi-user transform synchronization were identified and resolved in W2.D12, strengthening the bidirectional data flow.

#### Issue 1: Property Update Sync (✅ RESOLVED)
**Problem**: Font size/fill color/stroke color changes caused objects to deselect, breaking UX flow.

**Root Cause**: Asymmetric sync flag protection - selection event handlers lacked `_isSyncingFromStore` guards.

**Fixes**:
1. **Symmetric Sync Flag Protection**: Added guards to `onSelectionCreated`, `onSelectionUpdated`, `onSelectionCleared`
2. **Complete Change Detection**: Added `stroke`, `stroke_width`, `style_properties` to `hasObjectChanged()`

**Impact**: All property updates maintain selection state + immediate visual feedback.

#### Issue 2: Multi-User Transform Sync (✅ RESOLVED)
**Problem**:
- Rectangle resize snap-back (dimensions not persisted)
- Circle enlargement appears as movement to other users

**Root Cause**: Fabric.js scale transforms (scaleX, scaleY) not applied to geometric properties before database serialization.

**Data Flow (Before Fix)**:
```
User A resizes rectangle (100×100 → 200×150)
  → Fabric.js: width=100, scaleX=2.0 ❌
  → Database: width=100 ❌ (scale lost)
  → User B: width=100 ❌ (snap-back)
```

**Data Flow (After Fix)**:
```
User A resizes rectangle (100×100 → 200×150)
  → Fabric.js: width=100, scaleX=2.0
  → toCanvasObject(): width=200 ✅ (scale baked)
  → Database: width=200 ✅ (correct dimension)
  → User B: width=200, scaleX=1 ✅ (no double-scale)
```

**Fixes**:
1. **Bake Scales into Dimensions**: `width = obj.width * obj.scaleX`, `height = obj.height * obj.scaleY`
2. **Bake Scale into Circle Radius**: `radius = circle.radius * circle.scaleX`
3. **Reset Scales on Deserialization**: `scaleX = 1, scaleY = 1` in `createFabricObject()`

**Impact**: All geometric transformations persist correctly across database round-trips and sync to all users.

**Documentation**: 6 comprehensive analysis documents in `claudedocs/W2.D12_*` covering root cause analysis, architecture diagrams, sync gap matrix, and implementation plans.

#### Issue 3: Sync Architecture Flaw - Self-Broadcasting Race Condition (✅ RESOLVED - W5.D5++++)

**Status**: ✅ COMPLETELY RESOLVED with architectural timestamp comparison fix. Previous time-based filtering failed - old broadcasts can arrive AFTER the 2-second window expires.

**Problem**: Dragging user experiences snap-back artifacts and choppy "frame-by-frame" animation when moving objects, even after previous fixes.

**Evidence**:
- User drags object → Object snaps back to original position → Animates choppily → Settles at final position
- Remote users see smooth real-time updates (no artifacts)
- Bug manifests for BOTH single objects and group objects

**Root Cause Analysis** (Sequential Thinking - 46 total thoughts across 4 sessions):

**FOUR ROOT CAUSES IDENTIFIED** (W5.D5++++):

**Root Cause #1: Delayed Self-Broadcasts Arriving After Drag Ends**:
   - User drags object for 1 second → 60 `updateObject()` calls (60fps throttled)
   - Each database write has 50-200ms async latency
   - User releases mouse → Drag state cleared IMMEDIATELY in `onObjectModified`
   - BUT: Database broadcasts from DURING drag still in flight for 200-400ms
   - These delayed broadcasts arrive AFTER drag state is cleared
   - State→Canvas sync fires for each delayed broadcast → Remove+Add → Snap-back!

**Root Cause #2: Floating-Point Precision Loss Causing False Change Detection**:
   - `toCanvasObject()` preserves full JavaScript precision: `x = 100.123456789012345`
   - PostgreSQL DOUBLE PRECISION stores 15 digits: `x = 100.123456789012`
   - `hasObjectChanged()` uses strict equality: `100.123456789012345 !== 100.123456789012`
   - ALWAYS returns TRUE for database roundtrips, even for self-broadcasts
   - Triggers remove+add cycle even when positions are visually identical

**Root Cause #3: Filter Required Selection State (Git Diff - W5.D5+++)** [FIXED, but incomplete]:
   - Broadcast filter checked: `if (isRecentlyModified && isSelected)`
   - Required BOTH timestamp AND selection state
   - User drags → Releases → Deselects (clicks elsewhere)
   - Delayed broadcasts arrive AFTER deselection
   - `isRecentlyModified` = TRUE, but `isSelected` = FALSE
   - Filter fails → Broadcasts applied → Snap-back and frame-by-frame glitching!
   - **Fix Attempt**: Remove `&& isSelected` - timestamp alone identifies self-broadcasts
   - **Still Failed**: Time-based window (< 2 seconds) allows old broadcasts through!

**Root Cause #4: Time-Based Filtering Allows Stale Broadcasts (W5.D5++++ - THE REAL FLAW)**:
   - **Previous Approach**: `if (Date.now() - lastModTime < 2000) return;`
   - **The Problem**: Timestamp keeps getting OVERWRITTEN during drag!
   - Timeline:
     - T=1000ms: Start drag → `lastLocalModification[id] = 1000`
     - T=1016ms: object:moving → `lastLocalModification[id] = 1016` (OVERWRITE!)
     - T=1032ms: object:moving → `lastLocalModification[id] = 1032` (OVERWRITE!)
     - T=2000ms: End drag → `lastLocalModification[id] = 2000` (final)
     - T=4500ms: OLD broadcast from T=1000ms arrives!
     - Check: `(4500 - 2000 < 2000)` = `(2500 < 2000)` = FALSE ✗
     - Filter FAILS → Old position applied → SNAP BACK!
   - **The Flaw**: Asking "Did I modify this recently?" instead of "Is this data stale?"
   - **The Fix**: Compare broadcast's `updated_at` timestamp with current state's `updated_at`
   - **Why It Works**: Database timestamps provide authoritative ordering - reject anything OLDER than current state

**Data Flow (Broken)**:
```
User A drags object
  ↓
Fabric.js moves object visually (instant, local)
  ↓
object:moving event fires (60fps throttled)
  ↓
onObjectMoving handler → updateObject(newPosition)
  ↓
Zustand state updated (optimistic update)
  ↓
Database write to Supabase
  ↓
Supabase realtime broadcast to ALL users
  ↓ [INCLUDING SENDER!]
User A receives OWN broadcast ❌
  ↓
_updateObject called (internal state mutation)
  ↓
Zustand state change detected
  ↓
State→Canvas sync subscription fires
  ↓
CanvasSyncManager: removeObject(id) ← DESTROYS DRAGGING OBJECT!
  ↓
CanvasSyncManager: addObject(updatedObj) ← RECREATES OBJECT!
  ↓
Fabric.js drag state LOST
  ↓
Object appears at wrong position (snap back)
```

**Complete Four-Part Fix** (W5.D5++++):

**Part 1: Drag State Protection** (✅ IMPLEMENTED - CanvasSyncManager.ts):
- **Purpose**: Prevent State→Canvas sync from destroying objects DURING drag
- **Implementation**: `activelyDraggingObjectIds` Set tracks objects being dragged
- **Logic**:
  - `onObjectMoving` adds ID to Set
  - `setupStateToCanvasSync` checks Set before remove+add
  - If ID in Set → Skip update (Fabric.js owns position during drag)
  - `onObjectModified` clears ID from Set when drag ends
- **Why Essential**: Protects from optimistic update triggering State→Canvas sync mid-drag
- **Files**: `src/lib/sync/CanvasSyncManager.ts:60, 217, 221, 357-360`

**Part 2: Precision-Aware Comparison** (✅ IMPLEMENTED - CanvasSyncManager.ts):
- **Purpose**: Eliminate false change detection from floating-point precision loss
- **Implementation**: Round geometric values to 2 decimals before comparison
- **Logic**: `round(current.x) !== round(prev.x)` instead of `current.x !== prev.x`
- **Why Essential**: PostgreSQL DOUBLE PRECISION != JavaScript number precision
- **Files**: `src/lib/sync/CanvasSyncManager.ts:450-457`

**Part 3: _isSyncingFromCanvas Flag** (✅ IMPLEMENTED - CanvasSyncManager.ts):
- **Purpose**: Prevent circular updates when optimistic updates trigger State→Canvas sync
- **Implementation**: Flag set during Canvas→Store operations (onObjectMoving, onObjectModified)
- **Logic**: State→Canvas subscription checks flag and SKIPs if TRUE
- **Why Essential**: Optimistic updates during drag would trigger State→Canvas sync without this
- **Files**: `src/lib/sync/CanvasSyncManager.ts:318-320`

**Part 4: Timestamp Comparison Stale Broadcast Filter** (✅ IMPLEMENTED - W5.D5++++ - canvasSlice.ts):
- **Purpose**: Reject OLD broadcasts that arrive late (> 2 seconds after drag)
- **Previous Broken Approach**: `if (Date.now() - lastModTime < 2000) return;` (time-based)
- **Problem**: `lastModTime` gets overwritten during drag, old broadcasts slip through after window expires
- **New Approach**: Compare broadcast's `updated_at` with current state's `updated_at`
- **Logic**:
  ```typescript
  const broadcastTime = new Date(broadcast.updated_at).getTime();
  const currentTime = new Date(currentObj.updated_at).getTime();
  if (broadcastTime <= currentTime) return; // Reject stale data
  ```
- **Why It Works**:
  - Database `updated_at` timestamps provide authoritative ordering
  - Broadcast older than current state → stale → reject
  - Broadcast newer than current state → valid update → apply
  - Works regardless of when broadcast arrives (200ms or 5 seconds later!)
  - No time windows, no client-side timestamp tracking needed
- **Files**: `src/stores/slices/canvasSlice.ts:1176-1196`

**Why All Four Are Required**:
1. **Part 1** protects during drag (Set prevents State→Canvas sync for dragging objects)
2. **Part 2** prevents false positives from precision loss (rounding eliminates phantom changes)
3. **Part 3** prevents circular updates (flag prevents optimistic update loop)
4. **Part 4** rejects stale broadcasts after drag (timestamp comparison filters old data)

Remove any one → Snap-back can return. All four together → Complete, elegant fix.

**Success Criteria**:
- ✅ No snap-back during drag (Phase 1 prevents self-broadcasts)
- ✅ No frame-by-frame animation after drag (Phase 1 filters delayed broadcasts)
- ✅ No precision-triggered updates (Phase 2 eliminates false positives)
- ✅ Smooth real-time collaboration for all users
- ✅ Optimistic updates work correctly (no re-renders from self-broadcasts)

**Testing Plan**:
1. **Single Object Drag**: User A drags rectangle - verify no snap-back, no frame-by-frame animation
2. **Rapid Repeated Drags**: User A drags quickly back/forth - verify no artifacts during or after
3. **Group Object Drag**: User A selects 3 objects, drags as group - verify all move smoothly together
4. **Concurrent Edits**: User A drags object X, User B drags object Y simultaneously - verify both smooth
5. **Remote Updates During Selection**: User A selects object X, User B moves it - verify User A sees update after 2s cooldown
6. **Precision Verification**: User A makes small 0.1px movements - verify no snap-back from precision differences

**Lessons Learned**:
1. **Fix at the Source**: Filter bad updates at source (realtime subscription), not destination (State→Canvas sync)
2. **Consider Async Timing**: Account for async delays (broadcasts arrive 200-400ms after drag ends)
3. **Precision Matters**: Round to reasonable precision before comparison/storage (strict equality on floats fails)
4. **Test with Realistic Latency**: Test with simulated network latency (100-200ms), not just localhost
5. **Optimistic Updates Must Match**: Optimistic update precision must match database value precision

**Documentation**:
- **Final Fix**: [W5.D5++++_TIMESTAMP_COMPARISON_FIX.md](../claudedocs/W5.D5++++_TIMESTAMP_COMPARISON_FIX.md) - Architectural timestamp comparison solution (THE FIX)
- **Selection Bug**: [W5.D5++_FINAL_SNAP_BACK_FIX.md](../claudedocs/W5.D5++_FINAL_SNAP_BACK_FIX.md) - Selection state requirement bug (incomplete fix)
- **Initial Analysis**: [W5.D5+_SNAP_BACK_ROOT_CAUSE_ANALYSIS.md](../claudedocs/W5.D5+_SNAP_BACK_ROOT_CAUSE_ANALYSIS.md) - TWO root causes, 4-phase solution
- **Legacy Analysis**: [W5.D5+_SYNC_ARCHITECTURE_FLAW.md](../claudedocs/W5.D5+_SYNC_ARCHITECTURE_FLAW.md) - Original Phase 1 & 2 analysis

---

## Technical Stack

### Core Technologies
| Technology | Version | Purpose |
|------------|---------|---------|
| **Vite** | ^7.1.7 | Build tool and dev server |
| **React** | ^19.1.1 | UI framework |
| **TypeScript** | ~5.9.3 | Type safety |
| **Fabric.js** | ^6.x | Canvas rendering (NEW) |
| **Zustand** | ^5.0.x | State management (NEW) |
| **Supabase** | ^2.75.0 | Real-time database |

### Supporting Libraries
| Library | Purpose |
|---------|---------|
| `nanoid` | Unique ID generation |
| `use-debounce` | React debounce hooks |
| `@dnd-kit/core` | Drag-and-drop for layers panel |
| `react-colorful` | Color picker component |
| `hotkeys-js` | Keyboard shortcuts |
| `lodash` | Utilities (throttle/debounce) |
| `immer` | Immutable state updates with Zustand |

### Removed Dependencies
- ❌ `konva` - Replaced by Fabric.js
- ❌ `react-konva` - No longer needed (Fabric.js is imperative)
- ❌ `react-konva-utils` - No longer needed

---

## Feature Requirements

### Implementation Pattern: 8 Core Engines (DRY Principle)

Instead of implementing 57 features separately, we build **8 reusable engines**:

1. **Command Engine** - All operations as executable commands
2. **Selection Engine** - Single, multi, lasso, type-based selection
3. **Transform Engine** - Move, resize, rotate, scale, flip
4. **Layout Engine** - Align, distribute, arrange, grid, auto-layout
5. **Style Engine** - Fill, stroke, opacity, shadow, gradient, blend modes
6. **Hierarchy Engine** - Group, ungroup, layers, z-index, frames
7. **History Engine** - Undo, redo, version history
8. **Export Engine** - PNG, SVG, JSON serialization

---

### Feature Breakdown by Category

#### Category 1: Core Infrastructure (7 features)
| # | Feature | Engine | Priority | AI Ready |
|---|---------|--------|----------|----------|
| 1 | Multi-select (shift-click, drag) | Selection | P0 | ✅ |
| 2 | Undo/Redo (Cmd+Z/Cmd+Shift+Z) | History | P0 | ✅ |
| 3 | Keyboard shortcuts framework | Command | P0 | ✅ |
| 4 | Layer management | Hierarchy | P0 | ✅ |
| 5 | Transform operations | Transform | P0 | ✅ |
| 6 | Duplicate/Delete | Command | P0 | ✅ |
| 7 | Selection tools (lasso, select by type) | Selection | P0 | ✅ |

#### Category 2: Styling & Formatting (8 features)
| # | Feature | Engine | Priority | AI Ready |
|---|---------|--------|----------|----------|
| 8 | Color picker with palettes | Style | P0 | ✅ |
| 9 | Text formatting (bold, italic, size) | Style | P0 | ✅ |
| 10 | Opacity controls | Style | P1 | ✅ |
| 11 | Stroke properties | Style | P1 | ✅ |
| 12 | Gradient support (linear, radial) | Style | P1 | ✅ |
| 13 | Shadow effects | Style | P1 | ✅ |
| 14 | Blend modes | Style | P2 | ✅ |
| 15 | Styles/design tokens system | Style | P1 | ✅ |

#### Category 3: Layout & Organization (10 features)
| # | Feature | Engine | Priority | AI Ready |
|---|---------|--------|----------|----------|
| 16 | Alignment tools (left, center, right) | Layout | P0 | ✅ |
| 17 | Distribution (evenly space) | Layout | P0 | ✅ |
| 18 | Object grouping/ungrouping | Hierarchy | P0 | ✅ |
| 19 | Z-index management (front/back) | Hierarchy | P0 | ✅ |
| 20 | Snap-to-grid | Layout | P1 | ✅ |
| 21 | Smart guides (alignment helpers) | Layout | P1 | ✅ |
| 22 | Auto-layout (flexbox-like) | Layout | P2 | ✅ |
| 23 | Canvas frames/artboards | Hierarchy | P1 | ✅ |
| 24 | Layers panel with drag-to-reorder | Hierarchy | P0 | ✅ |
| 25 | Grid creation | Layout | P1 | ✅ |

#### Category 4: Operations (6 features)
| # | Feature | Engine | Priority | AI Ready |
|---|---------|--------|----------|----------|
| 26 | Copy/paste functionality | Command | P0 | ✅ |
| 27 | Export PNG | Export | P1 | ✅ |
| 28 | Export SVG | Export | P1 | ✅ |
| 29 | JSON serialization | Export | P1 | ✅ |
| 30 | Import SVG | Command | P2 | ✅ |
| 31 | Duplicate with offset | Command | P0 | ✅ |

#### Category 5: Advanced Canvas (8 features)
| # | Feature | Engine | Priority | AI Ready |
|---|---------|--------|----------|----------|
| 32 | Component system (symbols) | Hierarchy | P2 | ✅ |
| 33 | Vector path editing (pen tool) | Command | P2 | ✅ |
| 34 | Bezier curve editing | Transform | P2 | ✅ |
| 35 | Text on path | Style | P2 | ✅ |
| 36 | Image upload and placement | Command | P1 | ✅ |
| 37 | Mask/clip operations | Style | P2 | ✅ |
| 38 | Boolean operations (union, subtract) | Command | P2 | ✅ |
| 39 | Path simplification | Transform | P2 | ✅ |

#### Category 6: Collaboration (6 features)
| # | Feature | Engine | Priority | AI Ready |
|---|---------|--------|----------|----------|
| 40 | Collaborative comments | Command | P2 | ✅ |
| 41 | Annotations on objects | Command | P2 | ✅ |
| 42 | Version history | History | P2 | ✅ |
| 43 | Restore from version | History | P2 | ✅ |
| 44 | Real-time presence indicators | Collab | P0 | ✅ |
| 45 | Lock/unlock objects | Command | P0 | ✅ |

#### Category 7: User Experience (6 features)
| # | Feature | Engine | Priority | AI Ready |
|---|---------|--------|----------|----------|
| 46 | Properties panel (contextual) | UI | P0 | ✅ |
| 47 | Toolbar with tool selection | UI | P0 | ✅ |
| 48 | Keyboard shortcut hints | UI | P1 | ✅ |
| 49 | Right-click context menus | UI | P1 | ✅ |
| 50 | Rulers and guides | UI | P1 | ✅ |
| 51 | Zoom controls (fit, 100%, 200%) | Canvas | P0 | ✅ |

#### Category 8: Performance & Quality (6 features)
| # | Feature | Engine | Priority | AI Ready |
|---|---------|--------|----------|----------|
| 52 | Virtual scrolling for layers | Performance | P1 | N/A |
| 53 | Debounced database writes | Sync | P0 | N/A |
| 54 | Optimistic UI updates | Sync | P0 | N/A |
| 55 | Conflict resolution (LWW) | Sync | P0 | N/A |
| 56 | Connection status indicator | UI | P0 | N/A |
| 57 | Error boundary with recovery | Infrastructure | P0 | N/A |

**Priority Levels**:
- **P0**: Must-have (core functionality)
- **P1**: Should-have (important for UX)
- **P2**: Nice-to-have (advanced features)

---

## Implementation Strategy

### DRY Principles in Action

#### Example 1: Command Pattern (Universal Operations)

All operations inherit from base `Command` interface:

```typescript
// src/commands/base/Command.ts
export interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
  redo(): Promise<void>;
  canExecute(): boolean;
  description: string;
}

// src/commands/object/CreateObjectCommand.ts
export class CreateObjectCommand implements Command {
  constructor(private params: CreateObjectParams) {}

  async execute() {
    const id = await canvasStore.createObject(this.params);
    this.createdId = id;
  }

  async undo() {
    await canvasStore.deleteObject(this.createdId);
  }

  async redo() {
    await this.execute();
  }
}

// src/commands/layout/AlignCommand.ts
export class AlignCommand implements Command {
  constructor(
    private objectIds: string[],
    private alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  ) {}

  async execute() {
    const objects = canvasStore.getObjects(this.objectIds);
    const aligned = layoutEngine.align(objects, this.alignment);
    await canvasStore.updateObjects(aligned);
  }

  async undo() {
    await canvasStore.updateObjects(this.previousPositions);
  }
}
```

**Benefits**:
- ✅ Undo/redo works for ALL operations
- ✅ AI can execute any command with natural language
- ✅ Keyboard shortcuts map to commands
- ✅ Macro recording/playback support
- ✅ Single point of validation and error handling

#### Example 2: Selection Engine (Universal Selection Logic)

```typescript
// src/features/selection/SelectionManager.ts
export class SelectionManager {
  // Single select
  select(objectId: string) {
    selectionStore.setSelected([objectId]);
  }

  // Multi-select (shift-click)
  toggleSelect(objectId: string) {
    const current = selectionStore.getSelected();
    const next = current.has(objectId)
      ? current.filter(id => id !== objectId)
      : [...current, objectId];
    selectionStore.setSelected(next);
  }

  // Lasso select (drag area)
  selectInBounds(bounds: Rectangle) {
    const objects = canvasStore.queryObjects({ bounds });
    selectionStore.setSelected(objects.map(o => o.id));
  }

  // Select by type
  selectByType(type: ShapeType) {
    const objects = canvasStore.queryObjects({ type });
    selectionStore.setSelected(objects.map(o => o.id));
  }

  // Select all
  selectAll() {
    const objects = canvasStore.getAllObjects();
    selectionStore.setSelected(objects.map(o => o.id));
  }
}
```

**Benefits**:
- ✅ All selection methods use same store
- ✅ Consistent behavior across tools
- ✅ Easy to add new selection methods
- ✅ Single source of truth for selected state

#### Example 3: Layout Engine (Universal Layout Algorithms)

```typescript
// src/features/layout/LayoutEngine.ts
export class LayoutEngine {
  align(objects: CanvasObject[], alignment: AlignmentType): CanvasObject[] {
    const bounds = this.calculateBounds(objects);

    return objects.map(obj => {
      switch (alignment) {
        case 'left':
          return { ...obj, x: bounds.left };
        case 'center':
          return { ...obj, x: bounds.left + (bounds.width - obj.width) / 2 };
        case 'right':
          return { ...obj, x: bounds.right - obj.width };
        case 'top':
          return { ...obj, y: bounds.top };
        case 'middle':
          return { ...obj, y: bounds.top + (bounds.height - obj.height) / 2 };
        case 'bottom':
          return { ...obj, y: bounds.bottom - obj.height };
      }
    });
  }

  distribute(objects: CanvasObject[], direction: 'horizontal' | 'vertical'): CanvasObject[] {
    const sorted = this.sortObjects(objects, direction);
    const bounds = this.calculateBounds(sorted);
    const totalSize = this.calculateTotalSize(sorted, direction);
    const spacing = (bounds.size - totalSize) / (sorted.length - 1);

    // Distribute evenly with calculated spacing
    return this.applySpacing(sorted, spacing, direction);
  }

  grid(count: number, rows: number, cols: number, spacing: number): CanvasObject[] {
    const objects: CanvasObject[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        objects.push({
          type: 'rectangle',
          x: col * spacing,
          y: row * spacing,
          width: 100,
          height: 100,
          // ... other properties
        });
      }
    }

    return objects;
  }
}
```

**Benefits**:
- ✅ All layout operations use same algorithms
- ✅ Easy to add new layout types
- ✅ Consistent behavior across features
- ✅ AI can invoke any layout with parameters

---

## Migration Plan: Konva → Fabric.js

### Migration Strategy: Big Bang Replacement

**Rationale**:
- Clean slate architecture without technical debt
- Optimal for AI integration (Phase III)
- No complexity of maintaining two systems
- Better long-term maintainability

### Migration Steps

#### Step 1: Setup Fabric.js Infrastructure (Week 1)

**Dependencies**:
```json
{
  "dependencies": {
    "fabric": "^6.0.0"
  },
  "devDependencies": {
    "@types/fabric": "^6.0.0"
  }
}
```

**Remove**:
```json
{
  "dependencies": {
    "konva": "^10.0.2",
    "react-konva": "^19.0.10",
    "react-konva-utils": "^2.0.0"
  }
}
```

**Core Files**:
```typescript
// src/lib/fabric/FabricCanvasManager.ts
export class FabricCanvasManager {
  private canvas: fabric.Canvas;

  constructor(element: HTMLCanvasElement) {
    this.canvas = new fabric.Canvas(element, {
      width: 5000,
      height: 5000,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      renderOnAddRemove: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Mouse events → Commands
    this.canvas.on('selection:created', this.handleSelection);
    this.canvas.on('object:modified', this.handleModified);
    this.canvas.on('mouse:down', this.handleMouseDown);
    // ... other events
  }
}

// src/lib/fabric/ObjectFactory.ts
export class ObjectFactory {
  static fromCanvasObject(obj: CanvasObject): fabric.Object {
    switch (obj.type) {
      case 'rectangle':
        return new fabric.Rect({
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          fill: obj.fill,
          angle: obj.rotation,
          opacity: obj.opacity,
          stroke: obj.stroke,
          strokeWidth: obj.stroke_width,
        });

      case 'circle':
        return new fabric.Circle({
          left: obj.x,
          top: obj.y,
          radius: obj.type_properties.radius,
          fill: obj.fill,
          angle: obj.rotation,
          opacity: obj.opacity,
        });

      case 'text':
        return new fabric.IText(obj.type_properties.text_content, {
          left: obj.x,
          top: obj.y,
          fontSize: obj.type_properties.font_size,
          fontFamily: obj.type_properties.font_family,
          fill: obj.fill,
        });
    }
  }

  static toCanvasObject(fabricObj: fabric.Object, existing?: CanvasObject): Partial<CanvasObject> {
    return {
      id: existing?.id,
      type: this.getFabricType(fabricObj),
      x: fabricObj.left,
      y: fabricObj.top,
      width: fabricObj.width * fabricObj.scaleX,
      height: fabricObj.height * fabricObj.scaleY,
      rotation: fabricObj.angle,
      fill: fabricObj.fill as string,
      stroke: fabricObj.stroke as string,
      stroke_width: fabricObj.strokeWidth,
      opacity: fabricObj.opacity,
    };
  }
}
```

#### Step 2: Canvas Component Replacement (Week 1)

**Old (Konva)**:
```tsx
// src/components/canvas/CanvasStage.tsx
<Stage ref={stageRef} width={...} height={...}>
  <Layer>
    {shapes.map(shape => <Rectangle shape={shape} />)}
    <Transformer ref={transformerRef} />
  </Layer>
</Stage>
```

**New (Fabric.js)**:
```tsx
// src/components/canvas/Canvas.tsx
export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<FabricCanvasManager | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Fabric.js canvas
    managerRef.current = new FabricCanvasManager(canvasRef.current);

    return () => {
      managerRef.current?.dispose();
    };
  }, []);

  // Sync Zustand → Fabric.js
  useCanvasSync(managerRef);

  return (
    <div className="canvas-container">
      <canvas ref={canvasRef} />
    </div>
  );
}
```

#### Step 3: Event Handling Migration (Week 1-2)

**Konva Events → Fabric.js Events Mapping**:

| Konva Event | Fabric.js Event | Handler |
|-------------|-----------------|---------|
| `onClick` | `mouse:down` | Selection |
| `onDragEnd` | `object:modified` | Position update |
| `onTransformEnd` | `object:modified` | Size/rotation update |
| `onWheel` | `mouse:wheel` | Zoom |
| `onDragStart` | `object:moving` | Lock acquisition |

**Event Handler Example**:
```typescript
// src/lib/fabric/EventHandler.ts
export class EventHandler {
  constructor(
    private canvas: fabric.Canvas,
    private commandManager: CommandManager
  ) {
    this.setupHandlers();
  }

  private setupHandlers() {
    // Selection
    this.canvas.on('selection:created', (e) => {
      const ids = e.selected.map(obj => obj.data.id);
      selectionStore.setSelected(ids);
    });

    // Object modified → Create UpdateCommand
    this.canvas.on('object:modified', async (e) => {
      const obj = e.target;
      const canvasObj = ObjectFactory.toCanvasObject(obj, obj.data);

      const command = new UpdateObjectCommand(obj.data.id, canvasObj);
      await this.commandManager.execute(command);
    });

    // Mouse wheel → Zoom
    this.canvas.on('mouse:wheel', (e) => {
      const delta = e.e.deltaY;
      const zoom = this.canvas.getZoom();
      const newZoom = clampZoom(zoom * (1 - delta * 0.001));

      this.canvas.zoomToPoint(
        new fabric.Point(e.e.offsetX, e.e.offsetY),
        newZoom
      );
    });
  }
}
```

#### Step 4: Shape Component Removal (Week 2)

**Remove these files**:
- `src/components/canvas/shapes/Rectangle.tsx`
- `src/components/canvas/shapes/Circle.tsx`
- `src/components/canvas/shapes/Text.tsx`
- `src/components/canvas/shapes/BaseShape.tsx`

**Replace with**: Object factory pattern (already created in Step 1)

#### Step 5: Transformer Logic Migration (Week 2)

**Konva Transformer**:
```tsx
<Transformer ref={transformerRef} />
```

**Fabric.js Selection**:
```typescript
// Built-in to Fabric.js
canvas.setActiveObject(fabricObject);
fabricObject.set({
  hasControls: true,
  hasBorders: true,
  cornerSize: 10,
  transparentCorners: false,
});
```

#### Step 6: Testing & Validation (Week 2)

**Migration Checklist**:
- [ ] All shapes render correctly
- [ ] Selection works (single, multi, lasso)
- [ ] Transform operations (move, resize, rotate)
- [ ] Zoom and pan
- [ ] Real-time sync still working
- [ ] Optimistic updates working
- [ ] Performance benchmarks met
- [ ] No Konva dependencies remaining

---

## Infinite Canvas Architecture

### Overview

Paperbox implements a Figma-like infinite canvas with pan/zoom/transform capabilities, enabling users to navigate and manipulate objects across a virtually unlimited workspace. This architecture decision is based on comprehensive research of official Fabric.js documentation, industry-leading design tools (Figma, Miro, Excalidraw), and performance benchmarks.

### Viewport State Management

**Research Finding**: Fabric.js canvas should be the primary source of truth for viewport state, with Zustand used only for persistence snapshots.

**Pattern**: Hybrid approach following "uncontrolled component" pattern - let Fabric.js manage performance-critical state, sync snapshots to Zustand on commit (NOT every frame).

```typescript
// Primary: Fabric.js canvas
const canvasRef = useRef<fabric.Canvas | null>(null);

// Secondary: Zustand (persistence only)
const useCanvasStore = create<CanvasStore>((set, get) => ({
  viewport: { zoom: 1, panX: 0, panY: 0 },

  // Sync on commit only (NOT continuous)
  syncViewport: () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    set({
      viewport: {
        zoom: canvas.getZoom(),
        panX: canvas.viewportTransform[4],
        panY: canvas.viewportTransform[5],
      }
    });
  },

  restoreViewport: () => {
    const canvas = canvasRef.current;
    const { viewport } = get();
    if (!canvas) return;

    canvas.setZoom(viewport.zoom);
    canvas.absolutePan({ x: viewport.panX, y: viewport.panY });
  },
}));

// Event-driven synchronization (mouseup, NOT mousemove)
canvas.on('mouse:up', () => {
  useCanvasStore.getState().syncViewport();
});
```

**Rationale**:
- Continuous synchronization (every frame) kills performance
- Fabric.js optimized for viewport transforms
- Zustand snapshots enable cross-session persistence
- Event-driven sync reduces overhead by 90%+

### Transform Matrix Handling

Fabric.js v6 uses a 6-element transform matrix: `[scaleX, skewY, skewX, scaleY, translateX, translateY]`

**Critical Pattern (Fabric.js v6)**: ALWAYS call `requestRenderAll()` after modifying pan elements (indices 4, 5).

```javascript
// ❌ WRONG - Direct modification without re-render
canvas.viewportTransform[4] += deltaX;

// ✅ CORRECT - Re-render after modification (Fabric.js v6 pattern)
canvas.viewportTransform[4] += deltaX;
canvas.viewportTransform[5] += deltaY;
canvas.requestRenderAll(); // Triggers canvas recalculation
```

**Important**: For zoom (indices 0, 3), use `setZoom()` method instead of direct modification. Direct modification of scale indices does NOT update internal zoom state.

**Official Zoom Implementation** (from Fabric.js docs):
```javascript
canvas.on('mouse:wheel', function(opt) {
  var delta = opt.e.deltaY;
  var zoom = canvas.getZoom();
  zoom *= 0.999 ** delta;
  if (zoom > 20) zoom = 20;
  if (zoom < 0.01) zoom = 0.01;
  canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
  opt.e.preventDefault();
  opt.e.stopPropagation();
});
```

### Viewport Persistence

**Research Finding**: Industry standard is **per-user viewport** with optional follow mode for presentations.

**Pattern Analysis**:
- **Figma**: Per-user default + "Spotlight" opt-in sync for presentations
- **Miro**: Per-user navigation for collaboration
- **Excalidraw**: Per-user viewport with follow mode

**User Expectations by Context**:
- Solo editing: Per-user (zoom in on different areas independently)
- Collaboration: Per-user (work on separate sections simultaneously)
- Presentation: Follow mode (everyone watches presenter's viewport)

**Storage Strategy**: Hybrid localStorage + PostgreSQL JSONB

```javascript
// localStorage for instant access (no latency)
const viewportKey = `canvas_${canvasId}_viewport`;
localStorage.setItem(viewportKey, JSON.stringify({
    x: viewport.x,
    y: viewport.y,
    zoom: viewport.zoom,
    timestamp: Date.now()
}));

// PostgreSQL JSONB for cross-device sync (debounced)
UPDATE user_preferences
SET canvas_preferences = jsonb_set(
    canvas_preferences,
    ARRAY['canvas', canvas_id::text, 'viewport'],
    jsonb_build_object('x', x, 'y', y, 'zoom', zoom)
)
WHERE user_id = current_user_id;
```

**Database Schema**:
```sql
CREATE TABLE user_canvas_viewports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    canvas_id INTEGER REFERENCES canvases(id),
    viewport_x FLOAT NOT NULL,
    viewport_y FLOAT NOT NULL,
    zoom_level FLOAT NOT NULL DEFAULT 1.0,
    last_accessed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, canvas_id)
);
```

### Performance Optimization

**Research Finding**: Fabric.js has built-in `skipOffscreen: true` (default enabled) for viewport culling.

**Target**: 500 objects rendering at <40ms (60 FPS = 16ms ideal, 40ms acceptable)

**Performance Configuration**:
```javascript
const canvas = new fabric.Canvas('canvas', {
  renderOnAddRemove: false,  // Disable auto-render on add/remove
  skipOffscreen: true,        // Enable culling (default, but explicit)
  selection: true,            // Enable selection (default)
});

// Bulk add pattern (single render after all adds)
objects.forEach(obj => canvas.add(obj));
canvas.renderAll(); // Single render after all adds
```

**RequestAnimationFrame Loop Pattern**:
```javascript
let animationState = { needsRender: false };

canvas.on('mouse:move', function(e) {
  // Track state only, don't render immediately!
  animationState.needsRender = true;
});

function renderLoop() {
  if (animationState.needsRender) {
    canvas.renderAll();
    animationState.needsRender = false;
  }
  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);
```

**Performance Benchmarks** (from research):
- 500 objects: 20-40ms render time ✅
- 6,400 objects: 25ms with optimization ✅
- Target: <16ms for 60 FPS (achievable with skipOffscreen)

**Manual Culling** (only if built-in insufficient):
```javascript
function updateObjectVisibility(canvas) {
  canvas.getObjects().forEach(obj => {
    const wasVisible = obj.visible;
    obj.visible = isObjectInViewport(obj, canvas);

    // CRITICAL: Must call setCoords() when changing position
    if (wasVisible !== obj.visible) {
      obj.setCoords();
    }
  });

  canvas.renderAll();
}
```

### Canvas Interaction Patterns (Figma-Style)

**Implementation Status**: ✅ **COMPLETE** (W2.D12)

Paperbox implements industry-standard Figma-style canvas interactions for intuitive navigation and object manipulation.

#### Interaction Modes

| Interaction | Trigger | Behavior | Status |
|-------------|---------|----------|--------|
| **Scroll to pan** | Mouse wheel | Pan canvas up/down (default) | ✅ |
| **Horizontal scroll** | Trackpad horizontal | Pan canvas left/right | ✅ |
| **Shift + Scroll** | Shift + Mouse wheel | Pan canvas horizontally | ✅ |
| **Cmd/Ctrl + Scroll** | Modifier + Wheel | Zoom centered on cursor | ✅ |
| **Spacebar + Drag** | Hold space + Drag | Free panning with grab cursor | ✅ |
| **Click-to-place** | Tool + Click | Place object at cursor position | ✅ |

#### Technical Implementation

**Scroll Event Handler**:
```typescript
setupScrollPanAndZoom(): void {
  this.canvas.on('mouse:wheel', (opt: any) => {
    const event = opt.e as WheelEvent;
    event.preventDefault();

    // Detect zoom modifier (Cmd on Mac, Ctrl on Windows/Linux)
    const isZoomModifier = event.metaKey || event.ctrlKey;

    if (isZoomModifier) {
      this.handleScrollZoom(event, event.deltaY);
    } else {
      this.handleScrollPan(event, event.deltaY);
    }
  });
}
```

**Scroll Pan (with horizontal scroll support)**:
```typescript
private handleScrollPan(event: WheelEvent, delta: number) {
  // Support both vertical and horizontal scroll
  const deltaX = event.deltaX;
  const deltaY = event.deltaY;

  let panX = deltaX; // Trackpad horizontal scroll
  let panY = deltaY; // Trackpad vertical scroll

  // Shift modifier: Convert vertical scroll to horizontal pan
  if (event.shiftKey) {
    panX = deltaY;
    panY = 0;
  }

  // Apply pan with boundary enforcement (±50,000 pixels)
  const vpt = this.canvas.viewportTransform;
  vpt[4] -= panX;
  vpt[5] -= panY;
  this.canvas.requestRenderAll();

  // Sync to Zustand (throttled via RAF)
  this.requestViewportSync();
}
```

**Scroll Zoom (centered on cursor)**:
```typescript
private handleScrollZoom(event: WheelEvent, delta: number) {
  const zoom = this.canvas.getZoom();
  const zoomFactor = delta > 0 ? 0.9 : 1.1;
  let newZoom = zoom * zoomFactor;

  // Clamp zoom range (0.1x to 10x)
  newZoom = Math.max(0.1, Math.min(10, newZoom));

  // Get cursor position for zoom center (viewport coordinates)
  const pointer = this.canvas.getPointer(event, true);

  // Zoom centered on cursor position (Figma behavior)
  this.canvas.zoomToPoint(
    new Point(pointer.x, pointer.y),
    newZoom
  );

  this.canvas.requestRenderAll();
  this.requestViewportSync();
}
```

**Click-to-Place (viewport coordinates)**:
```typescript
// CRITICAL FIX: Use viewport coordinates (true flag)
// Previously used fabric space (false) causing offset from cursor
const pointer = this.canvas.getPointer(event, true);

// Create object at viewport position (where user clicked)
const rect = new Rect({
  left: pointer.x,
  top: pointer.y,
  width: 100,
  height: 100,
  fill: 'blue'
});

this.canvas.add(rect);
this.canvas.requestRenderAll();
```

#### Coordinate Spaces

**Viewport Space vs Fabric Space**:
```typescript
// Viewport space (screen-relative, what user sees)
const viewportPointer = canvas.getPointer(event, true);
// Use for: Click-to-place, UI overlays, cursor positioning

// Fabric space (accounts for pan/zoom transform)
const fabricPointer = canvas.getPointer(event, false);
// Use for: Object manipulation, selection bounds, snapping
```

**Viewport Transform Matrix**:
```typescript
// viewportTransform = [scaleX, skewY, skewX, scaleY, translateX, translateY]
//                      zoom             zoom      panX      panY
//                     [0]   [1]   [2]   [3]      [4]       [5]

const vpt = canvas.viewportTransform;
const zoom = canvas.getZoom();      // From indices [0] and [3]
const panX = vpt[4];                // Horizontal pan
const panY = vpt[5];                // Vertical pan
```

#### Visual Feedback

**Navigation Indicator Component**:
- **Location**: Bottom-right corner overlay
- **Content**: Real-time zoom % and pan X/Y coordinates
- **Updates**: Synced from Zustand viewport state
- **Purpose**: Visual feedback for canvas position without scrollbars

```tsx
export function CanvasNavigationIndicator() {
  const zoom = usePaperboxStore((state) => state.viewport.zoom);
  const panX = usePaperboxStore((state) => state.viewport.panX);
  const panY = usePaperboxStore((state) => state.viewport.panY);

  const zoomPercent = Math.round(zoom * 100);
  const displayPanX = Math.round(panX);
  const displayPanY = Math.round(panY);

  return (
    <div className="absolute bottom-4 right-4 bg-white border rounded-lg shadow-md px-4 py-2">
      <div>Zoom: {zoomPercent}%</div>
      <div>Pan: X: {displayPanX}, Y: {displayPanY}</div>
    </div>
  );
}
```

#### Boundary Enforcement

**Canvas Limits**:
- **Pan boundaries**: ±50,000 pixels from origin
- **Zoom range**: 0.1x to 10x (10% to 1000%)
- **Enforcement**: Clamped during pan/zoom operations

```typescript
// Pan boundary enforcement
const MAX_PAN = 50000;
const newPanX = Math.max(-MAX_PAN, Math.min(MAX_PAN, vpt[4] - deltaX));
const newPanY = Math.max(-MAX_PAN, Math.min(MAX_PAN, vpt[5] - deltaY));

// Zoom boundary enforcement
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));
```

#### Event Handler Consolidation

**Pattern**: Single `mouse:wheel` handler to prevent conflicts

**Previous Issue**: Duplicate handlers caused zoom-without-modifier bug
- OLD: `setupMousewheelZoom()` always zoomed (no modifier check)
- NEW: `setupScrollPanAndZoom()` checks modifier correctly

**Fix**: Removed duplicate handler registration, single source of truth in `useCanvasSync` hook initialization.

#### Integration with Existing Features

**Pixel Grid**: Automatically updates visibility based on zoom level
**Viewport Sync**: Throttled via RAF (60fps) to Zustand store
**Placement Mode**: Scroll interactions work during object placement
**Selection**: Pan/zoom don't affect object selection behavior

#### User Experience Benefits

1. **Intuitive Navigation**: Matches Figma/Miro interaction patterns
2. **Efficient Workflow**: Multiple input methods for different contexts (scroll, spacebar, shortcuts)
3. **Visual Feedback**: Real-time indicator shows canvas state during navigation
4. **Precise Control**: Zoom centered on cursor, not canvas center
5. **Flexible Input**: Supports trackpad, mouse wheel, keyboard modifiers

---

### Industry Patterns

**Figma Approach**:
- Per-user viewport (each user has independent camera)
- "Spotlight" feature: Opt-in viewport synchronization for presentations
- Visual feedback when following (colored border around viewport)

**Miro Pattern**:
- Per-user navigation during collaborative editing
- Follow mode for guided tours and presentations
- Minimap for spatial awareness

**Excalidraw Strategy**:
- Per-user viewport by default
- Optional follow mode for real-time collaboration
- Zoom-to-fit-all feature for overview

### Pan Controls

**Spacebar + Drag** (standard pattern):
```javascript
let isPanning = false;
let panStart = { x: 0, y: 0 };

canvas.on('mouse:down', function(e) {
  if (e.e.spaceKey) {
    isPanning = true;
    panStart = { x: e.e.clientX, y: e.e.clientY };
  }
});

canvas.on('mouse:move', function(e) {
  if (isPanning) {
    const deltaX = e.e.clientX - panStart.x;
    const deltaY = e.e.clientY - panStart.y;

    canvas.relativePan({ x: deltaX, y: deltaY });
    panStart = { x: e.e.clientX, y: e.e.clientY };
  }
});

canvas.on('mouse:up', function() {
  if (isPanning) {
    isPanning = false;
    // Sync viewport to Zustand on pan complete
    useCanvasStore.getState().syncViewport();
  }
});
```

### Navigation Shortcuts

**Standard keyboard shortcuts** (Figma-compatible):
```javascript
// Cmd+0: Fit to screen
shortcuts.register('cmd+0', () => {
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  useCanvasStore.getState().syncViewport();
});

// Cmd+1: Zoom to 100%
shortcuts.register('cmd+1', () => {
  canvas.setZoom(1);
  useCanvasStore.getState().syncViewport();
});

// Cmd+2: Zoom to 200%
shortcuts.register('cmd+2', () => {
  canvas.setZoom(2);
  useCanvasStore.getState().syncViewport();
});

// Cmd+9: Zoom to selection
shortcuts.register('cmd+9', () => {
  const activeObjects = canvas.getActiveObjects();
  if (activeObjects.length > 0) {
    canvas.zoomToObjects(activeObjects);
    useCanvasStore.getState().syncViewport();
  }
});
```

### Research Sources

- **Fabric.js Official Documentation**: viewport management, transform matrix patterns
- **Figma UX Patterns**: per-user viewport, Spotlight mode, collaboration patterns
- **Miro Collaboration**: multi-user navigation, minimap implementation
- **Excalidraw**: per-user viewport persistence, follow mode
- **Performance Benchmarks**: 500+ object rendering studies, skipOffscreen effectiveness
- **Real-world Implementations**: GitHub repositories of Figma clones, canvas performance optimizations

---

## State Management Architecture

### Zustand Store Design (6 Slices)

#### 1. Canvas Store
```typescript
// src/stores/canvasStore.ts
interface CanvasState {
  // Fabric.js instance
  fabricCanvas: fabric.Canvas | null;

  // Objects (synced with Supabase)
  objects: Map<string, CanvasObject>;

  // Viewport
  viewport: {
    zoom: number;
    pan: { x: number; y: number };
  };

  // Actions
  setFabricCanvas: (canvas: fabric.Canvas) => void;
  createObject: (object: Partial<CanvasObject>) => Promise<string>;
  updateObject: (id: string, updates: Partial<CanvasObject>) => Promise<void>;
  deleteObjects: (ids: string[]) => Promise<void>;
  setViewport: (viewport: Partial<Viewport>) => void;

  // Queries
  getObject: (id: string) => CanvasObject | undefined;
  getObjects: (ids: string[]) => CanvasObject[];
  queryObjects: (filter: ObjectFilter) => CanvasObject[];
}

export const useCanvasStore = create<CanvasState>()(
  immer((set, get) => ({
    fabricCanvas: null,
    objects: new Map(),
    viewport: { zoom: 1, pan: { x: 0, y: 0 } },

    setFabricCanvas: (canvas) => set({ fabricCanvas: canvas }),

    createObject: async (object) => {
      const id = nanoid();
      const fullObject = { ...defaultObject, ...object, id };

      // Optimistic update
      set((state) => {
        state.objects.set(id, fullObject);
      });

      // Database write
      await supabase.from('canvas_objects').insert(fullObject);

      return id;
    },

    updateObject: async (id, updates) => {
      const current = get().objects.get(id);
      if (!current) return;

      // Optimistic update
      set((state) => {
        const obj = state.objects.get(id);
        if (obj) {
          state.objects.set(id, { ...obj, ...updates });
        }
      });

      // Database write
      await supabase
        .from('canvas_objects')
        .update(updates)
        .eq('id', id);
    },

    // ... other actions
  }))
);
```

#### 2. Selection Store
```typescript
// src/stores/selectionStore.ts
interface SelectionState {
  selectedIds: Set<string>;
  selectionMode: 'single' | 'multi' | 'lasso';
  lassoPath: Point[];

  // Actions
  select: (ids: string[]) => void;
  deselect: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelection: (id: string) => void;

  // Lasso
  startLasso: () => void;
  addLassoPoint: (point: Point) => void;
  completeLasso: () => void;

  // Queries
  isSelected: (id: string) => boolean;
  getSelectedCount: () => number;
  getSelectedObjects: () => CanvasObject[];
}
```

#### 3. History Store
```typescript
// src/stores/historyStore.ts
interface HistoryState {
  past: Command[];
  future: Command[];
  maxHistory: number;

  // Actions
  execute: (command: Command) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clear: () => void;

  // Queries
  canUndo: () => boolean;
  canRedo: () => boolean;
  getHistorySize: () => number;
}

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    past: [],
    future: [],
    maxHistory: 100,

    execute: async (command) => {
      // Execute command
      await command.execute();

      // Add to history
      set((state) => {
        state.past.push(command);
        state.future = []; // Clear redo stack

        // Limit history size
        if (state.past.length > state.maxHistory) {
          state.past.shift();
        }
      });
    },

    undo: async () => {
      const { past } = get();
      if (past.length === 0) return;

      const command = past[past.length - 1];
      await command.undo();

      set((state) => {
        state.past.pop();
        state.future.push(command);
      });
    },

    redo: async () => {
      const { future } = get();
      if (future.length === 0) return;

      const command = future[future.length - 1];
      await command.redo();

      set((state) => {
        state.future.pop();
        state.past.push(command);
      });
    },
  }))
);
```

#### 4. Layers Store
```typescript
// src/stores/layersStore.ts
interface LayersState {
  groups: Map<string, CanvasGroup>;
  zIndexMap: Map<string, number>;

  // Actions
  createGroup: (name: string, objectIds: string[]) => Promise<string>;
  deleteGroup: (groupId: string) => Promise<void>;
  addToGroup: (groupId: string, objectIds: string[]) => Promise<void>;
  removeFromGroup: (groupId: string, objectIds: string[]) => Promise<void>;
  setZIndex: (objectId: string, zIndex: number) => Promise<void>;
  bringToFront: (objectIds: string[]) => Promise<void>;
  sendToBack: (objectIds: string[]) => Promise<void>;

  // Queries
  getGroupHierarchy: () => GroupNode[];
  getObjectsByGroup: (groupId: string) => CanvasObject[];
}
```

#### 5. Tools Store
```typescript
// src/stores/toolsStore.ts
interface ToolsState {
  activeTool: ToolType;
  toolConfig: Record<ToolType, ToolConfig>;

  // Actions
  setActiveTool: (tool: ToolType) => void;
  setToolConfig: (tool: ToolType, config: Partial<ToolConfig>) => void;

  // Tool-specific config
  getSelectionConfig: () => SelectionConfig;
  getDrawingConfig: () => DrawingConfig;
  getTextConfig: () => TextConfig;
}
```

#### 6. Collaboration Store
```typescript
// src/stores/collaborationStore.ts
interface CollaborationState {
  users: Map<string, User>;
  cursors: Map<string, CursorPosition>;
  locks: Map<string, string>; // objectId → userId

  // Actions
  updateCursor: (userId: string, position: CursorPosition) => void;
  acquireLock: (objectId: string) => Promise<boolean>;
  releaseLock: (objectId: string) => Promise<void>;
  updateUserPresence: (userId: string, data: Partial<User>) => void;

  // Queries
  getActiveUsers: () => User[];
  isLocked: (objectId: string) => boolean;
  getLockedBy: (objectId: string) => string | null;
}
```

### Zustand + Supabase Sync Pattern

```typescript
// src/lib/sync/SyncManager.ts
export class SyncManager {
  private channel: RealtimeChannel;

  constructor() {
    this.setupRealtimeSubscription();
  }

  private setupRealtimeSubscription() {
    this.channel = supabase
      .channel('canvas-sync')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'canvas_objects',
      }, (payload) => {
        const obj = dbToCanvasObject(payload.new);

        // Update Zustand store
        useCanvasStore.getState().objects.set(obj.id, obj);

        // Update Fabric.js canvas
        const fabricObj = ObjectFactory.fromCanvasObject(obj);
        fabricCanvas.add(fabricObj);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'canvas_objects',
      }, (payload) => {
        const obj = dbToCanvasObject(payload.new);

        // Update Zustand store
        useCanvasStore.getState().objects.set(obj.id, obj);

        // Update Fabric.js canvas
        const fabricObj = fabricCanvas.getObjects()
          .find(o => o.data.id === obj.id);
        if (fabricObj) {
          fabricObj.set(ObjectFactory.toFabricProps(obj));
          fabricCanvas.renderAll();
        }
      })
      .subscribe();
  }
}
```

---

## Conflict Resolution Strategy

### Hybrid Approach

#### 1. Last-Write-Wins (LWW) with Version Numbers

For geometry and style changes:

```typescript
interface CanvasObject {
  // ... existing fields
  version: number;  // Incremented on each update
  last_modified_by: string;
  updated_at: string;
}

async function updateObject(id: string, updates: Partial<CanvasObject>) {
  const current = await canvasStore.getObject(id);

  // Optimistic update (immediate)
  canvasStore.updateObject(id, updates);

  // Database update with version check
  const result = await supabase
    .from('canvas_objects')
    .update({
      ...updates,
      version: current.version + 1,
      last_modified_by: currentUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('version', current.version) // Optimistic locking
    .select()
    .single();

  if (result.error) {
    // Version conflict detected
    await handleConflict(id, updates, result.error);
  }
}

async function handleConflict(
  id: string,
  localUpdates: Partial<CanvasObject>,
  error: any
) {
  // Fetch latest version
  const latest = await supabase
    .from('canvas_objects')
    .select()
    .eq('id', id)
    .single();

  // Strategy: Last-Write-Wins (LWW)
  // Accept server version, discard local changes
  canvasStore.updateObject(id, latest.data);

  // Notify user
  notificationStore.show({
    type: 'warning',
    message: `Changes to object were overwritten by ${latest.data.last_modified_by}`,
  });
}
```

#### 2. Operational Transform for Text

For text content editing:

```typescript
// Use Yjs for collaborative text editing
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

class TextSyncManager {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider;

  constructor() {
    this.ydoc = new Y.Doc();
    this.provider = new WebsocketProvider(
      'wss://your-server.com',
      'text-sync',
      this.ydoc
    );
  }

  syncTextObject(objectId: string) {
    const ytext = this.ydoc.getText(objectId);

    // Bind to Fabric.js text object
    ytext.observe((event) => {
      const fabricObj = fabricCanvas.getObjects()
        .find(o => o.data.id === objectId) as fabric.IText;

      if (fabricObj) {
        fabricObj.set('text', ytext.toString());
        fabricCanvas.renderAll();
      }
    });
  }
}
```

#### 3. Conflict-Free Deletes (Tombstone)

```typescript
async function deleteObject(id: string) {
  // Soft delete with tombstone
  await supabase
    .from('canvas_objects')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: currentUserId,
    })
    .eq('id', id);

  // Remove from local state
  canvasStore.objects.delete(id);

  // Remove from Fabric.js
  const fabricObj = fabricCanvas.getObjects()
    .find(o => o.data.id === id);
  if (fabricObj) {
    fabricCanvas.remove(fabricObj);
  }
}
```

### Conflict Resolution Matrix

| Operation Type | Strategy | Rationale |
|---------------|----------|-----------|
| Geometry (x, y, width, height) | Last-Write-Wins | Concurrent moves are rare |
| Style (fill, stroke, opacity) | Last-Write-Wins | Simple, predictable |
| Text content | Operational Transform | Character-level merging needed |
| Delete | Always win (tombstone) | Deletes should propagate |
| Create | Always succeed | Unique IDs prevent conflicts |
| Z-index | Last-Write-Wins | Visual hierarchy preference |
| Grouping | Last-Write-Wins | Organizational preference |

---

## AI Integration Preparation (Phase III)

### Command System Design

All Phase II features implemented as commands enables seamless AI integration:

```typescript
// Phase III: AI command execution
async function executeAICommand(naturalLanguage: string) {
  // AI parses natural language → structured command
  const parsed = await aiService.parse(naturalLanguage);

  // Example: "Create a red circle at position 100, 200"
  // Parsed result:
  {
    commandType: 'CreateObject',
    params: {
      type: 'circle',
      x: 100,
      y: 200,
      fill: '#ff0000',
      type_properties: { radius: 50 }
    }
  }

  // Execute via command system (already built in Phase II)
  const command = new CreateObjectCommand(parsed.params);
  await historyStore.execute(command);
}

// Complex command: "Create a login form with username and password fields"
async function executeComplexCommand(naturalLanguage: string) {
  const parsed = await aiService.parse(naturalLanguage);

  // Parsed result:
  {
    commandType: 'CreateLoginForm',
    params: {
      position: { x: 100, y: 100 },
      style: 'modern'
    }
  }

  // Complex command = multiple sub-commands
  const command = new CreateLoginFormCommand({
    commands: [
      new CreateObjectCommand({ type: 'text', text_content: 'Username' }),
      new CreateObjectCommand({ type: 'rectangle', ... }), // input field
      new CreateObjectCommand({ type: 'text', text_content: 'Password' }),
      new CreateObjectCommand({ type: 'rectangle', ... }), // input field
      new CreateObjectCommand({ type: 'rectangle', ... }), // submit button
      new LayoutCommand({ type: 'vertical', spacing: 10 }),
    ]
  });

  await historyStore.execute(command);
}
```

### AI-Ready Features Checklist

All 57 features designed for AI invocation:

- ✅ **Commands**: Structured parameters, async execution
- ✅ **Undo/Redo**: Works automatically via command pattern
- ✅ **Validation**: Built into command.canExecute()
- ✅ **Error Handling**: Consistent across all commands
- ✅ **Multi-step**: Complex commands compose simple commands
- ✅ **Context-Aware**: Commands have access to current selection, canvas state
- ✅ **Feedback**: Progress events for AI status updates

### Canvas-Aware AI Commands (W5 Multi-Canvas Integration)

**W5 Update**: All AI commands now include canvas context for multi-canvas support.

**Canvas Context in Commands**:
```typescript
// Phase III: AI commands respect active canvas
async function executeAICommand(naturalLanguage: string) {
  const activeCanvasId = usePaperboxStore.getState().activeCanvasId;

  // AI parses with canvas context
  const parsed = await aiService.parse(naturalLanguage, {
    canvasId: activeCanvasId,
    canvasName: getCanvasName(activeCanvasId)
  });

  // Example: "Create a red circle"
  // Implicitly targets active canvas
  {
    commandType: 'CreateObject',
    params: {
      canvas_id: activeCanvasId,  // ← Canvas-scoped
      type: 'circle',
      x: 100,
      y: 100,
      fill: '#ff0000',
      type_properties: { radius: 50 }
    }
  }
}
```

**Canvas Management Commands** (New AI Capability):
```typescript
// "Switch to Design System canvas"
async function executeSwitchCanvasCommand(naturalLanguage: string) {
  const parsed = await aiService.parse(naturalLanguage);

  // Parsed result:
  {
    commandType: 'SwitchCanvas',
    params: {
      canvasName: 'Design System',
      canvasId: 'uuid-of-design-system-canvas'
    }
  }

  // Execute via Zustand action
  await usePaperboxStore.getState().setActiveCanvas(parsed.params.canvasId);
}

// "Create new canvas called 'Mobile Mockups'"
async function executeCreateCanvasCommand(naturalLanguage: string) {
  const parsed = await aiService.parse(naturalLanguage);

  // Parsed result:
  {
    commandType: 'CreateCanvas',
    params: {
      name: 'Mobile Mockups',
      description: 'Mobile app design mockups'
    }
  }

  // Execute via Zustand action
  const canvas = await usePaperboxStore.getState().createCanvas(
    parsed.params.name,
    parsed.params.description
  );

  // Auto-switch to new canvas
  await usePaperboxStore.getState().setActiveCanvas(canvas.id);
}
```

**Canvas-Scoped AI Workflows**:
1. **Object Creation**: "Create circle" → adds to `activeCanvasId`
2. **Canvas Switching**: "Switch to Design System" → AI parses canvas name → calls `setActiveCanvas()`
3. **Multi-Canvas Operations**: "Copy this to Mobile canvas" → AI creates duplicate in target canvas
4. **Canvas Organization**: "List all canvases" → AI returns canvas metadata for user review

**Benefits for Phase III**:
- AI commands automatically scoped to active canvas (no ambiguity)
- Natural language canvas management ("Show me my Design System")
- Cross-canvas operations ("Move this to Prototype canvas")
- Canvas-aware context ("What's in my Wireframes canvas?")

---

## Testing Strategy

### Test Coverage Requirements

- **Unit Tests**: >80% coverage for all managers, engines, stores
- **Integration Tests**: All Zustand ↔ Supabase ↔ Fabric.js sync paths
- **E2E Tests**: Critical user workflows (create, edit, collaborate, export)
- **Performance Tests**: 500+ objects, 5+ users, <100ms sync

### Test Organization

```
src/
├── __tests__/
│   ├── unit/
│   │   ├── commands/
│   │   ├── stores/
│   │   ├── engines/
│   │   └── lib/
│   ├── integration/
│   │   ├── sync/
│   │   ├── canvas/
│   │   └── collaboration/
│   └── e2e/
│       ├── workflows/
│       └── performance/
```

### Test Examples

```typescript
// Unit test: Command
describe('CreateObjectCommand', () => {
  it('should create object and enable undo', async () => {
    const command = new CreateObjectCommand({
      type: 'rectangle',
      x: 100,
      y: 100,
    });

    await command.execute();
    expect(canvasStore.objects.size).toBe(1);

    await command.undo();
    expect(canvasStore.objects.size).toBe(0);
  });
});

// Integration test: Sync
describe('SyncManager', () => {
  it('should sync Zustand → Supabase → Other Client', async () => {
    // Client 1: Create object
    await canvasStore.createObject({ type: 'circle' });

    // Wait for realtime propagation
    await waitFor(() => {
      // Client 2: Should receive object
      expect(client2Store.objects.size).toBe(1);
    });
  });
});

// Performance test
describe('Performance', () => {
  it('should handle 500+ objects smoothly', async () => {
    // Create 500 objects
    for (let i = 0; i < 500; i++) {
      await canvasStore.createObject({ type: 'rectangle' });
    }

    // Measure render time
    const start = performance.now();
    fabricCanvas.renderAll();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // <100ms render
  });
});
```

---

## Performance Requirements

### Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| Object creation | <50ms | Time to create + render |
| Object update | <16ms | Time to update + render (60fps) |
| Realtime sync | <100ms | DB write → other client sees change |
| Cursor broadcast | <50ms | Position update → other client sees cursor |
| Canvas render (500 objects) | <100ms | Time to render all objects |
| Undo/redo | <50ms | Time to execute undo/redo |
| Export PNG | <2s | Time to generate PNG (1920x1080) |
| Export SVG | <1s | Time to generate SVG |
| Initial load (500 objects) | <3s | Time to fetch + render all objects |

### Optimization Strategies

#### 1. Debounced Database Writes

```typescript
// src/lib/sync/DebouncedSync.ts
import { debounce } from 'use-debounce';

export class DebouncedSync {
  private pendingUpdates = new Map<string, Partial<CanvasObject>>();

  private debouncedFlush = debounce(() => {
    this.flush();
  }, 300); // 300ms debounce

  queueUpdate(id: string, updates: Partial<CanvasObject>) {
    // Merge with existing pending updates
    const existing = this.pendingUpdates.get(id) || {};
    this.pendingUpdates.set(id, { ...existing, ...updates });

    // Trigger debounced flush
    this.debouncedFlush();
  }

  private async flush() {
    const updates = Array.from(this.pendingUpdates.entries());
    this.pendingUpdates.clear();

    // Batch update to database
    await supabase
      .from('canvas_objects')
      .upsert(updates.map(([id, data]) => ({ id, ...data })));
  }
}
```

#### 2. Virtual Scrolling for Layers Panel

```typescript
// src/components/panels/LayersPanel.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function LayersPanel() {
  const objects = useCanvasStore(state => state.objects);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: objects.size,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // 40px per row
    overscan: 5, // Render 5 extra items
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) => (
          <LayerRow key={item.key} object={objects[item.index]} />
        ))}
      </div>
    </div>
  );
}
```

#### 3. Canvas Object Pooling

```typescript
// src/lib/fabric/ObjectPool.ts
export class ObjectPool {
  private pool = new Map<ShapeType, fabric.Object[]>();

  acquire(type: ShapeType): fabric.Object {
    const available = this.pool.get(type) || [];

    if (available.length > 0) {
      return available.pop()!;
    }

    // Create new object if pool empty
    return this.createNew(type);
  }

  release(obj: fabric.Object) {
    const type = obj.data.type;
    const pool = this.pool.get(type) || [];
    pool.push(obj);
    this.pool.set(type, pool);
  }
}
```

---

## Timeline & Milestones

### 12-Week Implementation Plan

#### **Week 1-2: Core Infrastructure**
**Milestone 1: Foundation Complete**

- [ ] Setup Fabric.js canvas manager
- [ ] Implement Zustand stores (6 slices)
- [ ] Create command pattern base classes
- [ ] Setup sync manager (Supabase ↔ Zustand ↔ Fabric)
- [ ] Remove all Konva dependencies
- [ ] Basic canvas rendering working

**Deliverables**:
- Fabric.js canvas rendering shapes
- Zustand stores managing state
- Real-time sync working (create, update, delete)
- Command system executing operations

---

#### **Week 3-4: Essential Canvas Features**
**Milestone 2: Core Interactions Complete**

- [ ] Multi-select (shift-click, drag-select, lasso)
- [ ] Transform operations (move, resize, rotate)
- [ ] Layer/Z-index management
- [ ] Object grouping/ungrouping
- [ ] Copy/paste functionality
- [ ] Duplicate/delete operations
- [ ] Keyboard shortcuts framework

**Deliverables**:
- Selection manager with all modes
- Transform engine operational
- Layers store with hierarchy
- Keyboard shortcuts working (Cmd+Z, Cmd+C, Delete, arrows)

---

#### **Week 5-6: Styling & Formatting**
**Milestone 3: Visual Tools Complete**

- [ ] Color picker with recent colors/palettes
- [ ] Text formatting (bold, italic, alignment, font size)
- [ ] Opacity controls
- [ ] Stroke properties
- [ ] Gradient support (linear, radial)
- [ ] Shadow effects
- [ ] Blend modes
- [ ] Styles/design tokens system

**Deliverables**:
- Style manager with all property types
- Color picker component
- Text formatting toolbar
- Design tokens storage

---

#### **Week 7-8: Layout & Organization**
**Milestone 4: Layout Tools Complete**

- [ ] Alignment tools (left, center, right, top, middle, bottom)
- [ ] Distribution (evenly space horizontal/vertical)
- [ ] Snap-to-grid
- [ ] Smart guides (alignment helpers)
- [ ] Auto-layout system (flexbox-like)
- [ ] Canvas frames/artboards
- [ ] Layers panel with drag-to-reorder
- [ ] Grid creation tool

**Deliverables**:
- Layout engine with all algorithms
- Snap-to-grid system
- Smart guides rendering
- Layers panel with DnD

---

#### **Week 9-10: Advanced Features**
**Milestone 5: Advanced Capabilities Complete**

- [ ] Export PNG
- [ ] Export SVG
- [ ] JSON serialization
- [ ] Import SVG
- [ ] Component system (reusable symbols)
- [ ] Vector path editing (pen tool)
- [ ] Bezier curve editing
- [ ] Image upload and placement
- [ ] Collaborative comments
- [ ] Version history

**Deliverables**:
- Export engine with PNG/SVG/JSON
- Component system operational
- Vector editing tools
- Comments system

---

#### **Week 11-12: Testing, Optimization, Polish**
**Milestone 6: Production Ready**

- [ ] Performance optimization (500+ objects)
- [ ] E2E test suite (critical workflows)
- [ ] Integration test suite (sync paths)
- [ ] Unit test suite (>80% coverage)
- [ ] Performance benchmarking
- [ ] Bug fixes and edge cases
- [ ] Documentation (API, architecture, deployment)
- [ ] Final polish and UX refinements

**Deliverables**:
- All tests passing
- Performance benchmarks met
- Documentation complete
- Production-ready codebase

---

### Critical Path Analysis

**Blocking Dependencies**:
1. **Week 1-2 blocks everything**: Core infrastructure must be complete
2. **Week 3-4 blocks Week 5-8**: Selection/transform needed for styling/layout
3. **Week 5-8 can partially parallelize**: Styling and layout are semi-independent
4. **Week 9-10 requires Week 3-8**: Advanced features build on core + styling + layout
5. **Week 11-12 requires everything**: Testing validates all features

**Risk Mitigation**:
- Week 1-2 is most critical → allocate extra time if needed
- Fabric.js migration is complex → budget 20% buffer
- Real-time sync edge cases → thorough testing in Week 3-4

---

## Appendix A: Directory Structure

```
src/
├── commands/                    # Command pattern (AI-ready)
│   ├── base/
│   │   ├── Command.ts
│   │   ├── CommandManager.ts
│   │   └── CommandHistory.ts
│   ├── object/
│   │   ├── CreateObjectCommand.ts
│   │   ├── UpdateObjectCommand.ts
│   │   ├── DeleteObjectCommand.ts
│   │   └── DuplicateObjectCommand.ts
│   ├── transform/
│   │   ├── MoveCommand.ts
│   │   ├── ResizeCommand.ts
│   │   ├── RotateCommand.ts
│   │   └── ScaleCommand.ts
│   ├── layout/
│   │   ├── AlignCommand.ts
│   │   ├── DistributeCommand.ts
│   │   ├── ArrangeCommand.ts
│   │   └── GridCommand.ts
│   ├── style/
│   │   ├── SetFillCommand.ts
│   │   ├── SetStrokeCommand.ts
│   │   ├── SetOpacityCommand.ts
│   │   └── ApplyStyleCommand.ts
│   ├── hierarchy/
│   │   ├── GroupCommand.ts
│   │   ├── UngroupCommand.ts
│   │   ├── SetZIndexCommand.ts
│   │   └── CreateFrameCommand.ts
│   └── complex/                # Multi-step commands (AI)
│       ├── CreateFormCommand.ts
│       ├── CreateLayoutCommand.ts
│       └── CreateComponentCommand.ts
│
├── stores/                     # Zustand stores (slices)
│   ├── canvasStore.ts
│   ├── selectionStore.ts
│   ├── historyStore.ts
│   ├── layersStore.ts
│   ├── toolsStore.ts
│   ├── collaborationStore.ts
│   └── index.ts               # Combined store
│
├── lib/                        # Core libraries
│   ├── fabric/
│   │   ├── FabricCanvasManager.ts
│   │   ├── ObjectFactory.ts
│   │   ├── EventHandler.ts
│   │   └── ObjectPool.ts
│   ├── sync/
│   │   ├── SyncManager.ts
│   │   ├── ConflictResolver.ts
│   │   ├── OptimisticUpdates.ts
│   │   └── DebouncedSync.ts
│   ├── supabase.ts
│   └── constants.ts
│
├── features/                   # Feature modules (DRY)
│   ├── selection/
│   │   ├── SelectionManager.ts
│   │   ├── LassoTool.ts
│   │   ├── DragSelectTool.ts
│   │   └── SelectByTypeTool.ts
│   ├── transform/
│   │   ├── TransformEngine.ts
│   │   └── TransformControls.ts
│   ├── layout/
│   │   ├── LayoutEngine.ts
│   │   ├── SnapToGrid.ts
│   │   ├── SmartGuides.ts
│   │   └── AutoLayout.ts
│   ├── style/
│   │   ├── StyleManager.ts
│   │   ├── ColorPicker.ts
│   │   └── GradientEditor.ts
│   ├── export/
│   │   ├── PNGExporter.ts
│   │   ├── SVGExporter.ts
│   │   └── JSONExporter.ts
│   ├── history/
│   │   ├── HistoryManager.ts
│   │   └── VersionControl.ts
│   └── collaboration/
│       ├── PresenceManager.ts
│       ├── CursorSync.ts
│       └── CommentSystem.ts
│
├── components/                 # React components
│   ├── canvas/
│   │   ├── Canvas.tsx
│   │   └── CursorOverlay.tsx
│   ├── panels/
│   │   ├── LayersPanel.tsx
│   │   ├── PropertiesPanel.tsx
│   │   ├── StylesPanel.tsx
│   │   └── CommentsPanel.tsx
│   ├── toolbar/
│   │   ├── Toolbar.tsx
│   │   ├── ToolButton.tsx
│   │   └── ColorPicker.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── StatusBar.tsx
│   └── collaboration/
│       ├── UserList.tsx
│       ├── PresenceBadge.tsx
│       └── CommentThread.tsx
│
├── hooks/                      # React hooks
│   ├── useCanvas.ts
│   ├── useSelection.ts
│   ├── useHistory.ts
│   ├── useKeyboard.ts
│   ├── useCanvasSync.ts
│   └── useCollaboration.ts
│
├── types/                      # TypeScript types
│   ├── canvas.ts
│   ├── commands.ts
│   ├── stores.ts
│   ├── fabric.ts
│   └── database.ts
│
├── utils/                      # Utility functions
│   ├── geometry.ts
│   ├── color.ts
│   ├── serialization.ts
│   └── validation.ts
│
└── __tests__/                  # Tests
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Appendix B: Technology Research

### Fabric.js vs Konva.js Comparison

| Feature | Fabric.js | Konva.js | Winner |
|---------|-----------|----------|--------|
| **SVG Import/Export** | Native, excellent | Manual, complex | Fabric.js ✅ |
| **Text Editing** | IText with inline editing | Basic, manual | Fabric.js ✅ |
| **Object Grouping** | Built-in Group class | Manual implementation | Fabric.js ✅ |
| **Selection** | Built-in ActiveSelection | Manual Transformer | Fabric.js ✅ |
| **Performance (500+ objects)** | Excellent (caching) | Good | Fabric.js ✅ |
| **React Integration** | Imperative API | react-konva (declarative) | Konva.js ⚠️ |
| **Learning Curve** | Moderate | Low (with react-konva) | Konva.js ⚠️ |
| **Path Editing** | Native path manipulation | Limited | Fabric.js ✅ |
| **JSON Serialization** | Native toJSON/fromJSON | Manual | Fabric.js ✅ |
| **Community & Docs** | Large, active | Large, active | Tie |

**Verdict**: Fabric.js is superior for feature-complete design tool

---

## Appendix C: Zustand Best Practices

### Slice Pattern

```typescript
// src/stores/createCanvasSlice.ts
export const createCanvasSlice: StateCreator<
  CombinedStore,
  [],
  [],
  CanvasSlice
> = (set, get) => ({
  objects: new Map(),

  createObject: async (object) => {
    // Implementation
  },
});

// src/stores/index.ts
export const useStore = create<CombinedStore>()(
  immer((...a) => ({
    ...createCanvasSlice(...a),
    ...createSelectionSlice(...a),
    ...createHistorySlice(...a),
    ...createLayersSlice(...a),
    ...createToolsSlice(...a),
    ...createCollaborationSlice(...a),
  }))
);
```

### Performance Optimization

```typescript
// Selective subscription (avoid unnecessary re-renders)
const selectedIds = useStore(state => state.selection.selectedIds);
const objects = useStore(state => state.canvas.objects);

// Derived state with selector
const selectedObjects = useStore(
  state => state.selection.selectedIds
    .map(id => state.canvas.objects.get(id))
    .filter(Boolean)
);
```

---

## Conclusion

Phase II transforms Paperbox into a **feature-complete collaborative design tool** with:

1. ✅ **57 Production-Ready Features** - All FOUNDATION.md requirements
2. ✅ **Modern Tech Stack** - Fabric.js + Zustand + Supabase Realtime
3. ✅ **DRY Architecture** - Pattern-based implementation (8 engines vs 57 features)
4. ✅ **AI-Ready** - Command pattern enables natural language execution (Phase III)
5. ✅ **Performance** - 500+ objects, 5+ users, <100ms sync
6. ✅ **Production Quality** - >80% test coverage, TypeScript strict mode

**Next Steps**:
1. Review and approve PRD
2. Begin Week 1: Core Infrastructure implementation
3. Setup project tracking and milestones
4. Regular progress reviews (weekly)

---

**Document Status**: Draft for Review
**Prepared By**: Claude (AI Assistant)
**Review Required By**: Development Team, Product Owner
