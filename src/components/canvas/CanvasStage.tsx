/**
 * Konva-based canvas stage component
 * Handles rendering, pan, and zoom
 */

import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../lib/constants';

interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage>;
  scale: number;
  position: { x: number; y: number };
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

export function CanvasStage({
  stageRef,
  scale,
  position,
  onWheel,
  onDragEnd,
}: CanvasStageProps) {
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

      {/* Objects layer - will be populated in PR #5 */}
      <Layer>
        {/* Shapes will be rendered here */}
      </Layer>
    </Stage>
  );
}

