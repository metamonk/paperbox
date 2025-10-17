# Database Migration Guide

## W1.D4.4 - Migrating to New Supabase Database

You mentioned creating a fresh Supabase database. Follow these steps to complete the migration:

---

## Step 1: Get Your New Database Credentials

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **Settings → API**
3. Copy the following values:
   - **Project URL** (looks like `https://xyzabc123.supabase.co`)
   - **anon/public key** (long JWT token starting with `eyJ...`)

---

## Step 2: Update Environment Variables

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and paste your actual values:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-actual-anon-key...
   ```

---

## Step 3: Run Database Migration

### Option A: Supabase Dashboard (Recommended for first migration)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/20250116_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run** to execute the migration

### Option B: Supabase CLI (For future migrations)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

---

## Step 4: Verify Migration

1. In Supabase Dashboard, go to **Table Editor**
2. You should see three new tables:
   - `canvas_sessions`
   - `canvas_objects`
   - `canvas_collaborators`

3. Check **Database → Replication** to ensure Realtime is enabled for:
   - `canvas_objects`
   - `canvas_collaborators`

---

## Step 5: Generate TypeScript Types (Optional but Recommended)

```bash
# Install Supabase CLI if not done
npm install -g supabase

# Generate types from your database schema
npx supabase gen types typescript --project-id your-project-ref > src/lib/supabase/types.ts
```

This will replace the placeholder types with actual types from your database schema.

---

## Step 6: Test the Connection

After completing steps 1-4, run:

```bash
pnpm dev
```

Open your browser console. If configured correctly, you should NOT see any Supabase environment variable errors.

---

## Database Schema Overview

### Tables Created:

**canvas_sessions**
- Stores canvas document metadata
- Fields: id, name, description, owner_id, timestamps

**canvas_objects**
- Stores individual shapes (rectangles, circles, text)
- Fields: id, canvas_id, type, position (x, y), dimensions, styling, z_index
- Type-specific properties stored in `type_properties` JSONB field

**canvas_collaborators**
- Tracks user access to canvases
- Roles: owner, editor, viewer

### Security Features:

✅ **Row Level Security (RLS)** enabled on all tables
✅ Users can only access their own canvases or canvases shared with them
✅ Editors can modify, viewers can only read
✅ Owners have full control including adding/removing collaborators

### Real-time Features:

✅ Live updates for `canvas_objects` (see changes from other users instantly)
✅ Live updates for `canvas_collaborators` (see who joins/leaves)
✅ Presence tracking ready for multiplayer cursors (W1.D4.8-9)

---

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Ensure `.env.local` exists and has correct values
- Restart dev server after changing `.env.local`

### Error: "relation does not exist"
- Migration wasn't run successfully
- Re-run the SQL migration from Step 3

### Can't see Realtime updates
- Check **Database → Replication** in Supabase dashboard
- Ensure `canvas_objects` and `canvas_collaborators` have Realtime enabled

### RLS blocking queries
- Make sure you're authenticated when testing
- Check Supabase logs in Dashboard → Logs → Postgres Logs

---

## Next Steps After Migration

Once migration is complete, we'll proceed with:

1. ✅ W1.D4.5: Verify database types match schema
2. ⏳ W1.D4.6-7: Test canvas object sync
3. ⏳ W1.D4.8-9: Test real-time presence
4. ⏳ W1.D4.10-11: Integrate with Zustand store

---

## Need Help?

If you encounter issues during migration, please share:
1. The exact error message
2. Which step you're on
3. Any relevant console logs

I'll help troubleshoot!
