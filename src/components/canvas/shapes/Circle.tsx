/**
 * Circle shape component
 * Draggable circle with boundary constraints
 */

import { Circle as KonvaCircle } from 'react-konva';
import Konva from 'konva';
import { CircleObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

interface CircleProps {
  shape: CircleObject;
  onUpdate: (id: string, updates: Partial<CircleObject>) => void;
}

export function Circle({ shape, onUpdate }: CircleProps) {
  /**
   * Constrain dragging to canvas boundaries
   * Account for radius so circle doesn't go off edge
   */
  const handleDragBound = (pos: { x: number; y: number }) => {
    return {
      x: Math.max(shape.radius, Math.min(pos.x, CANVAS_WIDTH - shape.radius)),
      y: Math.max(shape.radius, Math.min(pos.y, CANVAS_HEIGHT - shape.radius)),
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
    <KonvaCircle
      x={shape.x}
      y={shape.y}
      radius={shape.radius}
      fill={shape.fill}
      draggable
      dragBoundFunc={handleDragBound}
      onDragEnd={handleDragEnd}
    />
  );
}

