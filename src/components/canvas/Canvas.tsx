/**
 * Main canvas component
 * Provides layout and integrates CanvasStage with other UI elements
 */

import { useCanvas } from '../../hooks/useCanvas';
import { CanvasStage } from './CanvasStage';

export function Canvas() {
  const { stageRef, scale, position, handleWheel, handleDragEnd } = useCanvas();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">
      <CanvasStage
        stageRef={stageRef}
        scale={scale}
        position={position}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
      />
    </div>
  );
}

