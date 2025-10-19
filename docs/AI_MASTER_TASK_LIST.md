# AI Integration Master Task List - Phase III

**Duration**: 2 weeks (10 working days)
**Approach**: AI-First Implementation (Infrastructure → Commands → UI → Integration)
**Testing**: Manual validation with AI.md requirements (8+ commands, sub-2s performance)
**Quality**: Production-ready AI assistant for collaborative canvas editing

---

## Architecture Overview

### **Technology Stack**
- **AI Provider**: OpenAI (GPT-4 Turbo)
- **Framework**: Vercel AI SDK (@ai-sdk/openai, @ai-sdk/rsc)
- **Server**: Supabase Edge Functions
- **Streaming**: Server-sent events (SSE)
- **Performance Target**: Sub-2 second time to first token

### **Integration Pattern**
```
User Input (Command Palette / Toolbar)
    ↓
Supabase Edge Function (/functions/ai-command)
    ↓
OpenAI API (GPT-4 Turbo) + Tool Calling
    ↓
Command Execution (existing Command pattern)
    ↓
Zustand Store → Fabric.js → Supabase Realtime
    ↓
Visual Update on Canvas
```

### **Multi-User Coordination**
- Reuse existing object locking system (W1.D7)
- AI acquires locks before modifying objects
- Lock conflicts → graceful error messages
- Each user gets independent AI stream

---

## AI.md Requirements Mapping

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| 8+ distinct commands | 10 commands across 4 categories | Planned |
| Creation commands | CREATE_CIRCLE, CREATE_RECTANGLE, CREATE_TEXT | Week 1 |
| Manipulation commands | MOVE_OBJECT, RESIZE_OBJECT, ROTATE_OBJECT | Week 1 |
| Layout commands | ALIGN_OBJECTS, DISTRIBUTE_OBJECTS | Week 1 |
| Complex commands | COMPOSITE_COMMAND, GRID_LAYOUT | Week 1 |
| Sub-2s responses | Streaming + GPT-4 Turbo optimization | Week 1 |
| 90%+ accuracy | Golden test set validation | Week 2 |
| Multi-user support | AI-powered locking integration | Week 1 |
| Natural UX | Command Palette + Toolbar + Feedback | Week 1 |

---

## Key Design Decisions

### **Decision 1: AI Input Interface**
**Choice**: Hybrid - Command Palette (Primary) + Toolbar (Secondary)

**Rationale**:
- Command Palette (Cmd+K): Fast, keyboard-centric, non-intrusive
- Toolbar AI Input: Discoverable for new users, single-line with "Ask AI..." placeholder
- Matches professional design tools (Figma, Adobe)

**Implementation**:
- Command Palette: Modal overlay component
- Toolbar: Expandable input that triggers palette
- Both share same AI endpoint

---

### **Decision 2: Command Pattern Integration**
**Choice**: Option A (Generate Parameters) + Multi-Step Coordination

**How it works**:
```typescript
// AI receives: "Create a login form"
// AI generates tool calls:
[
  { tool: 'createText', args: { text: 'Username:', x: 100, y: 100 } },
  { tool: 'createRectangle', args: { x: 100, y: 130, width: 200, height: 40 } },
  { tool: 'createText', args: { text: 'Password:', x: 100, y: 190 } },
  { tool: 'createRectangle', args: { x: 100, y: 220, width: 200, height: 40 } },
  { tool: 'createRectangle', args: { x: 100, y: 280, width: 200, height: 40, fill: '#0070f3', text: 'Submit' } }
]

// Each tool call executes existing Command class:
const cmd = new CreateTextCommand({ text: 'Username:', x: 100, y: 100 });
await cmd.execute(); // Adds to Zustand, syncs to Supabase
historySlice.executeCommand(cmd); // Enables undo/redo
```

**Benefits**:
- Leverages existing Command infrastructure (W2.D2)
- Commands already integrated with undo/redo
- Multi-step coordination via `stopWhen: stepCountIs(5)`
- No AI-specific command classes needed

---

### **Decision 3: Canvas Context Awareness**
**Choice**: Full Context - AI sees selections, objects, viewport

**Context Provided to AI**:
```typescript
interface CanvasContext {
  canvasId: string;
  userId: string;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
    centerX: number; // Calculated from viewport
    centerY: number;
  };
  selectedObjects: {
    id: string;
    type: 'rectangle' | 'circle' | 'text';
    x: number;
    y: number;
    fill?: string;
    // ... other properties
  }[];
  allObjects: CanvasObject[]; // For reference queries
}
```

