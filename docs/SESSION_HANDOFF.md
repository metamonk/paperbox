# CollabCanvas - Session Handoff Document
**Date:** January 2025  
**Project:** Real-time Collaborative Canvas (Figma Clone MVP)  
**Timeline:** 24-hour sprint

---

## 🎯 Project Overview

**Goal:** Build a real-time collaborative design canvas where multiple users can simultaneously create, move, and manipulate shapes while seeing each other's cursors in real-time.

**Tech Stack:**
- **Frontend:** Vite + React + TypeScript + Konva.js + Tailwind CSS
- **Backend:** Supabase (Postgres + Realtime + Broadcast + Auth)
- **Package Manager:** pnpm (strictly enforced)
- **Deployment:** Vercel

---

## 📋 Key Documentation Files

All documentation is in `/docs/` folder:
- **PRD.md** - Complete product requirements (523 lines)
- **TASKS.md** - Detailed task breakdown with 10 PRs (1910 lines)
- **DIAGRAM.md** - Mermaid architecture diagram (172 lines)
- **SESSION_HANDOFF.md** - This file

---

## ✅ Current Status: PR #1 COMPLETE! 🎉

### **Completed (15/15 tasks - 100%):**
1. ✅ Vite + React + TypeScript scaffolded
2. ✅ Core dependencies installed (Supabase, Konva, React Router)
3. ✅ Testing dependencies installed (Vitest, Testing Library)
4. ✅ pnpm enforcement files created (.npmrc, .nvmrc)
5. ✅ Tailwind CSS v4 configured (@import in index.css)
6. ✅ Vitest configured (vite.config.ts with test settings)
7. ✅ Test setup file created (src/test/setup.ts)
8. ✅ Environment files created (.env.local, .env.example, .env.test)
9. ✅ Project folder structure created (all component/lib/type folders)
10. ✅ Supabase client created (src/lib/supabase.ts)
11. ✅ Type definitions created (canvas.ts, user.ts, database.ts)
12. ✅ Constants file created (src/lib/constants.ts)
13. ✅ .gitignore updated (env files, coverage)
14. ✅ package.json updated (engines, packageManager, test scripts)
15. ✅ README updated (comprehensive project documentation)

### **Ready for PR #2: Database Schema**

---

## 🔑 Key Decisions Made

### **1. Canvas Access Model**
- **Single global canvas** for MVP (all users see same canvas)
- Multi-project support is post-MVP
- Any authenticated user can manipulate any object

### **2. Object Locking**
- **First user to drag** acquires exclusive lock
- Visual feedback (highlight/outline) when object locked by another user
- Lock auto-releases on drag end
- Text locked from movement during editing
- Database fields: `locked_by`, `lock_acquired_at`

### **3. Display Names**
- **Auto-generated from email prefix** (e.g., john.doe@example.com → "john.doe")
- No custom display name input field needed

### **4. Cursor System**
- **Random color per user** (consistent for same userId)
- Cursor shape is consistent (only color varies)
- Throttled to 30 FPS (33ms updates)
- Via Supabase Broadcast (no database writes)

### **5. Canvas Boundaries**
- Objects **constrained to 0,0 - 5000,5000** pixels
- dragBoundFunc on all shapes to enforce boundaries

### **6. Idle Detection**
- Track user activity timestamps
- Visual differentiation for idle vs active users
- Mark as idle after period of inactivity

### **7. Error Handling**
- Connection drops: **Automatic reconnection** with visual feedback
- Object creation failures: **Display error message**
- Transient errors: **Silent retry with exponential backoff**

### **8. Package Manager**
- **pnpm strictly enforced** (not npm or yarn)
- `.npmrc` with `engine-strict=true`
- `.nvmrc` with Node version 18
- All commands use `pnpm` throughout documentation

---

## 📦 Installed Dependencies

### **Production:**
```json
{
  "@supabase/supabase-js": "^2.75.0",
  "konva": "^10.0.2",
  "react": "^19.1.1",
  "react-dom": "^19.1.1",
  "react-konva": "^19.0.10",
  "react-router-dom": "^7.9.4"
}
```

