# CollabCanvas MVP - Task List & PR Breakdown

## Project File Structure

```
collabcanvas/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── AuthLayout.tsx
│   │   ├── canvas/
│   │   │   ├── Canvas.tsx
│   │   │   ├── CanvasStage.tsx
│   │   │   ├── shapes/
│   │   │   │   ├── Rectangle.tsx
│   │   │   │   ├── Circle.tsx
│   │   │   │   └── Text.tsx
│   │   │   └── Toolbar.tsx
│   │   ├── collaboration/
│   │   │   ├── CursorOverlay.tsx
│   │   │   ├── UserList.tsx
│   │   │   └── PresenceBadge.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCanvas.ts
│   │   ├── useRealtimeObjects.ts
│   │   ├── useBroadcastCursors.ts
│   │   └── usePresence.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── constants.ts
│   ├── types/
│   │   ├── canvas.ts
│   │   ├── user.ts
│   │   └── database.ts
│   ├── utils/
│   │   ├── throttle.ts
│   │   └── canvas-helpers.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── CanvasPage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       └── 002_rls_policies.sql
├── public/
├── .env.local
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

---

## PR #1: Project Setup & Configuration
**Branch:** `feat/project-setup`  
**Goal:** Initialize project with all dependencies and configuration files  
**Estimated Time:** 30-45 minutes

### Tasks:
- [ ] Initialize Vite + React + TypeScript project
  - **Command:** `npm create vite@latest collabcanvas -- --template react-ts`
  - **Files created:** `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`

- [ ] Install core dependencies
  ```bash
  npm install @supabase/supabase-js konva react-konva react-router-dom
  npm install -D @types/react-konva
  ```
  - **Files updated:** `package.json`

- [ ] Install and configure Tailwind CSS
  ```bash
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
  - **Files created:** `tailwind.config.js`, `postcss.config.js`
  - **Files updated:** `src/index.css`

