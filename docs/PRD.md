# CollabCanvas MVP - Product Requirements Document

## Project Overview
Build a real-time collaborative design canvas (similar to Figma) where multiple users can simultaneously create, move, and manipulate basic shapes while seeing each other's cursors and actions in real-time.

**MVP Scope:** Single global canvas shared by all users. Multi-project/multi-canvas support is post-MVP.

**Timeline:** 24 hours (hard deadline)  
**Success Criteria:** Pass MVP gate to continue to full project

## Selected Tech Stack

**Frontend:**
- Vite + React + TypeScript
- Konva.js (react-konva) for canvas
- Tailwind CSS for styling

**Backend:**
- Supabase PostgreSQL (database)
- Supabase Auth (authentication)
- Supabase Realtime (object persistence & sync)
- Supabase Broadcast (ephemeral cursor updates)

**Deployment:**
- Vercel

**Key Architecture Decision:**
Two-channel approach for optimal performance:
- **Broadcast channel** for cursors (ephemeral, no DB writes, low latency)
- **Realtime channel** for objects (persisted to Postgres, authoritative state)

---

## User Stories

### Authenticated User
- As a user, I want to create an account and log in so that my work is associated with my identity
- As a user, I want to see my name displayed with my cursor so other collaborators know who I am
- As a user, I want the global canvas state to persist and be visible to all authenticated users

### Canvas Creator
- As a creator, I want to add shapes (rectangles, circles, or text) to the canvas
- As a creator, I want to move objects around the canvas by dragging them
- As a creator, I want to pan and zoom across a large workspace
- As a creator, I want to see my changes reflected immediately

### Collaborator
- As a collaborator, I want to see other users' cursors moving in real-time with their names
- As a collaborator, I want to see when someone creates or moves an object instantly
- As a collaborator, I want to know who else is currently online and editing
- As a collaborator, I want to edit simultaneously without breaking the canvas
- As a collaborator, I want the canvas to recover gracefully if I disconnect and reconnect

---

## Key Features Required for MVP

### 1. Authentication System
- User registration and login
- Persistent user sessions
- User profile with display name
- Public access to deployed app with auth

### 2. Canvas Functionality
- **Viewport Controls**
  - Pan (click and drag background)
  - Zoom (mouse wheel)
  - Canvas dimensions: 5000x5000 pixels
  - Objects cannot be placed or dragged outside canvas boundaries (0,0 to 5000,5000)
  - Dragging is constrained to keep objects within bounds
  
- **Shape Creation**
  - Three basic shape types with fixed default sizes:
    - **Rectangle:** 100x100px, default color
    - **Circle:** 50px radius, default color  
    - **Text:** "Text" placeholder, 16px font size
  - Simple creation UI (toolbar)
  - Shapes spawn at center of current viewport (visible area)

- **Object Manipulation**
  - Move objects via drag and drop (using Konva)
  - Visual feedback during manipulation
  - 60 FPS performance during interactions

- **Object Locking**
  - First user to select/drag an object locks it for manipulation
  - Visual indicator (highlight/outline) shows when object is being manipulated by another user
  - Lock automatically releases when drag ends or user releases object
  - Other users see locked state but cannot interact with locked objects

- **Text Editing**
  - Double-click any text object to enter edit mode
  - Any user can edit any text object (no ownership restrictions)
  - Text object is locked from movement while in edit mode
  - Click outside or press Enter to finish editing
  - Editing user's lock is visible to other collaborators

### 3. Real-Time Collaboration
- **Multiplayer Cursors (via Broadcast)**
  - Show cursor positions for all connected users
  - Display user names next to cursors
  - Throttled to 30 FPS (33ms updates) to optimize performance
  - Ephemeral - no database writes
  - Target < 50ms latency
  - Each user assigned a random color for cursor differentiation
  - Cursor shape is consistent across all users (only color varies)

- **Presence Awareness**
  - Show list of currently online users
  - Visual indicators for active sessions
  - Track connection/disconnection events
  - Mark users as idle after period of inactivity
  - Visual differentiation for idle vs active users in presence list
  
- **State Synchronization (via Realtime)**
  - Broadcast object creation to all users
  - Broadcast object movement to all users
  - All changes persisted to Postgres
  - Target < 100ms sync latency for object changes
  - Persist canvas state when all users disconnect
  - Restore full state when users reconnect
  - Subscribe to Postgres changes via Supabase Realtime