### **Development:**
```json
{
  "@testing-library/jest-dom": "^6.9.1",
  "@testing-library/react": "^16.3.0",
  "@testing-library/user-event": "^14.6.1",
  "autoprefixer": "^10.4.21",
  "jsdom": "^27.0.0",
  "postcss": "^8.5.6",
  "tailwindcss": "^4.1.14",
  "typescript": "~5.9.3",
  "vite": "^7.1.7",
  "vitest": "^3.2.4"
}
```

---

## 📂 Current File Structure

```
collabcanvas/
├── docs/                       # Planning documents
│   ├── PRD.md                 # Product requirements
│   ├── TASKS.md               # Task breakdown
│   ├── DIAGRAM.md             # Architecture diagram
│   └── SESSION_HANDOFF.md     # This file
├── src/
│   ├── App.tsx                # Default Vite scaffolding
│   ├── main.tsx
│   ├── index.css
│   └── assets/
├── .npmrc                      # pnpm enforcement
├── .nvmrc                      # Node 18
├── .gitignore                  # Vite default
├── package.json                # Dependencies installed
├── pnpm-lock.yaml             # Lock file
├── vite.config.ts             # Not yet configured for Vitest
├── tsconfig.json              # Default Vite TS config
└── index.html

MISSING FOLDERS (need to create):
- src/components/
- src/hooks/
- src/lib/
- src/types/
- src/utils/
- src/pages/
- src/test/
- supabase/migrations/
```

---

## 🎯 Next Steps - Complete PR #1

### **Immediate Commands to Run:**

```bash
# 1. Initialize Tailwind (CRITICAL - packages installed but not configured)
pnpm exec tailwindcss init -p

# 2. Create folder structure
mkdir -p src/{components/{auth,canvas/shapes,collaboration,layout},hooks,lib,types,utils,pages,test}
mkdir -p supabase/migrations

# 3. Create env files
touch .env.local .env.example .env.test
```

### **Files to Create (in order of priority):**

1. **Tailwind Configuration** (after init command above):
   - Update `src/index.css` with Tailwind directives
   
2. **Vitest Configuration:**
   - Update `vite.config.ts` with test config
   - Create `src/test/setup.ts`

3. **Supabase Setup:**
   - Create `src/lib/supabase.ts` with client
   - Create `.env.example` with placeholder vars

4. **Type Definitions:**
   - `src/types/canvas.ts` - CanvasObject interface
   - `src/types/user.ts` - User, Profile types
   - `src/types/database.ts` - Supabase table types

5. **Constants:**
   - `src/lib/constants.ts` - Canvas dimensions, colors, zoom limits

6. **Update Files:**
   - `package.json` - Add engines and packageManager fields
   - `.gitignore` - Add .env.local, .env.test, coverage/
   - `README.md` - Replace with project-specific instructions

---

## 🗂️ Database Schema (Ready to Create in PR #2)

### **Tables:**

**profiles:**
```sql
id UUID REFERENCES auth.users PRIMARY KEY
display_name TEXT NOT NULL  -- Auto-generated from email
created_at TIMESTAMPTZ DEFAULT NOW()
```

**canvas_objects:**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
type TEXT NOT NULL CHECK (type IN ('rectangle', 'circle', 'text'))
x FLOAT NOT NULL
y FLOAT NOT NULL
width FLOAT
height FLOAT
radius FLOAT
fill TEXT NOT NULL
text_content TEXT
font_size INT
created_by UUID REFERENCES profiles(id)
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
locked_by UUID REFERENCES profiles(id)      -- NEW: Object locking
lock_acquired_at TIMESTAMPTZ                -- NEW: Lock timestamp
```

### **RLS Policies:**
- All authenticated users can read all objects
- All authenticated users can insert/update/delete any object (collaborative model)
- Object locking handled at application layer, not database layer

---

## 🎨 Shape Defaults (from PRD)

```typescript
export const SHAPE_DEFAULTS = {
  rectangle: { width: 100, height: 100, fill: '#3B82F6' },  // Blue
  circle: { radius: 50, fill: '#EF4444' },                   // Red
  text: { textContent: 'Text', fontSize: 16, fill: '#000000' } // Black
};

