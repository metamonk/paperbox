# Logo Component

The `Logo` component displays the Paperbox isometric cube logo with automatic theme adaptation for light and dark modes.

## Features

- **Responsive sizing**: Configurable size prop
- **Theme-aware**: Automatically adapts to light/dark mode
- **Accent variant**: Optional colorful accent mode for branding
- **Accessible**: Includes proper ARIA labels
- **Lightweight**: Pure SVG with no external dependencies

## Usage

### Basic Usage

```tsx
import { Logo } from '@/components/ui/Logo';

function MyComponent() {
  return <Logo />;
}
```

### Custom Size

```tsx
// Small logo (e.g., in navigation)
<Logo size={24} />

// Medium logo (default)
<Logo size={40} />

// Large logo (e.g., on auth pages)
<Logo size={80} />
```

### Accent Mode

Use the accent variant for branding purposes (adds blue tones):

```tsx
<Logo size={80} useAccent />
```

### With Custom Styling

```tsx
<Logo size={48} className="hover:opacity-80 transition-opacity cursor-pointer" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `40` | Size of the logo in pixels |
| `className` | `string` | `undefined` | Additional CSS classes |
| `useAccent` | `boolean` | `false` | Use accent colors for visual interest |

## Theme Variables

You can customize the logo colors by overriding CSS variables:

```css
:root {
  --logo-top: oklch(1 0 0);      /* Top faces (lightest) */
  --logo-left: oklch(0.7 0 0);   /* Left faces (medium) */
  --logo-right: oklch(0.5 0 0);  /* Right faces (darkest) */
}

.dark {
  --logo-top: oklch(0.95 0 0);
  --logo-left: oklch(0.5 0 0);
  --logo-right: oklch(0.3 0 0);
}
```

## Examples in the Codebase

- **Header**: Navigation bar with medium-sized logo
- **AuthLayout**: Login/signup pages with large accent logo

## Design

The logo is an isometric representation of stacked cubes, creating a 3D effect through:
- Diamond-shaped top faces (lightest shade)
- Parallelogram left faces (medium shade)
- Parallelogram right faces (darkest shade)

The arrangement suggests depth, structure, and modularity - perfect for a collaborative canvas tool.