- **Conflict Resolution & Object Locking**
  - First user to select/drag an object acquires exclusive lock
  - Locked objects show visual feedback to all other users
  - Other users cannot interact with locked objects until lock is released
  - Lock automatically releases on drag end or object deselect
  - For simultaneous database writes (edge cases): "last write wins" based on Postgres timestamp
  - Document locking mechanism in code comments

### 4. Deployment
- Publicly accessible URL
- Support 5+ concurrent users
- Stable performance under load

---

## Technical Stack Recommendations

### Why Supabase?

**Supabase Realtime for Objects**
- Built on Postgres logical replication
- Changes to `canvas_objects` table automatically broadcast to subscribed clients
- Automatic conflict resolution via database constraints
- Persistent storage included
- Row-level security for access control

**Supabase Broadcast for Cursors**
- WebSocket-based pub/sub (no database writes)
- Extremely low latency for ephemeral data
- Perfect for high-frequency updates like cursor positions
- No storage costs
- Automatically handles presence

**Supabase Auth**
- Built-in user management
- JWT tokens for secure API access
- Email/password authentication
- User metadata storage (display names)
- Row-level security integration

### Konva.js for Canvas

**Why Konva + React?**
- `react-konva` provides React bindings
- Built-in drag-and-drop functionality
- Event handling for shapes (click, drag, hover)
- Layer management out of the box
- Excellent performance with hundreds of shapes
- Transform capabilities (move, scale, rotate) built-in
- TypeScript support

**Canvas Architecture with Konva:**
```typescript
<Stage> {/* Root canvas container */}
  <Layer> {/* Background layer */}
    {/* Grid, guides, etc */}
  </Layer>
  <Layer> {/* Objects layer */}
    {shapes.map(shape => (
      <Shape key={shape.id} draggable onDragEnd={handleSync} />
    ))}
  </Layer>
  <Layer> {/* Cursors layer */}
    {cursors.map(cursor => <Cursor key={cursor.userId} />)}
  </Layer>
</Stage>
```

### Vite + React + TypeScript

**Why this combo?**
- Vite: Instant HMR, fast builds, optimized for modern browsers
- React: Component model maps well to canvas objects
- TypeScript: Type safety for Supabase queries and canvas state
- Excellent DX for 24-hour sprint

---

## Data Schema

### Supabase Tables

**users (handled by Supabase Auth)**
```sql
-- Managed by Supabase Auth
id (uuid)
email (text)
created_at (timestamp)
```

**profiles**
```sql
id (uuid, FK to auth.users)
display_name (text)
created_at (timestamp)
-- Display name automatically generated from email (prefix before @)
-- Example: john.doe@example.com → "john.doe"
```

**canvas_objects**
```sql
id (uuid, PK)
type (text) -- 'rectangle' | 'circle' | 'text'
x (float)
y (float)
width (float, nullable for circles)
height (float, nullable for circles)
radius (float, nullable for rectangles/text)
fill (text) -- hex color
text_content (text, nullable)
font_size (int, nullable)
created_by (uuid, FK to profiles)
created_at (timestamp)
updated_at (timestamp)
locked_by (uuid, nullable, FK to profiles) -- User currently manipulating object
lock_acquired_at (timestamp, nullable) -- When lock was acquired
```

**Row-Level Security:**
- All authenticated users can read all objects
- All authenticated users can insert/update/delete any object (collaborative model)
- Object locking handled at application layer, not database layer

### Supabase Channels

**Channel: "canvas-objects"**
- Type: Realtime (Postgres changes)
- Subscription: All inserts, updates, deletes on `canvas_objects`

**Channel: "canvas-cursors"**
- Type: Broadcast
- Payload: `{ userId, displayName, x, y, timestamp }`
- No persistence

---

## Implementation Strategy

### Critical Path (Priority Order)

**Phase 1: Foundation**
1. Set up Supabase project (database, auth, API keys)
2. Initialize Vite + React + TypeScript project
3. Install dependencies (Konva, Supabase client, Tailwind)
4. Set up basic routing (login/canvas)
5. Deploy skeleton to Vercel

**Phase 2: Authentication**
1. Implement Supabase Auth UI (email/password)
2. Create profiles table and trigger
3. Protected canvas route
4. User session management

**Phase 3: Basic Canvas**
1. Set up Konva Stage with pan/zoom
2. Create toolbar for shape creation
3. Implement one shape type (rectangle) with drag-and-drop
4. Local state management (before sync)

**Phase 4: Multiplayer Core (MOST CRITICAL)**
1. Set up Supabase Realtime channel for objects
2. Subscribe to canvas_objects table changes
3. Sync object creation to Postgres
4. Sync object movement to Postgres
5. Test with 2 browser windows

