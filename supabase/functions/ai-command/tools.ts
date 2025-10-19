/**
 * AI Tool Definitions
 * Defines the tools available to the AI for canvas manipulation
 */

import { z } from 'npm:zod@4.1.12';
import { tool } from 'npm:ai@5.0.76';

/**
 * Tool: Create Circle
 * Creates a circle at the specified position with given radius
 */
export const createCircleTool = tool({
  description: 'Create a circle on the canvas at the specified position with given radius and styling',
  inputSchema: z.object({
    x: z.number().describe('X coordinate (horizontal position) in canvas coordinates'),
    y: z.number().describe('Y coordinate (vertical position) in canvas coordinates'),
    radius: z.number().positive().describe('Radius of the circle in pixels'),
    fill: z.string().optional().describe('Fill color in hex format (e.g., #ff0000 for red). Defaults to blue if not specified.'),
    stroke: z.string().optional().describe('Stroke/border color in hex format. Optional.'),
    strokeWidth: z.number().optional().describe('Stroke/border width in pixels. Optional.'),
    opacity: z.number().min(0).max(1).optional().describe('Opacity from 0 (transparent) to 1 (opaque). Defaults to 1.'),
  }),
});

/**
 * Tool: Create Rectangle
 * Creates a rectangle at the specified position with given dimensions
 */
export const createRectangleTool = tool({
  description: 'Create a rectangle on the canvas at the specified position with given width and height',
  inputSchema: z.object({
    x: z.number().describe('X coordinate (horizontal position) in canvas coordinates'),
    y: z.number().describe('Y coordinate (vertical position) in canvas coordinates'),
    width: z.number().positive().describe('Width of the rectangle in pixels'),
    height: z.number().positive().describe('Height of the rectangle in pixels'),
    fill: z.string().optional().describe('Fill color in hex format (e.g., #00ff00 for green). Defaults to green if not specified.'),
    stroke: z.string().optional().describe('Stroke/border color in hex format. Optional.'),
    strokeWidth: z.number().optional().describe('Stroke/border width in pixels. Optional.'),
    opacity: z.number().min(0).max(1).optional().describe('Opacity from 0 (transparent) to 1 (opaque). Defaults to 1.'),
    cornerRadius: z.number().optional().describe('Corner radius for rounded corners in pixels. Defaults to 0 (sharp corners).'),
  }),
});

/**
 * Tool: Create Text
 * Creates a text object at the specified position with given content
 */
export const createTextTool = tool({
  description: 'Create a text label on the canvas at the specified position with given content and styling',
  inputSchema: z.object({
    x: z.number().describe('X coordinate (horizontal position) in canvas coordinates'),
    y: z.number().describe('Y coordinate (vertical position) in canvas coordinates'),
    text: z.string().describe('The text content to display'),
    fontSize: z.number().positive().optional().describe('Font size in pixels. Defaults to 24.'),
    fontFamily: z.string().optional().describe('Font family (e.g., "Inter", "Arial", "Helvetica"). Defaults to Inter.'),
    fontWeight: z.enum(['normal', 'bold']).optional().describe('Font weight. Defaults to normal.'),
    fill: z.string().optional().describe('Text color in hex format. Defaults to black.'),
    opacity: z.number().min(0).max(1).optional().describe('Opacity from 0 (transparent) to 1 (opaque). Defaults to 1.'),
    textAlign: z.enum(['left', 'center', 'right']).optional().describe('Text alignment. Defaults to left.'),
  }),
});

/**
 * All available tools for the AI
 */
export const tools = {
  createCircle: createCircleTool,
  createRectangle: createRectangleTool,
  createText: createTextTool,
};
