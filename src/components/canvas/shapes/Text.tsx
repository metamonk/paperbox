/**
 * Text shape component
 * Draggable text with boundary constraints and editing capability
 */

import { useState, useRef, useEffect } from 'react';
import { Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import { TextObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

interface TextProps {
  shape: TextObject;
  onUpdate: (id: string, updates: Partial<TextObject>) => void;
}

export function Text({ shape, onUpdate }: TextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<Konva.Text>(null);

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
   * Update position in parent state on drag end
   */
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onUpdate(shape.id, {
      x: node.x(),
      y: node.y(),
    });
  };

  /**
   * Handle double-click to enter edit mode
   */
  const handleDoubleClick = () => {
    setIsEditing(true);
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
    }
  }, [isEditing, shape.id, shape.text_content, onUpdate]);

  return (
    <KonvaText
      ref={textRef}
      x={shape.x}
      y={shape.y}
      text={shape.text_content}
      fontSize={shape.font_size}
      fill={shape.fill}
      draggable={!isEditing}
      dragBoundFunc={handleDragBound}
      onDragEnd={handleDragEnd}
      onDblClick={handleDoubleClick}
      onDblTap={handleDoubleClick}
    />
  );
}

