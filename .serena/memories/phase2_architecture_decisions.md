# Phase II Architecture Decisions

## Core Architectural Patterns

### 1. Layered Architecture
- **Data Layer**: Supabase (source of truth)
- **State Layer**: Zustand with 6 slice stores
- **Sync Layer**: Bidirectional sync with optimistic updates
- **Canvas Layer**: Fabric.js (replacing Konva)
- **Feature Layer**: Command pattern for all operations

### 2. Zustand Store Slices
1. `canvasStore` - Fabric.js state and objects
2. `selectionStore` - Selection management
3. `historyStore` - Undo/redo with command pattern
4. `layersStore` - Hierarchy and z-index
5. `toolsStore` - Active tools and configuration
6. `collaborationStore` - Real-time users/cursors/locks

### 3. DRY Principles Application
Instead of 57 separate feature implementations, use pattern-based approach:
- **Object Operations**: Generic command system
- **Selection Operations**: Selection manager with queries
- **Transform Operations**: Transform engine
- **Layout Operations**: Layout engine with algorithms
- **Style Operations**: Style manager with properties
- **Hierarchy Operations**: Hierarchy manager with tree ops
- **State Operations**: Command pattern with history
- **Export Operations**: Export engine with format adapters

### 4. Command Pattern (AI-Ready)
All operations implemented as commands:
- `execute()` - Perform operation
- `undo()` - Reverse operation
- `redo()` - Re-execute operation

Enables:
- Undo/redo functionality
- AI command execution (Phase III)
- Keyboard shortcuts
- Macro recording

### 5. Conflict Resolution Strategy
- **Geometry/Style Changes**: Last-Write-Wins with version numbers
- **Text Content**: Operational Transform (character-level)
- **Delete Operations**: Always win (tombstone pattern)
- **Create Operations**: Always succeed (unique IDs)

### 6. Fabric.js Integration
- Imperative API (not declarative like Konva)
- Object-oriented design
- Manager classes separate from React
- Sync managers handle Fabric ↔ Zustand ↔ Supabase

## Implementation Timeline
- **Week 1-2**: Core infrastructure (Zustand, Fabric, Command system)
- **Week 3-4**: Essential canvas features (selection, transform, layers)
- **Week 5-6**: Styling and formatting
- **Week 7-8**: Layout and organization
- **Week 9-10**: Advanced features
- **Week 11-12**: Testing, optimization, polish
