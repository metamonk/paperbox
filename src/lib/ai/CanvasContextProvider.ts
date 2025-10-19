/**
 * Canvas Context Provider
 * Provides canvas state context to AI for intelligent command generation
 */

import { usePaperboxStore } from '../../stores';
import type { CanvasContext } from '../../types/ai';

/**
 * Get current canvas context for AI
 * 
 * Provides the AI with:
 * - Canvas ID and user ID
 * - Viewport state (zoom, pan, center point, dimensions)
 * - Selected objects
 * - All objects in the canvas
 * 
 * This context enables natural language commands like:
 * - "Create a circle at the center" → AI knows center coordinates
 * - "Move this to the right" → AI knows "this" = selected object
 * - "Create a circle next to the blue rectangle" → AI can find blue rectangle
 */
export function getCanvasContext(): CanvasContext | null {
  const store = usePaperboxStore.getState();

  const canvasId = store.activeCanvasId;
  const userId = store.currentUserId;

  if (!canvasId || !userId) {
    console.warn('[CanvasContextProvider] Cannot get context: missing canvas ID or user ID');
    return null;
  }

  // Get viewport state
  const viewport = store.viewport;

  // CENTER-ORIGIN COORDINATE SYSTEM:
  // Canvas center is at (0, 0) in center-origin coordinates
  // This matches Figma's coordinate system and allows negative coordinates
  const centerX = 0;
  const centerY = 0;

  // Canvas dimensions (fixed size, ranges from -4000 to +4000 in each direction)
  const viewportWidth = 8000;
  const viewportHeight = 8000;

  // Get selected objects
  const selectedIds = store.selectedIds;
  const selectedObjects = selectedIds
    .map((id) => store.getObjectById(id))
    .filter(Boolean)
    .map((obj) => obj!);

  // Get all objects (for "find blue rectangle" type queries)
  const allObjects = store.getAllObjects();

  return {
    canvasId,
    userId,
    viewport: {
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY,
      centerX,
      centerY,
      width: viewportWidth,
      height: viewportHeight,
    },
    selectedObjects,
    allObjects,
  };
}

/**
 * Get context for a specific canvas and user (for server-side use)
 * 
 * This is useful when the AI needs context but is running on the server
 * where it can't directly access the Zustand store.
 */
export function getCanvasContextForUser(
  canvasId: string,
  userId: string,
  storeState: ReturnType<typeof usePaperboxStore.getState>
): CanvasContext {
  const viewport = storeState.viewport;

  // CENTER-ORIGIN COORDINATE SYSTEM:
  // Canvas center is at (0, 0) in center-origin coordinates
  // This matches Figma's coordinate system and allows negative coordinates
  const centerX = 0;
  const centerY = 0;

  // Canvas dimensions (fixed size, ranges from -4000 to +4000 in each direction)
  const viewportWidth = 8000;
  const viewportHeight = 8000;

  // Get selected objects
  const selectedIds = storeState.selectedIds;
  const selectedObjects = selectedIds
    .map((id) => storeState.getObjectById(id))
    .filter(Boolean)
    .map((obj) => obj!);

  // Get all objects
  const allObjects = storeState.getAllObjects();

  return {
    canvasId,
    userId,
    viewport: {
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY,
      centerX,
      centerY,
      width: viewportWidth,
      height: viewportHeight,
    },
    selectedObjects,
    allObjects,
  };
}

