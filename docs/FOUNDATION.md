**Real-Time Synchronization**
Sub-100ms object sync
Sub-50ms cursor sync
Zero visible lag during rapid multi-user edits

**Conflict Resolution & State Management**
Two users edit same object simultaneously → both see consistent final state
Documented strategy (last-write-wins, CRDT, OT, etc.)
No "ghost" objects or duplicates
Rapid edits (10+ changes/sec) don't corrupt state
Clear visual feedback on who last edited

**Persistence & Reconnection**
User refreshes mid-edit → returns to exact state
All users disconnect → canvas persists fully
Network drop (30s+) → auto-reconnects with complete state
Operations during disconnect queue and sync on reconnect
Clear UI indicator for connection status

**Canvas Functionality**
Smooth pan/zoom
3+ shape types
Text with formatting
Multi-select (shift-click or drag)
Layer management
Transform operations (move/resize/rotate)
Duplicate/delete

**Performance & Scalability**
Consistent performance with 500+ objects
Supports 5+ concurrent users
No degradation under load
Smooth interactions at scale

**Figma-Inspired Features**
Color picker with recent colors/saved palettes
Undo/redo with keyboard shortcuts (Cmd+Z/Cmd+Shift+Z)
Keyboard shortcuts for common operations (Delete, Duplicate, Arrow keys to move)
Export canvas or objects as PNG/SVG
Snap-to-grid or smart guides when moving objects
Object grouping/ungrouping
Copy/paste functionality

Component system (create reusable components/symbols)
Layers panel with drag-to-reorder and hierarchy
Alignment tools (align left/right/center, distribute evenly)
Z-index management (bring to front, send to back)
Selection tools (lasso select, select all of type)
Styles/design tokens (save and reuse colors, text styles)
Canvas frames/artboards for organizing work

Auto-layout (flexbox-like automatic spacing and sizing)
Collaborative comments/annotations on objects
Version history with restore capability
Vector path editing (pen tool with bezier curves)
Advanced blend modes and opacity