**Phase 5: Cursors & Presence**
1. Set up Supabase Broadcast channel for cursors
2. Throttle cursor updates to 30fps
3. Render other users' cursors
4. Add presence tracking (online users list)

**Phase 6: Additional Shapes**
1. Add circle creation
2. Add text creation
3. Ensure all shapes sync properly

**Phase 7: Polish & Testing**
1. Optimize render performance
2. Test with 5+ concurrent users
3. Handle edge cases (disconnection, rapid updates)
4. Final deployment

---

## Not Included in MVP

### Features Explicitly Out of Scope
- Selection of multiple objects
- Shift-click or drag-to-select
- Layer management/reordering
- Delete or duplicate operations
- Resize or rotate transformations (objects are fixed size)
- Color picker or custom styling (use default colors)
- Undo/redo
- Copy/paste
- Export/save as image
- Canvas grid or rulers
- Snap-to-grid functionality
- Object grouping
- Z-index controls beyond default stacking
- User onboarding, tutorials, or help documentation
- Welcome screens or guided tours

### Technical Simplifications for MVP
- Fixed shape sizes (no resize handles)
- Default colors only (no color customization)
- Email/password auth only (no OAuth)
- Single canvas per deployment (no multiple rooms/projects)
- **Error handling strategy:**
  - Connection drops: Automatic reconnection attempts with visual feedback
  - Object creation failures: Display error message to user
  - Other transient errors: Silent retry with exponential backoff
  - No offline queue (requires active connection)
- Desktop-only (no mobile optimization)
- Modern browsers only (Chrome/Firefox/Safari)
- Text editing is basic (no rich formatting)

---

## Success Metrics

