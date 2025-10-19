# Figma-Style UI Redesign Plan
## Based on Scira Design System Analysis

**Created**: 2025-10-18
**Goal**: Transform Baseboard into a professional, production-quality Figma clone with modern dark UI aesthetic
**Reference**: Scira project (https://github.com/zaidmukaddam/scira)
**Screenshot Analysis**: Figma-style layout with dark theme

---

## 📊 Current State Analysis

### What We Have (Baseboard)
✅ **Component Library**: shadcn/ui + Kibo UI (already aligned!)
✅ **CSS Framework**: Tailwind CSS (already aligned!)
✅ **Core Layout**: Header, Sidebar, Canvas, Property Panel
✅ **Basic Functionality**: Tools, layers, properties working

### What's Missing for Professional Look
❌ **Dark theme** (currently light theme with basic colors)
❌ **Figma-style layout** (3-column: left sidebar, center canvas, right properties)
❌ **Professional color palette** (using OKLch color space like Scira)
❌ **Modern toolbar** (bottom toolbar like Figma, not header buttons)
❌ **Component library panel** (drag-drop components)
❌ **Polished spacing and typography**
❌ **Smooth animations and transitions**
❌ **Professional icons** (Lucide icons throughout)

---

## 🎨 Design System from Scira

### Color Palette (Dark Mode - Primary Focus)

Using **OKLch color space** for perceptually uniform colors:

```css
/* Dark Mode Variables (from Scira globals.css) */
--background: oklch(0.1776 0 0);           /* Near black #1a1a1a */
--foreground: oklch(0.9491 0 0);           /* Off-white #f0f0f0 */
--primary: oklch(0.9247 0.0524 66.1732);   /* Bright yellow-green accent */
--secondary: oklch(0.3163 0.019 63.6992);  /* Dark olive */
--accent: oklch(0.285 0 0);                /* Dark gray #3a3a3a */
--muted: oklch(0.285 0 0);                 /* Same as accent */
--card: oklch(0.1776 0 0);                 /* Same as background */
--popover: oklch(0.1776 0 0);              /* Same as background */
--border: oklch(0.285 0 0);                /* Dark gray borders */
--input: oklch(0.285 0 0);                 /* Dark gray inputs */
--ring: oklch(0.9247 0.0524 66.1732);      /* Primary for focus rings */

/* Sidebar specific (purple-tinted) */
--sidebar-background: oklch(0.1686 0.0089 293.2466);  /* Dark purple */
--sidebar-foreground: oklch(0.9491 0 0);              /* Off-white */
--sidebar-accent: oklch(0.3163 0.0392 286.7484);      /* Muted purple */
```

### Typography & Configuration
- **Font Family**: "Be Vietnam Pro" (from Scira) or "Inter" (Figma standard)
- **Border Radius**: `1rem` (consistent rounded corners)
- **Shadow System**: 8 levels from `--shadow-2xs` to `--shadow-2xl`
- **Tailwind v4 Approach**: NO `tailwind.config.js` file - all configuration via CSS `@theme` blocks
- **CSS-First Configuration**: Define theme variables in `src/index.css` using `@theme` directive

### Component Style Variant
- **shadcn/ui style**: "new-york" (matches Scira)
- **Icons**: Lucide React (already using this)

### Tailwind CSS v4 Key Differences
⚠️ **Important**: Tailwind v4 uses a completely different configuration approach:
- ❌ NO `tailwind.config.js` file (v3 approach)
- ✅ YES CSS-based configuration with `@theme` blocks
- ✅ All customization in CSS files using CSS custom properties
- ✅ Direct CSS variable usage in components: `var(--color-primary)`

---

## 🏗️ Layout Transformation

### Current Layout (Baseboard)
```
┌─────────────────────────────────────────────────────┐
│ Header (Tools, Properties, Layers buttons)          │
├────────────┬──────────────────────────┬──────────────┤
│            │                          │              │
│ Sidebar    │      Canvas Area         │ (Toggleable) │
│ (Toggles)  │                          │ Right Panel  │
│            │                          │              │
└────────────┴──────────────────────────┴──────────────┘
```

### Target Layout (Figma-style)
```
┌─────────────────────────────────────────────────────┐
│ Top Bar (Canvas Picker, Share, Design/Prototype)    │
├────┬──────────────────────────────────────────┬─────┤
│    │                                          │     │
│ L  │                                          │  R  │
│ e  │           Canvas Area                    │  i  │
│ f  │                                          │  g  │
│ t  │                                          │  h  │
│    │                                          │  t  │
│ S  │                                          │     │
│ i  │                                          │  P  │
│ d  │                                          │  a  │
│ e  │                                          │  n  │
│ b  │                                          │  e  │
│ a  │                                          │  l  │
│ r  │                                          │     │
│    ├──────────────────────────────────────────┤     │
│    │  Bottom Toolbar (Tools)                  │     │
└────┴──────────────────────────────────────────┴─────┘
```

### Layout Breakdown

#### 1. Top Bar (Header)
- **Left**: Canvas picker dropdown (like Figma file selector)
- **Center**: Tab controls (Design / Prototype mode)
- **Right**: Share button, user avatars, zoom controls

#### 2. Left Sidebar
- **Top Section**: Pages list (collapsible)
- **Bottom Section**: Layers panel (with search)
- **Width**: ~240px fixed
- **Resizable**: Optional

#### 3. Center Canvas
- **Background**: Dark gray (`#2c2c2c` or similar)
- **Infinite scroll**: Pan and zoom
- **Grid/Rulers**: Optional toggles

#### 4. Bottom Toolbar
- **Tools**: Cursor, Frame, Shape, Pen, Text, etc.
- **Centered**: Floating toolbar style
- **Icons**: Lucide icons with tooltips

#### 5. Right Panel (Properties)
- **Contextual**: Shows properties of selected object
- **Sections**: Design, Export, Variables, etc.
- **Width**: ~280px fixed
- **Collapsible**: Can hide to maximize canvas

---

## 📋 Implementation Tasks

### Phase 1: Color Scheme & Dark Theme (Priority: CRITICAL)

**Goal**: Implement professional dark theme using OKLch color space

- [ ] **Task 1.1**: Update `globals.css` with OKLch dark theme variables
  - Copy Scira's dark mode palette
  - Add light mode as fallback (optional)
  - Implement CSS variable system with `:root` and `.dark`

- [ ] **Task 1.2**: Update `components.json` shadcn config
  - Change to "new-york" style variant
  - Verify CSS variables enabled
  - Ensure Lucide icons configured

- [ ] **Task 1.3**: Apply dark theme to all existing components
  - Update Header component backgrounds
  - Update Sidebar styling
  - Update Canvas background color
  - Update PropertyPanel styling
  - Update all shadcn/ui component theming

- [ ] **Task 1.4**: Add theme toggle (optional)
  - Create ThemeProvider context
  - Add light/dark mode switcher in header
  - Persist preference in localStorage

**Files to Modify**:
- `app/globals.css` (or `src/index.css`)
- `components.json`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/canvas/Canvas.tsx`
- `src/components/properties/PropertyPanel.tsx`

---

### Phase 2: Layout Restructure (Priority: HIGH)

**Goal**: Transform to 3-column Figma-style layout

- [ ] **Task 2.1**: Create new CanvasLayout component
  - 3-column grid: Left sidebar (240px) | Center (flex-1) | Right panel (280px)
  - Dark background throughout
  - Sticky top header

- [ ] **Task 2.2**: Move tools to bottom toolbar
  - Create BottomToolbar component
  - Center-aligned floating toolbar style
  - Migrate tool buttons from Header
  - Add Lucide icons for each tool
  - Add keyboard shortcut tooltips

- [ ] **Task 2.3**: Redesign Left Sidebar
  - **Top section**: Pages panel (collapsible)
    - List of canvas pages
    - Add page button
    - Duplicate/delete actions
  - **Separator**: Horizontal divider
  - **Bottom section**: Layers panel (existing LayersPanel)
  - Search functionality for layers

- [ ] **Task 2.4**: Redesign Right Panel (Properties)
  - Contextual based on selection
  - Collapsible sections (Design, Export, Variables, Styles)
  - Polished spacing and typography
  - Professional input styling

- [ ] **Task 2.5**: Update Header (Top Bar)
  - **Left**: Canvas picker dropdown (existing CanvasPicker)
  - **Center**: Mode tabs (Design / Prototype)
  - **Right**: Share button, presence avatars, zoom controls
  - Remove tool buttons (moved to bottom toolbar)

**Files to Create**:
- `src/components/layout/CanvasLayout.tsx`
- `src/components/toolbar/BottomToolbar.tsx`
- `src/components/sidebar/PagesPanel.tsx`

**Files to Modify**:
- `src/pages/CanvasPage.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/properties/PropertyPanel.tsx`

---

### Phase 3: Component Library Panel (Priority: MEDIUM)

**Goal**: Add drag-drop component library like Figma

- [ ] **Task 3.1**: Create ComponentLibrary panel
  - Add to left sidebar (above Pages panel)
  - Collapsible sections: Shapes, Icons, UI Components
  - Search and filter functionality

- [ ] **Task 3.2**: Implement component templates
  - Rectangle, Circle, Triangle, Line (existing shapes)
  - Arrow, Star, Polygon (new shapes)
  - Text templates (Heading, Paragraph, Label)
  - UI kits (Button, Input, Card templates)

- [ ] **Task 3.3**: Drag-drop functionality
  - Drag component from library to canvas
  - Preview on hover
  - Drop to create on canvas

**Files to Create**:
- `src/components/library/ComponentLibrary.tsx`
- `src/components/library/ComponentCard.tsx`
- `src/lib/templates/shapeTemplates.ts`
- `src/lib/templates/uiTemplates.ts`

---

### Phase 4: Visual Polish & Animations (Priority: MEDIUM)

**Goal**: Professional animations and micro-interactions

- [ ] **Task 4.1**: Add Framer Motion for animations
  - Install framer-motion package
  - Smooth panel open/close transitions
  - Fade-in components on mount
  - Hover effects on interactive elements

- [ ] **Task 4.2**: Enhance toolbar interactions
  - Tool selection animations
  - Active state indicators
  - Tooltips with keyboard shortcuts
  - Smooth transitions

- [ ] **Task 4.3**: Canvas interactions polish
  - Smooth zoom transitions
  - Pan momentum/inertia
  - Selection box animation
  - Object transform feedback

- [ ] **Task 4.4**: Loading states and skeletons
  - Replace spinner with skeleton screens
  - Shimmer effect for loading content
  - Progressive loading for large canvases

**Files to Modify**:
- `package.json` (add framer-motion)
- `src/components/toolbar/BottomToolbar.tsx`
- `src/components/canvas/Canvas.tsx`
- All interactive components

---

### Phase 5: Typography & Spacing System (Priority: MEDIUM)

**Goal**: Consistent spacing and typography

- [ ] **Task 5.1**: Add custom font family
  - Install "Be Vietnam Pro" or "Inter" font
  - Update `globals.css` font-family
  - Add font-weights: 400, 500, 600, 700

- [ ] **Task 5.2**: Create spacing scale
  - Define Tailwind spacing extensions
  - Use consistent spacing throughout (4px base)
  - Apply to padding, margins, gaps

- [ ] **Task 5.3**: Typography scale
  - Define heading sizes (h1-h6)
  - Body text sizes (sm, base, lg)
  - Line heights and letter spacing
  - Apply consistently across UI

**Files to Modify**:
- `tailwind.config.js` (extend spacing and typography)
- `app/globals.css` (font imports)
- All component files (apply consistent spacing)

---

### Phase 6: Professional Icons & Assets (Priority: LOW)

**Goal**: Replace emojis with professional icons

- [ ] **Task 6.1**: Replace emoji icons with Lucide
  - Tools toolbar: Use proper tool icons
  - Property panel: Use settings icons
  - Sidebar: Use layer/page icons
  - Actions: Use action icons (delete, duplicate, lock)

- [ ] **Task 6.2**: Add brand assets
  - Logo/wordmark for header
  - Favicon and app icons
  - Empty state illustrations

**Files to Modify**:
- `src/components/layout/Header.tsx`
- `src/components/toolbar/BottomToolbar.tsx`
- `src/components/layers/LayersPanel.tsx`
- `public/` directory (favicon, icons)

---

### Phase 7: Accessibility & Polish (Priority: HIGH)

**Goal**: WCAG AA compliance and professional quality

- [ ] **Task 7.1**: Accessibility audit
  - Run jest-axe on all components
  - Fix color contrast issues
  - Add ARIA labels and roles
  - Test screen reader compatibility

- [ ] **Task 7.2**: Keyboard navigation
  - Full keyboard navigation for all panels
  - Focus indicators visible
  - Escape to close modals/popovers
  - Tab order logical

- [ ] **Task 7.3**: Error boundaries and states
  - Graceful error handling
  - User-friendly error messages
  - Retry mechanisms
  - Empty states with guidance

- [ ] **Task 7.4**: Performance optimization
  - Lazy load heavy components
  - Virtualize long lists (layers panel)
  - Debounce property updates
  - Optimize re-renders

**Files to Modify**:
- All component files (accessibility improvements)
- `src/components/ErrorBoundary.tsx`
- Performance-critical components

---

## 🎯 Prioritized Implementation Order

### Sprint 1: Dark Theme Foundation (1-2 days)
1. Update `globals.css` with OKLch dark palette
2. Apply dark theme to all components
3. Verify consistency across app

### Sprint 2: Layout Transformation (2-3 days)
4. Create 3-column CanvasLayout
5. Move tools to BottomToolbar
6. Redesign Header (top bar)
7. Restructure Left Sidebar (Pages + Layers)
8. Polish Right Panel (Properties)

### Sprint 3: Visual Polish (2-3 days)
9. Add Framer Motion animations
10. Professional typography and spacing
11. Replace emojis with Lucide icons
12. Loading states and skeletons

### Sprint 4: Component Library (2-3 days)
13. Create ComponentLibrary panel
14. Implement component templates
15. Drag-drop functionality

### Sprint 5: Accessibility & Quality (1-2 days)
16. Accessibility audit and fixes
17. Keyboard navigation improvements
18. Error boundaries and polish
19. Performance optimization

**Total Estimated Time**: 8-13 days (assuming 6-8 hours per day)

---

## 📦 Dependencies to Add

```bash
# Fonts (if using Google Fonts)
# Add to index.html or use @fontsource packages
pnpm add @fontsource/inter
# OR
pnpm add @fontsource/be-vietnam-pro

# Animations
pnpm add framer-motion

# Additional icons (if needed beyond Lucide)
# Already have lucide-react ✅

# Drag-drop (if not using HTML5 DnD)
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 🎨 Design Reference Screenshots

### Current Baseboard Layout
- Light theme with basic styling
- Header with tool buttons
- Toggle-able sidebars
- Basic property panel

### Target Figma-Style Layout (from your screenshot)
- **Top Bar**: Canvas picker, mode tabs, share button
- **Left Sidebar**: Pages (top) + Layers (bottom)
- **Center Canvas**: Dark background, infinite scroll
- **Bottom Toolbar**: Centered tool palette
- **Right Panel**: Contextual properties

### Scira Aesthetic
- Dark theme with OKLch colors
- Professional spacing and typography
- Smooth animations and transitions
- Modern shadcn/ui "new-york" style

---

## ✅ Success Criteria

### Visual Quality
- [ ] Professional dark theme throughout
- [ ] Consistent spacing and typography
- [ ] Smooth animations and transitions
- [ ] Modern, polished component styling

### Layout
- [ ] 3-column Figma-style layout
- [ ] Bottom toolbar with all tools
- [ ] Left sidebar with Pages + Layers
- [ ] Right panel with contextual properties
- [ ] Responsive and resizable panels

### User Experience
- [ ] Intuitive navigation
- [ ] Clear visual hierarchy
- [ ] Professional iconography (no emojis)
- [ ] Helpful tooltips and shortcuts
- [ ] Fast and responsive interactions

### Accessibility
- [ ] WCAG AA compliance
- [ ] Full keyboard navigation
- [ ] Screen reader friendly
- [ ] Visible focus indicators
- [ ] High contrast ratios

### Performance
- [ ] Smooth 60fps interactions
- [ ] Fast initial load (<2s)
- [ ] Efficient re-renders
- [ ] Optimized for 500+ objects

---

## 📝 Notes

- **Backward Compatibility**: Ensure all existing features continue to work during redesign
- **Incremental Rollout**: Can deploy dark theme first, then layout changes
- **User Feedback**: Consider beta testing with small group before full rollout
- **Documentation**: Update user docs and screenshots after redesign
- **Testing**: Comprehensive testing after each sprint
- **Git Strategy**: Feature branches for each sprint, merge to main after validation

---

## 🔗 References

- **Scira Repository**: https://github.com/zaidmukaddam/scira
- **shadcn/ui New York Style**: https://ui.shadcn.com/themes
- **OKLch Color Space**: https://oklch.com/
- **Figma Design**: User-provided screenshot
- **Lucide Icons**: https://lucide.dev/
- **Framer Motion**: https://www.framer.com/motion/
