/**
 * Canvas Context Provider
 * Provides canvas state context to AI for intelligent command generation
 */

import { usePaperboxStore } from '../../stores';
import type { CanvasContext } from '../../types/ai';
import { fabricToCenter } from '../fabric/coordinateTranslation';
import { getViewportBounds, getCanvasScreenDimensions } from '../fabric/viewportUtils';

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
  // Canvas dimensions (fixed size, ranges from -4000 to +4000 in each direction)
  const canvasWidth = 8000;
  const canvasHeight = 8000;

  // CRITICAL FIX: Properly calculate viewport bounds in Fabric coordinates
  // viewport.panX and viewport.panY are viewport transform offsets (vpt[4] and vpt[5])
  // NOT Fabric canvas coordinates! They are screen pixel offsets.
  
  // Get actual screen dimensions for accurate viewport calculation
  const screenDims = getCanvasScreenDimensions();
  
  // DEBUG: Log viewport state
  console.log('[CanvasContextProvider] DEBUG - Raw viewport state:', {
    zoom: viewport.zoom,
    panX: viewport.panX,
    panY: viewport.panY,
    screenDims,
  });
  
  // Calculate viewport bounds in Fabric coordinates
  // This tells us what part of the 8000×8000 canvas is currently visible
  const viewportBounds = getViewportBounds(
    [viewport.zoom, 0, 0, viewport.zoom, viewport.panX, viewport.panY],
    viewport.zoom,
    screenDims.width,
    screenDims.height
  );
  
  // DEBUG: Log viewport bounds
  console.log('[CanvasContextProvider] DEBUG - Viewport bounds:', viewportBounds);
  
  // Convert viewport center from Fabric coordinates to center-origin coordinates
  // This is where the user is actually looking on the canvas
  const viewportCenterFabric = viewportBounds.center;
  const viewportCenter = fabricToCenter(viewportCenterFabric.x, viewportCenterFabric.y);
  const viewportCenterX = viewportCenter.x;
  const viewportCenterY = viewportCenter.y;

  // DEBUG: Log final center coordinates
  console.log('[CanvasContextProvider] DEBUG - Final viewport center (center-origin):', {
    viewportCenterX,
    viewportCenterY,
  });

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
      centerX: viewportCenterX, // Where user is currently looking
      centerY: viewportCenterY, // Where user is currently looking
      width: canvasWidth,
      height: canvasHeight,
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
  // Canvas dimensions (fixed size, ranges from -4000 to +4000 in each direction)
  const canvasWidth = 8000;
  const canvasHeight = 8000;

  // CRITICAL FIX: Properly calculate viewport bounds in Fabric coordinates
  // viewport.panX and viewport.panY are viewport transform offsets (vpt[4] and vpt[5])
  // NOT Fabric canvas coordinates! They are screen pixel offsets.
  
  // Get actual screen dimensions for accurate viewport calculation
  const screenDims = getCanvasScreenDimensions();
  
  // Calculate viewport bounds in Fabric coordinates
  // This tells us what part of the 8000×8000 canvas is currently visible
  const viewportBounds = getViewportBounds(
    [viewport.zoom, 0, 0, viewport.zoom, viewport.panX, viewport.panY],
    viewport.zoom,
    screenDims.width,
    screenDims.height
  );
  
  // Convert viewport center from Fabric coordinates to center-origin coordinates
  // This is where the user is actually looking on the canvas
  const viewportCenterFabric = viewportBounds.center;
  const viewportCenter = fabricToCenter(viewportCenterFabric.x, viewportCenterFabric.y);
  const viewportCenterX = viewportCenter.x;
  const viewportCenterY = viewportCenter.y;

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
      centerX: viewportCenterX, // Where user is currently looking
      centerY: viewportCenterY, // Where user is currently looking
      width: canvasWidth,
      height: canvasHeight,
    },
    selectedObjects,
    allObjects,
  };
}