**Enables Natural Commands**:
- "Move this to the center" → AI knows "this" = selectedObjects[0]
- "Create a circle next to the blue rectangle" → AI finds blue rectangle from allObjects
- "Arrange selected items in a row" → AI operates on selectedObjects

---

### **Decision 4: Multi-User AI Coordination**
**Choice**: AI-Powered Locking (Option C)

**Flow**:
1. User A: "Move the blue rectangle to center"
2. AI identifies target object ID
3. AI calls `acquireLock(objectId, userAId)`
4. If SUCCESS → Execute command → `releaseLock(objectId)`
5. If FAILURE → Stream error: "Cannot modify - locked by User B"

**Integration Points**:
- Reuses `collaborationSlice.acquireLock()` from W1.D7
- Reuses `collaborationSlice.releaseLock()` from W1.D7
- Lock conflicts trigger toast notifications (W1.D8)
- No new lock infrastructure needed

---

# Week 1: Core AI Integration (Days 1-10)

## ─── Day 1: Infrastructure Setup ───

### Morning Block (4 hours)

- [ ] **W1.D1.1**: Install Vercel AI SDK dependencies
  - Install: `pnpm add ai @ai-sdk/openai @ai-sdk/rsc zod`
  - Verify: `OPENAI_API_KEY` in `.env.local`
  - Test: Simple OpenAI connection test script

- [ ] **W1.D1.2**: Create Supabase Edge Function structure
  - Create: `supabase/functions/ai-command/index.ts`
  - Add: TypeScript configuration for Edge Functions
  - Add: CORS headers for local development
  - Deploy: `supabase functions deploy ai-command`

- [ ] **W1.D1.3**: Implement basic streaming endpoint
  - Create: Edge Function with `streamText` example
  - Test: Manual curl request → verify streaming works
  - Add: Request logging and error handling

### Afternoon Block (4 hours)

- [ ] **W1.D1.4**: Create AI service types
  - Create: `src/types/ai.ts`
  - Define: `CanvasContext`, `AICommandRequest`, `AICommandResponse`
  - Define: `ToolCall`, `ToolResult` interfaces

- [ ] **W1.D1.5**: Implement canvas context provider
  - Create: `src/lib/ai/CanvasContextProvider.ts`
  - Method: `getCanvasContext(canvasId, userId)` → returns CanvasContext
  - Include: selectedObjects, allObjects, viewport, user info

- [ ] **W1.D1.6**: Create AI client hook
  - Create: `src/hooks/useAICommand.ts`
  - Hook: `useAICommand()` → `{ execute, isLoading, error, stream }`
  - Method: `execute(prompt)` → calls Edge Function, returns stream

---

## ─── Day 2: Command Class Implementations (Creation) ───

### Morning Block (4 hours)

- [ ] **W1.D2.1**: Implement CreateCircleCommand
  - Create: `src/lib/commands/CreateCircleCommand.ts`
  - Extends: `BaseCommand`
  - Parameters: `{ x, y, radius, fill?, stroke? }`
  - `execute()`: Add circle to canvasSlice
  - `undo()`: Remove circle from canvasSlice
  - `getMetadata()`: Return command type + params

- [ ] **W1.D2.2**: Implement CreateRectangleCommand
  - Create: `src/lib/commands/CreateRectangleCommand.ts`
  - Parameters: `{ x, y, width, height, fill?, stroke? }`
  - Follow same pattern as CreateCircleCommand

- [ ] **W1.D2.3**: Implement CreateTextCommand
  - Create: `src/lib/commands/CreateTextCommand.ts`
  - Parameters: `{ x, y, text, fontSize?, fontFamily?, fill? }`
  - Follow same pattern as CreateCircleCommand

### Afternoon Block (4 hours)

- [ ] **W1.D2.4**: Write tests for creation commands [RED]
  - Create: `src/lib/commands/__tests__/creation.test.ts`
  - Test: CreateCircleCommand execute/undo
  - Test: CreateRectangleCommand execute/undo
  - Test: CreateTextCommand execute/undo
  - Expect: All tests fail initially

- [ ] **W1.D2.5**: Fix creation command tests [GREEN]
  - Debug: Test failures
  - Fix: Command implementations
  - Verify: All tests passing

