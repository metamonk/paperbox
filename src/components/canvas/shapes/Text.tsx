/**
 * Text shape component
 * Draggable text with boundary constraints, inline editing capability, and locking
 */

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Group, Rect, Text as KonvaText } from 'react-konva';
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
  scale: number;
  stagePosition: { x: number; y: number };
}

function TextComponent({ shape, onUpdate, onAcquireLock, onReleaseLock, onActivity, scale, stagePosition }: TextProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const groupRef = useRef<Konva.Group>(null);
  const textRef = useRef<Konva.Text>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Determine lock state
  const isLockedByOther = shape.locked_by && shape.locked_by !== user?.id;
  const isLockedByMe = shape.locked_by === user?.id;

  // Calculate text dimensions for bounding box
  const padding = 10;
  const textWidth = textRef.current?.width() || 100;
  const textHeight = textRef.current?.height() || shape.font_size * 1.5;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;

  /**
   * Constrain dragging to canvas boundaries
   * Use the bounding box dimensions for boundary checking
   */
  const handleDragBound = useCallback((pos: { x: number; y: number }) => {
    const width = boxWidth || 120;
    const height = boxHeight || 40;

    return {
      x: Math.max(0, Math.min(pos.x, CANVAS_WIDTH - width)),
      y: Math.max(0, Math.min(pos.y, CANVAS_HEIGHT - height)),
    };
  }, [boxWidth, boxHeight]);

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
    // Get the group's position
    const group = groupRef.current;
    if (!group) return;
    
    const newPos = { x: group.x(), y: group.y() };
    const originalPos = { x: shape.x, y: shape.y };
    
    try {
      // Update position in database
      await onUpdate(shape.id, newPos);
    } catch (error) {
      // Revert position on failure
      console.error('Failed to update shape position:', error);
      group.position(originalPos);
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
  const handleDoubleClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Prevent stage from handling this event
    e.cancelBubble = true;
    
    console.log('Text double-clicked!', shape.id);
    onActivity?.();
    
    // Try to acquire lock for editing
    const success = await onAcquireLock(shape.id);
    console.log('Lock acquired:', success);
    
    if (success) {
      setEditValue(shape.text_content || '');
      setIsEditing(true);
    } else {
      alert('This text is currently being edited by another user.');
    }
  }, [shape.id, shape.text_content, onAcquireLock, onActivity]);

  /**
   * Finish editing and save changes
   */
  const handleFinishEdit = useCallback(async () => {
    setIsEditing(false);
    
    // Only update if text changed
    if (editValue.trim() && editValue !== shape.text_content) {
      await onUpdate(shape.id, {
        text_content: editValue,
      });
    }
    
    // Release lock after editing
    await onReleaseLock(shape.id);
  }, [editValue, shape.id, shape.text_content, onUpdate, onReleaseLock]);

  /**
   * Cancel editing without saving
   */
  const handleCancelEdit = useCallback(async () => {
    setIsEditing(false);
    setEditValue(shape.text_content || '');
    
    // Release lock
    await onReleaseLock(shape.id);
  }, [shape.id, shape.text_content, onReleaseLock]);

  /**
   * Auto-focus and select all text when entering edit mode
   */
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  /**
   * Calculate screen position for the input overlay
   */
  const getInputPosition = () => {
    if (!textRef.current) return { x: 0, y: 0 };
    
    // Convert canvas coordinates to screen coordinates
    const x = shape.x * scale + stagePosition.x;
    const y = shape.y * scale + stagePosition.y;
    
    return { x, y };
  };

  const inputPosition = getInputPosition();

  return (
    <>
      <Group
        ref={groupRef}
        x={shape.x}
        y={shape.y}
        draggable={!isEditing && !isLockedByOther}
        dragBoundFunc={handleDragBound}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        visible={!isEditing}
      >
        {/* Background rectangle - bounded container */}
        <Rect
          x={0}
          y={0}
          width={boxWidth}
          height={boxHeight}
          fill="rgba(255, 255, 255, 0.9)"
          stroke={isLockedByOther ? '#EF4444' : isLockedByMe ? '#10B981' : '#E5E7EB'}
          strokeWidth={isLockedByOther || isLockedByMe ? 3 : 1}
          cornerRadius={4}
          shadowColor="black"
          shadowBlur={4}
          shadowOpacity={0.1}
          shadowOffsetX={0}
          shadowOffsetY={2}
          opacity={isLockedByOther ? 0.7 : 1}
        />
        
        {/* Text content */}
        <KonvaText
          ref={textRef}
          x={padding}
          y={padding}
          text={shape.text_content}
          fontSize={shape.font_size}
          fill={shape.fill}
          perfectDrawEnabled={false}
        />
      </Group>

      {/* Inline text editor - rendered as portal over canvas */}
      {isEditing && createPortal(
        <textarea
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleFinishEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleFinishEdit();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              handleCancelEdit();
            }
          }}
          style={{
            position: 'absolute',
            left: `${inputPosition.x}px`,
            top: `${inputPosition.y}px`,
            fontSize: `${shape.font_size * scale}px`,
            fontFamily: 'Arial, sans-serif',
            color: shape.fill,
            background: 'white',
            border: '2px solid #3B82F6',
            borderRadius: '4px',
            padding: '4px 8px',
            outline: 'none',
            resize: 'none',
            minWidth: '100px',
            minHeight: `${shape.font_size * scale * 1.5}px`,
            lineHeight: '1.5',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
          rows={1}
        />,
        document.body
      )}
    </>
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
    prevProps.shape.locked_by === nextProps.shape.locked_by &&
    prevProps.scale === nextProps.scale &&
    prevProps.stagePosition.x === nextProps.stagePosition.x &&
    prevProps.stagePosition.y === nextProps.stagePosition.y
  );
};

export const Text = memo(TextComponent, areEqual);