- [ ] Install testing dependencies
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
  ```
  - **Files updated:** `package.json`

- [ ] Configure Vitest
  - **Files updated:** `vite.config.ts`
  - **Content:**
    ```ts
    import { defineConfig } from 'vite'
    import react from '@vitejs/plugin-react'
    
    export default defineConfig({
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
      },
    })
    ```

- [ ] Create test setup file
  - **Files created:** `src/test/setup.ts`
  - **Content:**
    ```ts
    import { expect, afterEach } from 'vitest'
    import { cleanup } from '@testing-library/react'
    import * as matchers from '@testing-library/jest-dom/matchers'
    
    expect.extend(matchers)
    
    afterEach(() => {
      cleanup()
    })
    ```

- [ ] Set up environment variables
  - **Files created:** `.env.local`, `.env.example`, `.env.test`
  - **Content:**
    ```
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_anon_key
    ```

- [ ] Create project structure (all folders)
  - **Folders created:** `src/components/`, `src/hooks/`, `src/lib/`, `src/types/`, `src/utils/`, `src/pages/`, `src/test/`, `supabase/migrations/`

- [ ] Set up Supabase client
  - **Files created:** `src/lib/supabase.ts`
  - **Content:** Initialize Supabase client with env vars

- [ ] Create TypeScript type definitions
  - **Files created:** 
    - `src/types/canvas.ts` (CanvasObject, Shape types)
    - `src/types/user.ts` (User, Profile types)
    - `src/types/database.ts` (Supabase table types)

- [ ] Create constants file
  - **Files created:** `src/lib/constants.ts`
  - **Content:** Canvas dimensions, default colors, zoom limits

- [ ] Update .gitignore
  - **Files updated:** `.gitignore`
  - **Add:** `.env.local`, `.env.test`, `node_modules/`, `dist/`, `coverage/`

- [ ] Create README with setup instructions
  - **Files created:** `README.md`

- [ ] Add test scripts to package.json
  - **Files updated:** `package.json`
  - **Content:**
    ```json
    {
      "scripts": {
        "test": "vitest",
        "test:ui": "vitest --ui",
        "test:coverage": "vitest --coverage"
      }
    }
    ```

### Tests:
- [ ] **Unit Test: Canvas Constants**
  - **Files created:** `src/lib/__tests__/constants.test.ts`
  - **Purpose:** Verify constants are correctly defined
  - **Content:**
    ```ts
    import { describe, it, expect } from 'vitest'
    import { CANVAS_WIDTH, CANVAS_HEIGHT, MIN_ZOOM, MAX_ZOOM, SHAPE_DEFAULTS } from '../constants'
    
    describe('Canvas Constants', () => {
      it('should have correct canvas dimensions', () => {
        expect(CANVAS_WIDTH).toBe(5000)
        expect(CANVAS_HEIGHT).toBe(5000)
      })
      
      it('should have valid zoom limits', () => {
        expect(MIN_ZOOM).toBe(0.1)
        expect(MAX_ZOOM).toBe(5)
        expect(MIN_ZOOM).toBeLessThan(MAX_ZOOM)
      })
      
      it('should have correct shape defaults', () => {
        expect(SHAPE_DEFAULTS.rectangle).toEqual({
          width: 100,
          height: 100,
          fill: '#3B82F6'
        })
        expect(SHAPE_DEFAULTS.circle).toEqual({
          radius: 50,
          fill: '#EF4444'
        })
        expect(SHAPE_DEFAULTS.text).toEqual({
          textContent: 'Text',
          fontSize: 16,
          fill: '#000000'
        })
      })
    })
    ```

**Commit Message:** `feat: initialize project with Vite, React, TypeScript, Tailwind, and Vitest`

---

## PR #2: Supabase Database Schema & Setup
**Branch:** `feat/database-schema`  
**Goal:** Set up Supabase project and create database schema  
**Estimated Time:** 30 minutes

### Tasks:
- [ ] Create Supabase project (via dashboard)
  - Get project URL and anon key
  - Update `.env.local` with credentials

- [ ] Create initial schema migration
  - **Files created:** `supabase/migrations/001_initial_schema.sql`
  - **Content:**
    ```sql
    -- Create profiles table
    CREATE TABLE profiles (
      id UUID REFERENCES auth.users PRIMARY KEY,
      display_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create canvas_objects table
    CREATE TABLE canvas_objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL CHECK (type IN ('rectangle', 'circle', 'text')),
      x FLOAT NOT NULL,
      y FLOAT NOT NULL,
      width FLOAT,
      height FLOAT,
      radius FLOAT,
      fill TEXT NOT NULL,
      text_content TEXT,
      font_size INT,
      created_by UUID REFERENCES profiles(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      locked_by UUID REFERENCES profiles(id),
      lock_acquired_at TIMESTAMPTZ
    );

    -- Create function to auto-create profile on signup
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, display_name)
      VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Create trigger for new user signup
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Add trigger to canvas_objects
    CREATE TRIGGER update_canvas_objects_updated_at
      BEFORE UPDATE ON canvas_objects
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ```

- [ ] Create RLS policies migration
  - **Files created:** `supabase/migrations/002_rls_policies.sql`
  - **Content:**
    ```sql
    -- Enable RLS
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;

    -- Profiles policies
    CREATE POLICY "Profiles are viewable by everyone"
      ON profiles FOR SELECT
      USING (true);

    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id);

    -- Canvas objects policies (collaborative model - any user can manipulate any object)
    CREATE POLICY "Canvas objects are viewable by everyone"
      ON canvas_objects FOR SELECT
      USING (true);

    CREATE POLICY "Authenticated users can insert canvas objects"
      ON canvas_objects FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can update any canvas object"
      ON canvas_objects FOR UPDATE
      USING (auth.role() = 'authenticated');

    CREATE POLICY "Authenticated users can delete any canvas object"
      ON canvas_objects FOR DELETE
      USING (auth.role() = 'authenticated');
    ```

- [ ] Run migrations in Supabase dashboard
  - Execute SQL in Supabase SQL Editor

- [ ] Enable Realtime for canvas_objects table
  - In Supabase dashboard: Database → Replication
  - Enable for `canvas_objects` table

- [ ] Update database types
  - **Files updated:** `src/types/database.ts`
  - Add generated types from Supabase

**Commit Message:** `feat: add database schema with profiles and canvas_objects tables`

---

## PR #3: Authentication System
**Branch:** `feat/authentication`  
**Goal:** Implement complete auth flow with login, signup, and protected routes  
**Estimated Time:** 1-1.5 hours

### Tasks:
- [ ] Create auth hook
  - **Files created:** `src/hooks/useAuth.ts`
  - **Content:** 
    - `signUp(email, password)` - display name auto-generated from email prefix
    - `signIn(email, password)`
    - `signOut()`
    - `user` state
    - `loading` state
    - Note: Display name extracted from email (prefix before @)

- [ ] Create auth layout component
  - **Files created:** `src/components/auth/AuthLayout.tsx`
  - **Content:** Centered layout with logo/title

- [ ] Create login form component
  - **Files created:** `src/components/auth/LoginForm.tsx`
  - **Content:** Email/password inputs, submit button, link to signup

- [ ] Create signup form component
  - **Files created:** `src/components/auth/SignupForm.tsx`
  - **Content:** Email/password inputs, submit button, link to login
  - Note: Display name auto-generated from email, no input field needed

- [ ] Create login page
  - **Files created:** `src/pages/Login.tsx`
  - **Content:** Render AuthLayout + LoginForm

- [ ] Create signup page
  - **Files created:** `src/pages/Signup.tsx`
  - **Content:** Render AuthLayout + SignupForm

- [ ] Set up routing with protected routes
  - **Files updated:** `src/App.tsx`
  - **Content:**
    - React Router setup
    - Protected route wrapper
    - Routes: `/login`, `/signup`, `/canvas`
    - Redirect logic (auth → canvas, unauth → login)

- [ ] Update main entry point
  - **Files updated:** `src/main.tsx`
  - **Content:** Wrap App with Router

- [ ] Style auth forms with Tailwind
  - **Files updated:** 
    - `src/components/auth/LoginForm.tsx`
    - `src/components/auth/SignupForm.tsx`
    - `src/components/auth/AuthLayout.tsx`

### Tests:
- [ ] **Unit Test: useAuth Hook**
  - **Files created:** `src/hooks/__tests__/useAuth.test.ts`
  - **Purpose:** Verify auth state management and methods
  - **Content:**
    ```ts
    import { describe, it, expect, vi, beforeEach } from 'vitest'
    import { renderHook, waitFor } from '@testing-library/react'
    import { useAuth } from '../useAuth'
    import { supabase } from '../../lib/supabase'
    
    // Mock Supabase
    vi.mock('../../lib/supabase', () => ({
      supabase: {
        auth: {
          signUp: vi.fn(),
          signInWithPassword: vi.fn(),
          signOut: vi.fn(),
          getSession: vi.fn(),
          onAuthStateChange: vi.fn(() => ({
            data: { subscription: { unsubscribe: vi.fn() } }
          }))
        }
      }
    }))
    
    describe('useAuth', () => {
      beforeEach(() => {
        vi.clearAllMocks()
      })
      
      it('should initialize with loading state', () => {
        const { result } = renderHook(() => useAuth())
        expect(result.current.loading).toBe(true)
      })
      
      it('should sign up a new user with auto-generated display name', async () => {
        const mockUser = { id: '123', email: 'test@example.com' }
        vi.mocked(supabase.auth.signUp).mockResolvedValue({
          data: { user: mockUser, session: null },
          error: null
        })
        
        const { result } = renderHook(() => useAuth())
        
        await waitFor(async () => {
          await result.current.signUp('test@example.com', 'password')
        })
        
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password',
          options: {
            data: { display_name: 'test' }
          }
        })
      })
      
      it('should sign in an existing user', async () => {
        const mockUser = { id: '123', email: 'test@example.com' }
        vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
          data: { user: mockUser, session: {} as any },
          error: null
        })
        
        const { result } = renderHook(() => useAuth())
        
        await waitFor(async () => {
          await result.current.signIn('test@example.com', 'password')
        })
        
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password'
        })
      })
      
      it('should sign out user', async () => {
        vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null })
        
        const { result } = renderHook(() => useAuth())
        
        await waitFor(async () => {
          await result.current.signOut()
        })
        
        expect(supabase.auth.signOut).toHaveBeenCalled()
      })
    })
    ```

- [ ] **Integration Test: Login Form**
  - **Files created:** `src/components/auth/__tests__/LoginForm.test.tsx`
  - **Purpose:** Verify login form renders and submits correctly
  - **Content:**
    ```ts
    import { describe, it, expect, vi } from 'vitest'
    import { render, screen, fireEvent, waitFor } from '@testing-library/react'
    import { LoginForm } from '../LoginForm'
    import { BrowserRouter } from 'react-router-dom'
    
    const mockSignIn = vi.fn()
    
    vi.mock('../../../hooks/useAuth', () => ({
      useAuth: () => ({
        signIn: mockSignIn,
        loading: false,
        user: null
      })
    }))
    
    describe('LoginForm', () => {
      it('should render login form fields', () => {
        render(
          <BrowserRouter>
            <LoginForm />
          </BrowserRouter>
        )
        
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
      })
      
      it('should submit form with email and password', async () => {
        render(
          <BrowserRouter>
            <LoginForm />
          </BrowserRouter>
        )
        
        const emailInput = screen.getByLabelText(/email/i)
        const passwordInput = screen.getByLabelText(/password/i)
        const submitButton = screen.getByRole('button', { name: /sign in/i })
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
        fireEvent.change(passwordInput, { target: { value: 'password123' } })
        fireEvent.click(submitButton)
        
        await waitFor(() => {
          expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
        })
      })
      
      it('should display error for empty fields', async () => {
        render(
          <BrowserRouter>
            <LoginForm />
          </BrowserRouter>
        )
        
        const submitButton = screen.getByRole('button', { name: /sign in/i })
        fireEvent.click(submitButton)
        
        // Form validation should prevent submission
        expect(mockSignIn).not.toHaveBeenCalled()
      })
    })
    ```

**Commit Message:** `feat: implement authentication with login and signup flows`

---

## PR #4: Basic Canvas with Pan & Zoom
**Branch:** `feat/canvas-foundation`  
**Goal:** Create canvas workspace with pan, zoom, and viewport controls  
**Estimated Time:** 1-1.5 hours

### Tasks:
- [ ] Create canvas constants
  - **Files updated:** `src/lib/constants.ts`
  - **Content:**
    ```ts
    export const CANVAS_WIDTH = 5000;
    export const CANVAS_HEIGHT = 5000;
    export const MIN_ZOOM = 0.1;
    export const MAX_ZOOM = 5;
    export const ZOOM_SPEED = 0.1;
    ```

- [ ] Create canvas stage component
  - **Files created:** `src/components/canvas/CanvasStage.tsx`
  - **Content:**
    - Konva Stage and Layer setup
    - Pan implementation (draggable stage)
    - Zoom implementation (wheel event handler)
    - Stage dimensions and positioning
    - Background/grid layer (optional)

- [ ] Create canvas utilities
  - **Files created:** `src/utils/canvas-helpers.ts`
  - **Content:**
    - `getViewportCenter()` - calculate center of visible area
    - `clampZoom(scale)` - enforce min/max zoom
    - `screenToCanvas(x, y)` - coordinate transformation
    - `constrainToBounds(x, y, width, height)` - keep objects within canvas boundaries (0,0 to 5000,5000)

- [ ] Create canvas hook
  - **Files created:** `src/hooks/useCanvas.ts`
  - **Content:**
    - `stageRef` for Konva stage reference
    - `scale` state for zoom level
    - `position` state for pan offset
    - `handleWheel` for zoom
    - `handleDragEnd` for pan

- [ ] Create main canvas component
  - **Files created:** `src/components/canvas/Canvas.tsx`
  - **Content:**
    - Container with sidebar and canvas area
    - Render CanvasStage
    - Basic layout structure

- [ ] Create canvas page
  - **Files created:** `src/pages/CanvasPage.tsx`
  - **Content:**
    - Render Canvas component
    - Auth check (redirect if not authenticated)

- [ ] Add canvas page to routing
  - **Files updated:** `src/App.tsx`
  - **Content:** Add `/canvas` route

- [ ] Style canvas layout
  - **Files updated:** 
    - `src/components/canvas/Canvas.tsx`
    - `src/components/canvas/CanvasStage.tsx`
  - **Content:** Full-height layout, overflow hidden

### Tests:
- [ ] **Unit Test: Canvas Helper Utilities**
  - **Files created:** `src/utils/__tests__/canvas-helpers.test.ts`
  - **Purpose:** Verify coordinate transformations and zoom clamping
  - **Content:**
    ```ts
    import { describe, it, expect } from 'vitest'
    import { getViewportCenter, clampZoom, screenToCanvas, canvasToScreen } from '../canvas-helpers'
    import { MIN_ZOOM, MAX_ZOOM } from '../../lib/constants'
    
    describe('Canvas Helpers', () => {
      describe('clampZoom', () => {
        it('should clamp zoom to minimum', () => {
          expect(clampZoom(0.05)).toBe(MIN_ZOOM)
          expect(clampZoom(0)).toBe(MIN_ZOOM)
          expect(clampZoom(-1)).toBe(MIN_ZOOM)
        })
        
        it('should clamp zoom to maximum', () => {
          expect(clampZoom(10)).toBe(MAX_ZOOM)
          expect(clampZoom(100)).toBe(MAX_ZOOM)
        })
        
        it('should not clamp valid zoom values', () => {
          expect(clampZoom(0.5)).toBe(0.5)
          expect(clampZoom(1)).toBe(1)
          expect(clampZoom(3)).toBe(3)
        })
      })
      
      describe('getViewportCenter', () => {
        it('should calculate center of viewport', () => {
          const stage = {
            width: () => 1000,
            height: () => 800,
            x: () => -500,
            y: () => -400,
            scaleX: () => 1,
            scaleY: () => 1
          }
          
          const center = getViewportCenter(stage as any)
          expect(center.x).toBe(1000) // (1000/2 - (-500)) / 1
          expect(center.y).toBe(800)  // (800/2 - (-400)) / 1
        })
        
        it('should account for zoom level', () => {
          const stage = {
            width: () => 1000,
            height: () => 800,
            x: () => 0,
            y: () => 0,
            scaleX: () => 2,
            scaleY: () => 2
          }
          
          const center = getViewportCenter(stage as any)
          expect(center.x).toBe(250) // (1000/2) / 2
          expect(center.y).toBe(200) // (800/2) / 2
        })
      })
      
      describe('screenToCanvas', () => {
        it('should convert screen coordinates to canvas coordinates', () => {
          const result = screenToCanvas(100, 100, 1, { x: 0, y: 0 })
          expect(result.x).toBe(100)
          expect(result.y).toBe(100)
        })
        
        it('should account for pan offset', () => {
          const result = screenToCanvas(100, 100, 1, { x: -50, y: -50 })
          expect(result.x).toBe(150)
          expect(result.y).toBe(150)
        })
        
        it('should account for zoom scale', () => {
          const result = screenToCanvas(100, 100, 2, { x: 0, y: 0 })
          expect(result.x).toBe(50)
          expect(result.y).toBe(50)
        })
      })
      
      describe('canvasToScreen', () => {
        it('should convert canvas coordinates to screen coordinates', () => {
          const result = canvasToScreen(100, 100, 1, { x: 0, y: 0 })
          expect(result.x).toBe(100)
          expect(result.y).toBe(100)
        })
        
        it('should account for pan offset', () => {
          const result = canvasToScreen(100, 100, 1, { x: 50, y: 50 })
          expect(result.x).toBe(150)
          expect(result.y).toBe(150)
        })
        
        it('should account for zoom scale', () => {
          const result = canvasToScreen(100, 100, 2, { x: 0, y: 0 })
          expect(result.x).toBe(200)
          expect(result.y).toBe(200)
        })
      })
    })
    ```

- [ ] **Unit Test: useCanvas Hook**
  - **Files created:** `src/hooks/__tests__/useCanvas.test.ts`
  - **Purpose:** Verify canvas state management (zoom, pan)
  - **Content:**
    ```ts
    import { describe, it, expect } from 'vitest'
    import { renderHook, act } from '@testing-library/react'
    import { useCanvas } from '../useCanvas'
    import { MIN_ZOOM, MAX_ZOOM } from '../../lib/constants'
    
    describe('useCanvas', () => {
      it('should initialize with default scale and position', () => {
        const { result } = renderHook(() => useCanvas())
        
        expect(result.current.scale).toBe(1)
        expect(result.current.position).toEqual({ x: 0, y: 0 })
      })
      
      it('should update zoom within limits', () => {
        const { result } = renderHook(() => useCanvas())
        
        act(() => {
          result.current.setScale(2)
        })
        
        expect(result.current.scale).toBe(2)
        
        act(() => {
          result.current.setScale(10)
        })
        
        expect(result.current.scale).toBe(MAX_ZOOM)
        
        act(() => {
          result.current.setScale(0.01)
        })
        
        expect(result.current.scale).toBe(MIN_ZOOM)
      })
      
      it('should update position on pan', () => {
        const { result } = renderHook(() => useCanvas())
        
        act(() => {
          result.current.setPosition({ x: 100, y: 200 })
        })
        
        expect(result.current.position).toEqual({ x: 100, y: 200 })
      })
    })
    ```

**Commit Message:** `feat: implement canvas with pan and zoom functionality`

---

## PR #5: Shape Creation & Local Manipulation
**Branch:** `feat/shapes-local`  
**Goal:** Add toolbar and create shapes (rectangle, circle, text) with drag functionality  
**Estimated Time:** 1.5-2 hours

### Tasks:
- [ ] Update canvas types
  - **Files updated:** `src/types/canvas.ts`
  - **Content:**
    ```ts
    export type ShapeType = 'rectangle' | 'circle' | 'text';
    
    export interface CanvasObject {
      id: string;
      type: ShapeType;
      x: number;
      y: number;
      fill: string;
      createdBy: string;
      width?: number;
      height?: number;
      radius?: number;
      textContent?: string;
      fontSize?: number;
    }
    ```

- [ ] Update constants with shape defaults
  - **Files updated:** `src/lib/constants.ts`
  - **Content:**
    ```ts
    export const SHAPE_DEFAULTS = {
      rectangle: { width: 100, height: 100, fill: '#3B82F6' },
      circle: { radius: 50, fill: '#EF4444' },
      text: { textContent: 'Text', fontSize: 16, fill: '#000000' }
    };
    ```

- [ ] Create Rectangle shape component
  - **Files created:** `src/components/canvas/shapes/Rectangle.tsx`
  - **Content:**
    - Konva Rect component
    - Draggable prop
    - onDragEnd handler with boundary constraints
    - dragBoundFunc to constrain dragging within canvas (0,0 to 5000,5000)
    - Props: shape data, onUpdate callback

- [ ] Create Circle shape component
  - **Files created:** `src/components/canvas/shapes/Circle.tsx`
  - **Content:**
    - Konva Circle component
    - Draggable prop
    - onDragEnd handler with boundary constraints
    - dragBoundFunc to constrain dragging within canvas (0,0 to 5000,5000)
    - Props: shape data, onUpdate callback

- [ ] Create Text shape component
  - **Files created:** `src/components/canvas/shapes/Text.tsx`
  - **Content:**
    - Konva Text component
    - Draggable prop (disabled during editing)
    - Double-click to edit (transformer or input overlay)
    - Text locked from movement while in edit mode
    - onDragEnd handler with boundary constraints
    - dragBoundFunc to constrain dragging within canvas (0,0 to 5000,5000)
    - Props: shape data, onUpdate, onEdit callbacks
    - Note: Any user can edit any text object

- [ ] Create toolbar component
  - **Files created:** `src/components/canvas/Toolbar.tsx`
  - **Content:**
    - Three buttons: Add Rectangle, Add Circle, Add Text
    - onClick handlers to create shapes
    - Styled with Tailwind

- [ ] Update canvas hook with shape management
  - **Files updated:** `src/hooks/useCanvas.ts`
  - **Content:**
    - `shapes` state (local array of CanvasObject)
    - `addShape(type)` - create shape at viewport center
    - `updateShape(id, updates)` - update shape properties
    - `handleShapeDragEnd(id, position)` - update position

- [ ] Render shapes in canvas stage
  - **Files updated:** `src/components/canvas/CanvasStage.tsx`
  - **Content:**
    - Map over shapes array
    - Render appropriate shape component
    - Pass drag handlers

- [ ] Integrate toolbar into canvas
  - **Files updated:** `src/components/canvas/Canvas.tsx`
  - **Content:**
    - Render Toolbar
    - Pass shape creation handler

- [ ] Implement text editing
  - **Files updated:** `src/components/canvas/shapes/Text.tsx`
  - **Content:**
    - Double-click detection
    - Show input overlay or Konva Transformer
    - Update text content on blur/enter

### Tests:
- [ ] **Unit Test: Shape Creation Logic**
  - **Files created:** `src/hooks/__tests__/useCanvas.shapes.test.ts`
  - **Purpose:** Verify shapes are created with correct properties
  - **Content:**
    ```ts
    import { describe, it, expect, vi } from 'vitest'
    import { renderHook, act } from '@testing-library/react'
    import { useCanvas } from '../useCanvas'
    import { SHAPE_DEFAULTS } from '../../lib/constants'
    
    describe('useCanvas - Shape Creation', () => {
      it('should create rectangle with correct defaults', () => {
        const { result } = renderHook(() => useCanvas())
        
        act(() => {
          result.current.addShape('rectangle')
        })
        
        const shape = result.current.shapes[0]
        expect(shape.type).toBe('rectangle')
        expect(shape.width).toBe(SHAPE_DEFAULTS.rectangle.width)
        expect(shape.height).toBe(SHAPE_DEFAULTS.rectangle.height)
        expect(shape.fill).toBe(SHAPE_DEFAULTS.rectangle.fill)
        expect(shape.id).toBeDefined()
      })
      
      it('should create circle with correct defaults', () => {
        const { result } = renderHook(() => useCanvas())
        
        act(() => {
          result.current.addShape('circle')
        })
        
        const shape = result.current.shapes[0]
        expect(shape.type).toBe('circle')
        expect(shape.radius).toBe(SHAPE_DEFAULTS.circle.radius)
        expect(shape.fill).toBe(SHAPE_DEFAULTS.circle.fill)
      })
      
      it('should create text with correct defaults', () => {
        const { result } = renderHook(() => useCanvas())
        
        act(() => {
          result.current.addShape('text')
        })
        
        const shape = result.current.shapes[0]
        expect(shape.type).toBe('text')
        expect(shape.textContent).toBe(SHAPE_DEFAULTS.text.textContent)
        expect(shape.fontSize).toBe(SHAPE_DEFAULTS.text.fontSize)
        expect(shape.fill).toBe(SHAPE_DEFAULTS.text.fill)
      })
      
      it('should update shape position', () => {
        const { result } = renderHook(() => useCanvas())
        
        act(() => {
          result.current.addShape('rectangle')
        })
        
        const shapeId = result.current.shapes[0].id
        
        act(() => {
          result.current.updateShape(shapeId, { x: 200, y: 300 })
        })
        
        const updatedShape = result.current.shapes[0]
        expect(updatedShape.x).toBe(200)
        expect(updatedShape.y).toBe(300)
      })
      
      it('should handle multiple shapes', () => {
        const { result } = renderHook(() => useCanvas())
        
        act(() => {
          result.current.addShape('rectangle')
          result.current.addShape('circle')
          result.current.addShape('text')
        })
        
        expect(result.current.shapes).toHaveLength(3)
        expect(result.current.shapes[0].type).toBe('rectangle')
        expect(result.current.shapes[1].type).toBe('circle')
        expect(result.current.shapes[2].type).toBe('text')
      })
    })
    ```

- [ ] **Integration Test: Toolbar Shape Creation**
  - **Files created:** `src/components/canvas/__tests__/Toolbar.test.tsx`
  - **Purpose:** Verify toolbar buttons trigger shape creation
  - **Content:**
    ```ts
    import { describe, it, expect, vi } from 'vitest'
    import { render, screen, fireEvent } from '@testing-library/react'
    import { Toolbar } from '../Toolbar'
    
    describe('Toolbar', () => {
      it('should render all shape creation buttons', () => {
        const mockAddShape = vi.fn()
        
        render(<Toolbar onAddShape={mockAddShape} />)
        
        expect(screen.getByText(/rectangle/i)).toBeInTheDocument()
        expect(screen.getByText(/circle/i)).toBeInTheDocument()
        expect(screen.getByText(/text/i)).toBeInTheDocument()
      })
      
      it('should call onAddShape with rectangle type', () => {
        const mockAddShape = vi.fn()
        
        render(<Toolbar onAddShape={mockAddShape} />)
        
        const rectangleButton = screen.getByText(/rectangle/i)
        fireEvent.click(rectangleButton)
        
        expect(mockAddShape).toHaveBeenCalledWith('rectangle')
      })
      
      it('should call onAddShape with circle type', () => {
        const mockAddShape = vi.fn()
        
        render(<Toolbar onAddShape={mockAddShape} />)
        
        const circleButton = screen.getByText(/circle/i)
        fireEvent.click(circleButton)
        
        expect(mockAddShape).toHaveBeenCalledWith('circle')
      })
      
      it('should call onAddShape with text type', () => {
        const mockAddShape = vi.fn()
        
        render(<Toolbar onAddShape={mockAddShape} />)
        
        const textButton = screen.getByText(/text/i)
        fireEvent.click(textButton)
        
        expect(mockAddShape).toHaveBeenCalledWith('text')
      })
    })
    ```

**Commit Message:** `feat: add shape creation (rectangle, circle, text) with drag functionality`

---

## PR #6: Supabase Realtime - Object Synchronization & Locking
**Branch:** `feat/realtime-sync`  
**Goal:** Sync canvas objects across all users via Supabase Realtime with object locking  
**Estimated Time:** 2.5-3 hours

### Tasks:
- [ ] Create Realtime objects hook
  - **Files created:** `src/hooks/useRealtimeObjects.ts`
  - **Content:**
    - Subscribe to `canvas_objects` table via Realtime
    - Listen for INSERT, UPDATE, DELETE events
    - Local state management with Supabase data
    - `createObject(shape)` - insert to DB
    - `updateObject(id, updates)` - update in DB with lock check
    - `deleteObject(id)` - delete from DB (if time permits)
    - `acquireLock(id, userId)` - set locked_by and lock_acquired_at
    - `releaseLock(id)` - clear locked_by and lock_acquired_at
    - Handle reconnection
    - Handle lock conflicts (visual feedback only)

- [ ] Update canvas hook to use Realtime
  - **Files updated:** `src/hooks/useCanvas.ts`
  - **Content:**
    - Replace local `shapes` state with `useRealtimeObjects`
    - `addShape` now calls `createObject`
    - `updateShape` now calls `updateObject`
    - Handle loading state while fetching initial objects
    - Track which objects are locked and by whom

- [ ] Update shape components to sync on drag end with locking
  - **Files updated:**
    - `src/components/canvas/shapes/Rectangle.tsx`
    - `src/components/canvas/shapes/Circle.tsx`
    - `src/components/canvas/shapes/Text.tsx`
  - **Content:**
    - `onDragStart` acquires lock (first user wins)
    - `onDragEnd` calls parent's `updateObject` with new position and releases lock
    - Visual feedback when object is locked by another user (highlight/outline/stroke)
    - Disable dragging if object is locked by another user
    - Optimistic UI updates (immediate local feedback)

- [ ] Add loading state to canvas
  - **Files updated:** `src/components/canvas/Canvas.tsx`
  - **Content:**
    - Show loading spinner while fetching objects
    - Handle empty state (no objects yet)

- [ ] Add error handling
  - **Files updated:** `src/hooks/useRealtimeObjects.ts`
  - **Content:**
    - Try/catch for database operations
    - Display error message to user for object creation failures
    - Silent retry with exponential backoff for transient errors
    - Automatic reconnection attempts with visual feedback for connection drops

      it('should create object and sync to DB', async () => {
        const { result } = renderHook(() => useRealtimeObjects())
        
        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })
        
        const newShape = {
          type: 'circle' as const,
          x: 200,
          y: 200,
          radius: 50,
          fill: '#EF4444'
        }
        
        let createdId: string
        await waitFor(async () => {
          createdId = await result.current.createObject(newShape)
          testObjectIds.push(createdId!)
        })
        
        // Verify object appears in local state
        await waitFor(() => {
          const object = result.current.objects.find(o => o.id === createdId)
          expect(object).toBeDefined()
          expect(object?.type).toBe('circle')
        }, { timeout: 2000 })
        
        // Verify object exists in DB
        const { data } = await supabase
          .from('canvas_objects')
          .select()
          .eq('id', createdId!)
          .single()
        
        expect(data).toMatchObject({
          type: 'circle',
          x: 200,
          y: 200,
          radius: 50
        })
      })
      
      it('should update object and sync changes', async () => {
        // Create initial object
        const { data: initialObject } = await supabase
          .from('canvas_objects')
          .insert({
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 100,
            height: 100,
            fill: '#3B82F6'
          })
          .select()
          .single()
        
        testObjectIds.push(initialObject!.id)
        
        const { result } = renderHook(() => useRealtimeObjects())
        
        await waitFor(() => {
          expect(result.current.objects.length).toBeGreaterThan(0)
        })
        
        // Update object position
        await waitFor(async () => {
          await result.current.updateObject(initialObject!.id, {
            x: 300,
            y: 300
          })
        })
        
        // Verify update in local state
        await waitFor(() => {
          const updated = result.current.objects.find(o => o.id === initialObject!.id)
          expect(updated?.x).toBe(300)
          expect(updated?.y).toBe(300)
        }, { timeout: 2000 })
        
        // Verify update in DB
        const { data } = await supabase
          .from('canvas_objects')
          .select()
          .eq('id', initialObject!.id)
          .single()
        
        expect(data?.x).toBe(300)
        expect(data?.y).toBe(300)
      })
      
      it('should receive real-time updates from other clients', async () => {
        const { result } = renderHook(() => useRealtimeObjects())
        
        await waitFor(() => {
          expect(result.current.loading).toBe(false)
        })
        
        // Simulate another client creating an object
        const { data: newObject } = await supabase
          .from('canvas_objects')
          .insert({
            type: 'text',
            x: 400,
            y: 400,
            text_content: 'Test',
            font_size: 16,
            fill: '#000000'
          })
          .select()
          .single()
        
        testObjectIds.push(newObject!.id)
        
        // Wait for real-time event to propagate
        await waitFor(() => {
          const found = result.current.objects.find(o => o.id === newObject!.id)
          expect(found).toBeDefined()
          expect(found?.type).toBe('text')
        }, { timeout: 3000 })
      })
    })
    ```

