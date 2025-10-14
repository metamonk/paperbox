/**
 * Circle shape component
 * Draggable circle with boundary constraints and locking
 */

import { Circle as KonvaCircle } from 'react-konva';
import Konva from 'konva';
import { useAuth } from '../../../hooks/useAuth';
import type { CircleObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

interface CircleProps {
  shape: CircleObject;
  onUpdate: (id: string, updates: Partial<CircleObject>) => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
}

export function Circle({ shape, onUpdate, onAcquireLock, onReleaseLock }: CircleProps) {
  const { user } = useAuth();
  
  // Determine lock state
  const isLockedByOther = shape.locked_by && shape.locked_by !== user?.id;
  const isLockedByMe = shape.locked_by === user?.id;

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
   * Acquire lock when starting to drag
   */
  const handleDragStart = async () => {
    const success = await onAcquireLock(shape.id);
    if (!success) {
      // Lock acquisition failed - prevent drag
      return false;
    }
  };

  /**
   * Update position and release lock on drag end
   */
  const handleDragEnd = async (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    
    // Update position in database
    await onUpdate(shape.id, {
      x: node.x(),
      y: node.y(),
    });
    
    // Release lock
    await onReleaseLock(shape.id);
  };

  return (
    <KonvaCircle
      x={shape.x}
      y={shape.y}
      radius={shape.radius}
      fill={shape.fill}
      draggable={!isLockedByOther}
      dragBoundFunc={handleDragBound}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      // Visual feedback for locked state
      stroke={isLockedByOther ? '#EF4444' : isLockedByMe ? '#10B981' : undefined}
      strokeWidth={isLockedByOther || isLockedByMe ? 3 : 0}
      opacity={isLockedByOther ? 0.7 : 1}
    />
  );
}

