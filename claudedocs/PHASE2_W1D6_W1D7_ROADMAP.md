# Phase 2 - Week 1, Days 6-7: Real-time Collaboration Roadmap

**Date**: 2025-10-17
**Status**: Planning
**Prerequisites**: ✅ W1.D1-D5 Complete (Canvas, Stores, Supabase, Presence)

---

## Overview

Build real-time collaboration features on top of the completed foundation:
- **W1.D6**: Live cursor tracking for multi-user awareness
- **W1.D7**: Object locking to prevent concurrent edit conflicts

Both features leverage existing Supabase infrastructure (Presence channels, real-time sync) and integrate with collaborationSlice.

---

## W1.D6: Live Cursor Tracking

### Objective
Broadcast and display real-time cursor positions for all collaborators in the same room.

### User Stories
- **As a collaborator**, I want to see where others are pointing so I know what they're working on
- **As a collaborator**, I want smooth cursor movements (not jittery) for a professional experience
- **As a collaborator**, I want to see user names with their cursors so I know who is who

### Technical Architecture

#### State Management (collaborationSlice)
```typescript
interface CursorPosition {
  userId: string;
  x: number;
  y: number;
  timestamp: number;
}

interface CollaborationSlice {
  cursors: Record<string, CursorPosition>;

  // Cursor broadcasting
  broadcastCursor: (x: number, y: number) => void;

  // Cursor state management (existing methods)
  updateCursor: (userId: string, position: CursorPosition) => void;
  removeCursor: (userId: string) => void;
  clearAllCursors: () => void;
}
```

#### Presence Integration
```typescript
// Extend existing Presence tracking with cursor data
setupPresenceChannel: (userId, userName, userColor, roomId) => {
  channel.track({
    userId,
    userName,
    userColor,
    isActive: true,
    lastSeen: Date.now(),
    cursor: null // Initially null, updated by broadcastCursor()
  });
}

broadcastCursor: (x: number, y: number) => {
  const channel = get().presenceChannel;
  if (!channel) return;

  // Throttle to max 60fps (16.67ms)
  const now = Date.now();
  const lastBroadcast = get().lastCursorBroadcast ?? 0;
  if (now - lastBroadcast < 16.67) return;

  channel.track({
    ...currentPresence,
    cursor: { x, y, timestamp: now }
  });

  set({ lastCursorBroadcast: now });
}
```

#### Canvas Rendering (FabricCanvasManager)
```typescript
// Add cursor overlay layer
class FabricCanvasManager {
  private cursorLayer: fabric.Group;

  renderCollaboratorCursors(cursors: Record<string, CursorPosition>, presence: Record<string, UserPresence>) {
    this.cursorLayer.clear();

    Object.entries(cursors).forEach(([userId, cursor]) => {
      const user = presence[userId];
      if (!user) return;

      // Render cursor icon with user color
      const cursorIcon = new fabric.Path('M0,0 L0,20 L5,15 L10,22 L14,20 L9,13 L17,13 Z', {
        fill: user.userColor,
        left: cursor.x,
        top: cursor.y,
        selectable: false,
      });

      // Add user name label
      const nameLabel = new fabric.Text(user.userName, {
        left: cursor.x + 20,
        top: cursor.y,
        fontSize: 12,
        fill: user.userColor,
        backgroundColor: 'white',
        selectable: false,
      });

      this.cursorLayer.add(cursorIcon, nameLabel);
    });

    this.canvas.renderAll();
  }
}
```

### Implementation Steps

#### W1.D6.1: Write Tests (RED Phase)
**File**: `src/stores/__tests__/collaborationSlice.test.ts`

**Test Cases** (~8 new tests):
1. `broadcastCursor()` - Cursor broadcasting
   - Updates Presence channel with cursor position
   - Throttles broadcasts to 60fps max
   - Handles null presence channel gracefully
   - Updates lastCursorBroadcast timestamp

2. Cursor state management (existing methods work with new data)
   - updateCursor() adds cursor to state
   - removeCursor() removes cursor from state
   - clearAllCursors() empties cursor map

