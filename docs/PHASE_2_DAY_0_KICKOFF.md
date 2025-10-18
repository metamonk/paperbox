# Phase II Day 0: Implementation Kickoff Guide

**Status**: Pre-Implementation Preparation
**Date**: 2025-10-16
**Ready to Start**: After completing this checklist

---

## Overview

This guide prepares your development environment for Phase II implementation. Complete these tasks **before** starting Day 1 of the 12-week workflow.

---

## ✅ Pre-Flight Checklist

### 1. Environment Setup (30 minutes)

#### Git Workflow
```bash
# CRITICAL: Create feature branch for Phase II
git checkout -b feature/phase2-fabric-zustand
git status  # Verify you're on feature branch, NOT main

# Confirm clean working tree
git status  # Should show "nothing to commit, working tree clean"
```

#### Dependency Audit
```bash
# Current dependencies to REMOVE in Week 1
pnpm list konva react-konva react-konva-utils

# Verify current versions match:
# - konva: ^10.0.2
# - react-konva: ^19.0.10
# - react-konva-utils: ^2.0.0

# Node/pnpm versions
node --version   # Should be >=18.0.0
pnpm --version   # Should be >=9.0.0
```

#### Project Structure Verification
```bash
# Verify critical directories exist
ls -la src/components/canvas  # CanvasStage.tsx
ls -la src/hooks              # useCanvas.ts, useRealtimeObjects.ts
ls -la src/types              # canvas.ts
ls -la docs                   # PRD and workflow docs
ls -la supabase/migrations    # Database migrations
```

---

### 2. Documentation Review (1 hour)

**Required Reading** (in order):
1. ✅ [PHASE_2_PRD.md](./PHASE_2_PRD.md) - Complete technical specification
2. ✅ [PHASE_2_IMPLEMENTATION_WORKFLOW.md](./PHASE_2_IMPLEMENTATION_WORKFLOW.md) - 12-week execution plan
3. ✅ [FOUNDATION.md](./FOUNDATION.md) - 57 feature requirements
4. ✅ [AI.md](./AI.md) - Phase III AI integration context

**Key Concepts to Understand**:
- 5-layer architecture (Data → State → Sync → Canvas → Feature)
- Zustand 6-slice store pattern
- Command pattern for AI-ready operations
- Fabric.js imperative API vs Konva declarative
- Hybrid conflict resolution (LWW + OT)

---

### 3. Technology Research (2 hours)

#### Fabric.js Deep Dive
```bash
# Read official documentation
# URL: http://fabricjs.com/docs/
# Focus areas:
# - Canvas initialization and configuration
# - Object model (fabric.Object, fabric.Rect, fabric.Circle, fabric.Text)
# - Event system (object:modified, selection:created, etc.)
# - Serialization (toJSON/loadFromJSON)
```

**Key Fabric.js Patterns to Learn**:
```typescript
// Canvas initialization
const canvas = new fabric.Canvas('canvas', {
  width: 5000,
  height: 5000,
  backgroundColor: '#ffffff'
});

// Object creation
const rect = new fabric.Rect({
  left: 100,
  top: 100,
  width: 200,
  height: 150,
  fill: '#3b82f6'
});
canvas.add(rect);

// Event handling
canvas.on('object:modified', (e) => {
  const obj = e.target;
  // Sync to Zustand store
});

// Selection management
canvas.getActiveObject();      // Single selection
canvas.getActiveObjects();     // Multi-selection
canvas.discardActiveObject();  // Deselect
```

#### Zustand with Immer
```bash
# Read official documentation
# URL: https://github.com/pmndrs/zustand
# Focus areas:
# - Create store with immer middleware
# - Slice pattern for store composition
# - Async actions and optimistic updates
# - TypeScript typing with create<T>()
```

