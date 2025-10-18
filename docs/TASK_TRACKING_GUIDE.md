# Phase II Task Tracking Guide

**Purpose**: How to use the master task list for focused, organized execution
**Master List**: [MASTER_TASK_LIST.md](./MASTER_TASK_LIST.md)

---

## 📋 Task Organization System

### Task ID Format: `W#.D#.#`

Every task has a unique ID following this pattern:
- **W#** = Week number (1-12)
- **D#** = Day number within week (1-5)
- **#** = Task number within day (1-10)

**Examples**:
- `W1.D1.1` = Week 1, Day 1, Task 1 (Install Fabric.js)
- `W3.D2.5` = Week 3, Day 2, Task 5
- `W12.D5.3` = Week 12, Day 5, Task 3 (final week, last day)

---

## 🔍 Chunking & Filtering

### How to Focus on Current Work

The master task list contains **~370 tasks** for the entire 12-week implementation. Use these filtering strategies to focus:

### Strategy 1: Week-Based Focus

**Show only current week's tasks** (example: Week 1):
```bash
# Search/filter for: W1.
# This shows all tasks starting with "W1."
```

**Result**: ~30-50 tasks for the week (manageable scope)

### Strategy 2: Day-Based Focus

**Show only today's tasks** (example: Week 1, Day 1):
```bash
# Search/filter for: W1.D1.
# This shows all tasks starting with "W1.D1."
```

**Result**: ~5-10 tasks for the day (daily execution scope)

### Strategy 3: Phase-Based Focus

**Show only specific phases** (example: testing tasks):
```bash
# Search for: [TEST]
# Shows all tasks with testing focus
```

**Show only Context7 documentation tasks**:
```bash
# Search for: [Context7]
# Shows all documentation fetch tasks
```

---

## 📊 Task Categories

Tasks are tagged with category markers for filtering:

| Tag | Meaning | Example |
|-----|---------|---------|
| `[Context7]` | Documentation fetch | `W1.D1.1: [Context7] Fetch Fabric.js docs` |
| `[RED]` | TDD: Write failing test | `W1.D3.1: Write test for createObject() [RED]` |
| `[GREEN]` | TDD: Implement to pass | `W1.D3.2: Implement createObject() [GREEN]` |
| `[REFACTOR]` | TDD: Clean up code | `W1.D3.3: Refactor for clarity [REFACTOR]` |
| `[TEST]` | Test execution | `W1.D5.10: Weekly validation - /sc:test [TEST]` |
| `[VALIDATE]` | Quality gate | `W2.D5.8: Milestone 1 validation [VALIDATE]` |
| `[COMMIT]` | Git checkpoint | `W1.D1.12: Commit Day 1 work [COMMIT]` |

---

## 🎯 Daily Workflow Pattern

### Morning Routine (Start of Day)

1. **Filter to today's tasks**
   ```bash
   # Example for Week 1, Day 1:
   # Filter: W1.D1.
   ```

2. **Review task list** (~5-10 tasks)
   - Read all tasks for the day
   - Understand dependencies
   - Note any Context7 fetches needed

3. **Mark first task as in_progress**
   - Update TodoWrite status
   - Begin execution

### During Day (Execution Loop)

For each task:

1. **Read task description**
   - Understand requirements
   - Check for tags ([Context7], [RED], [GREEN], etc.)

2. **Execute task**
   - If [Context7]: Fetch documentation first
   - If [RED]: Write failing test (TDD Red phase)
   - If [GREEN]: Implement to pass test (TDD Green phase)
   - If [REFACTOR]: Clean up implementation (TDD Refactor phase)

3. **Validate completion**
   - Run `pnpm test` (if code changes)
   - Run `pnpm typecheck` (if TypeScript changes)
   - Visual verification (if UI changes)

4. **Mark task completed**
   - Update TodoWrite status: `completed`
   - Move to next task

### End of Day (Wrap-up)

1. **Daily commit** (last task of each day)
   ```bash
   git add .
   git commit -m "feat(week-X): [brief description of day's work]"
   ```

2. **Review progress**
   - All day's tasks completed?
   - Any blockers for tomorrow?
   - Update daily standup

