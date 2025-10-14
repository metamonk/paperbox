/**
 * Text shape component for canvas
 * Supports inline editing via Html overlay from react-konva-utils
 * 
 * Note: Text uses Group + special transform logic, so it doesn't use BaseShape
 * The editing behavior and resize logic are unique to text objects
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

function TextComponent({ 
  shape, 
  isSelected: _isSelected, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSelect, 
  onUpdate, 
  onAcquireLock, 
  onReleaseLock, 
  onActivity, 
  scale, 
  stagePosition: _stagePosition // eslint-disable-line @typescript-eslint/no-unused-vars
}: TextProps) {
  const { user } = useAuth();
  const textRef = useRef<Konva.Text>(null);
  const groupRef = useRef<Konva.Group>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(shape.type_properties.text_content || '');

  // Determine lock state
  const isLockedByOther = shape.locked_by && shape.locked_by !== user?.id;
  const isLockedByMe = shape.locked_by === user?.id;

  // Get text properties from type_properties
  const textContent = shape.type_properties.text_content || 'Text';
  const fontSize = shape.type_properties.font_size || 16;
  const fontFamily = shape.type_properties.font_family || 'Arial, sans-serif';
  const fontWeight = shape.type_properties.font_weight || 'normal';
  const fontStyle = shape.type_properties.font_style || 'normal';
  const textAlign = shape.type_properties.text_align || 'left';

  // Calculate text dimensions for boundary checking
  const textWidth = textRef.current?.getTextWidth() || 100;
  const textHeight = fontSize;

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
   * Acquire lock on transform start
   */
  const handleTransformStart = useCallback(async () => {
    if (onActivity) onActivity();
    
    const locked = await onAcquireLock(shape.id);
    if (!locked) {
      return false;
    }
  }, [shape.id, onAcquireLock, onActivity]);

  /**
   * Handle transform end (resize fontSize and width, rotation)
   * 
   * Figma-style behavior:
   * - Corner anchors: Scale BOTH fontSize and width proportionally (uniform scaling)
   * - Side anchors (middle-left/right): Scale ONLY width, keep fontSize constant
   * 
   * Konva best practice:
   * - Apply new fontSize and width to text node BEFORE resetting group scale
   * - This prevents visual "snap back" to original size
   */
  const handleTransformEnd = useCallback(async () => {
    const group = groupRef.current;
    const text = textRef.current;
    if (!group || !text) return;

    // Get the scale from the Group (which has the transformer attached)
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();

    // Determine if this is a corner resize or side resize
    // Corner resize: both scaleX and scaleY change significantly
    // Side resize: only scaleX changes (scaleY ~= 1)
    const isCornerResize = Math.abs(scaleY - 1) > 0.01;
    
    let newFontSize = fontSize;
    let newWidth = shape.width || 200; // Default width if not set

    if (isCornerResize) {
      // Corner resize: Scale both fontSize and width (uniform scaling)
      newFontSize = Math.max(8, fontSize * scaleY);
      newWidth = Math.max(20, newWidth * scaleX);
    } else {
      // Side resize: Only scale width, keep fontSize constant
      newWidth = Math.max(20, newWidth * scaleX);
      // fontSize stays the same
    }

    // Apply new dimensions to text node BEFORE resetting scale (prevents snap-back)
    text.fontSize(Math.round(newFontSize));
    text.width(newWidth);

    // Now reset the group scale
    group.scaleX(1);
    group.scaleY(1);

    try {
      await onUpdate(shape.id, {
        x: group.x(),
        y: group.y(),
        width: newWidth,
        rotation: group.rotation(),
        type_properties: {
          ...shape.type_properties,
          font_size: Math.round(newFontSize),
        }
      });
    } catch (error) {
      console.error('Failed to update text transform:', error);
    } finally {
      // Release lock after transform
      await onReleaseLock(shape.id);
    }
  }, [shape.id, fontSize, shape.width, shape.type_properties, onUpdate, onReleaseLock]);

  /**
   * Start editing on double-click
   */
  const handleDoubleClick = useCallback(async () => {
    if (isLockedByOther) return;
    
    if (onActivity) onActivity();
    
    // Acquire lock for editing
    const locked = await onAcquireLock(shape.id);
    if (!locked) return;
    
    setEditValue(textContent);
    setIsEditing(true);
  }, [shape.id, textContent, isLockedByOther, onAcquireLock, onActivity]);

  /**
   * Save edited text
   */
  const handleFinishEdit = useCallback(async () => {
    setIsEditing(false);
    
    if (editValue !== textContent) {
      await onUpdate(shape.id, { 
        type_properties: {
          ...shape.type_properties,
          text_content: editValue,
        }
      });
    }
    
    await onReleaseLock(shape.id);
  }, [shape.id, textContent, editValue, shape.type_properties, onUpdate, onReleaseLock]);

  /**
   * Cancel editing without saving
   */
  const handleCancelEdit = useCallback(async () => {
    setIsEditing(false);
    setEditValue(textContent);
    await onReleaseLock(shape.id);
  }, [shape.id, textContent, onReleaseLock]);

  return (
    <Group
      ref={groupRef}
      x={shape.x}
      y={shape.y}
      rotation={shape.rotation || 0}
      draggable={!isLockedByOther && !isEditing}
      dragBoundFunc={handleDragBound}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onTransformStart={handleTransformStart}
      onTransformEnd={handleTransformEnd}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
      id={shape.id}
    >
      <KonvaText
        ref={textRef}
        text={textContent}
        fontSize={fontSize}
        fontFamily={fontFamily}
        fontStyle={fontWeight === 'bold' ? 'bold' : fontStyle}
        align={textAlign}
        fill={shape.fill}
        width={shape.width}
        visible={!isEditing}
        // Visual feedback for locked state
        stroke={isLockedByOther ? '#EF4444' : isLockedByMe ? '#10B981' : undefined}
        strokeWidth={isLockedByOther || isLockedByMe ? 2 : 0}
        opacity={isLockedByOther ? 0.7 : shape.opacity}
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
              minHeight: `${fontSize / scale}px`,
              fontSize: `${fontSize / scale}px`,
              fontFamily: fontFamily,
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
    prevProps.shape.type_properties.text_content === nextProps.shape.type_properties.text_content &&
    prevProps.shape.type_properties.font_size === nextProps.shape.type_properties.font_size &&
    prevProps.shape.type_properties.font_family === nextProps.shape.type_properties.font_family &&
    prevProps.shape.fill === nextProps.shape.fill &&
    prevProps.shape.width === nextProps.shape.width &&
    prevProps.shape.rotation === nextProps.shape.rotation &&
    prevProps.shape.opacity === nextProps.shape.opacity &&
    prevProps.shape.locked_by === nextProps.shape.locked_by &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.scale === nextProps.scale &&
    prevProps.stagePosition.x === nextProps.stagePosition.x &&
    prevProps.stagePosition.y === nextProps.stagePosition.y
  );
};

export const Text = memo(TextComponent, areEqual);