**Commit Message:** `feat: implement real-time object synchronization with object locking`

---

## PR #7: Multiplayer Cursors with Broadcast
**Branch:** `feat/multiplayer-cursors`  
**Goal:** Show real-time cursor positions for all users via Supabase Broadcast with random colors  
**Estimated Time:** 1.5-2 hours

### Tasks:
- [ ] Create throttle utility
  - **Files created:** `src/utils/throttle.ts`
  - **Content:**
    ```ts
    export function throttle<T extends (...args: any[]) => any>(
      func: T,
      wait: number
    ): (...args: Parameters<T>) => void {
      let timeout: NodeJS.Timeout | null = null;
      let previous = 0;
      
      return function(this: any, ...args: Parameters<T>) {
        const now = Date.now();
        const remaining = wait - (now - previous);
        
        if (remaining <= 0 || remaining > wait) {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
          previous = now;
          func.apply(this, args);
        } else if (!timeout) {
          timeout = setTimeout(() => {
            previous = Date.now();
            timeout = null;
            func.apply(this, args);
          }, remaining);
        }
      };
    }
    ```

- [ ] Create broadcast cursors hook
  - **Files created:** `src/hooks/useBroadcastCursors.ts`
  - **Content:**
    - Connect to Supabase Broadcast channel `canvas-cursors`
    - `cursors` state (Map of userId → cursor position + name)
    - `sendCursorUpdate(x, y)` - throttled to 30fps (33ms)
    - Subscribe to cursor events from other users
    - Handle user disconnect (remove cursor)
    - Track local user ID