export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
```

---

## 🔄 Two-Channel Architecture (CRITICAL)

### **Broadcast Channel (Cursors):**
- **Purpose:** Ephemeral cursor positions (high-frequency updates)
- **Channel Name:** `canvas-cursors`
- **Throttle:** 30 FPS (33ms)
- **No database writes**
- **Payload:** `{ userId, displayName, x, y, color, timestamp }`

### **Realtime Channel (Objects):**
- **Purpose:** Persistent object state (create/update/delete)
- **Channel Name:** `canvas-objects`
- **Subscribes to:** Postgres changes on `canvas_objects` table
- **All changes written to database**
- **Payload:** Full object data + lock state

---

## 📊 PR Breakdown (10 Total)

**Status Legend:** ✅ Complete | 🔄 In Progress | ⏳ Not Started

1. ✅ **PR #1: Project Setup** (COMPLETE - 15/15 tasks done)
2. ⏳ **PR #2: Database Schema** (30 min) - Supabase setup + migrations - **NEXT**
3. ⏳ **PR #3: Authentication** (1-1.5 hrs) - Login/signup with Supabase Auth
4. ⏳ **PR #4: Canvas Foundation** (1-1.5 hrs) - Pan/zoom with Konva
5. ⏳ **PR #5: Shape Creation** (1.5-2 hrs) - Local shapes + drag
6. ⏳ **PR #6: Realtime Sync + Locking** (2.5-3 hrs) - **MOST CRITICAL**
7. ⏳ **PR #7: Multiplayer Cursors** (1.5-2 hrs) - Broadcast with colors
8. ⏳ **PR #8: Presence + Idle** (1-1.5 hrs) - User list + idle detection
9. ⏳ **PR #9: Performance** (1-1.5 hrs) - Optimization
10. ⏳ **PR #10: Deployment** (30-45 min) - Vercel

**Total Estimated Time:** 15-18 hours (with 6-9 hour buffer)
**Time Elapsed:** ~1 hour (PR #1 complete)

---

## ⚠️ Important Notes

### **pnpm Enforcement:**
- All commands MUST use `pnpm` (not npm or yarn)
- `.npmrc` already created with `engine-strict=true`
- Package manager validation will fail if npm is used

### **Tailwind CSS v4:**
- Installed version: 4.1.14 (latest)
- Configuration may differ from v3 examples online
- After running `pnpm exec tailwindcss init -p`, check generated config format

### **React 19:**
- Project uses React 19.1.1 (latest)
- Some @testing-library examples may need adjustments
- react-konva 19.0.10 is compatible

### **Supabase Not Yet Created:**
- Need to create Supabase project at supabase.com
- Get URL and anon key
- Add to .env.local before PR #2

---

## 🚨 Critical Success Indicators

**Hour 6:** Shapes work locally with drag  
**Hour 9:** Realtime sync works (2+ users) ← **MVP GATE**  
**Hour 11:** Cursors visible across users  
**Hour 13:** Deployed and accessible  
**Hour 15:** 5+ users tested successfully  

---

## 📝 Context for Next Chat

When starting the next chat, share this document and mention:

1. **Where you left off:** "PR #1 is 27% complete (4/15 tasks done)"
2. **What's needed:** "Need to finish PR #1 configuration tasks"
3. **Key priority:** "Tailwind packages are installed but not initialized - need to run `pnpm exec tailwindcss init -p` first"

### **Quick Start Command for Next Session:**

```bash
# Show current status
cat docs/SESSION_HANDOFF.md

# Continue from where we left off
pnpm exec tailwindcss init -p
```

---

## 🔗 Quick Reference

- **Working Directory:** `/Users/zeno/Projects/collabcanvas/`
- **Docs Location:** `/Users/zeno/Projects/collabcanvas/docs/`
- **Current Branch:** main (no feature branch created yet)
- **Node Version:** 18 (specified in .nvmrc)
- **Package Manager:** pnpm (strictly enforced)

---

## 💡 Tips for Next Session

1. **Start with:** Reading this handoff doc + checking TASKS.md line 76+
2. **First action:** Complete Tailwind configuration (it's blocking progress)
3. **Don't skip:** Test setup and folder structure - needed for PRs 3-10
4. **Before PR #2:** Create Supabase project and get credentials
5. **Reference:** Use DIAGRAM.md when confused about data flow

---

**End of Handoff Document**  
*All critical decisions, progress, and next steps documented above.*