- [ ] **W1.D2.6**: Integrate with command registry
  - Update: `CommandRegistry` to include new commands
  - Update: `createCommand()` factory
  - Test: Factory creates correct command instances

---

## ─── Day 3: Command Class Implementations (Manipulation & Layout) ───

### Morning Block (4 hours)

- [ ] **W1.D3.1**: Implement MoveObjectCommand
  - Create: `src/lib/commands/MoveObjectCommand.ts`
  - Parameters: `{ objectId, toX, toY }`
  - Store: Previous position for undo
  - `execute()`: Update object position in canvasSlice

- [ ] **W1.D3.2**: Implement ResizeObjectCommand
  - Create: `src/lib/commands/ResizeObjectCommand.ts`
  - Parameters: `{ objectId, scaleX?, scaleY?, width?, height? }`
  - Store: Previous dimensions for undo

- [ ] **W1.D3.3**: Implement RotateObjectCommand
  - Create: `src/lib/commands/RotateObjectCommand.ts`
  - Parameters: `{ objectId, angle }` (degrees)
  - Store: Previous rotation for undo

### Afternoon Block (4 hours)

- [ ] **W1.D3.4**: Implement AlignObjectsCommand
  - Create: `src/lib/commands/AlignObjectsCommand.ts`
  - Parameters: `{ objectIds, alignment: 'left'|'center'|'right'|'top'|'middle'|'bottom' }`
  - Calculate: Alignment based on object bounds
  - Store: Previous positions for undo

- [ ] **W1.D3.5**: Implement DistributeObjectsCommand
  - Create: `src/lib/commands/DistributeObjectsCommand.ts`
  - Parameters: `{ objectIds, direction: 'horizontal'|'vertical', spacing?: number }`
  - Calculate: Even spacing between objects
  - Store: Previous positions for undo

- [ ] **W1.D3.6**: Write tests for manipulation & layout commands
  - Test: All 5 new commands (execute/undo)
  - Verify: Undo restores exact previous state
  - Verify: All tests passing

---

## ─── Day 4: AI Tool Definitions & Edge Function ───

### Morning Block (4 hours)

- [ ] **W1.D4.1**: Create AI tool definitions for creation
  - Create: `supabase/functions/ai-command/tools.ts`
  - Tool: `createCircle` → maps to CreateCircleCommand
  - Tool: `createRectangle` → maps to CreateRectangleCommand
  - Tool: `createText` → maps to CreateTextCommand
  - Include: Zod schemas for input validation

- [ ] **W1.D4.2**: Create AI tool definitions for manipulation
  - Tool: `moveObject` → maps to MoveObjectCommand
  - Tool: `resizeObject` → maps to ResizeObjectCommand
  - Tool: `rotateObject` → maps to RotateObjectCommand

- [ ] **W1.D4.3**: Create AI tool definitions for layout
  - Tool: `alignObjects` → maps to AlignObjectsCommand
  - Tool: `distributeObjects` → maps to DistributeObjectsCommand

### Afternoon Block (4 hours)

- [ ] **W1.D4.4**: Implement AI system prompt
  - Create: `supabase/functions/ai-command/prompts.ts`
  - Define: Canvas design assistant persona
  - Include: Tool usage guidelines
  - Include: Context interpretation rules (e.g., "this" = selected object)
  - Include: Multi-step planning instructions for complex commands

- [ ] **W1.D4.5**: Implement tool execution logic
  - Create: `supabase/functions/ai-command/executor.ts`
  - Function: `executeToolCall(toolName, params, context)`
  - Logic: Create appropriate Command instance
  - Logic: Execute command via RPC to client
  - Handle: Lock acquisition and release

- [ ] **W1.D4.6**: Integrate tools with streamText
  - Update: Edge Function to use tool definitions
  - Add: `stopWhen: stepCountIs(5)` for multi-step coordination
  - Add: Canvas context to system prompt
  - Test: Simple tool calling (manual curl)

---

## ─── Day 5: Complex Commands & Multi-Step Coordination ───

### Morning Block (4 hours)

- [ ] **W1.D5.1**: Implement CompositeCommand
  - Create: `src/lib/commands/CompositeCommand.ts`
  - Pattern: Chain multiple sub-commands
  - Parameters: `{ commands: Command[] }`
  - `execute()`: Execute all sub-commands sequentially
  - `undo()`: Undo all sub-commands in reverse order

