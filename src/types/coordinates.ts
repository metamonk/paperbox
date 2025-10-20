/**
 * Coordinate System Types for Paperbox Canvas
 * 
 * This file defines type-safe interfaces for the different coordinate systems used throughout
 * the application. Using these types prevents coordinate system confusion and provides
 * compile-time safety when transforming between systems.
 * 
 * ## Coordinate Systems Overview
 * 
 * 1. **ViewportTransform**: Fabric.js viewport transform matrix values
 *    - zoom: Scale factor (vpt[0] and vpt[3])
 *    - panX/panY: Screen pixel offsets (vpt[4] and vpt[5])
 *    - Used for: Storing viewport state, restoring viewport
 * 
 * 2. **FabricCoords**: Fabric.js internal canvas coordinate system
 *    - Range: 0 to 8000 in both X and Y
 *    - Origin: Top-left corner at (0, 0)
 *    - Used for: Fabric.js rendering, object placement internally
 * 
 * 3. **CenterCoords**: User-facing, database coordinate system
 *    - Range: -4000 to +4000 in both X and Y
 *    - Origin: Canvas center at (0, 0)
 *    - Used for: Database storage, user input/output, AI placement, cursor broadcasts
 * 
 * 4. **ScreenCoords**: Browser viewport pixel coordinates
 *    - Range: Variable based on screen size
 *    - Origin: Top-left of canvas element at (0, 0)
 *    - Used for: Mouse events, cursor rendering, DOM positioning
 * 
 * 5. **ViewportBounds**: Describes the visible area in Fabric coordinates
 *    - Tells you what part of the 8000×8000 canvas is currently visible
 *    - Used for: AI context, minimap rendering, visibility culling
 * 
 * ## Transformation Formulas
 * 
 * ```typescript
 * // Screen → Fabric
 * fabricX = (screenX - vpt[4]) / zoom
 * fabricY = (screenY - vpt[5]) / zoom
 * 
 * // Fabric → Screen
 * screenX = fabricX * zoom + vpt[4]
 * screenY = fabricY * zoom + vpt[5]
 * 
 * // Fabric → Center
 * centerX = fabricX - 4000
 * centerY = fabricY - 4000
 * 
 * // Center → Fabric
 * fabricX = centerX + 4000
 * fabricY = centerY + 4000
 * ```
 * 
 * @see src/lib/fabric/coordinateTranslation.ts for Center ↔ Fabric conversions
 * @see src/lib/fabric/viewportUtils.ts for viewport calculations
 */

/**
 * Viewport Transform State
 * 
 * Represents the Fabric.js viewport transform matrix values.
 * These are the raw values from the viewportTransform array:
 * [scaleX, skewY, skewX, scaleY, translateX, translateY]
 * 
 * For our purposes (no skew transforms):
 * - zoom = vpt[0] = vpt[3] (uniform scaling)
 * - panX = vpt[4] (horizontal screen pixel offset)
 * - panY = vpt[5] (vertical screen pixel offset)
 * 
 * IMPORTANT: panX and panY are NOT canvas coordinates!
 * They are screen pixel offsets for the viewport transform.
 * 
 * To get the Fabric canvas position of the screen's top-left corner:
 * topLeftFabricX = -panX / zoom
 * topLeftFabricY = -panY / zoom
 */
export interface ViewportTransform {
  /** Zoom level (1.0 = 100%, 2.0 = 200%, etc.) */
  zoom: number;
  
  /** Horizontal pan offset in screen pixels (vpt[4]) */
  panX: number;
  
  /** Vertical pan offset in screen pixels (vpt[5]) */
  panY: number;
}

/**
 * Fabric.js Canvas Coordinates
 * 
 * Internal coordinate system used by Fabric.js for rendering.
 * Origin at top-left corner of the 8000×8000 canvas.
 * 
 * Range: 0 to 8000 in both dimensions
 * 
 * Example positions:
 * - Top-left corner: { x: 0, y: 0 }
 * - Canvas center: { x: 4000, y: 4000 }
 * - Bottom-right corner: { x: 8000, y: 8000 }
 */
export interface FabricCoords {
  /** X coordinate (0 to 8000, left to right) */
  x: number;
  
  /** Y coordinate (0 to 8000, top to bottom) */
  y: number;
}

