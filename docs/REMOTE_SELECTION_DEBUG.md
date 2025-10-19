# Remote Selection Overlay Debugging Guide

## Problem
RemoteSelectionOverlay is not showing other users' selections visually (no colored borders appearing).

## Debug Logging Added

### 1. Component Render Logs
**Look for:** `[RemoteSelectionOverlay] Rendering:`

This shows:
- `remoteUserCount`: How many other users are detected
- `usersWithSelections`: How many of those have selections
- `currentUserId`: Your user ID
- `allPresence`: All user IDs in presence map
- `remoteUsers`: Detailed array with each remote user's selection data

### 2. Per-User Processing
**Look for:** `[RemoteSelectionOverlay] Processing user:`

For each remote user, shows:
- `userName`: Their display name
- `hasSelection`: Boolean if selection exists
- `selectionLength`: Number of selected objects
- `objectIds`: Array of selected object IDs

### 3. Selection Box Rendering
**Look for:** `[RemoteSelectionOverlay] Rendering selection box:`

For each selection box that should render, shows:
- `objectId`: The object being highlighted
- `userName`: Who selected it
- `userColor`: Their assigned color
- `left`, `top`, `width`, `height`: Positioning coordinates

### 4. Selection Broadcasting
**Look for:** `[🎯 DEBUG] broadcastSelection called:`

When a user selects objects, shows:
- `objectIds`: What was selected
- `count`: How many objects
- `isMultiSelect`: Boolean for multi-selection
- `userName`: Who is selecting
- `channel`: If presence channel exists

## Testing Steps

### Step 1: Verify Selection Broadcasting

**User A actions:**
1. Open browser console
2. Select an object (e.g., the blue rectangle)
3. Check console for: `[CanvasSyncManager] 🔒 Locks acquired for: [...]`
4. Check console for: `[🎯 DEBUG] broadcastSelection called:`

**Expected output:**
```
[CanvasSyncManager] 🔒 Locks acquired for: ["abc123..."]
[🎯 DEBUG] broadcastSelection called: {
  objectIds: ["abc123..."],
  count: 1,
  isMultiSelect: false,
  userName: "User A",
  channel: true
}
```

### Step 2: Verify Presence Reception

**User B actions:**
1. Open browser console on second browser/tab
2. Wait 1-2 seconds after User A selects
3. Check console for: `[RemoteSelectionOverlay] Rendering:`

**Expected output:**
```
[RemoteSelectionOverlay] Rendering: {
  remoteUserCount: 1,
  usersWithSelections: 1,  // ← Should be 1!
  currentUserId: "xyz789...",
  remoteUsers: [
    {
      name: "User A",
      selectionCount: 1,  // ← Should be 1!
      selection: {
        objectIds: ["abc123..."],
        updatedAt: 1234567890
      }
    }
  ]
}
```

### Step 3: Verify Object Lookup

**User B console (continued):**

Look for: `[RemoteSelectionOverlay] Processing user:`

**Expected output:**
```
[RemoteSelectionOverlay] Processing user: {
  userName: "User A",
  hasSelection: true,  // ← Should be true!
  selectionLength: 1,
  objectIds: ["abc123..."]
}
```

Then look for: `[RemoteSelectionOverlay] Rendering selection box:`

**Expected output:**
```
[RemoteSelectionOverlay] Rendering selection box: {
  objectId: "abc123",
  userName: "User A",
  userColor: "#3b82f6",  // or whatever color assigned
  left: 150,
  top: 200,
  width: 200,
  height: 150
}
```

### Step 4: Visual Verification

If all the above logs appear, the div SHOULD be rendering. Check:
1. Open DevTools Elements panel
2. Find the `RemoteSelectionOverlay` div
3. It should have width/height: 8000px
4. Inside it, look for child divs with:
   - `border: 3px solid #...` (user's color)
   - Positioned absolutely

## Common Issues & Solutions

### Issue 1: `usersWithSelections: 0`

**Symptom:** User B sees `remoteUserCount: 1` but `usersWithSelections: 0`

**Cause:** Selection state not being broadcast properly

**Fix:** Check if `broadcastSelection` is being called in CanvasSyncManager after lock acquisition

### Issue 2: `Object not found` warning

**Symptom:** Console shows `[RemoteSelectionOverlay] Object not found: abc123`

**Cause:** Object ID mismatch or object not loaded in User B's state

**Solution:** 
- Check if both users are on the same canvas
- Verify object is in `objects` state: `usePaperboxStore.getState().objects`
- Check realtime subscription is working

### Issue 3: Div renders but not visible

**Symptom:** All logs appear, div exists in DOM, but nothing visible on screen

**Possible causes:**
- Z-index conflict
- Object positioned off-screen
- Scroll position not aligned

**Debug:**
```javascript
// In browser console (User B):
const overlay = document.querySelector('[style*="width: 8000px"]');
console.log('Overlay:', overlay);
console.log('Children:', overlay?.children.length);

// Check first child position
const firstBox = overlay?.children[0];
console.log('First box style:', firstBox?.getAttribute('style'));
```

### Issue 4: Selection broadcast timing

**Symptom:** Delay of 1-2 seconds before selection appears

**Cause:** Normal Supabase Presence sync latency

**Solution:** This is expected behavior. Supabase Presence typically syncs within 200-500ms, but can take up to 2 seconds under load.

## Quick Test Command

Run this in User B's console after User A selects an object:

```javascript
const state = window.__PAPERBOX_DEBUG__ || usePaperboxStore.getState();
console.log('Debug Info:', {
  presence: Object.keys(state.presence).map(userId => ({
    userId: userId.slice(0, 8),
    name: state.presence[userId].userName,
    selection: state.presence[userId].selection
  })),
  objects: Object.keys(state.objects).length,
  currentUser: state.currentUserId?.slice(0, 8)
});
```

This will show you the complete state including all users' selections.

---

## Next Steps

After running the tests above, please share:
1. The console output from User A when selecting
2. The console output from User B when User A selects
3. Any error messages or warnings
4. Whether the `usersWithSelections` count is > 0 on User B

This will help us pinpoint exactly where the issue is in the data flow!

