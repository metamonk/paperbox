# Phase II Master Task List

**Total Tasks**: ~370
**Duration**: 12 weeks (60 working days)
**Approach**: TDD (Red → Green → Refactor)
**Documentation**: Context7 integrated at critical points

**How to Use**: See [TASK_TRACKING_GUIDE.md](./TASK_TRACKING_GUIDE.md) for filtering and workflow patterns

---

## Task Status Legend

- `[ ]` = Pending
- `[→]` = In Progress
- `[✓]` = Completed
- `[Context7]` = Documentation fetch required
- `[RED]` = TDD: Write failing test
- `[GREEN]` = TDD: Implement to pass test
- `[REFACTOR]` = TDD: Clean up code
- `[TEST]` = Execute /sc:test command
- `[VALIDATE]` = Quality gate checkpoint
- `[COMMIT]` = Git commit point

---

# ═══════════════════════════════════════════════════════
# WEEK 1: FABRIC.JS FOUNDATION & ZUSTAND SETUP
# ═══════════════════════════════════════════════════════

## ─── Week 1, Day 1: Fabric.js Installation & Setup ───

### Morning Block (4 hours)

- [ ] **W1.D1.1**: [Context7] Fetch Fabric.js 6.x documentation
  - Topic: Canvas initialization, configuration, basic setup
  - Focus: Constructor parameters, event system overview

- [ ] **W1.D1.2**: Install Fabric.js and remove Konva dependencies
  - `pnpm add fabric @types/fabric`
  - `pnpm remove konva react-konva react-konva-utils`
  - Verify package.json updated correctly

- [ ] **W1.D1.3**: Create project structure for Fabric.js
  - `mkdir -p src/lib/fabric`
  - `mkdir -p src/lib/fabric/__tests__`
  - Copy template: `docs/templates/FabricCanvasManager.template.ts` → `src/lib/fabric/FabricCanvasManager.ts`

