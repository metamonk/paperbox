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
2. Run the migrations in `supabase/migrations/` in order:
   - `001_initial_schema.sql` - Creates tables and triggers
   - `002_rls_policies.sql` - Sets up Row Level Security
   - `003_add_cascade_delete.sql` - Adds cascade delete constraints
3. Enable Realtime for the `canvas_objects` table
4. Configure RLS policies as specified in the migrations

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

### ✅ Currently Implemented (PRs #1-5)
- **Authentication:** Secure user authentication via Supabase Auth
- **Shape Creation:** Create rectangles, circles, and text objects
- **Object Manipulation:** Drag shapes within canvas boundaries
- **Text Editing:** Double-click text objects to edit content
- **Pan & Zoom:** Navigate large canvases (5000x5000px) with smooth controls
- **Canvas Boundaries:** Objects constrained to 0,0 - 5000,5000 pixels

### 🚧 Coming Soon (PRs #6-10)
- **Real-time Collaboration:** Multiple users working simultaneously (PR #6)
- **Object Locking:** First user to drag acquires exclusive lock (PR #6)
- **Live Cursors:** See other users' cursor positions with unique colors (PR #7)
- **User Presence:** See who's online and detect idle users (PR #8)

## 📖 Documentation

See the `docs/` folder for detailed documentation:

- **PRD.md** - Product requirements and specifications
- **TASKS.md** - Development task breakdown and progress tracking
- **DIAGRAM.md** - Architecture diagrams (Mermaid format)

## 🔒 Key Architecture Decisions

- **Single Global Canvas:** MVP uses one shared canvas for all users
- **Two-Channel System:**
  - Broadcast channel for ephemeral cursor positions (30 FPS)
  - Realtime channel for persistent object state (database-backed)
- **Object Locking:** First-to-drag acquires lock, prevents conflicts
- **Auto-generated Display Names:** Derived from email prefix
- **Canvas Boundaries:** Objects constrained to 0,0 - 5000,5000 pixels

## 🚢 Deployment

The application is deployed on Vercel. Build command:

```bash
pnpm build
```

## 📝 License

Private project - not for public distribution.

## 🙏 Acknowledgments

Built as part of a 24-hour development sprint to demonstrate real-time collaboration capabilities.