- [ ] **W1.D5.2**: Implement GridLayoutCommand (using CompositeCommand)
  - Create: `src/lib/commands/GridLayoutCommand.ts`
  - Parameters: `{ rows, cols, spacing, x, y, shapeType }`
  - Logic: Generate grid of CreateShapeCommands
  - Wrap: All commands in CompositeCommand

- [ ] **W1.D5.3**: Test complex command scenarios
  - Test: "Create login form" → verify 5+ objects created
  - Test: "Create 3x3 grid of squares" → verify 9 squares
  - Test: Undo complex command → all objects removed

### Afternoon Block (4 hours)

- [ ] **W1.D5.4**: Implement multi-step AI coordination
  - Update: System prompt with complex command examples
  - Add: "Create login form" → step-by-step plan
  - Add: "Build nav bar with 4 items" → multi-tool sequence
  - Test: AI generates correct tool call sequences

- [ ] **W1.D5.5**: Add AI tool for complex layouts
  - Tool: `createLoginForm` → generates composite plan
  - Tool: `createNavBar` → generates composite plan
  - Tool: `createCardLayout` → generates composite plan

- [ ] **W1.D5.6**: Validate complex command execution
  - Test: "Create login form" end-to-end
  - Verify: Objects properly positioned and styled
  - Verify: Undo removes entire form
  - Verify: Sub-2s streaming response

---

## ─── Day 6: UI Components (Command Palette) ───

### Morning Block (4 hours)

- [ ] **W1.D6.1**: Create Command Palette base component
  - Create: `src/components/ai/CommandPalette.tsx`
  - UI: Modal overlay with backdrop blur
  - UI: Input field with "Ask AI to..." placeholder
  - UI: Keyboard shortcut (Cmd+K) to open/close
  - State: Open/closed, input value

- [ ] **W1.D6.2**: Add streaming response display
  - Add: Response area below input
  - Display: Streaming text with typing animation
  - Display: Tool calls with icons (create, move, align, etc.)
  - Display: Progress indicators for multi-step commands

- [ ] **W1.D6.3**: Implement command history
  - Add: Recent commands list (localStorage)
  - UI: Show recent 5 commands below input
  - Action: Click recent command to re-execute
  - Action: Arrow up/down to navigate history

### Afternoon Block (4 hours)

- [ ] **W1.D6.4**: Add suggestion prompts
  - UI: Placeholder suggestions when input empty
  - Examples: "Create a circle...", "Move selected to...", "Arrange in grid..."
  - Rotate: Cycle through suggestions every 3s
  - Action: Click suggestion to fill input

- [ ] **W1.D6.5**: Implement error/lock conflict UI
  - Display: Lock conflict errors gracefully
  - Message: "Cannot modify - locked by [UserName]"
  - Action: "Try again" button
  - Action: "Create copy instead" suggestion

- [ ] **W1.D6.6**: Add keyboard navigation
  - Cmd+K: Open/close palette
  - Esc: Close palette
  - Enter: Submit command
  - Up/Down: Navigate history
  - Cmd+L: Clear input

---

## ─── Day 7: UI Components (Toolbar & Integration) ───

### Morning Block (4 hours)

- [ ] **W1.D7.1**: Create toolbar AI input component
  - Create: `src/components/ai/ToolbarAIInput.tsx`
  - UI: Single-line input in header
  - UI: "Ask AI..." placeholder with sparkle icon ✨
  - Behavior: Focus → expand and open Command Palette

- [ ] **W1.D7.2**: Integrate toolbar with Command Palette
  - Logic: Toolbar input focuses → open Command Palette
  - Logic: Command Palette shows → toolbar input blurs
  - Logic: Share same AI execution hook
  - Style: Consistent styling between both

- [ ] **W1.D7.3**: Add visual feedback for AI processing
  - Add: Loading spinner in input during execution
  - Add: Progress bar for multi-step commands
  - Add: Success animation when complete
  - Add: Error shake animation on failure

### Afternoon Block (4 hours)

- [ ] **W1.D7.4**: Implement AI execution integration
  - Connect: Command Palette → useAICommand hook
  - Logic: Submit → call Edge Function with canvas context
  - Logic: Stream response → update UI in real-time
  - Logic: Tool calls → execute commands → update canvas

