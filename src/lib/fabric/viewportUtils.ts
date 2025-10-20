/**
 * Viewport Utility Functions
 * 
 * Centralized utilities for viewport calculations and coordinate transformations
 * involving the viewport transform. These functions provide a single source of truth
 * for viewport-related math to prevent calculation errors throughout the codebase.
 * 
 * ## Key Concepts
 * 
 * The Fabric.js viewport transform is a 6-element matrix:
 * [scaleX, skewY, skewX, scaleY, translateX, translateY]
 * 
 * For our purposes (no skew):
 * - vpt[0] = vpt[3] = zoom (uniform scaling)
 * - vpt[4] = panX (horizontal screen pixel offset)
 * - vpt[5] = panY (vertical screen pixel offset)
 * 
 * The transform maps Fabric canvas coordinates to screen coordinates:
 * screenX = fabricX * zoom + panX
 * screenY = fabricY * zoom + panY
 * 
 * Inverse transform (screen to Fabric):
 * fabricX = (screenX - panX) / zoom
 * fabricY = (screenY - panY) / zoom
 * 
 * @see src/types/coordinates.ts for coordinate system type definitions
 */

import type {
  ViewportTransform,
  ViewportBounds,
  FabricCoords,
  ScreenCoords,
} from '@/types/coordinates';

/**
 * Calculate viewport bounds in Fabric coordinates
 * 
 * This function determines what portion of the 8000×8000 Fabric canvas
 * is currently visible on the user's screen, given the viewport transform
 * and screen dimensions.
 * 
 * @param vpt - Fabric.js viewport transform array [scaleX, skewY, skewX, scaleY, translateX, translateY]
 * @param zoom - Current zoom level (should match vpt[0] and vpt[3])
 * @param screenWidth - Visible screen width in pixels
 * @param screenHeight - Visible screen height in pixels
 * @returns ViewportBounds describing the visible area in Fabric coordinates
 * 
 * @example
 * ```typescript
 * const canvas = fabricManager.getCanvas();
 * const vpt = canvas.viewportTransform;
 * const zoom = canvas.getZoom();
 * const bounds = getViewportBounds(vpt, zoom, 1920, 1080);
 * 
 * console.log('User is looking at:', bounds.center);
 * console.log('Visible area:', bounds.width, 'x', bounds.height);
 * ```
 */
export function getViewportBounds(
  vpt: number[],
  zoom: number,
  screenWidth: number,
  screenHeight: number
): ViewportBounds {
  // DEBUG: Log inputs
  console.log('[getViewportBounds] DEBUG - Inputs:', {
    vpt: `[${vpt[0]}, ${vpt[1]}, ${vpt[2]}, ${vpt[3]}, ${vpt[4]}, ${vpt[5]}]`,
    zoom,
    screenWidth,
    screenHeight,
  });
  
  // The screen's top-left corner (0, 0) maps to these Fabric coordinates
  // Formula: fabricCoord = (screenCoord - pan) / zoom
  // For screen (0, 0): fabricX = -vpt[4] / zoom
  const topLeftX = -vpt[4] / zoom;
  const topLeftY = -vpt[5] / zoom;

  // Calculate how much of the Fabric canvas is visible
  // A smaller zoom means more canvas is visible (zoom out)
  // A larger zoom means less canvas is visible (zoom in)
  const visibleWidth = screenWidth / zoom;
  const visibleHeight = screenHeight / zoom;

  // Calculate center and bottom-right positions
  const centerX = topLeftX + visibleWidth / 2;
  const centerY = topLeftY + visibleHeight / 2;
  const bottomRightX = topLeftX + visibleWidth;
  const bottomRightY = topLeftY + visibleHeight;

  // DEBUG: Log calculated values
  console.log('[getViewportBounds] DEBUG - Calculated:', {
    topLeft: { x: topLeftX, y: topLeftY },
    center: { x: centerX, y: centerY },
    visibleDims: { width: visibleWidth, height: visibleHeight },
  });

  return {
    topLeft: { x: topLeftX, y: topLeftY },
    center: { x: centerX, y: centerY },
    bottomRight: { x: bottomRightX, y: bottomRightY },
    width: visibleWidth,
    height: visibleHeight,
  };
}

/**
 * Convert screen pixel coordinates to Fabric canvas coordinates
 * 
 * Transforms coordinates from the browser's screen space (relative to the canvas element)
 * to Fabric's internal canvas coordinate space (0 to 8000).
 * 
 * @param screen - Screen coordinates (pixels relative to canvas element)
 * @param vpt - Fabric.js viewport transform array
 * @param zoom - Current zoom level
 * @returns Fabric canvas coordinates
 * 
 * @example
 * ```typescript
 * // Mouse click handler
 * const rect = canvasElement.getBoundingClientRect();
 * const screenX = e.clientX - rect.left;
 * const screenY = e.clientY - rect.top;
 * 
 * const fabricCoords = screenToFabric(
 *   { x: screenX, y: screenY },
 *   canvas.viewportTransform,
 *   canvas.getZoom()
 * );
 * ```
 */