**Key Zustand Patterns to Learn**:
```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface CanvasState {
  objects: Map<string, CanvasObject>;
  createObject: (obj: Partial<CanvasObject>) => Promise<void>;
}

export const useCanvasStore = create<CanvasState>()(
  immer((set, get) => ({
    objects: new Map(),

    createObject: async (obj) => {
      const id = nanoid();

      // Optimistic update (immediate UI)
      set((state) => {
        state.objects.set(id, { ...obj, id } as CanvasObject);
      });

      // Database write (background)
      await supabase.from('canvas_objects').insert({ ...obj, id });
    }
  }))
);
```

---

### 4. Development Setup (30 minutes)

#### Install Day 1 Dependencies (Preview)
```bash
# DON'T RUN YET - Just preview what Day 1 will install

# Phase II Core Dependencies:
pnpm add fabric zustand immer nanoid use-debounce

# Type definitions:
pnpm add -D @types/fabric

# Day 1 will also REMOVE:
pnpm remove konva react-konva react-konva-utils
```

#### Create Directory Structure (Preview)
```bash
# DON'T CREATE YET - Day 1 will create these

mkdir -p src/lib/fabric          # Fabric.js managers
mkdir -p src/lib/commands        # Command pattern implementations
mkdir -p src/stores              # Zustand store slices
mkdir -p src/stores/slices       # Individual store modules
mkdir -p src/sync                # Supabase ↔ Zustand ↔ Fabric sync
mkdir -p src/engines             # 8 core engines (Selection, Transform, etc.)
```

#### VS Code Extensions (Recommended)
```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "vitest.explorer",
    "supabase.supabase-vscode"
  ]
}
```

---

### 5. Testing Strategy Preparation (1 hour)

#### Review Current Test Setup
```bash
# Run existing tests to establish baseline
pnpm test

# Check test coverage
pnpm test:coverage

# Expected: Low coverage (MVP has minimal tests)
# Goal: >80% coverage by end of Phase II
```

#### Testing Tools Setup
```bash
# Verify vitest configuration
cat vite.config.ts | grep -A 10 "test:"

# Testing libraries already installed:
# - vitest (test runner)
# - @testing-library/react (React testing)
# - @testing-library/user-event (user interaction simulation)
# - jsdom (DOM environment)
```

**Phase II Testing Layers**:
1. **Unit Tests**: Individual engines and commands
2. **Integration Tests**: Store ↔ Sync ↔ Canvas layer
3. **E2E Tests**: Complete user workflows (TBD - Week 11)

---

### 6. Project Tracking Setup (30 minutes)

#### TodoWrite Integration
This project uses `TodoWrite` tool for task tracking:

```typescript
// Day 1 example usage
TodoWrite([
  {
    content: "Install Fabric.js and remove Konva",
    activeForm: "Installing Fabric.js and removing Konva",
    status: "in_progress"
  },
  {
    content: "Create FabricCanvasManager.ts",
    activeForm: "Creating FabricCanvasManager.ts",
    status: "pending"
  }
]);
```

#### Optional: GitHub Projects Setup
```bash
# Create GitHub Project for Phase II tracking
# Link: https://github.com/[your-username]/paperbox/projects

# Suggested columns:
# - 📋 Backlog (57 features from FOUNDATION.md)
# - 🏗️ In Progress (current week tasks)
# - ✅ Done (completed tasks)
# - ⚠️ Blocked (impediments)
```

---

### 7. Risk Mitigation Preparation (1 hour)

#### Critical Risks & Mitigation

**Risk 1: Fabric.js Migration Complexity**
- **Mitigation**: Allocated 2 full weeks (Week 1-2) for migration
- **Fallback**: 20% time buffer in schedule
- **Validation**: Early testing gates on Day 10

**Risk 2: Real-time Sync Conflicts**
- **Mitigation**: Hybrid LWW/OT conflict resolution strategy
- **Fallback**: Consider Yjs for text editing if OT proves complex
- **Validation**: Conflict simulation tests in Week 11