3. Integration with Presence
   - Presence sync event updates cursors from other users
   - Cursor data persists in Presence state
   - Cursor removed when user leaves

**Estimated Time**: 2 hours

#### W1.D6.2: Implement Cursor Broadcasting (GREEN Phase)
**File**: `src/stores/slices/collaborationSlice.ts`

**Changes**:
1. Add `lastCursorBroadcast: number | null` to state
2. Implement `broadcastCursor()` method with throttling
3. Update Presence event handlers to extract cursor data
4. Wire up cursor updates to existing `updateCursor()` method

**Estimated Time**: 2 hours

#### W1.D6.3: Cursor Rendering Integration
**Files**:
- `src/lib/fabric/FabricCanvasManager.ts`
- `src/components/canvas/CanvasStage.tsx`

**Changes**:
1. Add cursor overlay layer to FabricCanvasManager
2. Implement `renderCollaboratorCursors()` method
3. Wire up canvas mouse move events to `broadcastCursor()`
4. Add cursor interpolation for smooth movement
5. Test multi-user cursor display

**Estimated Time**: 3-4 hours

#### W1.D6.4: Manual Testing & Polish
**Tasks**:
- Open two browser tabs, verify cursor positions sync
- Test cursor smoothness and performance (60fps)
- Verify cursor removal on user disconnect
- Test with 5+ users simultaneously
- Performance profiling (should be <5% CPU usage)

**Estimated Time**: 1-2 hours

### Success Criteria
- ✅ Cursors broadcast at max 60fps (throttled)
- ✅ Cursor positions sync across all collaborators <100ms latency
- ✅ Smooth cursor movement with interpolation
- ✅ User names displayed with cursors
- ✅ Cursors removed when users disconnect
- ✅ 8+ new tests passing
- ✅ No performance degradation with 10+ users

---

## W1.D7: Object Locking

### Objective
Implement database-level object locking to prevent concurrent edits and show visual lock indicators.

### User Stories
- **As a collaborator**, I want to lock objects I'm editing so others can't modify them simultaneously
- **As a collaborator**, I want to see visual indicators when objects are locked by others
- **As a collaborator**, I want locks to auto-release after 30s of inactivity to prevent deadlocks
- **As a collaborator**, I want to see who has locked an object when I try to edit it

### Technical Architecture

#### Database Schema (Already Exists)
```sql
-- canvas_objects table already has lock columns:
ALTER TABLE canvas_objects
  ADD COLUMN locked_by UUID REFERENCES auth.users(id),
  ADD COLUMN lock_acquired_at TIMESTAMPTZ;
```

#### State Management (collaborationSlice)
```typescript
interface ObjectLock {
  objectId: string;
  userId: string;
  userName: string;
  acquiredAt: number;
}

interface CollaborationSlice {
  locks: Record<string, ObjectLock>;

  // Lock management
  requestLock: (objectId: string) => Promise<boolean>;
  releaseLock: (objectId: string) => Promise<void>;

  // Lock state (existing methods)
  setLock: (objectId: string, lock: ObjectLock) => void;
  removeLock: (objectId: string) => void;

  // Utilities (existing methods)
  isObjectLocked: (objectId: string) => boolean;
  isObjectLockedByCurrentUser: (objectId: string) => boolean;
  isObjectLockedByOther: (objectId: string) => boolean;
  getLock: (objectId: string) => ObjectLock | undefined;
}
```

#### Lock Acquisition Flow
```typescript
requestLock: async (objectId: string) => {
  const userId = get().currentUserId;
  const userName = get().presence[userId]?.userName ?? 'Unknown';

  // Optimistic lock: Only update if not currently locked
  const { data, error } = await supabase
    .from('canvas_objects')
    .update({
      locked_by: userId,
      lock_acquired_at: new Date().toISOString()
    })
    .eq('id', objectId)
    .is('locked_by', null) // Critical: Only lock if unlocked
    .select()
    .single();

  if (error || !data) {
    // Lock failed - object already locked by someone else
    return false;
  }

  // Update local state
  get().setLock(objectId, {
    objectId,
    userId,
    userName,
    acquiredAt: Date.now()
  });

  return true;
}

releaseLock: async (objectId: string) => {
  const userId = get().currentUserId;

  // Only release if we own the lock
  const { error } = await supabase
    .from('canvas_objects')
    .update({
      locked_by: null,
      lock_acquired_at: null
    })
    .eq('id', objectId)
    .eq('locked_by', userId);

  if (!error) {
    get().removeLock(objectId);
  }
}
```

