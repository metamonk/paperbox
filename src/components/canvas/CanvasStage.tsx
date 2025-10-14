/**
 * Konva-based canvas stage component
 * Handles rendering, pan, zoom, and shape rendering
 */

import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../lib/constants';
import { CanvasObject } from '../../types/canvas';
import { Rectangle } from './shapes/Rectangle';
import { Circle } from './shapes/Circle';
import { Text } from './shapes/Text';

interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage>;
  scale: number;
  position: { x: number; y: number };
  shapes: CanvasObject[];
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onUpdateShape: (id: string, updates: Partial<CanvasObject>) => void;
}

export function CanvasStage({
  stageRef,
  scale,
  position,
  shapes,
  onWheel,
  onDragEnd,
  onUpdateShape,
}: CanvasStageProps) {
  /**
   * Check if click is on stage background (not on a shape)
   * Only allow stage dragging if clicking on background
   */
  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if we clicked on stage or background
    const clickedOnEmpty = e.target === e.target.getStage();
    if (!clickedOnEmpty) {
      // Clicked on a shape, disable stage dragging
      if (stageRef.current) {
        stageRef.current.draggable(false);
      }
    }
  };

  /**
   * Re-enable stage dragging on mouse up
   */
  const handleMouseUp = () => {
    if (stageRef.current) {
      stageRef.current.draggable(true);
    }
  };

  /**
   * Render the appropriate shape component based on type
   */
  const renderShape = (shape: CanvasObject) => {
    switch (shape.type) {
      case 'rectangle':
        return <Rectangle key={shape.id} shape={shape} onUpdate={onUpdateShape} />;
      case 'circle':
        return <Circle key={shape.id} shape={shape} onUpdate={onUpdateShape} />;
      case 'text':
        return <Text key={shape.id} shape={shape} onUpdate={onUpdateShape} />;
      default:
        return null;
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth}
      height={window.innerHeight}
      draggable
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      onWheel={onWheel}
      onDragEnd={onDragEnd}
      onMouseDown={checkDeselect}
      onTouchStart={checkDeselect}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
    >
      {/* Background layer */}
      <Layer listening={false}>
        <Rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="#ffffff"
          stroke="#e5e7eb"
          strokeWidth={2}
        />
      </Layer>

      {/* Objects layer */}
      <Layer>
        {shapes.map((shape) => renderShape(shape))}
      </Layer>
    </Stage>
  );
}

