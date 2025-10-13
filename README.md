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
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` (to be created in PR #2)
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

- **Real-time Collaboration:** Multiple users can work on the same canvas simultaneously
- **Live Cursors:** See other users' cursor positions in real-time with unique colors
- **Shape Creation:** Create rectangles, circles, and text objects
- **Object Manipulation:** Drag, resize, and edit shapes
- **Object Locking:** First user to drag acquires exclusive lock
- **Pan & Zoom:** Navigate large canvases (5000x5000px)
- **User Presence:** See who's online and detect idle users
- **Authentication:** Secure user authentication via Supabase Auth

## 📖 Documentation

See the `docs/` folder for detailed documentation:

- **PRD.md** - Product requirements and specifications
- **TASKS.md** - Development task breakdown
- **DIAGRAM.md** - Architecture diagrams
- **SESSION_HANDOFF.md** - Development progress and handoff notes

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
