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
    stroke: z.string().optional().describe('Stroke/border color in hex format. If provided, strokeWidth will default to 2 if not specified.'),
    strokeWidth: z.number().positive().optional().describe('Stroke/border width in pixels. Required if stroke is provided. Defaults to 2 when stroke is set.'),
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
    stroke: z.string().optional().describe('Stroke/border color in hex format. If provided, strokeWidth will default to 2 if not specified.'),
    strokeWidth: z.number().positive().optional().describe('Stroke/border width in pixels. Required if stroke is provided. Defaults to 2 when stroke is set.'),
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
    fontFamily: z.string().optional().describe('Font family (e.g., "Arial", "Helvetica", "Times New Roman"). Defaults to Arial (universal system font).'),
    fontWeight: z.enum(['normal', 'bold']).optional().describe('Font weight. Defaults to normal.'),
    fill: z.string().optional().describe('Text color in hex format. Defaults to black.'),
    opacity: z.number().min(0).max(1).optional().describe('Opacity from 0 (transparent) to 1 (opaque). Defaults to 1.'),
    textAlign: z.enum(['left', 'center', 'right']).optional().describe('Text alignment. Defaults to left.'),
  }),
});

/**
 * Tool: Move Object
 * Moves an object to a new position (absolute or relative)
 */
export const moveObjectTool = tool({
  description: 'Move a selected object to a new position. Use absolute coordinates (x, y) OR relative offsets (deltaX, deltaY).',
  inputSchema: z.object({
    objectId: z.string().describe('ID of the object to move. Use context.selectedObjects to get IDs of selected objects.'),
    x: z.number().optional().describe('Absolute X coordinate (use with y for absolute positioning)'),
    y: z.number().optional().describe('Absolute Y coordinate (use with x for absolute positioning)'),
    deltaX: z.number().optional().describe('Horizontal offset in pixels (positive = right, negative = left)'),
    deltaY: z.number().optional().describe('Vertical offset in pixels (positive = down, negative = up)'),
  }),
});

/**
 * Tool: Resize Object
 * Resizes an object by changing width/height or radius
 */
export const resizeObjectTool = tool({
  description: 'Resize a selected object. For rectangles/text use width/height, for circles use radius.',
  inputSchema: z.object({
    objectId: z.string().describe('ID of the object to resize. Use context.selectedObjects to get IDs of selected objects.'),
    width: z.number().positive().optional().describe('New width in pixels (for rectangles/text)'),
    height: z.number().positive().optional().describe('New height in pixels (for rectangles/text)'),
    radius: z.number().positive().optional().describe('New radius in pixels (for circles)'),
    scaleX: z.number().positive().optional().describe('Scale factor for width (e.g., 2 = double width, 0.5 = half width)'),
    scaleY: z.number().positive().optional().describe('Scale factor for height (e.g., 2 = double height, 0.5 = half height)'),
  }),
});

/**
 * Tool: Rotate Object
 * Rotates an object by specified angle
 */
export const rotateObjectTool = tool({
  description: 'Rotate a selected object by a specified angle in degrees',
  inputSchema: z.object({
    objectId: z.string().describe('ID of the object to rotate. Use context.selectedObjects to get IDs of selected objects.'),
    angle: z.number().optional().describe('Absolute rotation angle in degrees (0-360)'),
    deltaAngle: z.number().optional().describe('Relative rotation in degrees (positive = clockwise, negative = counter-clockwise)'),
  }),
});

/**
 * Tool: Change Style
 * Changes styling properties of an object (color, stroke, opacity)
 */
export const changeStyleTool = tool({
  description: 'Change the styling of a selected object: fill color, stroke color, stroke width, or opacity',
  inputSchema: z.object({
    objectId: z.string().describe('ID of the object to style. Use context.selectedObjects to get IDs of selected objects.'),
    fill: z.string().optional().describe('New fill color in hex format (e.g., #ff0000 for red, #00ff00 for green)'),
    stroke: z.string().optional().describe('New stroke/border color in hex format. If provided, stroke_width will default to 2 if not specified.'),
    stroke_width: z.number().positive().optional().describe('New stroke/border width in pixels. Required if stroke is provided. Defaults to 2 when stroke is set.'),
    opacity: z.number().min(0).max(1).optional().describe('New opacity from 0 (transparent) to 1 (opaque)'),
  }),
});

