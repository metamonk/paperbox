/**
 * Canvas utility functions for coordinate transformations and bounds checking
 */

import Konva from 'konva';
import { MIN_ZOOM, MAX_ZOOM, CANVAS_WIDTH, CANVAS_HEIGHT } from '../lib/constants';

/**
 * Get the center point of the current viewport in canvas coordinates
 * @param stage - Konva stage reference
 * @returns {x, y} coordinates of viewport center
 */
export function getViewportCenter(stage: Konva.Stage): { x: number; y: number } {
  const width = stage.width();
  const height = stage.height();
  const x = stage.x();
  const y = stage.y();
  const scaleX = stage.scaleX();

  return {
    x: (width / 2 - x) / scaleX,
    y: (height / 2 - y) / scaleX,
  };
}

/**
 * Clamp zoom level to min/max bounds
 * @param scale - Desired zoom scale
 * @returns Clamped scale value
 */
export function clampZoom(scale: number): number {
  return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
}

/**
 * Convert screen coordinates to canvas coordinates
 * @param screenX - Screen X coordinate
 * @param screenY - Screen Y coordinate
 * @param scale - Current zoom scale
 * @param stagePosition - Stage position {x, y}
 * @returns Canvas coordinates {x, y}
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  scale: number,
  stagePosition: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: (screenX - stagePosition.x) / scale,
    y: (screenY - stagePosition.y) / scale,
  };
}

/**
 * Convert canvas coordinates to screen coordinates
 * @param canvasX - Canvas X coordinate
 * @param canvasY - Canvas Y coordinate
 * @param scale - Current zoom scale
 * @param stagePosition - Stage position {x, y}
 * @returns Screen coordinates {x, y}
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  scale: number,
  stagePosition: { x: number; y: number }
): { x: number; y: number } {
  return {
    x: canvasX * scale + stagePosition.x,
    y: canvasY * scale + stagePosition.y,
  };
}

/**
 * Constrain coordinates to stay within canvas boundaries
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param width - Object width
 * @param height - Object height
 * @returns Constrained coordinates {x, y}
 */
export function constrainToBounds(
  x: number,
  y: number,
  width: number = 0,
  height: number = 0
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(x, CANVAS_WIDTH - width)),
    y: Math.max(0, Math.min(y, CANVAS_HEIGHT - height)),
  };
}