- [ ] Create cursor overlay component
  - **Files created:** `src/components/collaboration/CursorOverlay.tsx`
  - **Content:**
    - Render SVG cursor for each remote user
    - Position cursor using absolute positioning
    - Show name label next to cursor
    - Transform canvas coordinates to screen coordinates
    - Random color assignment per user (consistent for same userId)
    - Generate color from userId hash or use predefined color palette
    - Cursor shape is consistent across all users (only color varies)

- [ ] Integrate cursor broadcast into canvas
  - **Files updated:** `src/components/canvas/Canvas.tsx`
  - **Content:**
    - Add `onMouseMove` to canvas container
    - Call `sendCursorUpdate` with throttled mouse position
    - Render CursorOverlay with cursors data

- [ ] Convert canvas coordinates to screen coordinates
  - **Files updated:** `src/utils/canvas-helpers.ts`
  - **Content:**
    - `canvasToScreen(x, y, scale, stagePosition)` function
    - Account for zoom and pan transformations

- [ ] Style cursors
  - **Files updated:** `src/components/collaboration/CursorOverlay.tsx`
  - **Content:**
    - SVG cursor icon
    - Name label with background
    - Smooth transitions (CSS)

- [ ] Test cursor sync with multiple windows
  - Move mouse in window 1 → cursor appears in window 2
  - Verify 30fps throttling (no excessive updates)
  - Close window 1 → cursor disappears in window 2