3. **Prepare for tomorrow**
   - Scan tomorrow's tasks
   - Note any Context7 fetches needed
   - Identify dependencies

---

## 📅 Weekly Workflow Pattern

### Start of Week

1. **Filter to current week**
   ```bash
   # Example: W3.
   # Shows all Week 3 tasks
   ```

2. **Week overview**
   - Review all ~30-50 tasks for the week
   - Understand week's goals (check workflow doc)
   - Note milestone/validation gates

3. **Plan week**
   - Allocate tasks to specific days
   - Identify parallel opportunities (Week 5-12)
   - Schedule pairing/review sessions

### End of Week (Friday)

1. **Weekly validation task** (always last task of week)
   ```
   WX.D5.XX: Weekly validation - /sc:test [TEST]
   ```

2. **Execute /sc:test**
   - Comprehensive coverage analysis
   - Performance benchmarks
   - Quality metrics review

3. **Week summary**
   - Features completed
   - Coverage % achieved
   - Blockers identified
   - Lessons learned

4. **Prepare next week**
   - Scan Week X+1 tasks
   - Identify any prerequisites
   - Note Context7 research needed

---

## 🏆 Milestone Workflow Pattern

### Milestone Tasks (6 total)

Milestones occur at:
- **Milestone 1**: End of Week 2 (Foundation complete)
- **Milestone 2**: End of Week 4 (Core features)
- **Milestone 3**: End of Week 6 (Styling complete)
- **Milestone 4**: End of Week 8 (Layout complete)
- **Milestone 5**: End of Week 10 (Advanced features)
- **Milestone 6**: End of Week 12 (Production ready)

### Milestone Validation Process

1. **Complete all milestone tasks**
   - All features for milestone implemented
   - All tests passing
   - Code reviewed

2. **Execute milestone validation**
   ```
   WX.DX.XX: Milestone X validation - /sc:test + benchmarks [VALIDATE]
   ```

3. **Validation checklist**
   - [ ] All tests passing (`pnpm test`)
   - [ ] Coverage target met (progressive: 30% → 80%)
   - [ ] No TypeScript errors (`pnpm typecheck`)
   - [ ] No ESLint errors (`pnpm lint`)
   - [ ] Performance benchmarks met
   - [ ] Integration testing passed

4. **Gate decision**
   - ✅ **Pass**: Proceed to next phase
   - ⚠️ **Conditional Pass**: Address minor issues in next week
   - ❌ **Fail**: Stop and resolve issues before proceeding

---

## 🧪 TDD Task Pattern (Red → Green → Refactor)

### Every Feature Implementation Uses This Pattern

**Example**: Implementing `canvasStore.createObject()`

```
W1.D3.1: Write test for createObject() - expect failure [RED]
├─ Write unit test in src/stores/__tests__/canvasStore.test.ts
├─ Test should fail (RED) - function doesn't exist yet
└─ Validate: pnpm test (expect failure)

W1.D3.2: Implement createObject() - make test pass [GREEN]
├─ Implement function in src/stores/slices/canvasStore.ts
├─ Minimal code to pass test
└─ Validate: pnpm test (expect success)

W1.D3.3: Refactor createObject() for clarity [REFACTOR]
├─ Clean up implementation
├─ Add comments and documentation
├─ Extract helper functions if needed
└─ Validate: pnpm test (still passing)

W1.D3.4: Validate createObject() complete ✅
├─ Run full test suite: pnpm test
├─ Type check: pnpm typecheck
├─ Lint check: pnpm lint
└─ Mark task complete
```

### TDD Task Markers

- **[RED]**: Write test, expect failure
- **[GREEN]**: Implement, make test pass
- **[REFACTOR]**: Clean up, maintain passing tests

---

## 📚 Context7 Integration Pattern

### When to Fetch Documentation

Context7 tasks are embedded at critical points:

**Week 1-2** (Foundation): High documentation needs
- Fabric.js canvas initialization
- Zustand with immer middleware
- Command pattern best practices

**Week 3-12** (Features): Selective documentation
- New feature types (gradients, blend modes)
- Complex patterns (text editing, auto-layout)

### Context7 Task Example

