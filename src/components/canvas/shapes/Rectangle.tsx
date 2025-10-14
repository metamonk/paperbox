/**
 * Rectangle shape component
 * Draggable rectangle with boundary constraints and locking
 */

import { Rect } from 'react-konva';
import Konva from 'konva';
import { useAuth } from '../../../hooks/useAuth';
import type { RectangleObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

interface RectangleProps {
  shape: RectangleObject;
  onUpdate: (id: string, updates: Partial<RectangleObject>) => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
  onActivity?: () => void;
}

export function Rectangle({ shape, onUpdate, onAcquireLock, onReleaseLock, onActivity }: RectangleProps) {
  const { user } = useAuth();
  
  // Determine lock state
  const isLockedByOther = shape.locked_by && shape.locked_by !== user?.id;
  const isLockedByMe = shape.locked_by === user?.id;

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
   * Acquire lock when starting to drag
   * Also update activity for presence tracking
   */
  const handleDragStart = async () => {
    onActivity?.();
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
    <Rect
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
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