- [ ] **W1.D7.5**: Add multi-user coordination to UI
  - Display: "Acquiring lock..." during lock acquisition
  - Display: Lock conflict errors with user name
  - Toast: Show notification when AI completes command
  - Toast: Show notification on errors

- [ ] **W1.D7.6**: Test full UI flow end-to-end
  - Test: Open palette (Cmd+K)
  - Test: Type command → submit
  - Test: See streaming response
  - Test: Canvas updates in real-time
  - Test: Undo/redo works correctly

---

## ─── Day 8: Testing & Validation (AI.md Requirements) ───

### Morning Block (4 hours)

- [ ] **W1.D8.1**: Manual test - Creation commands (Category 1)
  - Test: "Create a red circle at position 100, 200" ✓
  - Test: "Add a text layer that says 'Hello World'" ✓
  - Test: "Make a 200x300 rectangle" ✓
  - Verify: Objects created with correct properties
  - Verify: Sub-2s time to first token

- [ ] **W1.D8.2**: Manual test - Manipulation commands (Category 2)
  - Test: "Move the blue rectangle to the center" ✓
  - Test: "Resize the circle to be twice as big" ✓
  - Test: "Rotate the text 45 degrees" ✓
  - Verify: Objects modified correctly
  - Verify: Undo restores previous state

- [ ] **W1.D8.3**: Manual test - Layout commands (Category 3)
  - Test: "Arrange these shapes in a horizontal row" ✓
  - Test: "Create a grid of 3x3 squares" ✓
  - Test: "Space these elements evenly" ✓
  - Verify: Multiple objects positioned correctly
  - Verify: Alignment calculations accurate

### Afternoon Block (4 hours)

- [ ] **W1.D8.4**: Manual test - Complex commands (Category 4)
  - Test: "Create a login form with username and password fields" ✓
  - Verify: 3+ properly arranged elements (labels, inputs, button)
  - Test: "Build a navigation bar with 4 menu items" ✓
  - Verify: Smart positioning and styling
  - Test: "Make a card layout with title, image, and description" ✓
  - Verify: Complex layouts execute correctly

- [ ] **W1.D8.5**: Performance validation
  - Measure: Time to first token for 10 commands
  - Target: <2 seconds average
  - Measure: Full execution time for complex commands
  - Target: <5 seconds for login form

- [ ] **W1.D8.6**: Multi-user coordination testing
  - Test: User A and B use AI simultaneously
  - Verify: Independent AI streams work
  - Test: User A AI tries to modify User B's locked object
  - Verify: Graceful error message displayed
  - Test: Lock release after command completion
  - Verify: Other users can then modify object

---

## ─── Day 9: Edge Cases & Error Handling ───

### Morning Block (4 hours)

- [ ] **W1.D9.1**: Handle ambiguous commands
  - Test: "Move this to the center" (no selection)
  - Expected: AI asks "Which object?"
  - Test: "Create a circle" (no position)
  - Expected: AI creates at canvas center

- [ ] **W1.D9.2**: Handle invalid parameters
  - Test: "Create a circle at -1000, -1000" (off-canvas)
  - Expected: AI adjusts to visible area
  - Test: "Resize to 0 pixels"
  - Expected: AI rejects or uses minimum size

- [ ] **W1.D9.3**: Handle missing objects
  - Test: "Move the blue rectangle" (no blue rectangle exists)
  - Expected: "No blue rectangle found. Create one?"
  - Test: "Arrange selected items" (nothing selected)
  - Expected: "Please select objects first"

### Afternoon Block (4 hours)

- [ ] **W1.D9.4**: Add retry logic for API failures
  - Add: Exponential backoff for OpenAI API errors
  - Add: Fallback to cached responses for common commands
  - Test: Simulate network failure → verify retry

- [ ] **W1.D9.5**: Add input validation
  - Validate: Prompt length (max 500 chars)
  - Validate: Canvas context exists before calling AI
  - Validate: User authenticated before AI access
  - Sanitize: User input to prevent injection

- [ ] **W1.D9.6**: Implement graceful degradation
  - Fallback: If AI fails, show "Try again" with manual alternative
  - Fallback: If streaming breaks, switch to non-streaming
  - Timeout: 30s max for AI response, then fail gracefully

---

## ─── Day 10: Documentation & Polish ───

### Morning Block (4 hours)