### Hard Requirements (Must Pass MVP Gate)
- [x] Authentication works (users can register/login via Supabase Auth) ✅ PR #3
- [x] Three shape types can be created (rectangle, circle, text) ✅ PR #5
- [x] Objects can be moved via drag-and-drop ✅ PR #5
- [x] Pan and zoom work smoothly at 60 FPS ✅ PR #4
- [ ] 2+ users see each other's cursors with names in real-time (PR #7)
- [ ] Real-time sync works (create/move visible to all users < 100ms) (PR #6)
- [ ] Presence awareness shows who's online (PR #8)
- [ ] Canvas state persists in Postgres across refreshes (PR #6)
- [ ] Deployed to Vercel and publicly accessible (PR #10)
- [ ] Supports 5+ concurrent users without degradation (PR #9)
- [ ] Broadcast channel handles cursor updates (no DB writes) (PR #7)
- [ ] Realtime channel handles object updates (with DB persistence) (PR #6)
- [ ] Object locking prevents simultaneous manipulation conflicts (PR #6)
- [ ] Visual feedback shows when objects are being manipulated by others (PR #6)
- [ ] Idle users are marked appropriately in presence UI (PR #8)
- [ ] Automatic reconnection works after connection drops (PR #6)

### Testing Checklist
- [ ] 2 users in different browsers can edit simultaneously (PR #6)
- [ ] User refreshes mid-edit and canvas state persists (PR #6)
- [ ] 10+ shapes created/moved rapidly sync correctly (PR #6)
- [ ] Disconnected user can reconnect and see current state (PR #6)
- [ ] 5 users can work simultaneously without FPS drops (PR #9)
- [ ] Cursor throttling at 30fps (no excessive updates) (PR #7)
- [ ] Object updates flow through Postgres (verify in Supabase dashboard) (PR #6)
- [x] Objects cannot be dragged outside canvas boundaries (0,0 to 5000,5000) ✅ PR #5
- [ ] Visual feedback appears when another user is manipulating an object (PR #6)
- [ ] Object locks prevent simultaneous manipulation (PR #6)
- [x] Text editing locks object from movement ✅ PR #5

---

## Risk Assessment

### High Risk Items
- **Supabase Realtime subscription setup:** Getting the channel config right
  - *Mitigation:* Follow Supabase docs closely, test early with 2 clients
  
- **Cursor performance:** Broadcast channel optimization
  - *Mitigation:* Implement throttling from the start (30fps max)
  
- **Konva drag events syncing:** Ensuring drag end updates Postgres
  - *Mitigation:* Use `onDragEnd` event, not `onDragMove`

### Medium Risk
- **Postgres schema design:** Getting the canvas_objects table structure right
  - *Mitigation:* Keep it simple, add columns only as needed
  
- **Row-level security:** Balancing security with collaboration needs
  - *Mitigation:* Start permissive for MVP, can tighten later

### Low Risk
- **Vercel deployment:** Well-documented, reliable
- **Supabase Auth:** Battle-tested, straightforward implementation
- **Konva performance:** Library is mature and performant

---

## Key Technical Decisions

### Cursor Updates: Why Broadcast?
- **Problem:** Writing every cursor move to Postgres would be ~60 writes/second/user
- **Solution:** Use Broadcast channel (ephemeral WebSocket pub/sub)
- **Benefit:** Zero database load, lower latency, no storage costs
- **Trade-off:** Cursors don't persist (acceptable - they're ephemeral by nature)

### Object Updates: Why Realtime?
- **Problem:** Canvas state must persist and survive refreshes
- **Solution:** Write all objects to Postgres, subscribe via Realtime
- **Benefit:** Single source of truth, automatic conflict resolution, audit trail
- **Trade-off:** Slightly higher latency than pure WebSocket (but still < 100ms)

### Throttling Strategy
```typescript
// Cursor updates: 30fps (33ms)
const throttledCursorUpdate = throttle((x, y) => {
  channel.send({
    type: 'broadcast',
    event: 'cursor',
    payload: { x, y, userId, displayName }
  })
}, 33)

// Object updates: Immediate on drag end (not during drag)
const handleDragEnd = async (shape) => {
  await supabase
    .from('canvas_objects')
    .update({ x: shape.x(), y: shape.y() })
    .eq('id', shape.id())
}
```

---

## Questions & Clarifications

### Resolved
- ✅ Timeline: Exactly 24 hours, no flex
- ✅ Shapes: Rectangle, circle, and text (fixed sizes)
- ✅ Auth: Supabase Auth (email/password)
- ✅ Database: Supabase Postgres + Realtime + Broadcast
- ✅ Canvas: Konva.js with react-konva
- ✅ Cursor throttling: 30 FPS (33ms intervals)
- ✅ Canvas dimensions: 5000x5000 pixels
- ✅ Deployment: Vercel
- ✅ Canvas access: Single global canvas for MVP
- ✅ Permissions: Any user can manipulate any object
- ✅ Conflict resolution: Object locking with visual feedback
- ✅ Display names: Auto-generated from email prefix
- ✅ Cursor colors: Random per user
- ✅ Object boundaries: Constrained to canvas (0,0 to 5000,5000)
- ✅ Shape spawn: Center of viewport
- ✅ Error handling: Reconnection attempts, error messages, silent retries

### Resolved Implementation Decisions

1. **Shape default colors:**
   - Rectangle: Blue (#3B82F6)
   - Circle: Red (#EF4444)
   - Text: Black (#000000)

2. **Text creation UX:**
   - Text spawns with "Text" placeholder
   - Double-click to edit text content
   - Click outside or press Enter to finish editing
   - Any user can edit any text object
   - Text is locked from movement during editing

3. **Zoom behavior:**
   - Min/max zoom levels: 0.1x to 5x
   - Zoom toward mouse position

4. **Presence UI:**
   - User list in sidebar (shows online users with avatars/names)
   - Cursor labels (name tags follow each cursor)
   - Each user gets randomly assigned color for cursor
   - Idle users marked with visual differentiation

5. **Object creation position:**
   - Center of current viewport (visible area after pan/zoom)
   - Objects constrained within canvas boundaries (0,0 to 5000,5000)

6. **Conflict resolution:**
   - First user to select object acquires exclusive lock
   - Visual feedback shows when objects are locked by others
   - Lock released automatically on drag end
   - For edge cases: "last write wins" based on server timestamp

7. **Display names:**
   - Automatically generated from email (prefix before @)
   - Example: john.doe@example.com → "john.doe"

8. **Canvas access model:**
   - Single global canvas for MVP
   - All authenticated users collaborate on same canvas
   - Any user can manipulate any object

---

## Next Steps

1. **Set up Supabase project** (create account, new project, get API keys)
2. **Initialize Vite project** with React + TypeScript template
3. **Install dependencies:**
   ```bash
   pnpm install @supabase/supabase-js konva react-konva
   pnpm install -D @types/react-konva
   pnpm install -D tailwindcss postcss autoprefixer
   ```
4. **Create database schema** in Supabase SQL editor (including locking fields)
5. **Build authentication flow** (login/signup with auto-generated display names)
6. **Implement basic canvas** with one shape and boundary constraints
7. **Implement object locking mechanism** with visual feedback
8. **Connect Realtime channel** for object sync
9. **Add Broadcast channel** for cursors with random colors
10. **Implement presence and idle detection**
11. **Deploy to Vercel** and test with multiple users