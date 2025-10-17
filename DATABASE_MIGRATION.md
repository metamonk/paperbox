# Database Migration Status

## ✅ Your Database Is Already Set Up!

Good news: Your database schema is already configured with migrations 001-008. The hybrid schema (007_hybrid_schema_refactor.sql) is the current schema.

**No migration needed** - your database already has:
- ✅ `canvas_objects` table with hybrid JSONB schema
- ✅ `canvas_groups` table for hierarchical organization
- ✅ `profiles` table for user data
- ✅ Row Level Security (RLS) policies
- ✅ Realtime enabled for live updates
- ✅ Performance indexes

---

## Environment Variables (Required)

Your project uses **Vite** (not Next.js), so environment variables use `VITE_PUBLIC_` prefix.

### Setup:

1. Create `.env.local` (if it doesn't exist):
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Supabase credentials:
   ```env
   VITE_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
   ```

3. Get credentials from:
   - Supabase Dashboard → Settings → API
   - Project URL: Under "Project URL"
   - Anon Key: Under "Project API keys" → "anon public"

---

## Verify Your Setup

Run the dev server to check everything works:

```bash
pnpm dev
```

**Success indicators:**
- ✅ No environment variable errors in console
- ✅ Supabase client initializes without errors
- ✅ Can query `canvas_objects` table

---

## Database Schema Reference

### Current Tables:

**profiles**
- User profile information
- Fields: id, display_name, created_at

**canvas_objects** (Hybrid Schema)
- Individual shapes on canvas
- Core properties: id, type, x, y, width, height, rotation, z_index
- Common styles: fill, stroke, stroke_width, opacity
- Flexible JSONB: type_properties, style_properties, metadata
- Hierarchy: group_id (FK to canvas_groups)
- Collaboration: created_by, locked_by, lock_acquired_at

**canvas_groups**
- Hierarchical organization for shapes
- Fields: id, name, parent_group_id, locked, z_index, created_by

---

## Sync Layer Integration

The sync layer ([src/lib/supabase/sync.ts](src/lib/supabase/sync.ts)) provides:

**CRUD Operations:**
```typescript
import {
  fetchCanvasObjects,
  insertCanvasObject,
  updateCanvasObject,
  deleteCanvasObject,
  deleteCanvasObjects,
} from '@/lib/supabase/sync';

// Fetch all objects
const objects = await fetchCanvasObjects();

// Insert new object (requires userId for created_by)
const newObject = await insertCanvasObject(myObject, userId);

// Update object
const updated = await updateCanvasObject(objectId, { x: 100, y: 50 });

// Delete object(s)
await deleteCanvasObject(objectId);
await deleteCanvasObjects([id1, id2, id3]);
```

**Real-time Subscriptions:**
```typescript
import { subscribeToCanvasObjects } from '@/lib/supabase/sync';

const unsubscribe = subscribeToCanvasObjects({
  onInsert: (object) => console.log('New object:', object),
  onUpdate: (object) => console.log('Updated:', object),
  onDelete: (objectId) => console.log('Deleted:', objectId),
});

// Clean up when done
unsubscribe();
```

**Type Conversions:**
- `dbToCanvasObject()`: Database row → CanvasObject (Zustand format)
- `canvasObjectToDb()`: CanvasObject → Database insert payload
- `canvasObjectToDbUpdate()`: Partial updates with proper null handling

---

## Schema Field Mapping

**CanvasObject (Zustand) ↔ Database Row:**

| Zustand Field | Database Column | Notes |
|--------------|----------------|-------|
| `fill` | `fill` | Color (e.g., "#ff0000") |
| `stroke` | `stroke` | Stroke color or null |
| `stroke_width` | `stroke_width` | Number or null |
| `group_id` | `group_id` | FK to canvas_groups |
| `z_index` | `z_index` | Layer position |
| `type_properties` | `type_properties` | JSONB (radius, text_content, etc.) |
| `style_properties` | `style_properties` | JSONB (shadows, gradients) |
| `metadata` | `metadata` | JSONB (AI data, custom fields) |
| `locked_by` | `locked_by` | User ID or null |
| `lock_acquired_at` | `lock_acquired_at` | Timestamp or null |

---

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Check `.env.local` exists with `VITE_PUBLIC_SUPABASE_URL` and `VITE_PUBLIC_SUPABASE_ANON_KEY`
- **Important**: Use `VITE_PUBLIC_` prefix, not `NEXT_PUBLIC_`
- Restart dev server after changing `.env.local`

### Type errors with CanvasObject fields
- ✅ Use `fill` not `fill_color`
- ✅ Use `stroke` not `stroke_color`
- ✅ Include `group_id`, `z_index`, `type_properties`, `style_properties`, `metadata`
- ✅ All fields from [src/types/canvas.ts](src/types/canvas.ts#L18-L50)

### Can't see Realtime updates
- Check **Database → Replication** in Supabase dashboard
- Ensure `canvas_objects` has Realtime enabled (should be already from migration 008)

### RLS blocking queries
- Ensure user is authenticated: `supabase.auth.getUser()`
- Current RLS: SELECT open to all, INSERT/UPDATE/DELETE require authentication
- Check logs: Dashboard → Logs → Postgres Logs

---

## Next Steps

✅ Database schema configured (migrations 001-008)
✅ Sync layer updated to match your schema
⏳ Environment variables setup (you need to add your credentials)
⏳ Test sync layer with real Supabase connection
⏳ Integrate with Zustand store

**To continue development:**
1. Add your Supabase credentials to `.env.local`
2. Run `pnpm dev` to verify connection
3. Proceed with W1.D4.6-7: Testing sync operations