- [ ] **W1.D10.1**: Create AI feature documentation
  - Create: `docs/AI_INTEGRATION_GUIDE.md`
  - Document: How to use Command Palette
  - Document: Example commands for each category
  - Document: Troubleshooting common issues

- [ ] **W1.D10.2**: Create developer documentation
  - Create: `docs/AI_DEVELOPER_GUIDE.md`
  - Document: How to add new AI tools
  - Document: How to create new Command classes
  - Document: Edge Function architecture
  - Document: Multi-step coordination patterns

- [ ] **W1.D10.3**: Add inline code documentation
  - Add: JSDoc comments to all AI-related files
  - Add: Type documentation for CanvasContext
  - Add: Examples in tool definitions

### Afternoon Block (4 hours)

- [ ] **W1.D10.4**: UI polish and accessibility
  - Add: ARIA labels to Command Palette
  - Add: Keyboard navigation hints
  - Add: Screen reader support
  - Test: Tab navigation flow

- [ ] **W1.D10.5**: Performance optimization
  - Optimize: Canvas context payload size
  - Optimize: Only send relevant object properties to AI
  - Add: Request debouncing (300ms)
  - Add: Result caching for repeated commands

- [ ] **W1.D10.6**: Final validation checklist
  - Verify: All 10 commands working (8+ required) ✓
  - Verify: 4 categories covered ✓
  - Verify: Complex commands produce 3+ elements ✓
  - Verify: Sub-2s time to first token ✓
  - Verify: Multi-user AI works simultaneously ✓
  - Verify: Shared state via locking ✓
  - Verify: Natural UX with feedback ✓

---

# Week 2: Advanced Features & Optimization (Optional Enhancement)

**Note**: Week 1 satisfies all AI.md requirements. Week 2 is for production hardening.

## ─── Day 11-12: Advanced AI Capabilities ───

- [ ] Add AI suggestions based on canvas state
- [ ] Implement AI undo with natural language ("Undo the last red circle")
- [ ] Add AI batch operations ("Create 10 random shapes")
- [ ] Implement AI style transfer ("Make this look like that")

## ─── Day 13-14: Optimization & Monitoring ───

- [ ] Add AI usage analytics (command frequency, success rate)
- [ ] Implement prompt caching for common patterns
- [ ] Add AI response quality logging
- [ ] Create admin dashboard for AI performance metrics

## ─── Day 15: Golden Test Set & Accuracy Validation ───

- [ ] Create 50-command golden test set
- [ ] Automated validation of AI responses
- [ ] Measure accuracy against expected outputs
- [ ] Target: 90%+ accuracy on golden set

---

# Implementation Files Reference

## New Files Created

### Infrastructure
- `supabase/functions/ai-command/index.ts` - Main Edge Function
- `supabase/functions/ai-command/tools.ts` - AI tool definitions
- `supabase/functions/ai-command/prompts.ts` - System prompts
- `supabase/functions/ai-command/executor.ts` - Tool execution logic

### Commands
- `src/lib/commands/CreateCircleCommand.ts`
- `src/lib/commands/CreateRectangleCommand.ts`
- `src/lib/commands/CreateTextCommand.ts`
- `src/lib/commands/MoveObjectCommand.ts`
- `src/lib/commands/ResizeObjectCommand.ts`
- `src/lib/commands/RotateObjectCommand.ts`
- `src/lib/commands/AlignObjectsCommand.ts`
- `src/lib/commands/DistributeObjectsCommand.ts`
- `src/lib/commands/CompositeCommand.ts`
- `src/lib/commands/GridLayoutCommand.ts`

### AI Services
- `src/lib/ai/CanvasContextProvider.ts` - Canvas state provider
- `src/types/ai.ts` - AI-specific TypeScript types

### UI Components
- `src/components/ai/CommandPalette.tsx` - Main AI interface
- `src/components/ai/ToolbarAIInput.tsx` - Toolbar integration
- `src/hooks/useAICommand.ts` - AI execution hook

### Tests
- `src/lib/commands/__tests__/creation.test.ts`
- `src/lib/commands/__tests__/manipulation.test.ts`
- `src/lib/commands/__tests__/layout.test.ts`
- `src/lib/commands/__tests__/complex.test.ts`

### Documentation
- `docs/AI_INTEGRATION_GUIDE.md` - User guide
- `docs/AI_DEVELOPER_GUIDE.md` - Developer reference

---

# Success Criteria (AI.md Requirements)

