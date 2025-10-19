# Offline Queue Debugging Guide

## Quick Fixes for Sync Errors

If you're experiencing errors when syncing offline operations, try these steps:

### 1. Clear the Current Queue (Emergency Fix)

Open browser console and run:

```javascript
// Import the OperationQueue
import { OperationQueue } from './lib/sync/OperationQueue';

// Clear all operations
OperationQueue.getInstance().clear();

// Or just clear localStorage directly
localStorage.removeItem('paperbox_offline_operations');
location.reload();
```

### 2. Check for Invalid Operations

```javascript
// View current queue
const queue = JSON.parse(localStorage.getItem('paperbox_offline_operations') || '{"operations":[]}');
console.log('Queue:', queue.operations);

// Check for invalid UUIDs or data
queue.operations.forEach((op, i) => {
  console.log(`Operation ${i}:`, {
    type: op.type,
    objectId: op.objectId,
    canvasId: op.canvasId,
    hasPayload: !!op.payload,
    payloadKeys: Object.keys(op.payload || {}),
  });
});
```

### 3. Clean Invalid Operations

The system now automatically validates operations on load, but you can force a cleanup:

```javascript
OperationQueue.getInstance().clearInvalidOperations();
```

## Common Error Patterns

### Error: `invalid input syntax for type uuid: "system"`

**Cause**: Update operations are trying to set a UUID field (like `group_id` or `created_by`) to the string `"system"` instead of a valid UUID or null.

**Fix**: The `OperationQueue.processUpdate()` method now sanitizes all update payloads to:
- Only include valid updatable fields
- Validate UUID format for `group_id`
- Exclude read-only fields: `id`, `canvas_id`, `type`, `created_by`, `created_at`

**Manual Fix**:
```javascript
// Clear the queue and start fresh
OperationQueue.getInstance().clear();
```

### Error: `Bad Request (400)` on sync

**Cause**: Operation payload contains invalid or missing required fields.

**Fix**: The validation now runs on:
1. **Load time** - Invalid operations are filtered out when loading from localStorage
2. **Enqueue time** - Operations are validated before adding to queue
3. **Sync time** - Additional validation before sending to database

**Manual Check**:
```javascript
// See what's in the queue
const queue = OperationQueue.getInstance();
console.log('Queue size:', queue.getCount());
console.log('Has operations:', queue.hasOperations());
```

### Error: `Max retry attempts reached`

**Cause**: An operation failed 3 times and was discarded.

**What happens**: 
- Operation is logged to console with full details
- Operation is removed from queue
- Toast notification shows partial sync results

**Prevention**: Invalid operations are now caught earlier, before retry attempts.

## Operation Validation Rules

### Create Operations
Must have:
- `type` (object type: rectangle, circle, etc.)
- `created_by` (user UUID)
- `x` (number)
- `y` (number)

### Update Operations
Can only update:
- Position: `x`, `y`, `width`, `height`, `rotation`
- Visual: `fill`, `stroke`, `stroke_width`, `opacity`
- Organization: `z_index`, `group_id` (validated UUID or null)
- Metadata: `type_properties`, `style_properties`, `metadata`

**Cannot update**: 
- `id`, `canvas_id`, `type`, `created_by`, `created_at`

### Delete Operations
Only needs:
- `objectId` (UUID to delete)

## Monitoring Queue Health

### Check Queue Status
```javascript
// In browser console
const queue = OperationQueue.getInstance();

console.log('Queue Status:', {
  count: queue.getCount(),
  hasOperations: queue.hasOperations(),
  isFlushing: queue.isFlushing, // if exposed
});
```

### Watch Live Queue Changes

```javascript
// Monitor localStorage changes
window.addEventListener('storage', (e) => {
  if (e.key === 'paperbox_offline_operations') {
    console.log('Queue updated:', JSON.parse(e.newValue || '{}'));
  }
});

// Or poll every 2 seconds
setInterval(() => {
  const stored = localStorage.getItem('paperbox_offline_operations');
  if (stored) {
    const { operations } = JSON.parse(stored);
    console.log(`Queue: ${operations.length} operations`);
  }
}, 2000);
```