### Tests:
- [ ] **Unit Test: Throttle Utility**
  - **Files created:** `src/utils/__tests__/throttle.test.ts`
  - **Purpose:** Verify throttle enforces rate limiting correctly
  - **Content:**
    ```ts
    import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
    import { throttle } from '../throttle'
    
    describe('throttle', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })
      
      afterEach(() => {
        vi.restoreAllMocks()
      })
      
      it('should call function immediately on first invocation', () => {
        const mockFn = vi.fn()
        const throttledFn = throttle(mockFn, 100)
        
        throttledFn()
        
        expect(mockFn).toHaveBeenCalledTimes(1)
      })
      
      it('should throttle subsequent calls', () => {
        const mockFn = vi.fn()
        const throttledFn = throttle(mockFn, 100)
        
        throttledFn()
        throttledFn()
        throttledFn()
        
        expect(mockFn).toHaveBeenCalledTimes(1)
      })
      
      it('should call function after wait time has passed', () => {
        const mockFn = vi.fn()
        const throttledFn = throttle(mockFn, 100)
        
        throttledFn()
        expect(mockFn).toHaveBeenCalledTimes(1)
        
        vi.advanceTimersByTime(50)
        throttledFn()
        expect(mockFn).toHaveBeenCalledTimes(1)
        
        vi.advanceTimersByTime(60)
        expect(mockFn).toHaveBeenCalledTimes(2)
      })
      
      it('should preserve function arguments', () => {
        const mockFn = vi.fn()
        const throttledFn = throttle(mockFn, 100)
        
        throttledFn('arg1', 'arg2')
        
        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      })
      
      it('should enforce 30fps throttling (33ms)', () => {
        const mockFn = vi.fn()
        const throttledFn = throttle(mockFn, 33)
        
        // Simulate rapid calls (like mousemove at 60fps = 16ms)
        for (let i = 0; i < 10; i++) {
          throttledFn()
          vi.advanceTimersByTime(16)
        }
        
        // Should have called roughly every 33ms = ~5 times in 160ms
        expect(mockFn.mock.calls.length).toBeLessThanOrEqual(6)
        expect(mockFn.mock.calls.length).toBeGreaterThanOrEqual(4)
      })
    })
    ```