- [ ] **W1.D1.4**: Write test for FabricCanvasManager initialization [RED]
  - Create `src/lib/fabric/__tests__/FabricCanvasManager.test.ts`
  - Test: Canvas initializes with correct dimensions
  - Test: Canvas has correct backgroundColor
  - Expect: Tests fail (implementation doesn't exist yet)

- [ ] **W1.D1.5**: Implement FabricCanvasManager.initialize() [GREEN]
  - Implement canvas element creation
  - Implement Fabric.js canvas initialization
  - Pass configuration parameters
  - Expect: Tests pass

- [ ] **W1.D1.6**: Refactor FabricCanvasManager for clarity [REFACTOR]
  - Add JSDoc comments
  - Extract configuration constants
  - Clean up implementation
  - Expect: Tests still pass

### Afternoon Block (4 hours)

- [ ] **W1.D1.7**: Write tests for Fabric.js event listeners [RED]
  - Test: object:modified event triggers callback
  - Test: selection:created event triggers callback
  - Test: selection:cleared event triggers callback
  - Expect: Tests fail

- [ ] **W1.D1.8**: Implement setupEventListeners() [GREEN]
  - Implement object:modified handler
  - Implement selection:created handler
  - Implement selection:updated handler
  - Implement selection:cleared handler
  - Expect: Tests pass

- [ ] **W1.D1.9**: Write tests for createFabricObject() factory [RED]
  - Test: Creates fabric.Rect from rectangle CanvasObject
  - Test: Creates fabric.Circle from circle CanvasObject
  - Test: Creates fabric.Text from text CanvasObject
  - Test: Returns null for unknown type
  - Expect: Tests fail

- [ ] **W1.D1.10**: Implement createFabricObject() factory [GREEN]
  - Implement rectangle creation logic
  - Implement circle creation logic
  - Implement text creation logic
  - Store database ID in fabricObj.data
  - Expect: Tests pass

- [ ] **W1.D1.11**: Test Fabric.js canvas rendering in browser
  - Create temporary test page
  - Initialize canvas
  - Add basic shapes
  - Visual verification: Canvas renders correctly

- [ ] **W1.D1.12**: Commit Day 1 work [COMMIT]
  - Run: `pnpm test`
  - Run: `pnpm typecheck`
  - Commit: `feat(fabric): Add Fabric.js canvas manager with event system`

---

## ─── Week 1, Day 2: Fabric.js Object Serialization ───

### Morning Block (4 hours)

- [ ] **W1.D2.1**: [Context7] Fetch Fabric.js serialization patterns
  - Topic: toJSON, loadFromJSON, object serialization
  - Focus: Custom properties, data preservation

- [ ] **W1.D2.2**: Write tests for toCanvasObject() serialization [RED]
  - Test: fabric.Rect → CanvasObject conversion
  - Test: fabric.Circle → CanvasObject conversion
  - Test: fabric.Text → CanvasObject conversion
  - Test: Preserves custom data properties
  - Expect: Tests fail

- [ ] **W1.D2.3**: Implement toCanvasObject() serialization [GREEN]
  - Extract base properties (x, y, width, height, rotation)
  - Extract style properties (fill, stroke, opacity)
  - Handle type-specific properties
  - Expect: Tests pass

- [ ] **W1.D2.4**: Refactor serialization for DRY pattern [REFACTOR]
  - Extract common property mapping
  - Create type-specific serializers
  - Add comprehensive comments
  - Expect: Tests still pass

### Afternoon Block (4 hours)

- [ ] **W1.D2.5**: Write tests for addObject() and removeObject() [RED]
  - Test: addObject() adds to canvas and renders
  - Test: removeObject() removes from canvas
  - Test: findObjectById() finds correct object
  - Expect: Tests fail

- [ ] **W1.D2.6**: Implement object management methods [GREEN]
  - Implement addObject()
  - Implement removeObject()
  - Implement findObjectById()
  - Implement getActiveObjects()
  - Expect: Tests pass

- [ ] **W1.D2.7**: Write tests for selection management [RED]
  - Test: getActiveObjects() returns selected objects
  - Test: discardActiveObject() clears selection
  - Test: Selection events fire correctly
  - Expect: Tests fail

- [ ] **W1.D2.8**: Implement selection management [GREEN]
  - Implement getActiveObjects()
  - Implement discardActiveObject()
  - Wire up to Fabric.js selection API
  - Expect: Tests pass

- [ ] **W1.D2.9**: Integration testing - Full object lifecycle
  - Create object → Add to canvas → Modify → Remove
  - Verify Fabric.js state consistency
  - Visual verification in browser

- [ ] **W1.D2.10**: Commit Day 2 work [COMMIT]
  - Run: `pnpm test`
  - Run: `pnpm typecheck`
  - Commit: `feat(fabric): Add object serialization and lifecycle management`

---

## ─── Week 1, Day 3: Zustand Store Architecture ───

### Morning Block (4 hours)

- [ ] **W1.D3.1**: [Context7] Fetch Zustand with immer middleware patterns
  - Topic: create(), immer middleware, TypeScript typing
  - Focus: Store composition, async actions, optimistic updates

- [ ] **W1.D3.2**: Install Zustand and supporting libraries
  - `pnpm add zustand immer nanoid use-debounce`
  - Verify package.json

- [ ] **W1.D3.3**: Create Zustand store structure
  - `mkdir -p src/stores/slices`
  - `mkdir -p src/stores/__tests__`
  - Copy template: `docs/templates/canvasStore.template.ts` → `src/stores/slices/canvasStore.ts`

- [ ] **W1.D3.4**: Write tests for canvasStore initial state [RED]
  - Test: Store initializes with empty objects Map
  - Test: loading is false initially
  - Test: error is null initially
  - Expect: Tests fail

- [ ] **W1.D3.5**: Implement canvasStore base structure [GREEN]
  - Setup create() with immer middleware
  - Define CanvasState interface
  - Initialize with default state
  - Expect: Tests pass

### Afternoon Block (4 hours)

- [ ] **W1.D3.6**: Write tests for canvasStore.createObject() [RED]
  - Test: Creates object with generated ID
  - Test: Optimistically updates objects Map
  - Test: Generates unique nanoid for each object
  - Test: Sets created_at timestamp
  - Expect: Tests fail

- [ ] **W1.D3.7**: Implement canvasStore.createObject() optimistic update [GREEN]
  - Generate nanoid
  - Create full CanvasObject with defaults
  - Optimistic update to objects Map (set state)
  - Return object ID
  - Expect: Tests pass (Supabase integration comes later)

- [ ] **W1.D3.8**: Write tests for canvasStore.updateObject() [RED]
  - Test: Updates object in Map
  - Test: Preserves existing properties
  - Test: Updates updated_at timestamp
  - Test: Handles non-existent object gracefully
  - Expect: Tests fail

- [ ] **W1.D3.9**: Implement canvasStore.updateObject() [GREEN]
  - Find existing object in Map
  - Merge updates with existing properties
  - Update updated_at timestamp
  - Optimistically update Map
  - Expect: Tests pass

- [ ] **W1.D3.10**: Write tests for canvasStore.deleteObjects() [RED]
  - Test: Removes objects from Map
  - Test: Handles multiple deletions
  - Test: Handles non-existent IDs gracefully
  - Expect: Tests fail

- [ ] **W1.D3.11**: Implement canvasStore.deleteObjects() [GREEN]
  - Remove each ID from objects Map
  - Optimistic delete (immediate UI update)
  - Expect: Tests pass

- [ ] **W1.D3.12**: Commit Day 3 work [COMMIT]
  - Run: `pnpm test`
  - Run: `pnpm typecheck`
  - Commit: `feat(stores): Add canvasStore with optimistic updates`

---

## ─── Week 1, Day 4: Supabase ↔ Zustand Integration ───

### Morning Block (4 hours)

- [ ] **W1.D4.1**: [Context7] Fetch Supabase Realtime subscription patterns
  - Topic: Realtime channels, postgres_changes, subscription lifecycle
  - Focus: Event handling, payload structure, cleanup

- [ ] **W1.D4.2**: Write tests for canvasStore.initialize() database load [RED]
  - Test: Fetches objects from Supabase
  - Test: Populates objects Map correctly
  - Test: Sets loading state during fetch
  - Test: Handles errors gracefully
  - Expect: Tests fail (mock Supabase)

- [ ] **W1.D4.3**: Implement canvasStore.initialize() [GREEN]
  - Query Supabase: `SELECT * FROM canvas_objects`
  - Convert array to Map
  - Set loading states appropriately
  - Handle errors with error state
  - Expect: Tests pass

- [ ] **W1.D4.4**: Wire canvasStore.createObject() to Supabase [GREEN]
  - After optimistic update, insert to Supabase
  - Handle insertion errors (rollback optimistic update)
  - Return final object ID
  - Test with real Supabase instance

### Afternoon Block (4 hours)

- [ ] **W1.D4.5**: Wire canvasStore.updateObject() to Supabase [GREEN]
  - After optimistic update, UPDATE in Supabase
  - Handle update errors (rollback optimistic change)
  - Test with real Supabase instance

- [ ] **W1.D4.6**: Wire canvasStore.deleteObjects() to Supabase [GREEN]
  - After optimistic delete, DELETE in Supabase
  - Handle deletion errors (restore deleted objects)
  - Test with real Supabase instance

- [ ] **W1.D4.7**: Write tests for realtime subscription [RED]
  - Test: Subscription activates on initialize()
  - Test: INSERT event adds object to Map
  - Test: UPDATE event updates object in Map
  - Test: DELETE event removes object from Map
  - Expect: Tests fail (mock realtime channel)

- [ ] **W1.D4.8**: Implement setupRealtimeSubscription() [GREEN]
  - Create Supabase channel
  - Subscribe to postgres_changes on canvas_objects
  - Implement syncFromRealtime() handler
  - Handle INSERT, UPDATE, DELETE events
  - Expect: Tests pass

- [ ] **W1.D4.9**: Test realtime sync with multiple browser tabs
  - Open two browser tabs
  - Create object in Tab 1
  - Verify appears in Tab 2 (<100ms)
  - Delete object in Tab 2
  - Verify removed in Tab 1

- [ ] **W1.D4.10**: Commit Day 4 work [COMMIT]
  - Run: `pnpm test`
  - Run: `pnpm typecheck`
  - Commit: `feat(stores): Wire canvasStore to Supabase with realtime sync`

---

## ─── Week 1, Day 5: Command Pattern Foundation ───

### Morning Block (4 hours)

- [ ] **W1.D5.1**: [Context7] Fetch Command pattern best practices
  - Topic: Command interface, undo/redo, command registry
  - Focus: TypeScript implementation, async commands

- [ ] **W1.D5.2**: Create command system structure
  - `mkdir -p src/lib/commands`
  - `mkdir -p src/lib/commands/__tests__`
  - Copy template: `docs/templates/Command.template.ts` → `src/lib/commands/Command.ts`

- [ ] **W1.D5.3**: Write tests for Command interface [RED]
  - Test: BaseCommand abstract class
  - Test: execute() / undo() / redo() contract
  - Test: isExecuted() state tracking
  - Expect: Tests fail

- [ ] **W1.D5.4**: Implement Command interface and BaseCommand [GREEN]
  - Define Command interface
  - Implement BaseCommand abstract class
  - Add executed state tracking
  - Define getDescription() and getMetadata()
  - Expect: Tests pass

### Afternoon Block (4 hours)

- [ ] **W1.D5.5**: Write tests for CreateRectangleCommand [RED]
  - Test: execute() creates object via canvasStore
  - Test: undo() deletes created object
  - Test: redo() re-creates object
  - Test: getDescription() returns correct string
  - Expect: Tests fail

- [ ] **W1.D5.6**: Implement CreateRectangleCommand [GREEN]
  - Implement execute() using canvasStore.createObject()
  - Store created object ID
  - Implement undo() using canvasStore.deleteObjects()
  - Implement redo() as re-execute
  - Expect: Tests pass

- [ ] **W1.D5.7**: Write tests for MoveObjectCommand [RED]
  - Test: execute() moves object to new position
  - Test: Saves previous position for undo
  - Test: undo() restores previous position
  - Test: merge() combines consecutive moves
  - Expect: Tests fail

- [ ] **W1.D5.8**: Implement MoveObjectCommand [GREEN]
  - Implement execute() using canvasStore.updateObject()
  - Save previous x, y coordinates
  - Implement undo() to restore position
  - Implement merge() for command batching
  - Expect: Tests pass

- [ ] **W1.D5.9**: Write tests for DeleteObjectsCommand [RED]
  - Test: execute() deletes objects
  - Test: Saves deleted objects for undo
  - Test: undo() restores all deleted objects
  - Expect: Tests fail

- [ ] **W1.D5.10**: Weekly validation - /sc:test [TEST]
  - Execute: `/sc:test` for comprehensive coverage analysis
  - Target: >30% coverage (Week 1 baseline)
  - Review: Test quality, missing coverage areas
  - Document: Week 1 metrics in weekly report

- [ ] **W1.D5.11**: Implement DeleteObjectsCommand [GREEN]
  - Implement execute() using canvasStore.deleteObjects()
  - Store deleted objects Map for undo
  - Implement undo() to restore objects
  - Expect: Tests pass

- [ ] **W1.D5.12**: Commit Day 5 + Week 1 Summary [COMMIT]
  - Run: `pnpm test`
  - Run: `pnpm typecheck`
  - Commit: `feat(commands): Add command pattern with create/move/delete`
  - Tag: `week-1-complete`

---

# ═══════════════════════════════════════════════════════
# WEEK 2: ZUSTAND SLICES & FABRIC INTEGRATION
# ═══════════════════════════════════════════════════════

## ─── Week 2, Day 1: Selection Store Slice ───

### Morning Block (4 hours)

- [ ] **W2.D1.1**: Create selectionStore structure
  - `touch src/stores/slices/selectionStore.ts`
  - `touch src/stores/slices/__tests__/selectionStore.test.ts`

- [ ] **W2.D1.2**: Write tests for selectionStore initial state [RED]
  - Test: selectedIds is empty Set
  - Test: selectionMode is 'single'
  - Test: activeSelectionTool is null
  - Expect: Tests fail

- [ ] **W2.D1.3**: Implement selectionStore base structure [GREEN]
  - Define SelectionState interface
  - Initialize with default state
  - Setup with immer middleware
  - Expect: Tests pass

- [ ] **W2.D1.4**: Write tests for selection operations [RED]
  - Test: selectObject() adds ID to selectedIds
  - Test: deselectObject() removes ID from selectedIds
  - Test: selectMultiple() adds multiple IDs
  - Test: clearSelection() empties selectedIds
  - Expect: Tests fail

- [ ] **W2.D1.5**: Implement selection operations [GREEN]
  - Implement selectObject()
  - Implement deselectObject()
  - Implement selectMultiple()
  - Implement clearSelection()
  - Expect: Tests pass

### Afternoon Block (4 hours)

- [ ] **W2.D1.6**: Write tests for selection mode [RED]
  - Test: setSelectionMode() changes mode
  - Test: Modes: 'single', 'multi', 'lasso', 'drag'
  - Test: Mode change clears selection appropriately
  - Expect: Tests fail

- [ ] **W2.D1.7**: Implement selection mode management [GREEN]
  - Implement setSelectionMode()
  - Handle mode-specific selection logic
  - Clear selection when switching modes
  - Expect: Tests pass

- [ ] **W2.D1.8**: Wire selectionStore to Fabric.js events
  - Connect Fabric selection:created → selectObject()
  - Connect Fabric selection:updated → selectMultiple()
  - Connect Fabric selection:cleared → clearSelection()
  - Test: Selection state syncs with Fabric.js

- [ ] **W2.D1.9**: Integration test: Selection with canvasStore
  - Create objects via canvasStore
  - Select via selectionStore
  - Verify Fabric.js highlights correctly
  - Verify state consistency

- [ ] **W2.D1.10**: Commit Day 1 work [COMMIT]
  - Run: `pnpm test`
  - Commit: `feat(stores): Add selectionStore with Fabric.js integration`

---

## ─── Week 2, Day 2: History Store Slice (Undo/Redo) ───

### Morning Block (4 hours)

- [ ] **W2.D2.1**: Create historyStore structure
  - `touch src/stores/slices/historyStore.ts`
  - `touch src/stores/slices/__tests__/historyStore.test.ts`

- [ ] **W2.D2.2**: Write tests for historyStore initial state [RED]
  - Test: undoStack is empty array
  - Test: redoStack is empty array
  - Test: canUndo() returns false initially
  - Test: canRedo() returns false initially
  - Expect: Tests fail

- [ ] **W2.D2.3**: Implement historyStore base structure [GREEN]
  - Define HistoryState interface
  - Initialize with empty stacks
  - Implement canUndo() and canRedo()
  - Expect: Tests pass

- [ ] **W2.D2.4**: Write tests for command execution [RED]
  - Test: executeCommand() runs command and adds to undoStack
  - Test: redoStack cleared on new command
  - Test: canUndo() returns true after execution
  - Expect: Tests fail

- [ ] **W2.D2.5**: Implement executeCommand() [GREEN]
  - Execute command.execute()
  - Push to undoStack
  - Clear redoStack
  - Update canUndo/canRedo state
  - Expect: Tests pass

### Afternoon Block (4 hours)

- [ ] **W2.D2.6**: Write tests for undo operation [RED]
  - Test: undo() calls command.undo()
  - Test: Moves command from undoStack to redoStack
  - Test: canRedo() returns true after undo
  - Test: Multiple undos work correctly
  - Expect: Tests fail

- [ ] **W2.D2.7**: Implement undo() [GREEN]
  - Pop from undoStack
  - Call command.undo()
  - Push to redoStack
  - Update state
  - Expect: Tests pass

- [ ] **W2.D2.8**: Write tests for redo operation [RED]
  - Test: redo() calls command.redo()
  - Test: Moves command from redoStack to undoStack
  - Test: Multiple redos work correctly
  - Expect: Tests fail

- [ ] **W2.D2.9**: Implement redo() [GREEN]
  - Pop from redoStack
  - Call command.redo()
  - Push to undoStack
  - Update state
  - Expect: Tests pass

- [ ] **W2.D2.10**: Integration test: Full undo/redo cycle
  - Execute CreateRectangleCommand
  - Verify object created
  - Undo → verify object deleted
  - Redo → verify object restored
  - Test multiple commands

- [ ] **W2.D2.11**: Commit Day 2 work [COMMIT]
  - Run: `pnpm test`
  - Commit: `feat(stores): Add historyStore with undo/redo`

---

## ─── Week 2, Day 3: Layers Store Slice ───

### Morning Block (4 hours)

- [ ] **W2.D3.1**: Create layersStore structure
  - `touch src/stores/slices/layersStore.ts`
  - `touch src/stores/slices/__tests__/layersStore.test.ts`

- [ ] **W2.D3.2**: Write tests for layersStore initial state [RED]
  - Test: layers is empty array
  - Test: activeLayerId is null
  - Test: Layer hierarchy tracking
  - Expect: Tests fail

- [ ] **W2.D3.3**: Implement layersStore base structure [GREEN]
  - Define LayersState interface
  - Initialize with default state
  - Define Layer type (id, name, objects, visible, locked)
  - Expect: Tests pass

- [ ] **W2.D3.4**: Write tests for layer operations [RED]
  - Test: createLayer() adds new layer
  - Test: deleteLayer() removes layer
  - Test: setActiveLayer() changes active layer
  - Test: reorderLayers() changes z-index
  - Expect: Tests fail

- [ ] **W2.D3.5**: Implement layer operations [GREEN]
  - Implement createLayer()
  - Implement deleteLayer()
  - Implement setActiveLayer()
  - Implement reorderLayers()
  - Expect: Tests pass

### Afternoon Block (4 hours)

- [ ] **W2.D3.6**: Write tests for layer object management [RED]
  - Test: addObjectToLayer() adds object to layer
  - Test: removeObjectFromLayer() removes object
  - Test: moveObjectBetweenLayers() transfers object
  - Expect: Tests fail

- [ ] **W2.D3.7**: Implement layer object management [GREEN]
  - Implement addObjectToLayer()
  - Implement removeObjectFromLayer()
  - Implement moveObjectBetweenLayers()
  - Sync with canvasStore
  - Expect: Tests pass

- [ ] **W2.D3.8**: Wire layersStore to Fabric.js z-index
  - Map layer order to Fabric.js object stacking
  - Update Fabric.js when layers reordered
  - Test: Visual z-index matches layer order

- [ ] **W2.D3.9**: Integration test: Multi-layer workflow
  - Create 3 layers
  - Add objects to each layer
  - Reorder layers → verify visual stacking
  - Hide/show layers → verify visibility

- [ ] **W2.D3.10**: Commit Day 3 work [COMMIT]
  - Run: `pnpm test`
  - Commit: `feat(stores): Add layersStore with hierarchy management`

---

## ─── Week 2, Day 4: Tools Store & Collaboration Store ───

### Morning Block (4 hours)

- [ ] **W2.D4.1**: Create toolsStore structure
  - `touch src/stores/slices/toolsStore.ts`
  - `touch src/stores/slices/__tests__/toolsStore.test.ts`

- [ ] **W2.D4.2**: Write tests for toolsStore [RED]
  - Test: activeTool state (select, rectangle, circle, text, etc.)
  - Test: setActiveTool() changes active tool
  - Test: toolConfig stores tool-specific settings
  - Expect: Tests fail

- [ ] **W2.D4.3**: Implement toolsStore [GREEN]
  - Define ToolsState interface
  - Implement setActiveTool()
  - Implement setToolConfig()
  - Support all tool types from FOUNDATION.md
  - Expect: Tests pass

### Afternoon Block (4 hours)

- [ ] **W2.D4.4**: Create collaborationStore structure
  - `touch src/stores/slices/collaborationStore.ts`
  - `touch src/stores/slices/__tests__/collaborationStore.test.ts`

- [ ] **W2.D4.5**: Write tests for collaborationStore [RED]
  - Test: activeUsers Map (user presence)
  - Test: cursors Map (cursor positions)
  - Test: objectLocks Map (optimistic locking)
  - Expect: Tests fail

- [ ] **W2.D4.6**: Implement collaborationStore [GREEN]
  - Define CollaborationState interface
  - Implement user presence tracking
  - Implement cursor position syncing
  - Implement object locking
  - Expect: Tests pass

- [ ] **W2.D4.7**: Wire collaborationStore to existing Supabase Realtime
  - Integrate with existing presence channel
  - Sync cursor positions (already working in MVP)
  - Sync object locks
  - Test: Multi-user collaboration

- [ ] **W2.D4.8**: Commit Day 4 work [COMMIT]
  - Run: `pnpm test`
  - Commit: `feat(stores): Add toolsStore and collaborationStore`

---

## ─── Week 2, Day 5: Sync Layer Integration & Validation ───

### Morning Block (4 hours)

- [ ] **W2.D5.1**: Create sync layer structure
  - `mkdir -p src/sync`
  - `touch src/sync/FabricSync.ts` (Fabric ↔ Zustand)
  - `touch src/sync/SupabaseSync.ts` (Zustand ↔ Supabase)

- [ ] **W2.D5.2**: Write tests for FabricSync [RED]
  - Test: Fabric object:modified → Zustand updateObject()
  - Test: Zustand createObject() → Fabric addObject()
  - Test: Bidirectional sync without infinite loops
  - Expect: Tests fail

- [ ] **W2.D5.3**: Implement FabricSync bidirectional sync [GREEN]
  - Subscribe to Fabric events
  - Update Zustand on Fabric changes
  - Update Fabric on Zustand changes
  - Prevent sync loops
  - Expect: Tests pass

- [ ] **W2.D5.4**: Test complete sync chain end-to-end
  - Create object in Fabric → Verify in Zustand → Verify in Supabase
  - Create object in Supabase → Verify in Zustand → Verify in Fabric
  - Multi-tab: Create in Tab 1 → Verify appears in Tab 2

### Afternoon Block (4 hours)

- [ ] **W2.D5.5**: Remove all Konva.js code and components
  - Delete: `src/components/canvas/shapes/` (Konva shapes)
  - Delete: Konva references in CanvasStage.tsx
  - Update: Canvas.tsx to use Fabric.js
  - Verify: No Konva imports remain (`grep -r "konva" src/`)

- [ ] **W2.D5.6**: Integration testing - Full application smoke test
  - Create objects via UI
  - Select, move, resize objects
  - Undo/redo operations
  - Multi-user collaboration
  - All tests passing

- [ ] **W2.D5.7**: Performance benchmark - 500 objects test
  - Create 500 rectangles programmatically
  - Measure: Object creation time (<50ms each)
  - Measure: Render performance (60fps)
  - Measure: Sync latency (<100ms)
  - Document: Baseline performance metrics

- [ ] **W2.D5.8**: Milestone 1 Validation [VALIDATE]
  - Execute: `/sc:test` with full benchmarks
  - Checklist:
    - [ ] All tests passing
    - [ ] Coverage >40%
    - [ ] Konva.js completely removed
    - [ ] Fabric.js rendering correctly
    - [ ] Zustand stores integrated
    - [ ] Real-time sync working
    - [ ] Command pattern functional
    - [ ] Performance benchmarks met

- [ ] **W2.D5.9**: Week 2 Summary & Retrospective
  - Document: Week 2 accomplishments
  - Document: Lessons learned
  - Document: Performance baselines
  - Update: Serena memory with architectural decisions

- [ ] **W2.D5.10**: Commit Week 2 Complete [COMMIT]
  - Run: `pnpm validate` (full validation)
  - Commit: `feat(foundation): Complete Fabric.js + Zustand migration`
  - Tag: `milestone-1-foundation-complete`

---

# ═══════════════════════════════════════════════════════
# WEEK 3-4: CORE CANVAS FEATURES
# ═══════════════════════════════════════════════════════

## ─── Week 3: Selection & Transform Engines ───

- [ ] **W3.D1.1**: [Context7] Fetch selection patterns (lasso, drag-select)
- [ ] **W3.D1.2-5**: Implement SelectionEngine with tests [RED/GREEN/REFACTOR]
  - Single-click selection
  - Multi-select (Shift+Click)
  - Drag-select box
  - Lasso selection
- [ ] **W3.D1.6**: Selection by type filtering
- [ ] **W3.D1.7-10**: Commit & validation

- [ ] **W3.D2.1**: [Context7] Fetch transform patterns (resize, rotate)
- [ ] **W3.D2.2-5**: Implement TransformEngine with tests [RED/GREEN/REFACTOR]
  - Move with arrow keys
  - Resize with handles
  - Rotate with handle
  - Scale proportionally
- [ ] **W3.D2.6-10**: Transform constraints (snap, aspect ratio)

- [ ] **W3.D3.1-5**: Multi-object transform [RED/GREEN/REFACTOR]
  - Group transform
  - Uniform scaling
  - Rotation around center
- [ ] **W3.D3.6-10**: Transform commands (for undo/redo)

- [ ] **W3.D4.1-5**: Keyboard shortcuts integration [RED/GREEN/REFACTOR]
  - Arrow keys: Move (1px, 10px with Shift)
  - Cmd+Z/Cmd+Shift+Z: Undo/Redo
  - Delete: Delete selected
  - Cmd+A: Select all
- [ ] **W3.D4.6-10**: Hotkeys library integration

- [ ] **W3.D5.1-7**: Week 3 integration testing
- [ ] **W3.D5.8**: Weekly validation - /sc:test [TEST]
  - Target: >50% coverage
- [ ] **W3.D5.9-10**: Week 3 commit

---

## ─── Week 4: Layers & Hierarchy ───

- [ ] **W4.D1.1-5**: Layers panel UI component [RED/GREEN/REFACTOR]
- [ ] **W4.D1.6-10**: Drag-drop layer reordering

- [ ] **W4.D2.1-5**: Z-index management [RED/GREEN/REFACTOR]
  - Bring to front
  - Send to back
  - Bring forward
  - Send backward
- [ ] **W4.D2.6-10**: Z-index commands

- [ ] **W4.D3.1-5**: Grouping system [RED/GREEN/REFACTOR]
  - Create group
  - Ungroup
  - Nested groups
- [ ] **W4.D3.6-10**: Group transform behavior

- [ ] **W4.D4.1-5**: Layer visibility & locking [RED/GREEN/REFACTOR]
- [ ] **W4.D4.6-10**: Layer naming and organization

- [ ] **W4.D5.1-7**: Week 4 integration testing
- [ ] **W4.D5.8**: Milestone 2 Validation - /sc:test + benchmarks [VALIDATE]
  - Target: >55% coverage
  - All core features working
- [ ] **W4.D5.9-10**: Week 4 commit
  - Tag: `milestone-2-core-features-complete`

---

# ═══════════════════════════════════════════════════════
# WEEK 5-6: STYLING & FORMATTING (PARALLEL EXECUTION)
# ═══════════════════════════════════════════════════════

## ─── Week 5: Color & Text Styling ───

### Feature: Color Picker (2 days)
- [ ] **W5.D1.1**: [Context7] Fetch color picker patterns
- [ ] **W5.D1.2-4**: Color picker component [RED/GREEN/REFACTOR]
- [ ] **W5.D1.5-7**: Fill color application
- [ ] **W5.D1.8-10**: Stroke color and width

### Feature: Text Formatting (2 days)
- [ ] **W5.D2.1**: [Context7] Fetch Fabric.js text editing patterns
- [ ] **W5.D2.2-4**: Font family selector [RED/GREEN/REFACTOR]
- [ ] **W5.D2.5-7**: Font size, weight, style
- [ ] **W5.D2.8-10**: Text alignment and decoration

### Feature: Opacity & Blend Modes (1 day)
- [ ] **W5.D3.1-3**: Opacity slider [RED/GREEN/REFACTOR]
- [ ] **W5.D3.4-6**: Blend modes dropdown
- [ ] **W5.D3.7-10**: Blend mode preview

- [ ] **W5.D4.1-7**: Week 5 integration testing
- [ ] **W5.D4.8**: Weekly validation - /sc:test [TEST]
  - Target: >60% coverage
- [ ] **W5.D4.9-10**: Week 5 commit

---

## ─── Week 6: Advanced Styling ───

### Feature: Gradients (2 days)
- [ ] **W6.D1.1**: [Context7] Fetch Fabric.js gradient patterns
- [ ] **W6.D1.2-4**: Linear gradient editor [RED/GREEN/REFACTOR]
- [ ] **W6.D1.5-7**: Radial gradient editor
- [ ] **W6.D1.8-10**: Gradient stop management

### Feature: Shadows & Effects (2 days)
- [ ] **W6.D2.1-3**: Drop shadow properties [RED/GREEN/REFACTOR]
- [ ] **W6.D2.4-6**: Inner shadow
- [ ] **W6.D2.7-10**: Blur effects

### Feature: Filters (1 day)
- [ ] **W6.D3.1-10**: Basic filters (brightness, contrast, saturation) [RED/GREEN/REFACTOR]

- [ ] **W6.D4.1-7**: Week 6 integration testing
- [ ] **W6.D4.8**: Milestone 3 Validation - /sc:test + benchmarks [VALIDATE]
  - Target: >65% coverage
  - All styling features working
- [ ] **W6.D4.9-10**: Week 6 commit
  - Tag: `milestone-3-styling-complete`

---

# ═══════════════════════════════════════════════════════
# WEEK 7-8: LAYOUT & ORGANIZATION (PARALLEL EXECUTION)
# ═══════════════════════════════════════════════════════

## ─── Week 7: Alignment & Distribution ───

### Feature: Alignment Tools (2 days)
- [ ] **W7.D1.1-3**: Align left/center/right [RED/GREEN/REFACTOR]
- [ ] **W7.D1.4-6**: Align top/middle/bottom
- [ ] **W7.D1.7-10**: Distribute horizontally/vertically

### Feature: Snap & Guides (2 days)
- [ ] **W7.D2.1**: [Context7] Fetch snap-to-grid patterns
- [ ] **W7.D2.2-4**: Snap-to-grid [RED/GREEN/REFACTOR]
- [ ] **W7.D2.5-7**: Smart guides (object alignment)
- [ ] **W7.D2.8-10**: Grid customization

### Feature: Rulers & Measurements (1 day)
- [ ] **W7.D3.1-5**: Ruler UI [RED/GREEN/REFACTOR]
- [ ] **W7.D3.6-10**: Distance measurements

- [ ] **W7.D4.1-7**: Week 7 integration testing
- [ ] **W7.D4.8**: Weekly validation - /sc:test [TEST]
  - Target: >70% coverage
- [ ] **W7.D4.9-10**: Week 7 commit

---

## ─── Week 8: Frames & Auto-Layout ───

### Feature: Frames/Artboards (2 days)
- [ ] **W8.D1.1**: [Context7] Fetch frame/artboard patterns
- [ ] **W8.D1.2-4**: Frame creation [RED/GREEN/REFACTOR]
- [ ] **W8.D1.5-7**: Frame nesting and clipping
- [ ] **W8.D1.8-10**: Preset frame sizes

### Feature: Auto-Layout (2 days)
- [ ] **W8.D2.1**: [Context7] Fetch Flexbox/auto-layout patterns
- [ ] **W8.D2.2-4**: Horizontal auto-layout [RED/GREEN/REFACTOR]
- [ ] **W8.D2.5-7**: Vertical auto-layout
- [ ] **W8.D2.8-10**: Spacing and padding controls

### Feature: Constraints (1 day)
- [ ] **W8.D3.1-10**: Responsive constraints (left, right, center, scale) [RED/GREEN/REFACTOR]

- [ ] **W8.D4.1-7**: Week 8 integration testing
- [ ] **W8.D4.8**: Milestone 4 Validation - /sc:test + benchmarks [VALIDATE]
  - Target: >72% coverage
  - All layout features working
- [ ] **W8.D4.9-10**: Week 8 commit
  - Tag: `milestone-4-layout-complete`

---

# ═══════════════════════════════════════════════════════
# WEEK 9-10: ADVANCED FEATURES (PARALLEL EXECUTION)
# ═══════════════════════════════════════════════════════

## ─── Week 9: Components & Libraries ───

### Feature: Component System (3 days)
- [ ] **W9.D1.1**: [Context7] Fetch component/instance patterns
- [ ] **W9.D1.2-10**: Component creation and instances [RED/GREEN/REFACTOR]

- [ ] **W9.D2.1-10**: Component overrides [RED/GREEN/REFACTOR]

- [ ] **W9.D3.1-5**: Component library panel [RED/GREEN/REFACTOR]
- [ ] **W9.D3.6-10**: Drag-drop component instances

### Feature: Vector Paths (2 days)
- [ ] **W9.D4.1**: [Context7] Fetch vector path editing patterns
- [ ] **W9.D4.2-5**: Pen tool (Bézier curves) [RED/GREEN/REFACTOR]
- [ ] **W9.D4.6-10**: Path editing (anchor points)

- [ ] **W9.D5.1-7**: Week 9 integration testing
- [ ] **W9.D5.8**: Weekly validation - /sc:test [TEST]
  - Target: >74% coverage
- [ ] **W9.D5.9-10**: Week 9 commit

---

## ─── Week 10: Copy/Paste & Export ───

### Feature: Copy/Paste System (2 days)
- [ ] **W10.D1.1-5**: Copy/paste within canvas [RED/GREEN/REFACTOR]
- [ ] **W10.D1.6-10**: Duplicate objects (Cmd+D)

- [ ] **W10.D2.1-5**: Cross-canvas copy/paste [RED/GREEN/REFACTOR]
- [ ] **W10.D2.6-10**: Paste with offset

### Feature: Export (2 days)
- [ ] **W10.D3.1**: [Context7] Fetch export patterns (PNG, SVG, JSON)
- [ ] **W10.D3.2-5**: PNG export [RED/GREEN/REFACTOR]
- [ ] **W10.D3.6-10**: SVG export

- [ ] **W10.D4.1-5**: JSON export (full canvas state) [RED/GREEN/REFACTOR]
- [ ] **W10.D4.6-10**: Import from JSON

- [ ] **W10.D5.1-7**: Week 10 integration testing
- [ ] **W10.D5.8**: Milestone 5 Validation - /sc:test + benchmarks [VALIDATE]
  - Target: >76% coverage
  - All advanced features working
- [ ] **W10.D5.9-10**: Week 10 commit
  - Tag: `milestone-5-advanced-features-complete`

---

# ═══════════════════════════════════════════════════════
# WEEK 11-12: TESTING, OPTIMIZATION & POLISH
# ═══════════════════════════════════════════════════════

## ─── Week 11: Comprehensive Testing ───

### Days 1-2: E2E Testing
- [ ] **W11.D1.1**: [Context7] Fetch E2E testing patterns (Playwright/Vitest)
- [ ] **W11.D1.2-10**: E2E tests for core workflows [RED/GREEN/REFACTOR]
  - Create/edit/delete workflow
  - Multi-user collaboration
  - Undo/redo scenarios

- [ ] **W11.D2.1-10**: E2E tests for advanced features [RED/GREEN/REFACTOR]
  - Component system workflow
  - Export/import workflow
  - Complex selection scenarios

### Days 3-4: Edge Cases & Conflict Resolution
- [ ] **W11.D3.1-5**: Concurrent editing tests [RED/GREEN/REFACTOR]
- [ ] **W11.D3.6-10**: Conflict resolution validation

- [ ] **W11.D4.1-5**: Offline/online scenarios [RED/GREEN/REFACTOR]
- [ ] **W11.D4.6-10**: Network error handling

### Day 5: Coverage Analysis
- [ ] **W11.D5.1-7**: Increase coverage to >80%
- [ ] **W11.D5.8**: Weekly validation - /sc:test [TEST]
  - Target: >80% coverage
- [ ] **W11.D5.9-10**: Week 11 commit

---

## ─── Week 12: Performance Optimization & Production Polish ───

### Days 1-2: Performance Optimization
- [ ] **W12.D1.1-5**: Object pooling for frequently created objects
- [ ] **W12.D1.6-10**: Virtual scrolling for large object lists

- [ ] **W12.D2.1-5**: Debounced database writes optimization
- [ ] **W12.D2.6-10**: Fabric.js render optimization

### Days 3-4: Production Polish
- [ ] **W12.D3.1-5**: Error boundaries and error handling
- [ ] **W12.D3.6-10**: Loading states and skeleton screens

- [ ] **W12.D4.1-5**: Accessibility audit (WCAG compliance)
- [ ] **W12.D4.6-10**: Browser compatibility testing

### Day 5: Final Validation & Launch
- [ ] **W12.D5.1-3**: Final performance benchmarks
  - 500+ objects: Smooth
  - 5+ users: No degradation
  - Sync latency: <100ms

- [ ] **W12.D5.4**: Milestone 6 FINAL Validation - /sc:test + full benchmarks [VALIDATE]
  - Checklist:
    - [ ] All 57 features implemented
    - [ ] All tests passing
    - [ ] Coverage >80%
    - [ ] Performance benchmarks exceeded
    - [ ] Production-ready quality
    - [ ] Documentation complete

- [ ] **W12.D5.5-7**: Production deployment preparation
  - Environment variables review
  - Database migrations validated
  - Rollback plan documented

- [ ] **W12.D5.8-9**: Final commit & tag
  - Run: `pnpm validate` (full validation)
  - Commit: `feat(phase2): Complete 57-feature implementation`
  - Tag: `milestone-6-production-ready`
  - Tag: `phase-2-complete`

- [ ] **W12.D5.10**: Phase II Retrospective & Phase III Planning
  - Document: Phase II accomplishments
  - Document: Lessons learned
  - Document: Performance achievements
  - Prepare: Phase III AI integration kickoff

---

# ═══════════════════════════════════════════════════════
# END OF PHASE II MASTER TASK LIST
# Total Tasks: ~370 (estimated)
# Coverage Target: >80%
# Performance: 500+ objects, 5+ users, <100ms sync
# ═══════════════════════════════════════════════════════

**Ready to begin? Start with W1.D1.1 and work sequentially through Week 1-2, then parallelize from Week 3 onwards! 🚀**

For detailed guidance on task management, see [TASK_TRACKING_GUIDE.md](./TASK_TRACKING_GUIDE.md)