/**
 * Center-Origin Coordinates
 * 
 * User-facing coordinate system with origin at canvas center.
 * This matches Figma's coordinate system and allows negative coordinates.
 * 
 * Used for:
 * - Database storage (canvas_objects table)
 * - Zustand store state
 * - User input/output
 * - AI agent placement
 * - Real-time cursor broadcasts
 * 
 * Range: -4000 to +4000 in both dimensions
 * 
 * Example positions:
 * - Top-left corner: { x: -4000, y: -4000 }
 * - Canvas center: { x: 0, y: 0 }
 * - Bottom-right corner: { x: 4000, y: 4000 }
 */
export interface CenterCoords {
  /** X coordinate (-4000 to +4000, left to right) */
  x: number;
  
  /** Y coordinate (-4000 to +4000, top to bottom) */
  y: number;
}

/**
 * Screen/Viewport Pixel Coordinates
 * 
 * Browser viewport pixel coordinates relative to the canvas element.
 * Origin at top-left corner of the visible canvas container.
 * 
 * Used for:
 * - Mouse event coordinates (e.clientX - rect.left)
 * - DOM element positioning (cursor overlays, selection boxes)
 * - Screen-space measurements
 * 
 * Range: Variable based on screen size (typically 0 to ~1920 for width, 0 to ~1080 for height)
 * 
 * Example positions:
 * - Canvas element top-left: { x: 0, y: 0 }
 * - Screen center: { x: screenWidth/2, y: screenHeight/2 }
 * - Canvas element bottom-right: { x: screenWidth, y: screenHeight }
 */
export interface ScreenCoords {
  /** X coordinate in pixels from left edge of canvas element */
  x: number;
  
  /** Y coordinate in pixels from top edge of canvas element */
  y: number;
}

/**
 * Viewport Bounds in Fabric Coordinates
 * 
 * Describes the visible area of the canvas in Fabric coordinate space.
 * This tells you what portion of the 8000×8000 canvas is currently visible
 * on the user's screen.
 * 
 * Used for:
 * - AI context (where the user is looking)
 * - Minimap viewport indicator positioning
 * - Visibility culling (determine which objects are on-screen)
 * - Object placement (place at viewport center)
 * 
 * Calculation:
 * ```typescript
 * const topLeftX = -vpt[4] / zoom;
 * const topLeftY = -vpt[5] / zoom;
 * const width = screenWidth / zoom;
 * const height = screenHeight / zoom;
 * const centerX = topLeftX + width / 2;
 * const centerY = topLeftY + height / 2;
 * ```
 */
export interface ViewportBounds {
  /** Fabric coordinates of the screen's top-left corner */
  topLeft: FabricCoords;
  
  /** Fabric coordinates of the screen's center (where user is looking) */
  center: FabricCoords;
  
  /** Fabric coordinates of the screen's bottom-right corner */
  bottomRight: FabricCoords;
  
  /** Visible width in Fabric canvas units */
  width: number;
  
  /** Visible height in Fabric canvas units */
  height: number;
}

/**
 * Type guard to check if coordinates are valid Fabric coordinates
 */
export function isFabricCoords(coords: any): coords is FabricCoords {
  return (
    typeof coords === 'object' &&
    coords !== null &&
    typeof coords.x === 'number' &&
    typeof coords.y === 'number' &&
    coords.x >= 0 &&
    coords.x <= 8000 &&
    coords.y >= 0 &&
    coords.y <= 8000
  );
}

/**
 * Type guard to check if coordinates are valid center-origin coordinates
 */
export function isCenterCoords(coords: any): coords is CenterCoords {
  return (
    typeof coords === 'object' &&
    coords !== null &&
    typeof coords.x === 'number' &&
    typeof coords.y === 'number' &&
    coords.x >= -4000 &&
    coords.x <= 4000 &&
    coords.y >= -4000 &&
    coords.y <= 4000
  );
}

/**
 * Type guard to check if viewport transform is valid
 */
export function isViewportTransform(vpt: any): vpt is ViewportTransform {
  return (
    typeof vpt === 'object' &&
    vpt !== null &&
    typeof vpt.zoom === 'number' &&
    vpt.zoom > 0 &&
    typeof vpt.panX === 'number' &&
    typeof vpt.panY === 'number'
  );
}