- [ ] **Unit Test: useBroadcastCursors Hook**
  - **Files created:** `src/hooks/__tests__/useBroadcastCursors.test.ts`
  - **Purpose:** Verify cursor state management and broadcast logic
  - **Content:**
    ```ts
    import { describe, it, expect, vi, beforeEach } from 'vitest'
    import { renderHook, act, waitFor } from '@testing-library/react'
    import { useBroadcastCursors } from '../useBroadcastCursors'
    
    // Mock Supabase
    const mockSend = vi.fn()
    const mockSubscribe = vi.fn()
    const mockUnsubscribe = vi.fn()
    
    vi.mock('../../lib/supabase', () => ({
      supabase: {
        channel: vi.fn(() => ({
          on: vi.fn().mockReturnThis(),
          subscribe: mockSubscribe.mockReturnValue({
            unsubscribe: mockUnsubscribe
          }),
          send: mockSend
        }))
      }
    }))
    
    vi.mock('../useAuth', () => ({
      useAuth: () => ({
        user: { id: 'user-123', user_metadata: { display_name: 'Test User' } }
      })
    }))
    
    describe('useBroadcastCursors', () => {
      beforeEach(() => {
        vi.clearAllMocks()
      })
      
      it('should initialize with empty cursors map', () => {
        const { result } = renderHook(() => useBroadcastCursors())
        
        expect(result.current.cursors).toEqual(new Map())
      })
      
      it('should send cursor updates when sendCursorUpdate is called', () => {
        const { result } = renderHook(() => useBroadcastCursors())
        
        act(() => {
          result.current.sendCursorUpdate(100, 200)
        })
        
        expect(mockSend).toHaveBeenCalledWith({
          type: 'broadcast',
          event: 'cursor',
          payload: expect.objectContaining({
            x: 100,
            y: 200,
            userId: 'user-123',
            displayName: 'Test User'
          })
        })
      })
      
      it('should throttle rapid cursor updates', () => {
        vi.useFakeTimers()
        const { result } = renderHook(() => useBroadcastCursors())
        
        // Rapid fire updates
        act(() => {
          for (let i = 0; i < 10; i++) {
            result.current.sendCursorUpdate(i * 10, i * 10)
          }
        })
        
        // Should be throttled (less than 10 calls)
        expect(mockSend.mock.calls.length).toBeLessThan(10)
        
        vi.useRealTimers()
      })
      
      it('should cleanup subscription on unmount', () => {
        const { unmount } = renderHook(() => useBroadcastCursors())
        
        unmount()
        
        expect(mockUnsubscribe).toHaveBeenCalled()
      })
    })
    ```

