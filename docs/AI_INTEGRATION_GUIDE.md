# AI Integration Guide - Paperbox

> **Natural language commands for your collaborative canvas**

Paperbox includes a powerful AI assistant that lets you create, modify, and arrange design elements using natural language. Just describe what you want, and the AI will execute it instantly.

---

## 🚀 Getting Started

### Activating AI Mode

Press `/` or `Cmd+/` to toggle between **Tools Mode** and **AI Mode**.

When AI mode is active, you'll see a text input box at the bottom center of your canvas:

```
✨ Ask AI to create, modify, or arrange...                    ⏎
```

### Basic Usage

1. **Type your command** in natural language
2. **Press Enter** to execute
3. **Watch the AI work** - objects appear instantly
4. **Use Cmd+Z** to undo if needed

---

## 📝 Command Categories

The AI supports 11 distinct command types across 4 categories:

### 1️⃣ **Creation Commands** (3 types)

Create shapes and text on your canvas.

**Examples:**
- "Create a red circle"
- "Add a blue rectangle"
- "Make a text that says 'Hello World'"
- "Create a green circle at position 100, 200"
- "Add a 200x300 rectangle to the right"

**Supported Shapes:**
- **Circles**: `radius`, `fill`, `stroke`, `stroke_width`, `opacity`
- **Rectangles**: `width`, `height`, `fill`, `stroke`, `stroke_width`, `opacity`, `corner_radius`
- **Text**: `text`, `fontSize`, `fontFamily`, `fontWeight`, `fill`, `opacity`, `textAlign`

---

### 2️⃣ **Manipulation Commands** (3 types)

Modify existing objects. **Note**: You must select objects first!

#### Move Objects
- "Move this to the right by 100 pixels"
- "Move it to position 400, 300"
- "Shift this left by 50"

#### Resize Objects
- "Make this bigger"
- "Double the size"
- "Resize to 200 by 150"
- "Scale by 1.5"

#### Rotate Objects
- "Rotate this 45 degrees"
- "Rotate clockwise by 90 degrees"
- "Set rotation to 180 degrees"

---

### 3️⃣ **Style Commands** (1 type)

Change the appearance of selected objects.

**Examples:**
- "Change the color to red"
- "Make it blue"
- "Add a red border"
- "Make it semi-transparent" (opacity = 0.5)
- "Set opacity to 80%"
- "Give it a 2 pixel stroke"

---

### 4️⃣ **Layout Commands** (2 types)

Arrange multiple objects. **Note**: Select 2+ objects for align, 3+ for distribute.

#### Align Objects
Align multiple objects along a shared edge or center.

**Examples:**
- "Align left" - Align to leftmost edge
- "Center horizontally" - Align to horizontal center
- "Align right" - Align to rightmost edge
- "Align top" - Align to topmost edge
- "Center vertically" - Align to vertical center
- "Align bottom" - Align to bottommost edge

#### Distribute Objects
Space objects evenly.

**Examples:**
- "Distribute horizontally" - Even horizontal spacing
- "Space them evenly" - Even spacing (inferred direction)
- "Distribute vertically" - Even vertical spacing
- "Space them 50 pixels apart horizontally" - Fixed spacing

---

### 5️⃣ **Complex Commands** (2 types)

Create multiple objects in patterns.

#### Grid Layouts
Create grids of shapes.

**Examples:**
- "Create a 3x3 grid of circles"
- "Make a 2x4 grid of squares"
- "Create a 5x5 grid of small red circles"
- "Make a 3x2 grid of rectangles"

**Parameters:**
- `rows` - Number of rows
- `cols` - Number of columns
- `shapeType` - circle, rectangle, or text
- `spacing` - Distance between shapes
- `fill` - Color for all shapes
- `radius` / `width` / `height` - Size of each shape

---

## 🎯 Pro Tips

### Positioning

**The AI is context-aware!** It knows where you're looking.

- **"Create a circle"** → Appears at the center of your current viewport
- **"Add a rectangle to the right"** → Offset from viewport center
- **"Create at 100, 200"** → Exact coordinates

### Selection Context

The AI understands which objects you've selected:

- **"Make this bigger"** → Resizes first selected object
- **"Align left"** → Aligns all selected objects
- **"Change these to blue"** → Changes color of selected objects

**Important**: If nothing is selected and you say "move this", the AI will ask you to select an object first.

### Natural Language

The AI understands variations:

- ✅ "Create a red circle"
- ✅ "Make a circle that is red"
- ✅ "Add a red circular shape"
- ✅ "I want a circle, make it red"

### Size Shortcuts

- "Small circle" = 30px radius
- "Large rectangle" = 300x200px
- Default circle = 50px radius
- Default rectangle = 150x100px
- Default text = 24px font size

### Color Shortcuts

You can use:
- **Color names**: red, blue, green, yellow, purple, orange, black, white
- **Hex codes**: #ff0000, #00ff00, #0000ff
- **RGB**: (coming soon)

---

## 🐛 Troubleshooting

### "Please select an object first"

**Problem**: You asked to modify something, but nothing is selected.

**Solution**: Click on the object you want to modify, then try again.

---

### "Need at least 2 objects to align"

**Problem**: Align requires multiple objects.

**Solution**: Select 2+ objects by clicking while holding Shift, then try again.

---

### "Need at least 3 objects to distribute"

**Problem**: Distribute requires 3+ objects.

**Solution**: Select 3+ objects, then try again.

---

### Objects created off-screen

**Problem**: Objects appear far from where you're looking.

**Solution**: The AI uses your viewport center by default. Pan to the area where you want objects, then create them.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Cmd+/` | Toggle AI mode |
| `Enter` | Execute AI command |
| `Esc` | Close AI input (return to Tools mode) |
| `Cmd+Z` | Undo last AI command |
| `Cmd+Shift+Z` | Redo |

---

## 🎨 Examples Gallery

### Create a Login Form

```
"Create a login form"
```

The AI will create:
- "Username" label
- Username input field
- "Password" label
- Password input field
- "Login" button

All properly positioned and sized!

---

### Create a Color Palette

```
"Create a row of 5 circles with different colors"
```

(Then manually adjust colors, or specify: "red, blue, green, yellow, purple")

---

### Build a Dashboard Grid

```
"Create a 3x2 grid of rectangles"
```

Perfect starting point for dashboard cards!

---

## 🔒 Limitations

1. **Single canvas only** - AI operates on the active canvas
2. **No image import** - AI can't fetch external images (yet)
3. **No complex paths** - Bezier curves require manual creation
4. **English only** - AI understands English commands only (for now)
5. **Selection required** - Manipulation commands need objects selected first

---

## 📚 Learn More

- [AI Master Task List](./AI_MASTER_TASK_LIST.md) - Full implementation details
- [AI Integration Setup](./AI_INTEGRATION_SETUP.md) - Developer setup guide
- [Command Pattern](./FOUNDATION.md) - Architecture overview

---

## 🆘 Support

Having issues? Check:
1. Is the object selected? (For manipulation/style commands)
2. Are you in AI mode? (Press `/` to toggle)
3. Is your command clear? (Be specific about what you want)

For bugs or feature requests, please open an issue on GitHub.

---

**🎉 Enjoy building with AI!**

