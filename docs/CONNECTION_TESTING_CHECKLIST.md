# Connection Testing Checklist

## Quick Test Commands

### macOS Quick Test
```bash
# Go offline
networksetup -setairportpower en0 off

# Wait and perform operations in Paperbox

# Go back online
networksetup -setairportpower en0 on
```

## Test Scenarios

### ✅ Test 1: Basic Disconnect/Reconnect
- [ ] Start with green dot (connected)
- [ ] Disconnect WiFi
- [ ] Dot turns red within 5 seconds
- [ ] Toast appears: "Connection Lost"
- [ ] Reconnect WiFi
- [ ] Dot pulses orange (reconnecting)
- [ ] Dot turns green
- [ ] Toast: "Back Online"

### ✅ Test 2: Create Objects Offline
- [ ] Go offline (red dot)
- [ ] Create 3 rectangles
- [ ] Move 2 circles
- [ ] Change colors on shapes
- [ ] Open DevTools → Application → Local Storage
- [ ] Verify `paperbox_offline_queue` has ~5+ operations
- [ ] Go back online
- [ ] Toast: "Back Online - Syncing X operations"
- [ ] Toast: "All Changes Synced"
- [ ] Verify all changes persisted
- [ ] Verify queue cleared in localStorage

### ✅ Test 3: Page Refresh with Queue
- [ ] Go offline
- [ ] Perform 5 operations (create, move, delete)
- [ ] Verify localStorage has queued operations
- [ ] Refresh page (Cmd+R)
- [ ] On load: Toast "Offline Changes Detected - 5 operations from previous session will sync"
- [ ] Go online
- [ ] Operations auto-sync
- [ ] Toast: "All Changes Synced"

### ✅ Test 4: Tooltip States
- [ ] Connected: Hover dot → "Connected"
- [ ] Disconnect → Hover dot → "Offline" (or "Offline (X operations queued)")
- [ ] Reconnecting → Hover dot → "Reconnecting... (X operations queued)"
- [ ] After max attempts → Hover dot → "Connection failed - Refresh required"

### ✅ Test 5: Extended Disconnect (Max Attempts)
**Setup:**
```bash
sudo sh -c 'echo "127.0.0.1 *.supabase.co" >> /etc/hosts'
```

- [ ] Refresh Paperbox
- [ ] Watch console for reconnection attempts
- [ ] Wait ~5 minutes (25 attempts)
- [ ] Dot turns dark red
- [ ] Toast (persistent): "Connection Failed - Please refresh the page to reconnect"
- [ ] Click "Refresh" button in toast → Page reloads

**Cleanup:**
```bash
sudo sed -i '' '/supabase.co/d' /etc/hosts
```

### ✅ Test 6: Collaborative Editing Offline
- [ ] Open Paperbox in two browser windows
- [ ] Window 1: Go offline
- [ ] Window 1: Create objects (they queue)
- [ ] Window 2: Create objects (they sync immediately)
- [ ] Window 1: Go online
- [ ] Window 1: Queued operations flush
- [ ] Both windows: Verify all objects visible

### ✅ Test 7: Operation Types
Test each operation type works offline:
- [ ] Create (rectangle, circle, text)
- [ ] Update (move, resize, color change)
- [ ] Delete (single, multiple)
- [ ] All sync correctly on reconnect

### ✅ Test 8: Queue Size Limits
- [ ] Go offline
- [ ] Perform 100+ operations rapidly
- [ ] Verify queue doesn't exceed 1000 operations
- [ ] Verify oldest operations dropped if limit exceeded
- [ ] Go online and verify sync works

### ✅ Test 9: Multi-Canvas Scoping
- [ ] Create Canvas A
- [ ] Go offline
- [ ] Create objects in Canvas A
- [ ] Switch to Canvas B
- [ ] Create objects in Canvas B
- [ ] Go online
- [ ] Verify operations synced to correct canvases

## Console Commands for Testing

### Check Connection State
```javascript
JSON.parse(localStorage.getItem('paperbox_connection_state'))
```

### Check Queue
```javascript
JSON.parse(localStorage.getItem('paperbox_offline_queue'))
```

### Clear Queue (for testing)
```javascript
localStorage.removeItem('paperbox_offline_queue')
localStorage.removeItem('paperbox_connection_state')
location.reload()
```

### Monitor Live
```javascript
setInterval(() => {
  const state = JSON.parse(localStorage.getItem('paperbox_connection_state') || '{}');
  const queue = JSON.parse(localStorage.getItem('paperbox_offline_queue') || '{"operations":[]}');
  console.log(`Status: ${state.status} | Queue: ${queue.operations.length} operations`);
}, 2000);
```

## Expected Exponential Backoff Timeline

| Attempt | Delay | Cumulative Time |
|---------|-------|----------------|
| 1 | 1s | 1s |
| 2 | 2s | 3s |
| 3 | 4s | 7s |
| 4 | 8s | 15s |
| 5 | 16s | 31s |
| 6-25 | 30s (max) | ~5 minutes |

## Troubleshooting

### Issue: Dot stays yellow
- Check browser console for errors
- Verify Supabase credentials in `.env.local`
- Check Supabase dashboard for service status

### Issue: Operations not syncing
- Check localStorage for queue
- Verify network is actually online
- Check browser console for sync errors

### Issue: Toast not showing
- Verify Sonner is imported in App.tsx
- Check for JavaScript errors in console

## Reset Test Environment

```bash
# Clear localStorage
localStorage.clear()

# Refresh page
location.reload()

# Or full reset
rm -rf node_modules/.cache
pnpm dev
```