#### Lock Timeout Mechanism
```typescript
// Check for expired locks every 10 seconds
useEffect(() => {
  const interval = setInterval(() => {
    const now = Date.now();
    const locks = usePaperboxStore.getState().locks;

    Object.entries(locks).forEach(([objectId, lock]) => {
      const age = now - lock.acquiredAt;
      if (age > 30000) { // 30 seconds
        usePaperboxStore.getState().releaseLock(objectId);
      }
    });
  }, 10000);

  return () => clearInterval(interval);
}, []);
```

#### Visual Lock Indicators (FabricCanvasManager)
```typescript
// Add lock overlay to locked objects
applyLockIndicator(object: fabric.Object, lock: ObjectLock) {
  // Add lock icon
  const lockIcon = new fabric.Text('🔒', {
    left: object.left - 20,
    top: object.top - 20,
    fontSize: 16,
    selectable: false,
  });

  // Add locked border color
  object.set({
    borderColor: '#FF6B6B',
    borderDashArray: [5, 5],
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
  });

  // Add tooltip with lock owner
  object.on('mouseover', () => {
    showTooltip(`Locked by ${lock.userName}`);
  });
}
```

### Implementation Steps

#### W1.D7.1: Write Tests (RED Phase)
**File**: `src/stores/__tests__/collaborationSlice.test.ts`

**Test Cases** (~12 new tests):
1. `requestLock()` - Lock acquisition
   - Successfully acquires lock for unlocked object
   - Fails to acquire lock if already locked
   - Updates local state on successful lock
   - Handles database errors gracefully

2. `releaseLock()` - Lock release
   - Releases lock owned by current user
   - Does not release lock owned by another user
   - Clears local state on successful release
   - Handles database errors gracefully

3. Lock utilities (existing methods work with new data)
   - isObjectLocked() returns true for locked objects
   - isObjectLockedByCurrentUser() identifies user's locks
   - isObjectLockedByOther() identifies others' locks
   - getLock() returns lock metadata

4. Lock timeout
   - Locks auto-release after 30s
   - Timeout checking runs every 10s
   - Only current user's locks are auto-released

**Estimated Time**: 3 hours

#### W1.D7.2: Implement Lock Mechanism (GREEN Phase)
**File**: `src/stores/slices/collaborationSlice.ts`

**Changes**:
1. Implement `requestLock()` with optimistic database locking
2. Implement `releaseLock()` with ownership verification
3. Add lock timeout checking mechanism
4. Wire up lock state to existing utility methods

**Estimated Time**: 3 hours

#### W1.D7.3: Lock UI Integration
**Files**:
- `src/lib/fabric/FabricCanvasManager.ts`
- `src/components/canvas/CanvasStage.tsx`

**Changes**:
1. Add lock indicator rendering to FabricCanvasManager
2. Wire up object selection to `requestLock()`
3. Wire up object deselection to `releaseLock()`
4. Add lock conflict notifications (toast/snackbar)
5. Add lock owner tooltip on hover
6. Disable editing for locked objects

**Estimated Time**: 4-5 hours

#### W1.D7.4: Manual Testing & Edge Cases
**Tasks**:
- Test lock conflicts (two users trying to lock same object)
- Verify lock timeout after 30s
- Test lock persistence across page reloads
- Verify lock release on user disconnect
- Test with 5+ users editing different objects
- Performance testing (lock checks should be <10ms)

**Estimated Time**: 2 hours

