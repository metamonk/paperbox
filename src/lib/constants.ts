/**
 * Application constants
 */

import type { ShapeDefaults } from '../types/canvas';

// Canvas dimensions and boundaries
// STATIC CANVAS MIGRATION: Fixed 8000x8000 canvas for simple coordinate system
export const CANVAS_WIDTH = 8000;
export const CANVAS_HEIGHT = 8000;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1;
export const ZOOM_SPEED = 0.1;

// Snap-to-grid settings
export const GRID_SIZE = 1; // pixels - objects snap to 1px grid (pixel-perfect)
export const GRID_ENABLED = true; // enable/disable snap-to-grid
export const SHOW_GRID = false; // show visual grid overlay (future feature)

// Shape defaults
export const SHAPE_DEFAULTS: ShapeDefaults = {
  rectangle: {
    width: 100,
    height: 100,
    fill: '#3B82F6', // Blue
  },
  circle: {
    radius: 50,
    fill: '#EF4444', // Red
  },
  text: {
    textContent: 'Text',
    fontSize: 16,
    fill: '#000000', // Black
  },
};

// Realtime channels
export const CHANNELS = {
  CURSORS: 'canvas-cursors',
  OBJECTS: 'canvas-objects',
} as const;

// Cursor settings
export const CURSOR_THROTTLE_MS = 33; // 30 FPS

// Vibrant color palette for cursor and user differentiation (12 colors)
export const CURSOR_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

/**
 * Generate a consistent color from userId using FNV-1a hash algorithm
 * FNV-1a provides better distribution for similar strings (like UUIDs) than simple accumulation
 * Same userId will always get the same color
 *
 * @param userId - User ID to generate color from
 * @returns Hex color string from CURSOR_COLORS palette
 */
export function generateColorFromId(userId: string): string {
  // FNV-1a hash algorithm - better distribution for UUIDs
  let hash = 2166136261; // FNV offset basis (32-bit)

  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }

  // Convert to positive and get index
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
}

// Idle detection
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Lock settings
export const LOCK_TIMEOUT_MS = 30 * 1000; // 30 seconds

// Error retry settings
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;
export const RETRY_BACKOFF_MULTIPLIER = 2;

