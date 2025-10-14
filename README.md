# CollabCanvas

A real-time collaborative design canvas where multiple users can simultaneously create, move, and manipulate shapes while seeing each other's cursors in real-time. Built as a Figma clone MVP.

## 🚀 Tech Stack

- **Frontend:** Vite + React 19 + TypeScript + Konva.js + Tailwind CSS v4
- **Backend:** Supabase (Postgres + Realtime + Broadcast + Auth)
- **Package Manager:** pnpm (strictly enforced)

## 📋 Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0
- Supabase account (for backend services)

## 🛠️ Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your Supabase credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase project URL and anon key:

```env
VITE_PUBLIC_SUPABASE_URL=your-supabase-project-url
VITE_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings → API
3. Run the migrations in `supabase/migrations/` in order:
   - `001_initial_schema.sql` - Creates tables and triggers
   - `002_rls_policies.sql` - Sets up Row Level Security
   - `003_add_cascade_delete.sql` - Adds cascade delete constraints
   - `004_configure_realtime.sql` - Configures Realtime with REPLICA IDENTITY FULL
   - `005_add_performance_indexes.sql` - Adds indexes for faster queries
   - `006_add_rotation_column.sql` - Adds rotation support for transformations
4. Enable Realtime for `canvas_objects` table (Database → Replication → Enable for table)
5. RLS policies are automatically applied via migrations

## 🏃 Development

Start the development server:

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`

## 🧪 Testing

Run tests:

```bash
pnpm test
```

Run tests with UI:

```bash
pnpm test:ui
```

Run tests with coverage:

```bash
pnpm test:coverage
```

## 🏗️ Project Structure

```
collabcanvas/
├── docs/                          # Project documentation
├── src/
│   ├── components/
│   │   ├── auth/                 # Authentication components
│   │   ├── canvas/               # Canvas and shape components
│   │   ├── collaboration/        # Cursor and presence components
│   │   └── layout/               # Layout components
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Libraries and utilities
│   │   ├── supabase.ts          # Supabase client
│   │   └── constants.ts         # App constants
│   ├── pages/                    # Page components
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   └── test/                     # Test setup and utilities
├── supabase/
│   └── migrations/               # Database migrations
└── public/                       # Static assets
```

## 🎨 Features

### ✅ Implemented Features (MVP Complete)

**Core Canvas**
- **Pan & Zoom:** Navigate large canvases (5000x5000px) with smooth 60 FPS controls
- **Shape Creation:** Create rectangles, circles, and text objects with keyboard shortcuts (R/C/T)
- **Object Manipulation:** Drag, resize, and rotate shapes with Konva Transformer
- **Text Editing:** Inline text editing with HTML overlay
- **Canvas Boundaries:** Objects constrained to 0,0 - 5000,5000 pixels

**Authentication & Security**
- **Supabase Auth:** Secure email/password authentication
- **Row-Level Security:** PostgreSQL RLS policies for data protection
- **Auto-generated Display Names:** Derived from email prefix

**Real-Time Collaboration**
- **Object Synchronization:** All shape changes sync via Supabase Realtime (< 100ms latency)
- **Object Locking:** First user to drag acquires exclusive lock, prevents conflicts
- **Visual Lock Feedback:** Red outline when object locked by another user
- **Automatic Reconnection:** Robust reconnection with exponential backoff

**Multiplayer Features**
- **Live Cursors:** See other users' cursor positions with unique colors (30 FPS throttled)
- **User Presence:** Online user list with avatar initials and status indicators
- **Idle Detection:** Automatically marks users idle after 2 minutes of inactivity
- **Activity Tracking:** Updates on mouse movement and shape interactions

**Performance & Polish**
- **React.memo Optimization:** 50-70% reduction in unnecessary re-renders
- **Konva Performance Flags:** Optimized rendering for smooth interactions
- **Error Boundaries:** Graceful error handling with recovery UI
- **Skeleton Loading:** Enhanced loading states for better perceived performance
- **Error Recovery:** Automatic position revert on failed database updates

## 📖 Documentation

See the `docs/` folder for detailed documentation:

- **PRD.md** - Product requirements and specifications
- **TASKS.md** - Development task breakdown and progress tracking
- **DIAGRAM.md** - Architecture diagrams (Mermaid format)

## 🔒 Key Architecture Decisions

### Two-Channel System
- **Broadcast Channel** (`canvas-cursors`): Ephemeral cursor positions, 30 FPS throttled, no database writes
- **Realtime Channel** (`canvas-objects`): Persistent object state, Postgres-backed, < 100ms sync latency
- **Presence Channel** (`canvas-presence`): User online/offline/idle status tracking

### Collaboration Model
- **Single Global Canvas:** MVP uses one shared canvas for all authenticated users
- **Object Locking:** First-to-drag acquires exclusive lock via database transaction
- **Visual Feedback:** Locked objects show red outline to other users
- **Optimistic Updates:** Immediate local feedback with database sync and error recovery

### Performance Optimizations
- **Unique Channel Names:** Each client gets unique Realtime channel with timestamp to prevent conflicts
- **React.memo:** All shape components memoized with custom comparison functions
- **Throttling:** Cursor updates limited to 33ms (30 FPS), activity updates to 5 seconds
- **Indexed Queries:** Database indexes on `created_at`, `locked_by`, and `z_index`
- **Konva Flags:** `perfectDrawEnabled={false}` and `shadowForStrokeEnabled={false}`

### Data Model
- **Auto-generated Display Names:** Derived from email prefix (e.g., john.doe@example.com → "john.doe")
- **Canvas Boundaries:** Objects constrained to 0,0 - 5000,5000 pixels with drag bounds
- **Deterministic Colors:** Cursor and avatar colors generated from userId hash (8 color palette)

## 🚢 Deployment

### Vercel Deployment (Recommended)

1. **Connect Repository:**
   - Import project from GitHub in Vercel dashboard
   - Framework preset: Vite
   - Build command: `pnpm build`
   - Output directory: `dist`

2. **Configure Environment Variables:**
   ```
   VITE_PUBLIC_SUPABASE_URL=your-supabase-project-url
   VITE_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. **Deploy:**
   - Push to `main` branch triggers automatic deployment
   - SPA routing configured via `vercel.json`

### Manual Build

```bash
pnpm build
```

Production build output: `dist/`

### Testing Deployment

1. Create test account via signup form
2. Open in multiple browser windows/incognito tabs
3. Verify real-time features:
   - Object creation syncs across windows
   - Cursors appear for each user
   - Presence list shows all online users
   - Object locking prevents conflicts

## 📝 License

Private project - not for public distribution.

## 🙏 Acknowledgments

Built as part of a 24-hour development sprint to demonstrate real-time collaboration capabilities.