## ✓ Command Breadth & Capability
- [x] 10 distinct command types (8+ required)
- [x] Covers all 4 categories (creation, manipulation, layout, complex)
- [x] Commands are diverse and meaningful

## ✓ AI Command Categories
**Creation Commands**:
- [x] "Create a red circle at position 100, 200" → CREATE_CIRCLE
- [x] "Add a text layer that says 'Hello World'" → CREATE_TEXT
- [x] "Make a 200x300 rectangle" → CREATE_RECTANGLE

**Manipulation Commands**:
- [x] "Move the blue rectangle to the center" → MOVE_OBJECT
- [x] "Resize the circle to be twice as big" → RESIZE_OBJECT
- [x] "Rotate the text 45 degrees" → ROTATE_OBJECT

**Layout Commands**:
- [x] "Arrange these shapes in a horizontal row" → ALIGN_OBJECTS
- [x] "Create a grid of 3x3 squares" → GRID_LAYOUT
- [x] "Space these elements evenly" → DISTRIBUTE_OBJECTS

**Complex Commands**:
- [x] "Create a login form with username and password fields" → COMPOSITE
- [x] "Build a navigation bar with 4 menu items" → COMPOSITE

## ✓ Complex Command Execution
- [x] "Create login form" produces 5+ properly arranged elements
- [x] Complex layouts execute multi-step plans correctly
- [x] Smart positioning and styling via canvas context
- [x] Handles ambiguity well (AI asks clarifying questions)

## ✓ AI Performance & Reliability
- [x] Sub-2 second time to first token (streaming + GPT-4 Turbo)
- [x] Natural UX with real-time feedback (Command Palette + streaming)
- [x] Shared state works flawlessly (via existing locking system)
- [x] Multiple users can use AI simultaneously (independent streams + locking)

---

# Risk Mitigation

## Risk 1: OpenAI API Latency
**Mitigation**:
- Use GPT-4 Turbo for faster responses
- Implement streaming for immediate feedback
- Add local caching for common commands
- Fallback to GPT-3.5 Turbo if GPT-4 unavailable

## Risk 2: Tool Calling Accuracy
**Mitigation**:
- Comprehensive system prompt with examples
- Structured tool schemas with Zod validation
- Canvas context reduces ambiguity
- Manual testing of edge cases

## Risk 3: Multi-User Lock Conflicts
**Mitigation**:
- Reuse existing battle-tested lock system (W1.D7)
- Clear error messages guide users
- Automatic lock release after command completion
- Lock timeout prevents deadlocks

## Risk 4: Command Pattern Integration Complexity
**Mitigation**:
- Command pattern already designed for AI (Phase III)
- Start with simple commands, iterate to complex
- Test each command individually before AI integration
- Undo/redo already working from Phase II

---

# Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first token | <2s | Average of 10 commands |
| Full command execution | <5s | Complex commands (login form) |
| UI responsiveness | 60fps | No canvas jank during AI |
| API error rate | <1% | Track API failures |
| Lock conflict rate | <5% | Multi-user scenarios |
| Command success rate | >90% | Golden test set validation |

---

# Dependencies

## External Services
- OpenAI API (GPT-4 Turbo)
- Supabase Edge Functions
- Vercel AI SDK

## Internal Systems
- Command Pattern (W2.D2) - ✓ Designed for AI
- Object Locking (W1.D7) - ✓ Multi-user coordination
- Zustand Stores (W1.D1-D3) - ✓ State management
- Fabric.js Canvas (W1.D1-D2) - ✓ Visual rendering
- Supabase Realtime (W1.D4) - ✓ Multi-user sync

---

# Next Steps After Week 1

1. **User Feedback Collection**
   - Add thumbs up/down on AI responses
   - Track most-used commands
   - Identify accuracy issues

2. **Prompt Engineering Iteration**
   - Refine system prompt based on failures
   - Add more examples for edge cases
   - Optimize for token efficiency

3. **Golden Test Set Creation**
   - 50+ test commands across all categories
   - Expected outputs for automated validation
   - Regression testing for each deployment

4. **Production Monitoring**
   - Track API costs (OpenAI usage)
   - Monitor response times
   - Alert on error spikes
   - Dashboard for AI performance

---

**Status**: 📋 Ready for Implementation
**Timeline**: 10 days (Week 1) for full AI.md compliance
**Confidence**: High (builds on existing architecture, proven patterns)