**Commit Message:** `feat: add multiplayer cursors with Supabase Broadcast`

---

## PR #8: Presence Awareness & User List
**Branch:** `feat/presence-system`  
**Goal:** Show online users in sidebar with presence tracking and idle detection  
**Estimated Time:** 1-1.5 hours

### Tasks:
- [ ] Create presence hook
  - **Files created:** `src/hooks/usePresence.ts`
  - **Content:**
    - Use Supabase Broadcast presence tracking
    - `onlineUsers` state (array of {id, displayName, joinedAt, isIdle})
    - Track join/leave events
    - Implement idle detection (no activity for X minutes)
    - Update user activity timestamp on canvas interactions
    - Sync with `useBroadcastCursors` (same channel)

- [ ] Create user list component
  - **Files created:** `src/components/collaboration/UserList.tsx`
  - **Content:**
    - List of online users
    - User avatars (initials in circles)
    - Display names
    - Active indicator (green dot for active, gray/yellow for idle)
    - Visual differentiation for idle vs active users
    - Current user highlighted

- [ ] Create presence badge component
  - **Files created:** `src/components/collaboration/PresenceBadge.tsx`
  - **Content:**
    - Small component showing "X users online"
    - Used in header or sidebar

- [ ] Create sidebar component
  - **Files created:** `src/components/layout/Sidebar.tsx`
  - **Content:**
    - Fixed sidebar (right side)
    - Render UserList
    - Collapsible (optional for MVP)

- [ ] Create header component
  - **Files created:** `src/components/layout/Header.tsx`
  - **Content:**
    - App title
    - PresenceBadge
    - Sign out button

- [ ] Integrate sidebar into canvas
  - **Files updated:** `src/components/canvas/Canvas.tsx`
  - **Content:**
    - Layout: header + main (canvas + sidebar)
    - Pass presence data to UserList

- [ ] Style presence UI
  - **Files updated:**
    - `src/components/collaboration/UserList.tsx`
    - `src/components/collaboration/PresenceBadge.tsx`
    - `src/components/layout/Sidebar.tsx`
    - `src/components/layout/Header.tsx`
  - **Content:** Tailwind styling, avatars, badges

- [ ] Test presence with multiple windows
  - Open 3+ windows → see all users in list
  - Close window → user disappears from list
  - Verify current user is highlighted
  - Test idle detection: stop interacting → user marked as idle
  - Verify idle state visual differentiation

**Commit Message:** `feat: add presence awareness with online user list`

---

## PR #9: Performance Optimization & Polish
**Branch:** `feat/performance-polish`  
**Goal:** Optimize rendering, add loading states, improve UX  
**Estimated Time:** 1-1.5 hours

### Tasks:
- [ ] Optimize Konva rendering
  - **Files updated:** `src/components/canvas/CanvasStage.tsx`
  - **Content:**
    - Add `listening={false}` to background layer
    - Use `perfectDrawEnabled={false}` for shapes
    - Implement layer caching if needed

- [ ] Optimize shape component re-renders
  - **Files updated:**
    - `src/components/canvas/shapes/Rectangle.tsx`
    - `src/components/canvas/shapes/Circle.tsx`
    - `src/components/canvas/shapes/Text.tsx`
  - **Content:**
    - Memoize components with React.memo
    - Use useCallback for event handlers

- [ ] Add optimistic updates for drag
  - **Files updated:** `src/hooks/useCanvas.ts`
  - **Content:**
    - Update local state immediately on drag
    - Sync to DB on drag end
    - Handle sync failures (revert on error)

- [ ] Add loading states
  - **Files updated:** `src/pages/CanvasPage.tsx`
  - **Content:**
    - Loading spinner while auth checking
    - Loading state for initial object fetch
    - Skeleton UI for sidebar

- [ ] Add error boundaries
  - **Files created:** `src/components/ErrorBoundary.tsx`
  - **Content:** Catch rendering errors, show fallback UI
  - **Files updated:** `src/App.tsx` (wrap routes)

- [ ] Improve text editing UX
  - **Files updated:** `src/components/canvas/shapes/Text.tsx`
  - **Content:**
    - Better edit mode UI (overlay input or Transformer)
    - Auto-select text on edit
    - ESC to cancel edit

- [ ] Add keyboard shortcuts (optional)
  - **Files created:** `src/hooks/useKeyboard.ts`
  - **Content:**
    - R for rectangle, C for circle, T for text
    - Delete key to remove selected shape (if time)

- [ ] Test performance targets
  - 60 FPS during pan/zoom (check with DevTools)
  - < 100ms sync latency (check network tab)
  - 500+ objects without lag (create stress test)
  - 5+ users simultaneously (test with friends)

**Commit Message:** `feat: optimize performance and polish UX`

---

## PR #10: Deployment & Documentation
**Branch:** `feat/deployment`  
**Goal:** Deploy to Vercel and finalize documentation  
**Estimated Time:** 30-45 minutes

### Tasks:
- [ ] Configure Vercel deployment
  - **Files created:** `vercel.json`
  - **Content:**
    ```json
    {
      "buildCommand": "npm run build",
      "outputDirectory": "dist",
      "framework": "vite"
    }
    ```

- [ ] Set up Vercel project
  - Connect GitHub repo to Vercel
  - Configure environment variables in Vercel dashboard
  - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

- [ ] Deploy to Vercel
  - Push to main → automatic deployment
  - Verify deployment URL

- [ ] Update README with comprehensive docs
  - **Files updated:** `README.md`
  - **Content:**
    - Project description
    - Features list
    - Tech stack
    - Local development setup
    - Environment variables needed
    - Deployment instructions
    - Architecture overview (Realtime + Broadcast)
    - Known limitations
    - Future improvements

- [ ] Add architecture diagram (optional)
  - **Files created:** `docs/architecture.md`
  - **Content:** Explain dual-channel approach

- [ ] Test deployed application
  - Create account on production URL
  - Create shapes
  - Test with multiple users
  - Verify all features work

