/**
 * Text shape component
 * Draggable text with boundary constraints, editing capability, and locking
 */

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import { useAuth } from '../../../hooks/useAuth';
import type { TextObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

interface TextProps {
  shape: TextObject;
  onUpdate: (id: string, updates: Partial<TextObject>) => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
  onActivity?: () => void;
}

function TextComponent({ shape, onUpdate, onAcquireLock, onReleaseLock, onActivity }: TextProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<Konva.Text>(null);
  
  // Determine lock state
  const isLockedByOther = shape.locked_by && shape.locked_by !== user?.id;
  const isLockedByMe = shape.locked_by === user?.id;

  /**
   * Constrain dragging to canvas boundaries
   * Estimate text dimensions for boundary checking
   */
  const handleDragBound = useCallback((pos: { x: number; y: number }) => {
    const textWidth = shape.width || 100;
    const textHeight = shape.height || shape.font_size * 1.2;

    return {
      x: Math.max(0, Math.min(pos.x, CANVAS_WIDTH - textWidth)),
      y: Math.max(0, Math.min(pos.y, CANVAS_HEIGHT - textHeight)),
    };
  }, [shape.width, shape.height, shape.font_size]);

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
   * Handle double-click to enter edit mode
   * Acquire lock before editing (any user can edit any text)
   * Also update activity for presence tracking
   */
  const handleDoubleClick = useCallback(async () => {
    onActivity?.();
    // Try to acquire lock for editing
    const success = await onAcquireLock(shape.id);
    if (success) {
      setIsEditing(true);
    } else {
      alert('This text is currently being edited by another user.');
    }
  }, [shape.id, onAcquireLock, onActivity]);

  /**
   * Handle text editing via browser prompt
   * In PR #9 we can improve this with a proper input overlay
   */
  useEffect(() => {
    if (isEditing) {
      const newText = prompt('Edit text:', shape.text_content);
      if (newText !== null && newText !== shape.text_content) {
        onUpdate(shape.id, {
          text_content: newText || 'Text',
        });
      }
      setIsEditing(false);
      
      // Release lock after editing
      onReleaseLock(shape.id);
    }
  }, [isEditing, shape.id, shape.text_content, onUpdate, onReleaseLock]);

  return (
    <KonvaText
      ref={textRef}
      x={shape.x}
      y={shape.y}
      text={shape.text_content}
      fontSize={shape.font_size}
      fill={shape.fill}
      draggable={!isEditing && !isLockedByOther}
      dragBoundFunc={handleDragBound}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      // Visual feedback for locked state
      stroke={isLockedByOther ? '#EF4444' : isLockedByMe ? '#10B981' : undefined}
      strokeWidth={isLockedByOther || isLockedByMe ? 3 : 0}
      opacity={isLockedByOther ? 0.7 : 1}
      // Performance optimizations
      perfectDrawEnabled={false}
    />
  );
}

/**
 * Custom comparison function for React.memo
 * Only re-render if shape properties that affect rendering change
 */
const areEqual = (prevProps: TextProps, nextProps: TextProps) => {
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.shape.x === nextProps.shape.x &&
    prevProps.shape.y === nextProps.shape.y &&
    prevProps.shape.text_content === nextProps.shape.text_content &&
    prevProps.shape.font_size === nextProps.shape.font_size &&
    prevProps.shape.fill === nextProps.shape.fill &&
    prevProps.shape.locked_by === nextProps.shape.locked_by
  );
};

export const Text = memo(TextComponent, areEqual);