```
W1.D1.1: [Context7] Fetch Fabric.js 6.x canvas initialization patterns
├─ Use Context7 MCP to fetch latest Fabric.js docs
├─ Focus: Canvas constructor, configuration options, event system
├─ Review fetched docs before implementation
└─ Proceed to W1.D1.2 with documentation context
```

### How to Execute Context7 Tasks

1. **Trigger Context7 MCP**
   ```
   Use mcp__context7__resolve-library-id("fabric")
   Then mcp__context7__get-library-docs with relevant topic
   ```

2. **Review documentation**
   - Read fetched patterns
   - Note best practices
   - Identify examples to follow

3. **Apply to implementation**
   - Use documentation in next tasks
   - Reference patterns in code

---

## ⚡ Parallel Execution (Week 5-12)

### Identifying Parallel Opportunities

Some weeks have **independent features** that can be parallelized:

**Week 5-6**: Styling features (all independent)
- Color picker
- Text formatting
- Gradients
- Blend modes
- Shadows
- Filters

**Strategy**: If you have multiple developers or want to batch work:
1. Group tasks by feature
2. Complete all tasks for Feature A
3. Complete all tasks for Feature B
4. Run weekly validation together

### Task Grouping for Parallel Work

Tasks in Week 5-6 are grouped:
```
─── Feature: Color Picker (2 days) ───
W5.D1.1-10: Color picker tasks

─── Feature: Text Formatting (2 days) ───
W5.D2.1-10: Text formatting tasks

[These can be done in any order]
```

---

## 📊 Progress Tracking

### Daily Progress Metrics

Track these metrics daily:
- **Tasks completed today**: X/10
- **Tests passing**: Yes/No
- **Coverage %**: Current trend
- **Blockers**: List impediments

### Weekly Progress Metrics

Track these metrics weekly:
- **Tasks completed this week**: X/50
- **Features completed**: List
- **Coverage %**: Target vs actual
- **Performance**: Benchmark results
- **Quality gates**: Pass/Fail

### Phase Progress (Overall)

Track throughout Phase II:
- **Total tasks completed**: X/370
- **Weeks completed**: X/12
- **Milestones achieved**: X/6
- **Features implemented**: X/57
- **Final coverage**: X% (target: 80%)

---

## 🆘 Troubleshooting

### "Too many tasks, feeling overwhelmed"

**Solution**: Focus on smaller chunks
- Filter to today only (W#.D#.)
- Complete one task at a time
- Don't look ahead more than 1 day

### "Task dependencies unclear"

**Solution**: Review workflow document
- Check [PHASE_2_IMPLEMENTATION_WORKFLOW.md](./PHASE_2_IMPLEMENTATION_WORKFLOW.md)
- Read week overview section
- Note critical path (Week 1-2 is sequential)

### "Behind schedule"

**Solution**: Use built-in buffer
- 20% time buffer allocated
- Week 9-10 features can defer to Phase III
- Focus on Milestones 1-4 (essential features)

### "Test failing, blocking progress"

**Solution**: TDD recovery process
1. Don't skip test - find root cause
2. Re-run test with verbose output
3. Check test expectations vs implementation
4. Fix implementation, not test
5. Use /sc:test for comprehensive analysis

---

## ✅ Quick Reference

### Daily Commands
```bash
# Start day
# Filter to: W#.D#.

# During day
pnpm test           # Run tests
pnpm typecheck      # Type checking
pnpm lint           # Lint checking

# End day
git add .
git commit -m "feat(week-X): [description]"
```

### Weekly Commands
```bash
# Start week
# Filter to: W#.

# End week (validation task)
# Execute: /sc:test

# Review metrics
pnpm test:coverage
```

### Milestone Commands
```bash
# Milestone validation (task-driven)
# Execute: /sc:test + benchmarks

# Full validation
pnpm validate       # All checks
```

---

## 🎯 Success Criteria

You're on track if:
- ✅ Daily tasks completed each day
- ✅ All tests passing before each commit
- ✅ Weekly validations passing
- ✅ Coverage trending toward 80%
- ✅ No accumulated technical debt

---

**Ready to start? Open [MASTER_TASK_LIST.md](./MASTER_TASK_LIST.md) and begin with W1.D1.1! 🚀**
