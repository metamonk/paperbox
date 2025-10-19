/**
 * Coordinate Translation Utilities
 * 
 * Paperbox Canvas Coordinate System:
 * - User-Facing: Center origin at (0, 0), range -4000 to +4000
 * - Fabric.js Internal: Top-left origin at (0, 0), range 0 to 8000
 * 
 * This module provides translation functions between these two coordinate systems.
 * 
 * Usage:
 * - When storing to database: Use center-origin coordinates (-4000 to +4000)
 * - When rendering with Fabric.js: Translate to top-left origin (0 to 8000)
 * - When receiving user input: Convert viewport → Fabric → center-origin
 * 
 * Key Principles:
 * 1. Database always stores center-origin coordinates
 * 2. Fabric.js always uses top-left origin internally
 * 3. Translation happens ONLY in FabricCanvasManager (single source of truth)
 * 4. All other components work with center-origin coordinates
 */

export const CANVAS_SIZE = 8000;
export const CANVAS_CENTER_OFFSET = CANVAS_SIZE / 2; // 4000

/**
 * Convert center-origin coordinates to Fabric.js top-left origin
 * 
 * @param x - X coordinate in center-origin system (-4000 to +4000)
 * @param y - Y coordinate in center-origin system (-4000 to +4000)
 * @returns Object with x, y in Fabric.js coordinates (0 to 8000)
 * 
 * @example
 * centerToFabric(0, 0)      // Returns { x: 4000, y: 4000 } - canvas center
 * centerToFabric(-4000, -4000) // Returns { x: 0, y: 0 } - top-left corner
 * centerToFabric(4000, 4000)   // Returns { x: 8000, y: 8000 } - bottom-right corner
 */
export function centerToFabric(x: number, y: number): { x: number; y: number } {
  return {
    x: x + CANVAS_CENTER_OFFSET,
    y: y + CANVAS_CENTER_OFFSET,
  };
}

/**
 * Convert Fabric.js top-left origin coordinates to center-origin
 * 
 * @param x - X coordinate in Fabric.js system (0 to 8000)
 * @param y - Y coordinate in Fabric.js system (0 to 8000)
 * @returns Object with x, y in center-origin coordinates (-4000 to +4000)
 * 
 * @example
 * fabricToCenter(4000, 4000) // Returns { x: 0, y: 0 } - canvas center
 * fabricToCenter(0, 0)       // Returns { x: -4000, y: -4000 } - top-left
 * fabricToCenter(8000, 8000) // Returns { x: 4000, y: 4000 } - bottom-right
 */
export function fabricToCenter(x: number, y: number): { x: number; y: number } {
  return {
    x: x - CANVAS_CENTER_OFFSET,
    y: y - CANVAS_CENTER_OFFSET,
  };
}

/**
 * Validate that coordinates are within the valid center-origin range
 * 
 * @param x - X coordinate to validate
 * @param y - Y coordinate to validate
 * @returns true if coordinates are within bounds, false otherwise
 * 
 * @example
 * isValidCenterCoord(0, 0)          // true - center
 * isValidCenterCoord(-4000, -4000)  // true - top-left boundary
 * isValidCenterCoord(5000, 5000)    // false - outside bounds
 */
export function isValidCenterCoord(x: number, y: number): boolean {
  return (
    x >= -CANVAS_CENTER_OFFSET &&
    x <= CANVAS_CENTER_OFFSET &&
    y >= -CANVAS_CENTER_OFFSET &&
    y <= CANVAS_CENTER_OFFSET
  );
}

/**
 * Clamp coordinates to the valid center-origin range
 * 
 * @param x - X coordinate to clamp
 * @param y - Y coordinate to clamp
 * @returns Object with clamped x, y coordinates
 * 
 * @example
 * clampCenterCoord(5000, 5000)   // Returns { x: 4000, y: 4000 }
 * clampCenterCoord(-5000, -5000) // Returns { x: -4000, y: -4000 }
 */
export function clampCenterCoord(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(-CANVAS_CENTER_OFFSET, Math.min(CANVAS_CENTER_OFFSET, x)),
    y: Math.max(-CANVAS_CENTER_OFFSET, Math.min(CANVAS_CENTER_OFFSET, y)),
  };
}

/**
 * Convert a width or height value (dimensions don't change between coordinate systems)
 * Note: Dimensions remain the same regardless of coordinate system origin
 * 
 * @param dimension - Width or height value
 * @returns Same dimension value
 */
export function convertDimension(dimension: number): number {
  return dimension;
}

/**
 * Get the center point in center-origin coordinates
 * This is always (0, 0) in the center-origin system
 * 
 * @returns Object with x: 0, y: 0
 */
export function getCenterPoint(): { x: number; y: number } {
  return { x: 0, y: 0 };
}

/**
 * Get the center point in Fabric.js coordinates
 * This is always (4000, 4000) in the Fabric.js system
 * 
 * @returns Object with x: 4000, y: 4000
 */
export function getFabricCenterPoint(): { x: number; y: number } {
  return { x: CANVAS_CENTER_OFFSET, y: CANVAS_CENTER_OFFSET };
}

