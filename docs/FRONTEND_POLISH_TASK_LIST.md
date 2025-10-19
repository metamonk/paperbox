# Frontend Polish Task List
## Production-Quality Figma Clone UI Transformation

**Created**: 2025-10-18
**Goal**: Transform PaperBox into a professional, production-ready Figma clone
**Design Reference**: Scira project + Figma screenshot
**Estimated Duration**: 8-13 days (48-78 hours)

**Related Documentation**:
- [FIGMA_STYLE_UI_REDESIGN_PLAN.md](../claudedocs/FIGMA_STYLE_UI_REDESIGN_PLAN.md) - Detailed design analysis
- [MASTER_TASK_LIST.md](./MASTER_TASK_LIST.md) - Main project tasks (W12.D3-D4)

---

## ⚙️ Tailwind CSS v4 Configuration Approach

**IMPORTANT**: This project uses **Tailwind CSS v4.1.14** which has a fundamentally different configuration approach:

✅ **DO** (Tailwind v4):
- Configure theme in CSS using `@theme { }` blocks in `src/index.css`
- Use CSS custom properties: `--color-primary`, `--spacing-4`, `--text-lg`
- Import Tailwind: `@import "tailwindcss";`
- Reference variables directly: `var(--color-primary)` or use utilities: `bg-primary`

❌ **DON'T** (Old Tailwind v3 approach):
- Don't create `tailwind.config.js` - not used in v4
- Don't use `module.exports = { theme: { extend: {} } }` syntax
- Don't use JavaScript-based configuration

