/**
 * Rectangle shape component
 * Draggable rectangle with boundary constraints and locking
 */

import { memo, useCallback } from 'react';
import { Rect } from 'react-konva';
import Konva from 'konva';
import { useAuth } from '../../../hooks/useAuth';
import type { RectangleObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

interface RectangleProps {
  shape: RectangleObject;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<RectangleObject>) => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
  onActivity?: () => void;
}

function RectangleComponent({ shape, isSelected, onSelect, onUpdate, onAcquireLock, onReleaseLock, onActivity }: RectangleProps) {
  const { user } = useAuth();
  const shapeRef = useRef<Konva.Rect>(null);
  
  // Determine lock state
  const isLockedByOther = shape.locked_by && shape.locked_by !== user?.id;
  const isLockedByMe = shape.locked_by === user?.id;

  /**
   * Constrain dragging to canvas boundaries
   */
  const handleDragBound = useCallback((pos: { x: number; y: number }) => {
    return {
      x: Math.max(0, Math.min(pos.x, CANVAS_WIDTH - shape.width)),
      y: Math.max(0, Math.min(pos.y, CANVAS_HEIGHT - shape.height)),
    };
  }, [shape.width, shape.height]);

  /**
   * Acquire lock when starting to drag
   * Also update activity for presence tracking
   */
  const handleDragStart = useCallback(async () => {
    onActivity?.();
    const success = await onAcquireLock(shape.id);
    if (!success) {
      // Lock acquisition failed - prevent drag
      return false;
    }
  }, [shape.id, onAcquireLock, onActivity]);

  /**
   * Update position and release lock on drag end
   * Includes error recovery to revert position on failed update
   */
  const handleDragEnd = useCallback(async (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newPos = { x: node.x(), y: node.y() };
    const originalPos = { x: shape.x, y: shape.y };
    
    try {
      // Update position in database
      await onUpdate(shape.id, newPos);
    } catch (error) {
      // Revert position on failure
      console.error('Failed to update shape position:', error);
      node.position(originalPos);
    } finally {
      // Always release lock
      await onReleaseLock(shape.id);
    }
  }, [shape.id, shape.x, shape.y, onUpdate, onReleaseLock]);

  /**
   * Handle transform end (resize/rotate)
   */
  const handleTransformEnd = useCallback(async () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    try {
      await onUpdate(shape.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    } catch (error) {
      console.error('Failed to update shape transform:', error);
    }
  }, [shape.id, onUpdate]);

  return (
    <Rect
      ref={shapeRef}
      id={shape.id}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      fill={shape.fill}
      rotation={shape.rotation || 0}
      draggable={!isLockedByOther}
      dragBoundFunc={handleDragBound}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      onClick={onSelect}
      onTap={onSelect}
      // Visual feedback for locked state
      stroke={isLockedByOther ? '#EF4444' : isLockedByMe ? '#10B981' : undefined}
      strokeWidth={isLockedByOther || isLockedByMe ? 3 : 0}
      opacity={isLockedByOther ? 0.7 : 1}
      // Performance optimizations
      perfectDrawEnabled={false}
      shadowForStrokeEnabled={false}
    />
  );
}

/**
 * Custom comparison function for React.memo
 * Only re-render if shape properties that affect rendering change
 */
const areEqual = (prevProps: RectangleProps, nextProps: RectangleProps) => {
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.shape.x === nextProps.shape.x &&
    prevProps.shape.y === nextProps.shape.y &&
    prevProps.shape.width === nextProps.shape.width &&
    prevProps.shape.height === nextProps.shape.height &&
    prevProps.shape.fill === nextProps.shape.fill &&
    prevProps.shape.rotation === nextProps.shape.rotation &&
    prevProps.shape.locked_by === nextProps.shape.locked_by &&
    prevProps.isSelected === nextProps.isSelected
  );
};

export const Rectangle = memo(RectangleComponent, areEqual);

