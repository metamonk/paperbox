# Collaborative Editing: Race Condition Fix

## Problem

Selection broadcasting was failing with error:
```
[Collaboration] Cannot broadcast selection - no channel or current user
```

Even after presence channel was successfully subscribed.

## Root Cause

**Race Condition:** The presence channel was being stored in Zustand state immediately upon creation, before Supabase confirmed the subscription was ready.

**Timeline:**
1. `setupPresenceChannel()` called
2. Channel created → immediately stored in state
3. User selects object → `broadcastSelection()` called
4. Channel exists but state = `"joining"` (not ready)
5. ❌ Broadcast fails
6. ~500ms later: Channel becomes `"joined"` (ready)
7. But subsequent broadcasts still fail

## Solution

### Change 1: Delayed Channel Storage

**File:** `src/stores/slices/collaborationSlice.ts:935-956`

Store channel in state ONLY after Supabase confirms subscription:

```typescript
.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    // ✅ CRITICAL: Wait for SUBSCRIBED before storing
    set({ presenceChannel: channel }, undefined, 'collaboration/setupPresence');
    console.log('[🔧] ✅ Channel stored and ready for broadcasts!');
  } else if (status === 'CHANNEL_ERROR') {
    set({ presenceChannel: null }, undefined, 'collaboration/setupPresenceError');
  }
});
```

**Before:**
```typescript
channel.subscribe();
set({ presenceChannel: channel });  // ❌ Too early!
```

**After:**
```typescript
channel.subscribe((status) => {
  if (status === 'SUBSCRIBED') {
    set({ presenceChannel: channel });  // ✅ Perfect timing!
  }
});
```

### Change 2: State Verification

**File:** `src/stores/slices/collaborationSlice.ts:383-402`

Added channel state check before broadcasting:

```typescript
broadcastSelection: (objectIds: string[]) => {
  const channel = state.presenceChannel;
  
  // Detailed error logging
  if (!channel || !currentUser) {
    console.warn('[Collaboration] Cannot broadcast', {
      hasChannel: !!channel,
      channelState: channel?.state,  // ← Diagnose state
      hasCurrentUser: !!currentUser,
    });
    return;
  }
  
  // Safety check: ensure channel is joined
  if (channel.state !== 'joined') {
    console.warn('[Collaboration] Channel not ready. State:', channel.state);
    return;
  }
  
  // ✅ Now safe to broadcast
  channel.track({ ... });
};
```

## Testing

### Before Fix:
```
[🔧] Setup initiated
[CanvasSyncManager] Selection created
❌ [Collaboration] Cannot broadcast selection - no channel
[🔧] Subscription status: SUBSCRIBED  ← Too late!
```

### After Fix:
```
[🔧] Setup initiated, waiting for subscription...
[🔧] Subscription status: SUBSCRIBED
[🔧] ✅ Channel stored and ready for broadcasts!
[CanvasSyncManager] Selection created
✅ [🎯 DEBUG] broadcastSelection called: { hasSelection: true }
```

## Impact

- ✅ Eliminates "Cannot broadcast" errors
- ✅ First selection now broadcasts correctly
- ✅ Remote users see selection overlays immediately
- ✅ No reload required for presence sync

## Related Files

- `src/stores/slices/collaborationSlice.ts` - Presence channel management
- `src/components/canvas/Canvas.tsx` - Presence channel initialization
- `src/lib/sync/CanvasSyncManager.ts` - Selection event handlers
- `src/components/collaboration/RemoteSelectionOverlay.tsx` - Visual feedback

## Verification Steps

1. Open two browsers
2. Both should show: `✅ Channel stored and ready for broadcasts!`
3. User A selects object
4. Check User A console: No "Cannot broadcast" errors
5. Check User B console: `usersWithSelections: 1`
6. User B should see colored border around User A's selection

---

**Status:** ✅ Fixed (October 19, 2025)

