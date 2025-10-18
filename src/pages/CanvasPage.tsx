/**
 * Canvas page
 * Main collaborative canvas workspace
 * Protected route - requires authentication
 * W5.D4: URL-based canvas routing with /canvas/:canvasId pattern
 */

import { Canvas } from '../components/canvas/Canvas';

/**
 * Canvas Page - Simple wrapper that just renders the Canvas component
 *
 * NOTE: All routing logic has been removed to prevent infinite loops.
 * The canvas routing is now handled by:
 * 1. App.tsx - Redirects /canvas to /canvas/:canvasId
 * 2. useCanvasSync - Loads canvases and sets active canvas on mount
 * 3. URL params - Drive which canvas is active
 */
export function CanvasPage() {
  return <Canvas />;
}