### Inspect Operation Details

```javascript
const stored = localStorage.getItem('paperbox_offline_operations');
if (stored) {
  const { operations } = JSON.parse(stored);
  
  // Group by type
  const byType = operations.reduce((acc, op) => {
    acc[op.type] = (acc[op.type] || 0) + 1;
    return acc;
  }, {});
  
  console.table(byType);
  
  // Show oldest operation
  const oldest = operations[0];
  console.log('Oldest operation:', {
    type: oldest.type,
    age: Math.round((Date.now() - oldest.timestamp) / 1000) + 's',
    retryCount: oldest.retryCount,
  });
}
```

## Testing Offline Sync

### Step 1: Go Offline
```bash
# macOS
networksetup -setairportpower en0 off

# Or use Chrome DevTools Network tab → Offline
```

### Step 2: Perform Operations
- Create 3-5 shapes
- Move/resize them
- Change colors
- Delete some

### Step 3: Verify Queue
```javascript
const queue = JSON.parse(localStorage.getItem('paperbox_offline_operations'));
console.log(`Queued ${queue.operations.length} operations`);

// Check each operation is valid
queue.operations.forEach((op, i) => {
  const valid = OperationQueue.getInstance().isValidOperation(op);
  if (!valid) {
    console.error(`Invalid operation at index ${i}:`, op);
  }
});
```

### Step 4: Go Online
```bash
# macOS
networksetup -setairportpower en0 on
```

### Step 5: Monitor Sync
Watch console for:
- `[OperationQueue] Flushing X operations...`
- `[OperationQueue] Processing create/update/delete operation`
- `[OperationQueue] Flush complete: X succeeded, Y failed`

## Recovery Procedures

### Full Reset (Nuclear Option)
```javascript
// Clear everything and start fresh
localStorage.removeItem('paperbox_offline_operations');
localStorage.removeItem('paperbox_connection_state');
window.location.reload();
```

### Partial Reset (Keep valid operations)
```javascript
// Load queue, validate, save
const queue = OperationQueue.getInstance();
queue.loadFromStorage();
queue.clearInvalidOperations();
// Valid operations remain in queue
```

### Export Queue for Debugging
```javascript
// Save queue to file for inspection
const queue = localStorage.getItem('paperbox_offline_operations');
const blob = new Blob([queue], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `paperbox-queue-${Date.now()}.json`;
a.click();
```

## New Safeguards (After This Fix)

1. **Validation on Load**: Invalid operations are filtered when loading from localStorage
2. **Validation on Enqueue**: Operations are validated before adding to queue  
3. **Validation on Sync**: Additional checks before sending to database
4. **Sanitized Updates**: Update operations only include valid, updatable fields
5. **UUID Validation**: `group_id` is validated as proper UUID or null
6. **Read-only Protection**: System fields (`id`, `canvas_id`, `type`, `created_by`, `created_at`) cannot be updated
7. **Better Logging**: All operations log their data before/after processing
8. **Graceful Failures**: Invalid operations are discarded with clear error messages

## Console Helpers

Add these to your browser console for quick debugging:

```javascript
// Quick queue status
window.queueStatus = () => {
  const queue = OperationQueue.getInstance();
  console.log(`Queue: ${queue.getCount()} operations`);
};

// Clear invalid operations
window.cleanQueue = () => {
  OperationQueue.getInstance().clearInvalidOperations();
};

// Full reset
window.resetQueue = () => {
  OperationQueue.getInstance().clear();
  console.log('Queue cleared');
};

// Export for debugging
window.exportQueue = () => {
  const queue = localStorage.getItem('paperbox_offline_operations');
  console.log('Queue export:', JSON.parse(queue || '{}'));
};
```

## Contact for Support

If you continue to experience sync errors after trying these steps:

1. Export your queue using the export helper above
2. Check the browser console for detailed error logs
3. Note the exact error message and operation type that failed
4. Clear the queue to resume working
5. Report the issue with the exported queue data