- [ ] Create demo video (for submission)
  - Record 3-5 minute demo
  - Show authentication
  - Show shape creation
  - Show real-time sync with 2 browsers
  - Show cursors and presence
  - Explain architecture

**Commit Message:** `feat: deploy to Vercel and add documentation`

---

## Testing Checklist (Run Before Submission)

### Authentication
- [ ] User can sign up with email/password/display name
- [ ] User can log in with existing credentials
- [ ] User can log out
- [ ] Protected routes redirect to login when unauthenticated
- [ ] Authenticated users redirect from login to canvas

### Canvas Basics
- [ ] Pan works (drag background)
- [ ] Zoom works (mouse wheel)
- [ ] Zoom is clamped (0.1x to 5x)
- [ ] Canvas is 5000x5000px

### Shape Creation
- [ ] Can create rectangle (100x100, blue)
- [ ] Can create circle (50px radius, red)
- [ ] Can create text ("Text", 16px, black)
- [ ] Shapes appear at viewport center
- [ ] Toolbar buttons work

### Shape Manipulation
- [ ] Can drag shapes
- [ ] Shapes move smoothly (60 FPS)
- [ ] Shapes cannot be dragged outside canvas boundaries (0,0 to 5000,5000)
- [ ] Text can be edited (double-click)
- [ ] Text editing works (enter/click outside to finish)
- [ ] Text is locked from movement during editing
- [ ] Any user can edit any text object

### Real-Time Sync
- [ ] Shapes created in window 1 appear in window 2 instantly (< 100ms)
- [ ] Shapes moved in window 1 update in window 2 (< 100ms)
- [ ] Text edits sync across windows
- [ ] Canvas state persists after refresh
- [ ] Disconnected user can reconnect and see current state
- [ ] First user to drag object acquires lock
- [ ] Second user sees visual feedback when object is locked
- [ ] Second user cannot drag locked object
- [ ] Lock releases when first user finishes dragging

### Multiplayer Cursors
- [ ] Cursors appear for other users
- [ ] Cursor positions update smoothly (30fps)
- [ ] Cursor labels show display names
- [ ] Each user has a different randomly assigned color
- [ ] Cursor shape is consistent (only color varies)
- [ ] Cursors disappear when user disconnects
- [ ] No lag or jitter in cursor movement

### Presence
- [ ] Online users list shows all connected users
- [ ] Current user is highlighted
- [ ] User count is accurate
- [ ] Users appear/disappear on connect/disconnect
- [ ] Presence badge shows correct count
- [ ] Idle users are marked with visual differentiation
- [ ] Users transition from active to idle state correctly

### Performance
- [ ] Maintains 60 FPS during pan/zoom
- [ ] No lag with 10+ shapes
- [ ] No lag with 5+ concurrent users
- [ ] Cursor updates don't impact FPS
- [ ] Object sync doesn't impact FPS

### Edge Cases
- [ ] Multiple users can create shapes simultaneously
- [ ] Object locking prevents simultaneous manipulation conflicts
- [ ] Rapid shape creation doesn't break sync
- [ ] Network disconnect/reconnect recovers gracefully
- [ ] Connection drops show reconnection UI with visual feedback
- [ ] Empty canvas state (no objects) renders correctly
- [ ] Objects stay within canvas boundaries during drag
- [ ] Lock releases properly if user disconnects mid-drag

---

## Time Allocation Estimate

| PR # | Task | Estimated Time | Testing Time |
|------|------|----------------|--------------|
| 1 | Project Setup | 30-45 min | +15 min (unit tests) |
| 2 | Database Schema | 30 min | N/A (manual DB verification) |
| 3 | Authentication | 1-1.5 hours | +30 min (unit + integration tests) |
| 4 | Canvas Foundation | 1-1.5 hours | +30 min (unit tests) |
| 5 | Shape Creation | 1.5-2 hours | +30 min (unit + integration tests) |
| 6 | Realtime Sync & Locking | 2.5-3 hours | +20 min (integration tests) |
| 7 | Multiplayer Cursors | 1.5-2 hours | +30 min (unit tests) |
| 8 | Presence & Idle Detection | 1-1.5 hours | N/A (manual browser testing) |
| 9 | Performance & Polish | 1-1.5 hours | N/A (performance testing) |
| 10 | Deployment | 30-45 min | N/A (deployment verification) |
| **Total** | | **12.5-15.5 hours** | **+2.5 hours** |

**Total with Testing:** 15-18 hours  
**Buffer:** 6-9 hours for debugging and unexpected issues

---

## Critical Path (Must Complete for MVP)

1. ✅ PRs 1-2: Setup (foundation)
2. ✅ PR 3: Auth (gate for canvas access)
3. ✅ PR 4: Canvas (workspace)
4. ✅ PR 5: Shapes (core functionality)
5. ✅ **PR 6: Realtime Sync (MOST CRITICAL)**
6. ✅ PR 7: Cursors (multiplayer proof)
7. ✅ PR 8: Presence (requirement)
8. ⚠️ PR 9: Performance (important but can be minimal)
9. ✅ PR 10: Deployment (must submit)

**Priority:** If short on time, PR 9 can be reduced to just testing and fixing critical bugs. All other PRs are mandatory.

---

## Git Workflow

### Branch Naming
- Feature branches: `feat/branch-name`
- Bug fixes: `fix/bug-description`
- Hotfixes: `hotfix/critical-issue`

### Commit Messages
Follow conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code refactoring
- `style:` formatting changes
- `docs:` documentation
- `test:` adding tests
- `chore:` maintenance

### PR Process
1. Create feature branch from `main`
2. Complete all tasks in PR checklist
3. Test thoroughly
4. Commit with descriptive message
5. Push branch to GitHub
6. Create PR with description
7. Merge to `main` after review (or self-merge for solo project)
8. Delete feature branch
9. Pull latest `main` before next PR

---

## Emergency Time-Saving Measures

If running behind schedule:

### Skip for MVP (reclaim ~2 hours):
- Text editing (just display static text)
- User list sidebar (keep presence badge only)
- Keyboard shortcuts
- Error boundaries
- Performance optimizations (if working reasonably)

### Simplify (reclaim ~1 hour):
- Use email only for display name (no custom field)
- Single default color for all shapes
- No text shape (just rectangle and circle)
- Remove zoom limits (trust users)

### Absolutely Cannot Skip:
- Authentication
- Canvas with pan/zoom
- At least 1 shape type (rectangle)
- Realtime sync for objects
- Broadcast for cursors
- Presence awareness (even minimal)
- Deployment

---

## Post-MVP Improvements (If Time Remains)

- [ ] Select and delete shapes
- [ ] Resize and rotate transformations
- [ ] Color picker for shapes
- [ ] Undo/redo functionality
- [ ] Multiple canvas rooms/projects
- [ ] Export canvas as image
- [ ] Collaborative cursors show what tool is active
- [ ] Better conflict resolution UI
- [ ] Mobile responsiveness
- [ ] Dark mode