### Success Criteria
- ✅ Object locks prevent concurrent edits (database-level)
- ✅ Visual lock indicators show locked state
- ✅ Lock owner name displayed on hover
- ✅ Locks auto-release after 30s of inactivity
- ✅ Lock conflicts handled gracefully with user feedback
- ✅ 12+ new tests passing
- ✅ No lock-related bugs in multi-user testing

---

## Integration & Testing

### Multi-Feature Testing
After both W1.D6 and W1.D7 are complete:

1. **Cursor + Lock Integration**
   - Verify cursors display correctly over locked objects
   - Test cursor performance with locks active
   - Ensure lock indicators don't interfere with cursors

2. **Full Collaboration Workflow**
   - User joins room → presence updates
   - User moves cursor → cursor broadcasts
   - User selects object → lock acquired
   - Other user sees lock indicator
   - User deselects → lock released
   - User leaves → presence removed, locks cleared

3. **Performance Testing**
   - 10 users with active cursors
   - 20 objects with various lock states
   - Measure CPU, memory, network usage
   - Target: <10% CPU, <50MB memory, <100KB/s network

4. **Edge Case Testing**
   - Network interruptions
   - Rapid lock/unlock cycles
   - Simultaneous lock attempts
   - Browser tab crashes
   - Long-running sessions (>1 hour)

### Documentation Updates
- Update PHASE2_W1_PROGRESS_SUMMARY.md with W1.D6-D7 completion
- Create PHASE2_W1D6_COMPLETE.md for cursor tracking
- Create PHASE2_W1D7_COMPLETE.md for object locking
- Update architecture diagrams with new features

---

## Timeline Estimates

### W1.D6: Live Cursor Tracking
- **Day 6.1**: RED phase tests - 2 hours
- **Day 6.2**: GREEN phase implementation - 2 hours
- **Day 6.3**: Rendering integration - 3-4 hours
- **Day 6.4**: Testing & polish - 1-2 hours
- **Total**: ~8-10 hours

### W1.D7: Object Locking
- **Day 7.1**: RED phase tests - 3 hours
- **Day 7.2**: GREEN phase implementation - 3 hours
- **Day 7.3**: UI integration - 4-5 hours
- **Day 7.4**: Testing & edge cases - 2 hours
- **Total**: ~12-13 hours

### Overall Estimate
**Combined W1.D6 + W1.D7**: ~20-23 hours
**Suggested Schedule**: 3-4 development sessions

---

## Dependencies & Prerequisites

### Already Complete ✅
- Supabase Presence channels (W1.D5)
- Real-time postgres_changes subscriptions (W1.D4)
- Collaboration state management (W1.D3)
- FabricCanvasManager rendering (W1.D1-D2)

### Required Infrastructure ✅
- Supabase Realtime enabled
- Database schema with lock columns
- Zustand store with Immer middleware
- Vitest testing framework

### External Dependencies
- Supabase Presence API (existing, no new setup)
- Fabric.js overlay layers (existing capability)
- Canvas event handlers (existing infrastructure)

---

## Risk Mitigation

### Technical Risks
1. **Cursor Performance**: Throttle to 60fps max, use requestAnimationFrame
2. **Lock Conflicts**: Database-level optimistic locking with clear user feedback
3. **Memory Leaks**: Cleanup all event listeners and timers on component unmount
4. **Network Latency**: Graceful degradation, local state optimistic updates

### Testing Risks
1. **Multi-User Setup**: Use browser tabs + incognito for local testing
2. **Real-time Sync**: Mock Supabase channels comprehensively in tests
3. **Race Conditions**: Test concurrent operations with delayed promises

---

## Success Metrics

### Technical Metrics
- ✅ 20+ new tests passing (8 cursor + 12 lock)
- ✅ 100% test coverage maintained
- ✅ <100ms cursor sync latency
- ✅ <10ms lock check latency
- ✅ <5% CPU usage with 10+ users
- ✅ <50MB memory overhead

### User Experience Metrics
- ✅ Smooth 60fps cursor movement
- ✅ Clear lock conflict feedback
- ✅ Intuitive lock indicators
- ✅ No user-facing errors in normal usage

---

Ready to start implementation when you are! 🚀
