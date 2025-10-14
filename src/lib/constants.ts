/**
 * Application constants
 */

import type { ShapeDefaults } from '../types/canvas';

// Canvas dimensions and boundaries
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const DEFAULT_ZOOM = 1;
export const ZOOM_SPEED = 0.1;

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
export const CURSOR_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

// Idle detection
export const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Lock settings
export const LOCK_TIMEOUT_MS = 30 * 1000; // 30 seconds

// Error retry settings
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_MS = 1000;
export const RETRY_BACKOFF_MULTIPLIER = 2;