**Risk 3: Performance Degradation**
- **Mitigation**: Continuous benchmarking (500+ objects target)
- **Fallback**: Object pooling, virtual scrolling, debounced writes
- **Validation**: Performance gates at each milestone

**Risk 4: Scope Creep**
- **Mitigation**: Strict adherence to 57 FOUNDATION.md features
- **Fallback**: Defer non-essential features to Phase III
- **Validation**: Weekly scope review

---

### 8. Communication Plan (30 minutes)

#### Daily Standup Format
```markdown
## Daily Status Update

**Yesterday**:
- Completed: [tasks completed]
- Blockers: [impediments encountered]

**Today**:
- Focus: [current day tasks from workflow]
- Goals: [expected outcomes]

**Risks**:
- [Any new risks identified]
```

#### Weekly Status Report Format
```markdown
## Week [N] Status Report

**Milestone Progress**: [X/6 milestones complete]

**Completed This Week**:
- [Feature/task completions]

**Quality Gates**:
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Code review complete

**Next Week Focus**:
- [Preview of Week N+1 tasks]

**Blockers/Risks**:
- [Any impediments or concerns]
```

---

## 📋 Day 0 Completion Checklist

Before starting Day 1, verify:

- [ ] ✅ Git feature branch created: `feature/phase2-fabric-zustand`
- [ ] ✅ Working tree is clean (no uncommitted changes)
- [ ] ✅ Node >=18.0.0 and pnpm >=9.0.0 verified
- [ ] ✅ Project structure verified (all directories exist)
- [ ] ✅ Documentation reviewed (PRD, Workflow, FOUNDATION.md)
- [ ] ✅ Fabric.js documentation studied (2 hours minimum)
- [ ] ✅ Zustand documentation studied (1 hour minimum)
- [ ] ✅ Current test suite baseline established
- [ ] ✅ TodoWrite task tracking system understood
- [ ] ✅ Risk mitigation strategies reviewed
- [ ] ✅ Communication plan established

---

## 🚀 Next Steps

**When all checklist items are complete**:

1. **Read**: [PHASE_2_IMPLEMENTATION_WORKFLOW.md](./PHASE_2_IMPLEMENTATION_WORKFLOW.md) - Day 1 section
2. **Start**: Day 1, Morning Tasks (4 hours)
3. **Track**: Update TodoWrite with Day 1 tasks
4. **Communicate**: Daily standup (if applicable)

---

## 📚 Reference Materials

### Quick Links
- [Fabric.js Docs](http://fabricjs.com/docs/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Immer Guide](https://immerjs.github.io/immer/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

### Internal Documentation
- [PHASE_2_PRD.md](./PHASE_2_PRD.md) - Complete technical specification
- [PHASE_2_IMPLEMENTATION_WORKFLOW.md](./PHASE_2_IMPLEMENTATION_WORKFLOW.md) - 12-week plan
- [FOUNDATION.md](./FOUNDATION.md) - Feature requirements
- [AI.md](./AI.md) - Phase III preparation context

### Serena Memory
```bash
# Architecture decisions stored in project memory
# Access with: mcp__serena__read_memory("phase2_architecture_decisions")
```

---

## ⚠️ Important Notes

1. **Branch Strategy**: NEVER work directly on `main` branch during Phase II
2. **Dependency Changes**: ALL dependency changes happen on Day 1 - don't install early
3. **Testing**: Run full test suite before each commit
4. **Performance**: Benchmark continuously, don't wait until the end
5. **Documentation**: Update architectural decisions in Serena memory as you go

---

## 🎯 Success Metrics

Track these throughout Phase II:

- **Feature Completion**: X/57 features implemented
- **Test Coverage**: Current% → Target 80%
- **Performance**: Object count supported (target: 500+)
- **Concurrent Users**: User count supported (target: 5+)
- **Sync Latency**: Current ms → Target <100ms

---

**Ready to begin? Complete this checklist, then proceed to Day 1 of the implementation workflow.**
