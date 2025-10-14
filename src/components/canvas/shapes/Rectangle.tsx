/**
 * Rectangle shape component
 * Draggable rectangle with boundary constraints
 */

import { Rect } from 'react-konva';
import Konva from 'konva';
import { RectangleObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

interface RectangleProps {
  shape: RectangleObject;
  onUpdate: (id: string, updates: Partial<RectangleObject>) => void;
}

export function Rectangle({ shape, onUpdate }: RectangleProps) {
  /**
   * Constrain dragging to canvas boundaries
   */
  const handleDragBound = (pos: { x: number; y: number }) => {
    return {
      x: Math.max(0, Math.min(pos.x, CANVAS_WIDTH - shape.width)),
      y: Math.max(0, Math.min(pos.y, CANVAS_HEIGHT - shape.height)),
    };
  };

  /**
   * Update position in parent state on drag end
   */
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onUpdate(shape.id, {
      x: node.x(),
      y: node.y(),
    });
  };

  return (
    <Rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      fill={shape.fill}
      draggable
      dragBoundFunc={handleDragBound}
      onDragEnd={handleDragEnd}
    />
  );
}