/**
 * Tool: Align Objects
 * Aligns multiple selected objects along a specified axis
 */
export const alignObjectsTool = tool({
  description: 'Align multiple selected objects along a specified edge or center. Use for "align left", "center horizontally", "align bottom", etc.',
  inputSchema: z.object({
    objectIds: z.array(z.string()).min(2).describe('Array of object IDs to align. Use context.selectedObjects to get IDs. Need at least 2 objects.'),
    alignment: z.enum(['left', 'center', 'right', 'top', 'middle', 'bottom']).describe(
      'Alignment type: left/center/right (horizontal), top/middle/bottom (vertical)'
    ),
  }),
});

/**
 * Tool: Distribute Objects
 * Distributes multiple objects with even spacing
 */
export const distributeObjectsTool = tool({
  description: 'Distribute multiple objects with even spacing horizontally or vertically. Use for "space evenly", "distribute horizontally", etc.',
  inputSchema: z.object({
    objectIds: z.array(z.string()).min(3).describe('Array of object IDs to distribute. Use context.selectedObjects to get IDs. Need at least 3 objects.'),
    direction: z.enum(['horizontal', 'vertical']).describe('Distribution direction: horizontal (left to right) or vertical (top to bottom)'),
    spacing: z.number().positive().optional().describe('Fixed spacing between objects in pixels. If not provided, objects are distributed evenly between first and last object.'),
  }),
});

/**
 * Tool: Grid Layout
 * Create a grid of shapes (circles, rectangles, or text)
 */
export const gridLayoutTool = tool({
  description: 'Create a grid of identical shapes arranged in rows and columns. Use for "create a 3x3 grid of circles", "make a 2x4 grid of squares", etc.',
  inputSchema: z.object({
    rows: z.number().int().positive().describe('Number of rows in the grid'),
    cols: z.number().int().positive().describe('Number of columns in the grid'),
    shapeType: z.enum(['circle', 'rectangle', 'text']).describe('Type of shape to create in the grid'),
    startX: z.number().describe('X coordinate of the top-left corner of the grid (use viewport center if not specified)'),
    startY: z.number().describe('Y coordinate of the top-left corner of the grid (use viewport center if not specified)'),
    spacing: z.number().positive().describe('Space between shapes in pixels. For circles: center-to-center distance. For rectangles/text: edge-to-edge distance.'),
    radius: z.number().positive().optional().describe('Radius for circles (default: 30px)'),
    width: z.number().positive().optional().describe('Width for rectangles (default: 80px)'),
    height: z.number().positive().optional().describe('Height for rectangles (default: 80px)'),
    fill: z.string().optional().describe('Fill color in hex format (default: blue for circles, green for rectangles)'),
    stroke: z.string().optional().describe('Stroke color in hex format. If provided, strokeWidth will default to 2 if not specified.'),
    strokeWidth: z.number().positive().optional().describe('Stroke width in pixels. Required if stroke is provided. Defaults to 2 when stroke is set.'),
    text: z.string().optional().describe('Text content for text shapes (default: numbered 1, 2, 3...)'),
    fontSize: z.number().positive().optional().describe('Font size for text shapes (default: 20px)'),
  }),
});

/**
 * All available tools for the AI
 */
export const tools = {
  createCircle: createCircleTool,
  createRectangle: createRectangleTool,
  createText: createTextTool,
  moveObject: moveObjectTool,
  resizeObject: resizeObjectTool,
  rotateObject: rotateObjectTool,
  changeStyle: changeStyleTool,
  alignObjects: alignObjectsTool,
  distributeObjects: distributeObjectsTool,
  gridLayout: gridLayoutTool,
};
