/**
 * Main canvas component
 * Provides layout and integrates CanvasStage with Toolbar and other UI elements
 */

import { useCanvas } from '../../hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { Toolbar } from './Toolbar';

export function Canvas() {
  const {
    stageRef,
    scale,
    position,
    shapes,
    handleWheel,
    handleDragEnd,
    addShape,
    updateShape,
  } = useCanvas();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">
      <Toolbar onAddShape={addShape} />
      <CanvasStage
        stageRef={stageRef}
        scale={scale}
        position={position}
        shapes={shapes}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onUpdateShape={updateShape}
      />
    </div>
  );
}

