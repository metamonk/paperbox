/**
 * Text shape component for canvas
 * Supports inline editing via Html overlay from react-konva-utils
 */

import { memo, useRef, useCallback, useState } from 'react';
import { Text as KonvaText, Group } from 'react-konva';
import { Html } from 'react-konva-utils';
import Konva from 'konva';
import { useAuth } from '../../../hooks/useAuth';
import type { TextObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

interface TextProps {
  shape: TextObject;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<TextObject>) => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
  onActivity?: () => void;
  scale: number;
  stagePosition: { x: number; y: number };
}

function TextComponent({ shape, isSelected: _isSelected, onSelect, onUpdate, onAcquireLock, onReleaseLock, onActivity, scale, stagePosition: _stagePosition }: TextProps) {
  const { user } = useAuth();
  const textRef = useRef<Konva.Text>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(shape.text_content || '');

  // Determine lock state
  const isLockedByOther = shape.locked_by && shape.locked_by !== user?.id;
  const isLockedByMe = shape.locked_by === user?.id;

  // Calculate text dimensions for boundary checking
  const textWidth = textRef.current?.getTextWidth() || 100;
  const textHeight = shape.font_size || 16;

  /**
   * Constrain dragging to canvas boundaries
   */
  const handleDragBound = useCallback((pos: { x: number; y: number }) => {
    return {
      x: Math.max(0, Math.min(pos.x, CANVAS_WIDTH - textWidth)),
      y: Math.max(0, Math.min(pos.y, CANVAS_HEIGHT - textHeight)),
    };
  }, [textWidth, textHeight]);

  /**
   * Acquire lock and track activity on drag start
   */
  const handleDragStart = useCallback(async () => {
    if (onActivity) onActivity();
    
    const locked = await onAcquireLock(shape.id);
    if (!locked) {
      return false;
    }
  }, [shape.id, onAcquireLock, onActivity]);

  /**
   * Update position and release lock on drag end
   */
  const handleDragEnd = useCallback(async (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newPos = { x: node.x(), y: node.y() };
    const originalPos = { x: shape.x, y: shape.y };
    
    try {
      await onUpdate(shape.id, newPos);
    } catch (error) {
      console.error('Failed to update text position:', error);
      node.position(originalPos);
    } finally {
      await onReleaseLock(shape.id);
    }
  }, [shape.id, shape.x, shape.y, onUpdate, onReleaseLock]);

  /**
   * Handle transform end (resize for width, rotation)
   */
  const handleTransformEnd = useCallback(async () => {
    const node = textRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    node.scaleX(1);
    node.scaleY(1);

    try {
      await onUpdate(shape.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(20, node.width() * scaleX),
        rotation: node.rotation(),
      });
    } catch (error) {
      console.error('Failed to update text transform:', error);
    }
  }, [shape.id, onUpdate]);

  /**
   * Start editing on double-click
   */
  const handleDoubleClick = useCallback(async () => {
    if (isLockedByOther) return;
    
    if (onActivity) onActivity();
    
    // Acquire lock for editing
    const locked = await onAcquireLock(shape.id);
    if (!locked) return;
    
    setEditValue(shape.text_content || '');
    setIsEditing(true);
  }, [shape.id, shape.text_content, isLockedByOther, onAcquireLock, onActivity]);

  /**
   * Save edited text
   */
  const handleFinishEdit = useCallback(async () => {
    setIsEditing(false);
    
    if (editValue !== shape.text_content) {
      await onUpdate(shape.id, { text_content: editValue });
    }
    
    await onReleaseLock(shape.id);
  }, [shape.id, shape.text_content, editValue, onUpdate, onReleaseLock]);

  /**
   * Cancel editing without saving
   */
  const handleCancelEdit = useCallback(async () => {
    setIsEditing(false);
    setEditValue(shape.text_content || '');
    await onReleaseLock(shape.id);
  }, [shape.id, shape.text_content, onReleaseLock]);

  return (
    <Group
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation || 0}
      draggable={!isLockedByOther && !isEditing}
      dragBoundFunc={handleDragBound}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      id={shape.id}
    >
      <KonvaText
        ref={textRef}
        text={shape.text_content || 'Text'}
        fontSize={shape.font_size || 16}
        fill={shape.fill}
        width={shape.width}
        visible={!isEditing}
        // Visual feedback for locked state
        stroke={isLockedByOther ? '#EF4444' : isLockedByMe ? '#10B981' : undefined}
        strokeWidth={isLockedByOther || isLockedByMe ? 2 : 0}
        opacity={isLockedByOther ? 0.7 : 1}
        perfectDrawEnabled={false}
      />
      
      {isEditing && (
        <Html
          divProps={{
            style: {
              position: 'absolute',
              top: '0px',
              left: '0px',
            },
          }}
        >
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleFinishEdit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancelEdit();
              }
            }}
            autoFocus
            style={{
              width: `${Math.max(100, (shape.width || textWidth) / scale)}px`,
              minHeight: `${(shape.font_size || 16) / scale}px`,
              fontSize: `${(shape.font_size || 16) / scale}px`,
              fontFamily: 'Arial, sans-serif',
              color: shape.fill,
              border: '2px solid #3B82F6',
              borderRadius: '4px',
              padding: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              outline: 'none',
              resize: 'none',
              overflow: 'hidden',
            }}
          />
        </Html>
      )}
    </Group>
  );
}

/**
 * Custom comparison function for React.memo
 */
const areEqual = (prevProps: TextProps, nextProps: TextProps) => {
  return (
    prevProps.shape.id === nextProps.shape.id &&
    prevProps.shape.x === nextProps.shape.x &&
    prevProps.shape.y === nextProps.shape.y &&
    prevProps.shape.text_content === nextProps.shape.text_content &&
    prevProps.shape.font_size === nextProps.shape.font_size &&
    prevProps.shape.fill === nextProps.shape.fill &&
    prevProps.shape.width === nextProps.shape.width &&
    prevProps.shape.rotation === nextProps.shape.rotation &&
    prevProps.shape.locked_by === nextProps.shape.locked_by &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.scale === nextProps.scale &&
    prevProps.stagePosition.x === nextProps.stagePosition.x &&
    prevProps.stagePosition.y === nextProps.stagePosition.y
  );
};

export const Text = memo(TextComponent, areEqual);