export function screenToFabric(
  screen: ScreenCoords,
  vpt: number[],
  zoom: number
): FabricCoords {
  return {
    x: (screen.x - vpt[4]) / zoom,
    y: (screen.y - vpt[5]) / zoom,
  };
}

/**
 * Convert Fabric canvas coordinates to screen pixel coordinates
 * 
 * Transforms coordinates from Fabric's internal canvas space (0 to 8000)
 * to browser screen space (pixels relative to the canvas element).
 * 
 * @param fabric - Fabric canvas coordinates
 * @param vpt - Fabric.js viewport transform array
 * @param zoom - Current zoom level
 * @returns Screen coordinates (pixels)
 * 
 * @example
 * ```typescript
 * // Position a DOM overlay at a canvas object's location
 * const fabricCoords = { x: 4000, y: 4000 }; // Canvas center
 * const screenCoords = fabricToScreen(
 *   fabricCoords,
 *   canvas.viewportTransform,
 *   canvas.getZoom()
 * );
 * 
 * overlayElement.style.left = `${screenCoords.x}px`;
 * overlayElement.style.top = `${screenCoords.y}px`;
 * ```
 */
export function fabricToScreen(
  fabric: FabricCoords,
  vpt: number[],
  zoom: number
): ScreenCoords {
  return {
    x: fabric.x * zoom + vpt[4],
    y: fabric.y * zoom + vpt[5],
  };
}

/**
 * Get the Fabric canvas position of the viewport's top-left corner
 * 
 * Helper function to determine what Fabric canvas coordinates are at the
 * top-left corner of the visible screen.
 * 
 * @param vpt - Fabric.js viewport transform array
 * @param zoom - Current zoom level
 * @returns Fabric coordinates of the screen's top-left corner
 * 
 * @example
 * ```typescript
 * const topLeft = getViewportTopLeft(canvas.viewportTransform, canvas.getZoom());
 * console.log('Top-left corner is showing canvas position:', topLeft);
 * ```
 */
export function getViewportTopLeft(vpt: number[], zoom: number): FabricCoords {
  return {
    x: -vpt[4] / zoom,
    y: -vpt[5] / zoom,
  };
}

/**
 * Get the Fabric canvas position of the viewport's center
 * 
 * This is the most important position for AI placement and user interaction,
 * as it represents where the user is currently looking on the canvas.
 * 
 * @param vpt - Fabric.js viewport transform array
 * @param zoom - Current zoom level
 * @param screenWidth - Visible screen width in pixels
 * @param screenHeight - Visible screen height in pixels
 * @returns Fabric coordinates of the screen's center
 * 
 * @example
 * ```typescript
 * // Place an AI-generated object at the viewport center
 * const center = getViewportCenter(
 *   canvas.viewportTransform,
 *   canvas.getZoom(),
 *   1920,
 *   1080
 * );
 * const centerOriginCoords = fabricToCenter(center.x, center.y);
 * createObject(centerOriginCoords.x, centerOriginCoords.y);
 * ```
 */
export function getViewportCenter(
  vpt: number[],
  zoom: number,
  screenWidth: number,
  screenHeight: number
): FabricCoords {
  const topLeft = getViewportTopLeft(vpt, zoom);
  const visibleWidth = screenWidth / zoom;
  const visibleHeight = screenHeight / zoom;

  return {
    x: topLeft.x + visibleWidth / 2,
    y: topLeft.y + visibleHeight / 2,
  };
}

/**
 * Check if a Fabric coordinate is currently visible in the viewport
 * 
 * Useful for visibility culling and determining whether objects need to be rendered.
 * 
 * @param fabricCoords - Fabric canvas coordinates to check
 * @param vpt - Fabric.js viewport transform array
 * @param zoom - Current zoom level
 * @param screenWidth - Visible screen width in pixels
 * @param screenHeight - Visible screen height in pixels
 * @param margin - Optional margin in Fabric units to expand the visible area (default: 0)
 * @returns true if the coordinates are visible (or within margin), false otherwise
 * 
 * @example
 * ```typescript
 * const isVisible = isCoordVisibleInViewport(
 *   { x: 4000, y: 4000 },
 *   canvas.viewportTransform,
 *   canvas.getZoom(),
 *   1920,
 *   1080,
 *   100 // 100 unit margin for preloading
 * );
 * ```
 */
export function isCoordVisibleInViewport(
  fabricCoords: FabricCoords,
  vpt: number[],
  zoom: number,
  screenWidth: number,
  screenHeight: number,
  margin: number = 0
): boolean {
  const bounds = getViewportBounds(vpt, zoom, screenWidth, screenHeight);

  return (
    fabricCoords.x >= bounds.topLeft.x - margin &&
    fabricCoords.x <= bounds.bottomRight.x + margin &&
    fabricCoords.y >= bounds.topLeft.y - margin &&
    fabricCoords.y <= bounds.bottomRight.y + margin
  );
}

