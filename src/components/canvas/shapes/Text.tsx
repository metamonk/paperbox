/**
 * Text shape component
 * Draggable text with boundary constraints, editing capability, and locking
 */

import { useState, useRef, useEffect } from 'react';
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
}

export function Text({ shape, onUpdate, onAcquireLock, onReleaseLock }: TextProps) {
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
  const handleDragBound = (pos: { x: number; y: number }) => {
    const textWidth = shape.width || 100;
    const textHeight = shape.height || shape.font_size * 1.2;

    return {
      x: Math.max(0, Math.min(pos.x, CANVAS_WIDTH - textWidth)),
      y: Math.max(0, Math.min(pos.y, CANVAS_HEIGHT - textHeight)),
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

  /**
   * Handle double-click to enter edit mode
   * Acquire lock before editing (any user can edit any text)
   */
  const handleDoubleClick = async () => {
    // Try to acquire lock for editing
    const success = await onAcquireLock(shape.id);
    if (success) {
      setIsEditing(true);
    } else {
      alert('This text is currently being edited by another user.');
    }
  };

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
    />
  );
}