**Reference**: See [Tailwind CSS v4 Docs](https://tailwindcss.com/docs/theme) for CSS-based theming

### Tailwind v4 Quick Reference

**Color System Example**:
```css
/* src/index.css */
@import "tailwindcss";

@theme {
  /* Define colors */
  --color-primary: oklch(0.55 0.22 264);
  --color-primary-foreground: oklch(0.98 0 0);

  /* Use in HTML */
  /* <div class="bg-primary text-primary-foreground"> */

  /* Or use directly in CSS */
  /* background: var(--color-primary); */
}
```

**Spacing/Typography Example**:
```css
@theme {
  --spacing: 4px;  /* Base unit for all spacing utilities */
  --text-lg: 1.125rem;
  --text-lg--line-height: 1.75rem;

  /* Generates utilities like: text-lg, p-4, m-2, gap-3 */
}
```

**Complete Dark Theme Example** (what we'll build):
```css
@import "tailwindcss";

@theme {
  --color-background: oklch(0.1776 0 0);
  --color-foreground: oklch(0.9491 0 0);
  --color-primary: oklch(0.9247 0.0524 66.1732);
  --color-border: oklch(0.285 0 0);
  --radius: 1rem;
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

---

## 📊 Current State vs Target State

### ✅ What We Already Have
- shadcn/ui component library installed
- Kibo UI tree component
- **Tailwind CSS v4.1.14** configured with Vite plugin
- Basic layout with Header, Sidebar, Canvas, PropertyPanel
- Lucide icons package
- Core functionality working (tools, layers, properties)

### 🎯 What We're Building Toward
- **Dark theme** using OKLch color space (professional aesthetic)
- **Figma-style 3-column layout** (Left: Pages+Layers | Center: Canvas | Right: Properties)
- **Bottom toolbar** with centered tool palette (not header buttons)
- **Component library panel** with drag-drop templates
- **Professional animations** using Framer Motion
- **WCAG AA accessibility** compliance
- **Production-quality polish** throughout

---

# SPRINT 1: DARK THEME FOUNDATION (1-2 days)

## Day 1: Color System Implementation

### Morning Block (4 hours)

- [ ] **FP1.1**: Update shadcn/ui configuration to "new-york" style
  - **File**: `components.json`
  - **Action**: Change `"style": "default"` to `"style": "new-york"`
  - **Verify**: Run `npx shadcn@latest add button --overwrite` to test
  - **Success**: Components use new-york variant styling

- [ ] **FP1.2**: Implement OKLch dark theme color palette
  - **File**: `src/index.css` (or `app/globals.css`)
  - **Action**: Add dark theme CSS variables
  ```css
  @layer base {
    :root {
      --background: oklch(0.1776 0 0);
      --foreground: oklch(0.9491 0 0);
      --primary: oklch(0.9247 0.0524 66.1732);
      --secondary: oklch(0.3163 0.019 63.6992);
      --accent: oklch(0.285 0 0);
      --muted: oklch(0.285 0 0);
      --card: oklch(0.1776 0 0);
      --popover: oklch(0.1776 0 0);
      --border: oklch(0.285 0 0);
      --input: oklch(0.285 0 0);
      --ring: oklch(0.9247 0.0524 66.1732);
      --radius: 1rem;

      /* Sidebar specific (purple-tinted) */
      --sidebar-background: oklch(0.1686 0.0089 293.2466);
      --sidebar-foreground: oklch(0.9491 0 0);
      --sidebar-accent: oklch(0.3163 0.0392 286.7484);
    }
  }
  ```
  - **Reference**: [Scira globals.css](https://github.com/zaidmukaddam/scira/blob/main/app/globals.css)
  - **Success**: Dark colors visible in browser dev tools

- [ ] **FP1.3**: Update body and root element styling
  - **File**: `src/index.css`
  - **Action**: Apply background and foreground colors
  ```css
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
  ```
  - **Success**: Page background is dark

### Afternoon Block (4 hours)

- [ ] **FP1.4**: Apply dark theme to Header component
  - **File**: `src/components/layout/Header.tsx`
  - **Changes**:
    - Background: `bg-card border-border` (dark)
    - Text colors: `text-foreground`
    - Buttons: Use shadcn Button with variant="ghost"
    - Remove light theme classes (bg-white, text-gray-900, etc.)
  - **Success**: Header has dark background, readable text

- [ ] **FP1.5**: Apply dark theme to Sidebar component
  - **File**: `src/components/layout/Sidebar.tsx`
  - **Changes**:
    - Background: `bg-sidebar-background`
    - Text: `text-sidebar-foreground`
    - Accents: `bg-sidebar-accent`
    - Border: `border-border`
  - **Success**: Sidebar has purple-tinted dark background

- [ ] **FP1.6**: Apply dark theme to Canvas background
  - **File**: `src/components/canvas/Canvas.tsx`
  - **Changes**:
    - Canvas background: `#2c2c2c` or `oklch(0.22 0 0)`
    - Remove light gray background
  - **Success**: Canvas has professional dark gray background

- [ ] **FP1.7**: Apply dark theme to PropertyPanel
  - **File**: `src/components/properties/PropertyPanel.tsx`
  - **Changes**:
    - Background: `bg-card`
    - Borders: `border-border`
    - Text: `text-foreground`
    - Input fields: Use shadcn Input component styling
  - **Success**: Properties panel matches dark theme

---

## Day 2: Component Theme Application

### Morning Block (4 hours)

- [ ] **FP1.8**: Update all shadcn/ui components to dark theme
  - **Files**: `src/components/ui/*.tsx`
  - **Action**: Verify all components use CSS variables
  - **Components to check**:
    - Button, Dialog, Form, Select, Popover
    - Label, Tooltip, Toggle, ToggleGroup
    - Slider, Separator, Collapsible
  - **Success**: All shadcn components respect dark theme

- [ ] **FP1.9**: Update Kibo Tree component styling
  - **File**: `src/components/kibo-ui/tree/tree.tsx`
  - **Changes**:
    - Tree background: `bg-card`
    - Tree items: `hover:bg-accent`
    - Selected state: `bg-primary/10 text-primary`
    - Text colors: `text-foreground`
  - **Success**: Layers tree has dark theme

- [ ] **FP1.10**: Update color picker component
  - **File**: `src/components/properties/ColorProperty.tsx`
  - **Changes**:
    - Popover background: `bg-popover`
    - Swatch border: `border-border`
    - Input background: `bg-input`
  - **Success**: Color picker matches dark theme

### Afternoon Block (4 hours)

- [ ] **FP1.11**: Update all form inputs and controls
  - **Files**: All property components
  - **Changes**:
    - Input backgrounds: `bg-input text-foreground`
    - Focus rings: `ring-ring`
    - Disabled states: `opacity-50`
  - **Success**: All inputs have consistent dark styling

- [ ] **FP1.12**: Update modal and dialog styling
  - **Files**: `src/components/ui/dialog.tsx`, `CanvasManagementModal.tsx`
  - **Changes**:
    - Overlay: `bg-background/80 backdrop-blur-sm`
    - Dialog content: `bg-card border-border`
    - Close button: Use shadcn styling
  - **Success**: Modals have dark theme with blur overlay

- [ ] **FP1.13**: Add theme transition smoothing
  - **File**: `src/index.css`
  - **Action**: Add transition to theme-aware elements
  ```css
  * {
    @apply transition-colors duration-150;
  }
  ```
  - **Success**: Smooth color transitions on theme changes

- [ ] **FP1.14**: Test dark theme across all pages
  - **Pages**: Login, Signup, CanvasPage, CanvasSelectorPage
  - **Action**: Verify dark theme applied consistently
  - **Success**: All pages have professional dark aesthetic

**Sprint 1 Deliverable**: Complete dark theme implementation across entire app

---

# SPRINT 2: LAYOUT TRANSFORMATION (2-3 days)

## Day 3: Bottom Toolbar & Layout Structure

### Morning Block (4 hours)

- [ ] **FP2.1**: Create BottomToolbar component
  - **File**: `src/components/toolbar/BottomToolbar.tsx`
  - **Structure**:
  ```tsx
  interface BottomToolbarProps {
    activeTool: Tool;
    onToolChange: (tool: Tool) => void;
  }

  export function BottomToolbar({ activeTool, onToolChange }: BottomToolbarProps) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-2 shadow-lg">
          {/* Tool buttons */}
        </div>
      </div>
    );
  }
  ```
  - **Tools to include**:
    - Cursor (Select) - `<MousePointer2 />`
    - Frame - `<Square />`
    - Rectangle - `<RectangleHorizontal />`
    - Circle - `<Circle />`
    - Text - `<Type />`
    - Pen - `<Pen />`
  - **Success**: Centered floating toolbar at bottom of canvas

- [ ] **FP2.2**: Implement tool button styling
  - **File**: `src/components/toolbar/BottomToolbar.tsx`
  - **Styling**:
  ```tsx
  <Button
    variant={activeTool === 'cursor' ? 'default' : 'ghost'}
    size="icon"
    className="h-10 w-10"
    onClick={() => onToolChange('cursor')}
  >
    <MousePointer2 className="h-5 w-5" />
  </Button>
  ```
  - **Active state**: Primary color background
  - **Inactive state**: Ghost variant
  - **Tooltips**: Add shadcn Tooltip with keyboard shortcuts
  - **Success**: Professional tool palette with clear active states

- [ ] **FP2.3**: Migrate tools from Header to BottomToolbar
  - **Files**:
    - `src/components/layout/Header.tsx` (remove tool buttons)
    - `src/pages/CanvasPage.tsx` (add BottomToolbar)
  - **Action**:
    - Remove Tools, Properties, Layers buttons from Header
    - Add `<BottomToolbar />` to CanvasPage
    - Wire up tool state and handlers
  - **Success**: Tools accessible from bottom toolbar only

### Afternoon Block (4 hours)

- [ ] **FP2.4**: Create 3-column CanvasLayout component
  - **File**: `src/components/layout/CanvasLayout.tsx`
  - **Structure**:
  ```tsx
  export function CanvasLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex h-screen flex-col">
        {/* Top Bar (Header) */}
        <Header />

        {/* Main 3-column layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <aside className="w-60 border-r border-border bg-sidebar-background">
            {/* Pages + Layers */}
          </aside>

          {/* Center Canvas */}
          <main className="flex-1 relative">
            {children}
          </main>

          {/* Right Properties Panel */}
          <aside className="w-70 border-l border-border bg-card">
            {/* Properties */}
          </aside>
        </div>
      </div>
    );
  }
  ```
  - **Success**: 3-column layout with fixed sidebars

- [ ] **FP2.5**: Update CanvasPage to use CanvasLayout
  - **File**: `src/pages/CanvasPage.tsx`
  - **Action**:
    - Wrap content with `<CanvasLayout>`
    - Remove old layout structure
    - Position BottomToolbar inside canvas area
  - **Success**: Figma-style layout working

- [ ] **FP2.6**: Make sidebars collapsible
  - **File**: `src/components/layout/CanvasLayout.tsx`
  - **Action**:
    - Add collapse buttons to left/right sidebars
    - Animate width transition with Tailwind
    - Persist state in localStorage
  - **Success**: Sidebars can be hidden to maximize canvas

- [ ] **FP2.7**: Test responsive layout
  - **Viewports**: Desktop (1920x1080), laptop (1440x900), tablet (1024x768)
  - **Action**: Verify layout adapts gracefully
  - **Success**: Layout usable on all screen sizes

---

## Day 4: Left Sidebar Redesign

### Morning Block (4 hours)

- [ ] **FP2.8**: Create PagesPanel component
  - **File**: `src/components/sidebar/PagesPanel.tsx`
  - **Structure**:
  ```tsx
  export function PagesPanel() {
    const { canvases, activeCanvasId } = usePaperboxStore();

    return (
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase">Pages</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {canvases.map(canvas => (
            <PageItem key={canvas.id} canvas={canvas} isActive={canvas.id === activeCanvasId} />
          ))}
        </div>
      </div>
    );
  }
  ```
  - **Success**: Pages list shows all canvases

- [ ] **FP2.9**: Create PageItem component
  - **File**: `src/components/sidebar/PageItem.tsx`
  - **Features**:
    - Canvas thumbnail preview (optional)
    - Canvas name (editable on double-click)
    - Active state highlighting
    - Context menu (duplicate, delete, rename)
  - **Styling**:
  ```tsx
  <div className={cn(
    "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer",
    isActive && "bg-sidebar-accent text-sidebar-foreground",
    !isActive && "hover:bg-sidebar-accent/50"
  )}>
  ```
  - **Success**: Professional page items with hover/active states

- [ ] **FP2.10**: Integrate PagesPanel into CanvasLayout
  - **File**: `src/components/layout/CanvasLayout.tsx`
  - **Action**:
    - Add PagesPanel to top of left sidebar
    - Add Separator between Pages and Layers
    - Make PagesPanel collapsible (optional)
  - **Success**: Pages panel visible in left sidebar

### Afternoon Block (4 hours)

- [ ] **FP2.11**: Enhance LayersPanel styling
  - **File**: `src/components/layers/LayersPanel.tsx`
  - **Changes**:
    - Add search input at top
    - Update header styling to match PagesPanel
    - Improve spacing and typography
    - Add section collapse functionality
  - **Success**: Layers panel matches Pages panel aesthetic

- [ ] **FP2.12**: Update LayerItem styling
  - **File**: `src/components/layers/LayerItem.tsx`
  - **Changes**:
    - Use Lucide icons (Eye, EyeOff, Lock, Unlock)
    - Remove emoji icons
    - Improve hover states
    - Add icon buttons for actions
  - **Success**: Professional layer items with icons

- [ ] **FP2.13**: Add layer search functionality
  - **File**: `src/components/layers/LayersPanel.tsx`
  - **Action**:
    - Add Input at top of panel
    - Filter layers by name
    - Highlight matches
  - **Success**: Can search and filter layers

- [ ] **FP2.14**: Test left sidebar functionality
  - **Action**: Verify Pages panel + Layers panel working
  - **Success**: Both panels functional and styled

---

## Day 5: Header & Right Panel Redesign

### Morning Block (4 hours)

- [ ] **FP2.15**: Redesign Header (Top Bar)
  - **File**: `src/components/layout/Header.tsx`
  - **New Layout**:
  ```tsx
  <header className="h-14 border-b border-border bg-card px-4 flex items-center justify-between">
    {/* Left: Canvas Picker */}
    <div className="flex items-center gap-2">
      <CanvasPicker />
      <Button variant="ghost" size="icon"><LayoutGrid /></Button>
      <Button variant="ghost" size="icon"><Settings /></Button>
    </div>

    {/* Center: Mode Tabs */}
    <div className="flex items-center gap-1">
      <Button variant={mode === 'design' ? 'default' : 'ghost'}>Design</Button>
      <Button variant={mode === 'prototype' ? 'default' : 'ghost'}>Prototype</Button>
    </div>

    {/* Right: Actions */}
    <div className="flex items-center gap-2">
      <Button variant="default" size="sm">Share</Button>
      <PresenceBadge count={userCount} />
      <ZoomControls />
      <UserMenu />
    </div>
  </header>
  ```
  - **Success**: Figma-style top bar layout

- [ ] **FP2.16**: Create ZoomControls component
  - **File**: `src/components/canvas/ZoomControls.tsx`
  - **Features**:
    - Zoom in button (+)
    - Zoom out button (-)
    - Zoom percentage dropdown
    - Reset to 100% option
    - Fit to screen option
  - **Success**: Zoom controls functional in header

- [ ] **FP2.17**: Create UserMenu component
  - **File**: `src/components/layout/UserMenu.tsx`
  - **Structure**: shadcn DropdownMenu
  - **Items**:
    - User name + email
    - Settings
    - Sign out
  - **Success**: User menu in header

### Afternoon Block (4 hours)

- [ ] **FP2.18**: Redesign PropertyPanel header
  - **File**: `src/components/properties/PropertyPanel.tsx`
  - **Changes**:
    - Add "Design" heading with icon
    - Add collapse/expand button
    - Improve section headers
  - **Success**: Professional property panel header

- [ ] **FP2.19**: Add collapsible sections to PropertyPanel
  - **File**: `src/components/properties/PropertyPanel.tsx`
  - **Action**:
    - Wrap sections in shadcn Collapsible
    - Add expand/collapse icons
    - Default to expanded state
    - Persist state in localStorage
  - **Success**: Sections can be collapsed

- [ ] **FP2.20**: Enhance property input styling
  - **Files**: All property components
  - **Changes**:
    - Consistent label styling
    - Input field spacing
    - Number input spinners
    - Slider styling
    - Color picker improvements
  - **Success**: All property inputs look professional

- [ ] **FP2.21**: Add empty state to PropertyPanel
  - **File**: `src/components/properties/PropertyPanel.tsx`
  - **Action**:
    - Show helpful message when nothing selected
    - Add illustration or icon
    - Guide user to select object
  - **Success**: Empty state is helpful and polished

**Sprint 2 Deliverable**: Complete Figma-style 3-column layout with bottom toolbar

---

# SPRINT 3: VISUAL POLISH & ANIMATIONS (2-3 days)

## Day 6: Animation System

### Morning Block (4 hours)

- [ ] **FP3.1**: Install Framer Motion
  - **Command**: `pnpm add framer-motion`
  - **Verify**: Check package.json
  - **Success**: Framer Motion installed

- [ ] **FP3.2**: Add panel open/close animations
  - **Files**: `src/components/layout/CanvasLayout.tsx`
  - **Implementation**:
  ```tsx
  import { motion, AnimatePresence } from 'framer-motion';

  <AnimatePresence>
    {leftSidebarOpen && (
      <motion.aside
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 240, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Sidebar content */}
      </motion.aside>
    )}
  </AnimatePresence>
  ```
  - **Success**: Smooth sidebar animations

- [ ] **FP3.3**: Add fade-in animations to components
  - **Files**: All major components
  - **Implementation**:
  ```tsx
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
  ```
  - **Components**: Modals, popovers, tooltips
  - **Success**: Subtle entrance animations

### Afternoon Block (4 hours)

- [ ] **FP3.4**: Add toolbar hover effects
  - **File**: `src/components/toolbar/BottomToolbar.tsx`
  - **Implementation**:
  ```tsx
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
    <Button>...</Button>
  </motion.div>
  ```
  - **Success**: Responsive tool button interactions

- [ ] **FP3.5**: Add canvas zoom transition smoothing
  - **File**: `src/lib/fabric/FabricCanvasManager.ts`
  - **Action**:
    - Add easing to zoom animations
    - Smooth pan transitions
    - Use requestAnimationFrame
  - **Success**: Buttery smooth zoom/pan

- [ ] **FP3.6**: Add object selection animations
  - **File**: `src/lib/fabric/FabricCanvasManager.ts`
  - **Action**:
    - Animate selection box appearance
    - Pulse effect on newly created objects
    - Transform handle animations
  - **Success**: Polished selection feedback

- [ ] **FP3.7**: Add loading state animations
  - **Files**: All components with loading states
  - **Implementation**: Replace spinners with skeleton screens
  - **Package**: Consider `react-loading-skeleton`
  - **Success**: Professional loading states

---

## Day 7: Typography & Spacing

### Morning Block (4 hours)

- [ ] **FP3.8**: Install and configure font family
  - **Option A**: Google Fonts CDN
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
  - **Option B**: Local package
  ```bash
  pnpm add @fontsource/inter
  ```
  - **File**: `src/index.css`
  ```css
  @import '@fontsource/inter/400.css';
  @import '@fontsource/inter/500.css';
  @import '@fontsource/inter/600.css';
  @import '@fontsource/inter/700.css';

  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
  ```
  - **Success**: Inter font applied throughout app

- [ ] **FP3.9**: Define typography scale in CSS using @theme
  - **File**: `src/index.css`
  ```css
  @theme {
    /* Typography scale */
    --text-xs: 0.75rem;
    --text-xs--line-height: 1rem;
    --text-sm: 0.875rem;
    --text-sm--line-height: 1.25rem;
    --text-base: 1rem;
    --text-base--line-height: 1.5rem;
    --text-lg: 1.125rem;
    --text-lg--line-height: 1.75rem;
    --text-xl: 1.25rem;
    --text-xl--line-height: 1.75rem;
    --text-2xl: 1.5rem;
    --text-2xl--line-height: 2rem;
    --text-3xl: 1.875rem;
    --text-3xl--line-height: 2.25rem;

    /* Font weights */
    --font-weight-normal: 400;
    --font-weight-medium: 500;
    --font-weight-semibold: 600;
    --font-weight-bold: 700;
  }
  ```
  - **Success**: Consistent typography scale

- [ ] **FP3.10**: Apply typography scale to all text elements
  - **Action**: Update all components to use defined text sizes
  - **Headers**: `text-xl font-semibold` or `text-2xl font-bold`
  - **Body text**: `text-sm` or `text-base`
  - **Labels**: `text-xs font-medium uppercase text-muted-foreground`
  - **Success**: Consistent text styling throughout

### Afternoon Block (4 hours)

- [ ] **FP3.11**: Define spacing scale in CSS using @theme
  - **File**: `src/index.css`
  ```css
  @theme {
    /* Spacing scale (4px base) */
    --spacing: 4px;
    --spacing-0: 0px;
    --spacing-1: calc(var(--spacing) * 1);   /* 4px */
    --spacing-2: calc(var(--spacing) * 2);   /* 8px */
    --spacing-3: calc(var(--spacing) * 3);   /* 12px */
    --spacing-4: calc(var(--spacing) * 4);   /* 16px */
    --spacing-5: calc(var(--spacing) * 5);   /* 20px */
    --spacing-6: calc(var(--spacing) * 6);   /* 24px */
    --spacing-8: calc(var(--spacing) * 8);   /* 32px */
    --spacing-10: calc(var(--spacing) * 10); /* 40px */
    --spacing-12: calc(var(--spacing) * 12); /* 48px */
    --spacing-16: calc(var(--spacing) * 16); /* 64px */
  }
  ```
  - **Note**: Tailwind v4 uses `--spacing` as the base unit
  - **Success**: 4px base spacing system

- [ ] **FP3.12**: Apply consistent spacing to all components
  - **Action**: Replace arbitrary values with spacing scale
  - **Padding**: Use `p-3`, `p-4`, `px-4`, `py-2`
  - **Margins**: Use `m-2`, `mb-4`, `mt-6`
  - **Gaps**: Use `gap-2`, `gap-3`, `gap-4`
  - **Success**: Consistent spacing throughout

- [ ] **FP3.13**: Add shadow system in CSS using @theme
  - **File**: `src/index.css`
  ```css
  @theme {
    /* Shadow system (Tailwind v4 defaults are good, customize if needed) */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  }
  ```
  - **Note**: Tailwind v4 includes good defaults, only customize if needed
  - **Apply**: Toolbar (`shadow-lg`), modals (`shadow-xl`), cards (`shadow-sm`)
  - **Success**: Subtle depth with shadows

- [ ] **FP3.14**: Test typography and spacing consistency
  - **Action**: Visual audit of all pages
  - **Check**: Headings, labels, inputs, buttons, panels
  - **Success**: Professional, consistent typography and spacing

---

## Day 8: Icon System & Polish

### Morning Block (4 hours)

- [ ] **FP3.15**: Replace all emoji icons with Lucide
  - **Files**:
    - `src/components/layout/Header.tsx`
    - `src/components/toolbar/BottomToolbar.tsx`
    - `src/components/layers/LayersPanel.tsx`
    - `src/components/properties/PropertyPanel.tsx`
  - **Icon Mapping**:
    - 🎨 Tools → `<Palette />`
    - ⚙️ Properties → `<Settings />`
    - 📊 Layers → `<Layers />`
    - 👁️ Visibility → `<Eye />` / `<EyeOff />`
    - 🔒 Lock → `<Lock />` / `<Unlock />`
    - ➕ Add → `<Plus />`
    - 🗑️ Delete → `<Trash2 />`
  - **Success**: Professional icons throughout

- [ ] **FP3.16**: Standardize icon sizes
  - **Action**: Use consistent icon classes
  - **Small icons**: `className="h-4 w-4"` (buttons, labels)
  - **Medium icons**: `className="h-5 w-5"` (toolbar, actions)
  - **Large icons**: `className="h-6 w-6"` (headings, emphasis)
  - **Success**: Visually balanced icons

- [ ] **FP3.17**: Add brand logo to header
  - **File**: `src/components/layout/Header.tsx`
  - **Action**:
    - Use Logo.tsx component
    - Add "PaperBox" wordmark
    - Style appropriately
  - **Success**: Professional branding in header

### Afternoon Block (4 hours)

- [ ] **FP3.18**: Create empty state illustrations
  - **Files**: Components with empty states
  - **Options**:
    - Use Lucide icons with styling
    - Or install `lucide-react` illustrations
    - Or create simple SVGs
  - **Components**:
    - Empty canvas
    - No layers
    - No selection (property panel)
    - No canvases (canvas selector)
  - **Success**: Helpful empty states

- [ ] **FP3.19**: Add favicon and app icons
  - **Files**: `public/favicon.ico`, `public/logo192.png`, `public/logo512.png`
  - **Action**:
    - Create or generate app icon
    - Add favicon
    - Update `index.html` meta tags
  - **Success**: Professional app branding

- [ ] **FP3.20**: Polish button states (hover, active, disabled)
  - **Files**: All components with buttons
  - **Check**:
    - Hover states visible
    - Active states clear
    - Disabled states obvious (opacity-50, cursor-not-allowed)
    - Focus rings visible for accessibility
  - **Success**: Clear button states

- [ ] **FP3.21**: Add micro-interactions throughout
  - **Examples**:
    - Button press animations
    - Checkbox check animations
    - Toggle switch animations
    - Input focus animations
  - **Implementation**: Use Framer Motion or CSS transitions
  - **Success**: App feels responsive and polished

**Sprint 3 Deliverable**: Professional visual polish with animations, typography, and icons

---

# SPRINT 4: COMPONENT LIBRARY (2-3 days)

## Day 9: Component Library Foundation

### Morning Block (4 hours)

- [ ] **FP4.1**: Create ComponentLibrary component
  - **File**: `src/components/library/ComponentLibrary.tsx`
  - **Structure**:
  ```tsx
  export function ComponentLibrary() {
    return (
      <div className="p-3">
        <div className="mb-3">
          <Input
            placeholder="Search components..."
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-2">
          <ComponentSection title="Shapes" items={shapes} />
          <ComponentSection title="Icons" items={icons} />
          <ComponentSection title="UI Components" items={uiComponents} />
        </div>
      </div>
    );
  }
  ```
  - **Success**: Component library panel structure

- [ ] **FP4.2**: Create ComponentSection component
  - **File**: `src/components/library/ComponentSection.tsx`
  - **Structure**: Collapsible section with component grid
  ```tsx
  <Collapsible defaultOpen>
    <CollapsibleTrigger className="flex items-center justify-between w-full">
      <h4 className="text-xs font-semibold">{title}</h4>
      <ChevronDown className="h-4 w-4" />
    </CollapsibleTrigger>
    <CollapsibleContent>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {items.map(item => (
          <ComponentCard key={item.id} item={item} />
        ))}
      </div>
    </CollapsibleContent>
  </Collapsible>
  ```
  - **Success**: Collapsible component sections

- [ ] **FP4.3**: Create ComponentCard component
  - **File**: `src/components/library/ComponentCard.tsx`
  - **Features**:
    - Visual preview (icon or thumbnail)
    - Component name
    - Hover state
    - Click to add to canvas
  ```tsx
  <div
    className="flex flex-col items-center justify-center p-3 border border-border rounded-lg cursor-pointer hover:bg-accent transition-colors"
    onClick={() => onAddToCanvas(item)}
  >
    <item.icon className="h-6 w-6 mb-1" />
    <span className="text-xs">{item.name}</span>
  </div>
  ```
  - **Success**: Clickable component cards

### Afternoon Block (4 hours)

- [ ] **FP4.4**: Define component templates for shapes
  - **File**: `src/lib/templates/shapeTemplates.ts`
  ```ts
  export const shapeTemplates = [
    {
      id: 'rectangle',
      name: 'Rectangle',
      icon: RectangleHorizontal,
      defaultProps: {
        type: 'rectangle',
        width: 200,
        height: 150,
        fill: '#3b82f6',
        stroke: '#1e40af',
        stroke_width: 2,
      }
    },
    {
      id: 'circle',
      name: 'Circle',
      icon: Circle,
      defaultProps: {
        type: 'circle',
        radius: 75,
        fill: '#10b981',
        stroke: '#059669',
        stroke_width: 2,
      }
    },
    // ... more shapes
  ];
  ```
  - **Success**: Shape templates defined

- [ ] **FP4.5**: Define component templates for UI elements
  - **File**: `src/lib/templates/uiTemplates.ts`
  ```ts
  export const uiTemplates = [
    {
      id: 'button',
      name: 'Button',
      icon: Square,
      defaultProps: {
        type: 'rectangle',
        width: 120,
        height: 40,
        fill: '#3b82f6',
        rx: 8,
        ry: 8,
        // ... text label properties
      }
    },
    // ... more UI templates
  ];
  ```
  - **Success**: UI templates defined

- [ ] **FP4.6**: Integrate ComponentLibrary into left sidebar
  - **File**: `src/components/layout/CanvasLayout.tsx`
  - **Action**:
    - Add ComponentLibrary above PagesPanel
    - Make collapsible
    - Add separator
  - **Success**: Component library visible in sidebar

- [ ] **FP4.7**: Wire component library to canvas creation
  - **File**: `src/components/library/ComponentCard.tsx`
  - **Action**:
    - onClick → create object with template defaults
    - Position at canvas center or cursor
    - Use existing createObject() method
  - **Success**: Clicking component adds to canvas

---

## Day 10: Drag-Drop & Advanced Templates

### Morning Block (4 hours)

- [ ] **FP4.8**: Install @dnd-kit for drag-drop
  - **Command**: `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
  - **Success**: dnd-kit installed

- [ ] **FP4.9**: Implement drag from component library
  - **File**: `src/components/library/ComponentCard.tsx`
  - **Implementation**:
  ```tsx
  import { useDraggable } from '@dnd-kit/core';

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: item,
  });

  <div
    ref={setNodeRef}
    {...listeners}
    {...attributes}
  >
    {/* Component card */}
  </div>
  ```
  - **Success**: Components draggable from library

- [ ] **FP4.10**: Implement drop on canvas
  - **File**: `src/components/canvas/Canvas.tsx`
  - **Implementation**:
  ```tsx
  import { useDroppable } from '@dnd-kit/core';

  const { setNodeRef } = useDroppable({ id: 'canvas' });

  const handleDrop = (event) => {
    const { active, over } = event;
    if (over?.id === 'canvas') {
      const template = active.data.current;
      createObjectFromTemplate(template, dropPosition);
    }
  };
  ```
  - **Success**: Drop creates object on canvas

- [ ] **FP4.11**: Add drag preview overlay
  - **File**: `src/components/library/ComponentLibrary.tsx`
  - **Implementation**: DragOverlay from dnd-kit
  ```tsx
  <DragOverlay>
    {activeId ? <ComponentPreview item={activeItem} /> : null}
  </DragOverlay>
  ```
  - **Success**: Visual feedback while dragging

### Afternoon Block (4 hours)

- [ ] **FP4.12**: Add advanced shape templates
  - **File**: `src/lib/templates/shapeTemplates.ts`
  - **New shapes**:
    - Triangle
    - Pentagon
    - Hexagon
    - Star
    - Arrow
    - Line
  - **Success**: More shape options available

- [ ] **FP4.13**: Add text templates
  - **File**: `src/lib/templates/textTemplates.ts`
  ```ts
  export const textTemplates = [
    { id: 'heading', name: 'Heading', fontSize: 32, fontWeight: 'bold' },
    { id: 'subheading', name: 'Subheading', fontSize: 24, fontWeight: 'semibold' },
    { id: 'body', name: 'Body Text', fontSize: 16, fontWeight: 'normal' },
    { id: 'label', name: 'Label', fontSize: 12, fontWeight: 'medium' },
  ];
  ```
  - **Success**: Text templates available

- [ ] **FP4.14**: Add search functionality to component library
  - **File**: `src/components/library/ComponentLibrary.tsx`
  - **Action**:
    - Filter components by search term
    - Highlight matches
    - Show "No results" state
  - **Success**: Can search components

- [ ] **FP4.15**: Add favorites/recent components
  - **File**: `src/components/library/ComponentLibrary.tsx`
  - **Action**:
    - Track recently used components
    - Allow favoriting components
    - Show in separate sections
  - **Success**: Quick access to favorite components

**Sprint 4 Deliverable**: Fully functional component library with click-to-add

---

# ~~SPRINT 5: ACCESSIBILITY & QUALITY~~ (DEFERRED)

**Decision**: Focus on core UI transformation first (Sprints 1-4), then assess accessibility needs after visual redesign is complete.

**Deferred Tasks**:
- Accessibility audit and WCAG compliance
- Screen reader testing
- Error handling enhancements
- Performance optimization deep-dive

**When to revisit**: After Sprint 4 completion, evaluate need for accessibility sprint based on:
- User feedback on new UI
- Actual performance metrics observed
- Specific accessibility requirements identified

---

# ~~SPRINT 5 CONTENT REMOVED~~

The following sections have been removed from this task list:
- Day 11: Accessibility Audit (FP5.1-FP5.8)
- Day 12: Error Handling & Performance (FP5.9-FP5.16)
- Day 13: Final Polish & Validation (FP5.17-FP5.24)

**Rationale**: Build and test the UI redesign first, then determine what accessibility and performance work is actually needed based on real usage.

---

# REVISED SPRINT SCOPE

## Focused Implementation (8-10 days)

### Core Sprints (MUST DO):
1. **Sprint 1** (Days 1-2): Dark Theme Foundation - 12-16 hours
2. **Sprint 2** (Days 3-5): Layout Transformation - 16-24 hours
3. **Sprint 3** (Days 6-8): Visual Polish & Animations - 16-24 hours
4. **Sprint 4** (Days 9-10): Component Library - 12-16 hours

### Optional Polish (IF TIME/NEEDED):
5. ~~**Sprint 5** (Days 11-13): Accessibility & Quality~~ - DEFERRED

**New Total Duration**: 8-10 days (48-60 hours)

---

# FINAL VALIDATION CHECKLIST

## Day 11: Accessibility Audit

### Morning Block (4 hours)

- [ ] **FP5.1**: Install jest-axe for automated accessibility testing
  - **Command**: `pnpm add -D jest-axe @testing-library/jest-dom`
  - **Success**: jest-axe installed

- [ ] **FP5.2**: Create accessibility test suite
  - **File**: `src/__tests__/accessibility.test.tsx`
  ```tsx
  import { axe, toHaveNoViolations } from 'jest-axe';
  expect.extend(toHaveNoViolations);

  test('Header has no accessibility violations', async () => {
    const { container } = render(<Header {...props} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  ```
  - **Components to test**:
    - Header, Sidebar, Canvas, PropertyPanel
    - BottomToolbar, ComponentLibrary
    - All modal dialogs and popovers
  - **Success**: Accessibility tests running

- [ ] **FP5.3**: Fix color contrast issues
  - **Action**: Use WebAIM Contrast Checker
  - **Target**: WCAG AA (4.5:1 for normal text, 3:1 for large text)
  - **Check**:
    - Text on dark backgrounds
    - Button text on colored backgrounds
    - Muted text readability
  - **Success**: All text meets contrast requirements

- [ ] **FP5.4**: Add ARIA labels to all interactive elements
  - **Files**: All components with buttons, inputs, controls
  - **Action**:
    - `aria-label` on icon-only buttons
    - `aria-labelledby` for complex controls
    - `aria-describedby` for help text
    - `role` attributes where appropriate
  - **Success**: Screen readers can identify all controls

### Afternoon Block (4 hours)

- [ ] **FP5.5**: Improve keyboard navigation
  - **Action**: Test tab navigation through entire app
  - **Focus management**:
    - Focus visible on all interactive elements
    - Focus trap in modals
    - Logical tab order
    - Escape to close modals
  - **Success**: Full keyboard navigation working

- [ ] **FP5.6**: Add focus indicators
  - **File**: `src/index.css`
  ```css
  *:focus-visible {
    @apply ring-2 ring-ring ring-offset-2 ring-offset-background outline-none;
  }
  ```
  - **Success**: Clear focus indicators on all elements

- [ ] **FP5.7**: Test with screen reader
  - **Tools**: NVDA (Windows), VoiceOver (Mac), JAWS
  - **Test**:
    - Navigate header
    - Use toolbar
    - Select objects
    - Edit properties
  - **Success**: Screen reader can use all features

- [ ] **FP5.8**: Fix accessibility violations
  - **Action**: Address all issues found in testing
  - **Common fixes**:
    - Add alt text to images
    - Fix heading hierarchy
    - Add labels to form controls
    - Fix button accessibility
  - **Success**: Zero accessibility violations

---

## Day 12: Error Handling & Performance

### Morning Block (4 hours)

- [ ] **FP5.9**: Enhance ErrorBoundary component
  - **File**: `src/components/ErrorBoundary.tsx`
  - **Improvements**:
    - User-friendly error messages
    - "Try again" button
    - Report error option
    - Fallback UI styling
  - **Success**: Graceful error handling

- [ ] **FP5.10**: Add error states to all async operations
  - **Components**: All components with data fetching
  - **Implementation**:
  ```tsx
  {error && (
    <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
      <p className="text-destructive text-sm">{error.message}</p>
      <Button variant="outline" size="sm" onClick={retry}>Try Again</Button>
    </div>
  )}
  ```
  - **Success**: All errors handled gracefully

- [ ] **FP5.11**: Add loading skeletons to all components
  - **Package**: `pnpm add react-loading-skeleton` (optional)
  - **Or**: Use shadcn Skeleton component
  - **Implementation**:
  ```tsx
  {loading ? (
    <Skeleton className="h-10 w-full" />
  ) : (
    <ActualContent />
  )}
  ```
  - **Success**: Professional loading states

- [ ] **FP5.12**: Add empty states with guidance
  - **Components**: Canvas, Layers, ComponentLibrary, CanvasSelector
  - **Structure**:
  ```tsx
  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
    <IconComponent className="h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2">No items yet</h3>
    <p className="text-sm text-muted-foreground mb-4">
      Get started by creating your first item
    </p>
    <Button onClick={createNew}>Create New</Button>
  </div>
  ```
  - **Success**: Helpful empty states guide users

### Afternoon Block (4 hours)

- [ ] **FP5.13**: Optimize component re-renders
  - **Action**: Use React DevTools Profiler
  - **Techniques**:
    - React.memo() for expensive components
    - useMemo() for expensive calculations
    - useCallback() for stable function references
  - **Target**: Minimize unnecessary re-renders
  - **Success**: Improved render performance

- [ ] **FP5.14**: Virtualize long lists
  - **Components**: LayersPanel (if >100 layers)
  - **Package**: `pnpm add @tanstack/react-virtual`
  - **Implementation**: Virtualize layer list for performance
  - **Success**: Smooth scrolling with many layers

- [ ] **FP5.15**: Debounce property updates
  - **Files**: Property input components
  - **Implementation**:
  ```tsx
  const debouncedUpdate = useMemo(
    () => debounce((value) => updateProperty(value), 300),
    []
  );
  ```
  - **Success**: Reduced database writes

- [ ] **FP5.16**: Optimize Fabric.js rendering
  - **File**: `src/lib/fabric/FabricCanvasManager.ts`
  - **Optimizations**:
    - Enable object caching
    - Use `renderOnAddRemove: false` during batch ops
    - Request render after batch complete
  - **Success**: Smooth canvas with 500+ objects

---

## Day 13: Final Polish & Validation

### Morning Block (4 hours)

- [ ] **FP5.17**: Comprehensive visual audit
  - **Action**: Review every page and component
  - **Checklist**:
    - Consistent spacing
    - Aligned elements
    - Proper typography
    - Color consistency
    - Icon consistency
  - **Success**: No visual inconsistencies

- [ ] **FP5.18**: Cross-browser testing
  - **Browsers**: Chrome, Firefox, Safari, Edge
  - **Test**:
    - Layout rendering
    - Interactions
    - Animations
    - Canvas functionality
  - **Success**: Works in all major browsers

- [ ] **FP5.19**: Responsive design testing
  - **Viewports**:
    - Desktop: 1920x1080, 1440x900
    - Laptop: 1366x768
    - Tablet: 1024x768
  - **Success**: Usable on all viewport sizes

- [ ] **FP5.20**: Performance benchmarks
  - **Metrics**:
    - Initial load time < 2s
    - Time to interactive < 3s
    - Smooth 60fps interactions
    - 500+ objects without lag
  - **Tools**: Lighthouse, React DevTools
  - **Success**: Meets all performance targets

### Afternoon Block (4 hours)

- [ ] **FP5.21**: User acceptance testing
  - **Action**: Have team members test the app
  - **Gather feedback** on:
    - Ease of use
    - Visual polish
    - Performance
    - Bugs or issues
  - **Success**: Positive feedback, bugs documented

- [ ] **FP5.22**: Fix critical bugs from testing
  - **Priority**: Critical and high severity bugs only
  - **Action**: Address all blocking issues
  - **Success**: No critical bugs remaining

- [ ] **FP5.23**: Update documentation
  - **Files**:
    - Update README with new UI
    - Screenshot current state
    - Document new features (component library, etc.)
  - **Success**: Documentation reflects new UI

- [ ] **FP5.24**: Final commit and tag
  - **Command**: `git add . && git commit -m "feat(ui): Complete Figma-style UI redesign with dark theme"`
  - **Tag**: `git tag -a ui-redesign-v1.0 -m "Production-quality Figma-style UI"`
  - **Success**: Changes committed and tagged

**Sprint 5 Deliverable**: Production-ready, accessible, polished UI

---

# FINAL VALIDATION CHECKLIST

## Visual Quality ✅
- [ ] Professional dark theme applied throughout
- [ ] Consistent spacing (4px base scale)
- [ ] Professional typography (Inter font, defined scale)
- [ ] Smooth animations and transitions (Framer Motion)
- [ ] Professional icons (Lucide, no emojis)
- [ ] Clear visual hierarchy
- [ ] Polished component styling

## Layout ✅
- [ ] 3-column Figma-style layout (Left sidebar | Canvas | Right panel)
- [ ] Bottom toolbar with centered tool palette
- [ ] Left sidebar: Component Library + Pages + Layers
- [ ] Right panel: Contextual properties
- [ ] Collapsible sidebars
- [ ] Responsive design

## Functionality ✅
- [ ] Component library with drag-drop working
- [ ] All tools accessible from bottom toolbar
- [ ] Canvas zoom and pan smooth
- [ ] Object selection and editing working
- [ ] Properties update in real-time
- [ ] Multi-user collaboration working

## User Experience ✅
- [ ] Intuitive navigation
- [ ] Clear empty states with guidance
- [ ] Helpful error messages
- [ ] Professional loading states (skeletons)
- [ ] Tooltips with keyboard shortcuts
- [ ] Responsive interactions

## Accessibility ✅
- [ ] WCAG AA color contrast compliance
- [ ] Full keyboard navigation
- [ ] Screen reader friendly (ARIA labels)
- [ ] Visible focus indicators
- [ ] Zero accessibility violations (jest-axe)

## Performance ✅
- [ ] Initial load < 2 seconds
- [ ] Time to interactive < 3 seconds
- [ ] Smooth 60fps interactions
- [ ] 500+ objects render smoothly
- [ ] Optimized re-renders
- [ ] Debounced updates

## Code Quality ✅
- [ ] TypeScript compilation passes
- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Linting passes
- [ ] Code formatted consistently

## Documentation ✅
- [ ] README updated with screenshots
- [ ] User guide reflects new UI
- [ ] Component documentation updated
- [ ] Design system documented

---

# ESTIMATED TIMELINE

**Total Duration**: 10-13 days (60-78 hours)

- **Sprint 1** (Days 1-2): Dark Theme Foundation - 12-16 hours
- **Sprint 2** (Days 3-5): Layout Transformation - 16-24 hours
- **Sprint 3** (Days 6-8): Visual Polish & Animations - 16-24 hours
- **Sprint 4** (Days 9-10): Component Library - 12-16 hours
- **Sprint 5** (Days 11-13): Accessibility & Quality - 12-16 hours

**Velocity Assumptions**:
- 6-8 hours per day
- Some tasks can be parallelized
- Buffer time included for unexpected issues

---

# SUCCESS METRICS

## Before (Current State)
- Light theme with basic styling
- Header-based tool buttons
- Toggle-able sidebars
- Basic functionality
- Emoji icons
- Limited polish

## After (Target State)
- **Professional dark theme** with OKLch colors
- **Figma-style layout** matching industry standards
- **Component library** for rapid prototyping
- **Smooth animations** enhancing UX
- **WCAG AA accessibility** for inclusive design
- **Production-quality polish** throughout

## Measurable Improvements
- **Visual Appeal**: From basic → Professional
- **User Efficiency**: Component library reduces creation time by 50%
- **Accessibility Score**: From unknown → WCAG AA compliant
- **Performance**: Smooth 60fps with 500+ objects
- **User Satisfaction**: Measured through feedback and usage metrics

---

# NOTES

- **Incremental Deployment**: Can deploy after each sprint for feedback
- **Feature Flags**: Consider feature flags for gradual rollout
- **User Training**: May need brief training on new layout
- **Backward Compatibility**: All existing features continue to work
- **Future Enhancements**: Component library can be expanded over time

**Prepared by**: Claude Code
**Date**: 2025-10-18
**Version**: 1.0