/**
 * Calculate the Fabric canvas coordinates needed to center the viewport on a specific point
 * 
 * This function calculates what panX and panY values are needed to center the viewport
 * on a given Fabric canvas position.
 * 
 * @param targetFabricCoords - Fabric coordinates to center on
 * @param zoom - Desired zoom level
 * @param screenWidth - Visible screen width in pixels
 * @param screenHeight - Visible screen height in pixels
 * @returns ViewportTransform values needed to center on the target
 * 
 * @example
 * ```typescript
 * // Center viewport on a specific object
 * const object = { x: 2000, y: 3000 }; // Fabric coords
 * const transform = calculateViewportForCenter(
 *   object,
 *   1.5, // 150% zoom
 *   1920,
 *   1080
 * );
 * 
 * canvas.setZoom(transform.zoom);
 * canvas.absolutePan(new Point(transform.panX, transform.panY));
 * ```
 */
export function calculateViewportForCenter(
  targetFabricCoords: FabricCoords,
  zoom: number,
  screenWidth: number,
  screenHeight: number
): ViewportTransform {
  // To center on a point, the viewport's center must be at the target
  // Screen center is at (screenWidth/2, screenHeight/2)
  // We need: screenX = fabricX * zoom + panX
  // Solving for panX: panX = screenX - fabricX * zoom
  const panX = screenWidth / 2 - targetFabricCoords.x * zoom;
  const panY = screenHeight / 2 - targetFabricCoords.y * zoom;

  return { zoom, panX, panY };
}

/**
 * Get the actual visible viewport dimensions
 * 
 * CRITICAL: Returns the dimensions of the VISIBLE viewport (scroll container),
 * NOT the canvas element itself (which is 8000x8000).
 * 
 * The canvas is inside a scrollable container:
 * <div class="overflow-auto"> ← This is what we need
 *   <canvas width="8000" height="8000" /> ← Not this!
 * </div>
 * 
 * @param canvasElement - Optional canvas element reference
 * @returns Object with width and height of the visible viewport in pixels
 * 
 * @example
 * ```typescript
 * const canvas = fabricManager.getCanvas();
 * const dims = getCanvasScreenDimensions(canvas?.getElement());
 * // Returns scroll container size (e.g., 1920x1080), not canvas size (8000x8000)
 * ```
 */
export function getCanvasScreenDimensions(
  canvasElement?: HTMLCanvasElement | null
): { width: number; height: number } {
  // CRITICAL FIX: We need the VISIBLE viewport dimensions, not the scroll container's total size!
  // Use getBoundingClientRect() which gives us the actual visible area on screen
  
  // Get the scroll container (parent of canvas element)
  if (canvasElement?.parentElement) {
    const scrollContainer = canvasElement.parentElement;
    const rect = scrollContainer.getBoundingClientRect();
    
    // DEBUG: Log element details
    console.log('[getCanvasScreenDimensions] DEBUG - Element info:', {
      tagName: scrollContainer.tagName,
      className: scrollContainer.className,
      clientWidth: scrollContainer.clientWidth,
      clientHeight: scrollContainer.clientHeight,
      offsetWidth: scrollContainer.offsetWidth,
      offsetHeight: scrollContainer.offsetHeight,
      rect: { width: rect.width, height: rect.height },
      scrollWidth: scrollContainer.scrollWidth,
      scrollHeight: scrollContainer.scrollHeight,
    });
    
    const dims = {
      width: rect.width || 1200,
      height: rect.height || 800,
    };
    console.log('[getCanvasScreenDimensions] DEBUG - Returning dims:', dims);
    return dims;
  }

  // Fallback: The layout is broken (canvas is absolutely positioned and expands everything)
  // SOLUTION: Use window dimensions and subtract approximate UI chrome (header, sidebars)
  // This is the most reliable approach for getting the actual visible viewport
  
  const scrollContainer = document.querySelector('.overflow-auto.bg-muted') as HTMLElement;
  
  if (scrollContainer) {
    const rect = scrollContainer.getBoundingClientRect();
    
    // DEBUG: Log what we found
    console.log('[getCanvasScreenDimensions] DEBUG - Scroll container rect:', {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    });
    
    // CRITICAL FIX: Use the bounding rect's actual visible dimensions
    // rect.top tells us where the viewport starts
    // window.innerHeight - rect.top tells us the actual visible height
    const visibleHeight = window.innerHeight - rect.top;
    const visibleWidth = rect.width; // Width is usually correct
    
    const dims = {
      width: visibleWidth || 1200,
      height: visibleHeight || 800,
    };
    
    console.log('[getCanvasScreenDimensions] DEBUG - Calculated from window:', {
      windowHeight: window.innerHeight,
      rectTop: rect.top,
      visibleHeight,
      visibleWidth,
    });
    console.log('[getCanvasScreenDimensions] DEBUG - Returning visible viewport dims:', dims);
    return dims;
  }

  // Ultimate fallback: Use window inner dimensions as approximation
  // This is actually more accurate than a hardcoded value
  const windowDims = {
    width: window.innerWidth * 0.7, // Approximate, accounting for sidebars
    height: window.innerHeight * 0.85, // Approximate, accounting for header
  };
  console.log('[getCanvasScreenDimensions] DEBUG - Using window approximation:', windowDims);
  return windowDims;
}

