import { CompositeCommand } from './CompositeCommand';
import { CreateCircleCommand, type CreateCircleParams } from './CreateCircleCommand';
import { CreateRectangleCommand, type CreateRectangleParams } from './CreateRectangleCommand';
import { CreateTextCommand, type CreateTextParams } from './CreateTextCommand';

export type GridShapeType = 'circle' | 'rectangle' | 'text';

export interface GridLayoutCommandParams {
  rows: number;
  cols: number;
  shapeType: GridShapeType;
  startX: number;
  startY: number;
  spacing: number; // Space between shapes
  userId: string;
  // Shape-specific parameters
  radius?: number; // For circles
  width?: number; // For rectangles
  height?: number; // For rectangles
  fill?: string; // For all shapes
  stroke?: string; // For all shapes
  strokeWidth?: number; // For all shapes
  text?: string; // For text (defaults to index)
  fontSize?: number; // For text
}

/**
 * GridLayoutCommand - Create a grid of shapes
 * Uses CompositeCommand to create multiple shapes arranged in a grid pattern
 *
 * Example: "Create a 3x3 grid of circles"
 */
export class GridLayoutCommand extends CompositeCommand {
  constructor(params: GridLayoutCommandParams) {
    const { rows, cols, shapeType, startX, startY, spacing, userId } = params;

    if (rows < 1 || cols < 1) {
      throw new Error('Grid must have at least 1 row and 1 column');
    }

    // Calculate default dimensions based on shape type
    const defaultRadius = params.radius ?? 30;
    const defaultWidth = params.width ?? 80;
    const defaultHeight = params.height ?? 80;
    const defaultFill = params.fill ?? (shapeType === 'circle' ? '#3b82f6' : '#10b981');
    
    // STROKE VALIDATION: Always pass stroke (will default to black in child commands)
    // If AI provides stroke color, ensure strokeWidth is numeric (visible)
    const defaultStroke = params.stroke; // Pass through (child commands will default to black)
    const defaultStrokeWidth = params.stroke 
      ? (params.strokeWidth ?? 2)  // If stroke color provided, default width to 2 (visible)
      : params.strokeWidth;         // Pass through undefined (child will set to 0)
    
    const defaultFontSize = params.fontSize ?? 20;

    const commands = [];

    // Create shapes in grid pattern
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const index = row * cols + col;

        // Calculate position based on shape type and spacing
        let x: number;
        let y: number;

        if (shapeType === 'circle') {
          // For circles, spacing is center-to-center
          x = startX + col * spacing;
          y = startY + row * spacing;
        } else {
          // For rectangles and text, spacing is edge-to-edge
          x = startX + col * (defaultWidth + spacing);
          y = startY + row * (defaultHeight + spacing);
        }

        // Create appropriate command based on shape type
        switch (shapeType) {
          case 'circle': {
            const circleParams: CreateCircleParams = {
              x,
              y,
              radius: defaultRadius,
              fill: defaultFill,
              stroke: defaultStroke,
              stroke_width: defaultStrokeWidth,
            };
            commands.push(new CreateCircleCommand(circleParams, userId));
            break;
          }

          case 'rectangle': {
            const rectParams: CreateRectangleParams = {
              x,
              y,
              width: defaultWidth,
              height: defaultHeight,
              fill: defaultFill,
              stroke: defaultStroke,
              stroke_width: defaultStrokeWidth,
            };
            commands.push(new CreateRectangleCommand(rectParams, userId));
            break;
          }

          case 'text': {
            const textContent = params.text ?? `${index + 1}`;
            const textParams: CreateTextParams = {
              x,
              y,
              text: textContent,
              fontSize: defaultFontSize,
              fill: defaultFill ?? '#000000',
            };
            commands.push(new CreateTextCommand(textParams, userId));
            break;
          }
        }
      }
    }

    // Create composite command with descriptive name
    const description = `${rows}×${cols} Grid of ${shapeType}s (${commands.length} items)`;
    super(commands, description);

    console.log(`[GridLayoutCommand] Created grid: ${description}`);
  }
}

