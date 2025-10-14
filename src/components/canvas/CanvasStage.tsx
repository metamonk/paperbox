/**
 * Konva-based canvas stage component
 * Handles rendering, pan, zoom, shape rendering, and transformation
 */

import { useState, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../lib/constants';
import type { CanvasObject } from '../../types/canvas';
import { Rectangle } from './shapes/Rectangle';
import { Circle } from './shapes/Circle';
import { Text } from './shapes/Text';

interface CanvasStageProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  transformerRef: React.RefObject<Konva.Transformer | null>;
  scale: number;
  position: { x: number; y: number };
  shapes: CanvasObject[];
  selectedShapeId: string | null;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onUpdateShape: (id: string, updates: Partial<CanvasObject>) => void;
  onSelectShape: (id: string | null) => void;
  onDeselectShape: () => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
  onActivity?: () => void;
}

export function CanvasStage({
  stageRef,
  transformerRef,
  scale,
  position,
  shapes,
  selectedShapeId,
  onWheel,
  onDragEnd,
  onUpdateShape,
  onSelectShape,
  onDeselectShape,
  onAcquireLock,
  onReleaseLock,
  onActivity,
}: CanvasStageProps) {
  // Track window dimensions for responsive canvas
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Update transformer when selection changes
   */
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    
    if (!transformer || !stage) return;

    if (selectedShapeId) {
      // Find the selected node
      const selectedNode = stage.findOne(`#${selectedShapeId}`);
      if (selectedNode) {
        transformer.nodes([selectedNode]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      // Clear selection
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedShapeId, transformerRef, stageRef]);

  /**
   * Check if click is on stage background (not on a shape)
   * Deselect shapes and allow stage dragging
   */
  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Check if we clicked on stage or background
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      // Clicked on empty area, deselect shape
      onDeselectShape();
    } else {
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
        return (
          <Rectangle 
            key={shape.id} 
            shape={shape}
            isSelected={shape.id === selectedShapeId}
            onSelect={() => onSelectShape(shape.id)}
            onUpdate={onUpdateShape}
            onAcquireLock={onAcquireLock}
            onReleaseLock={onReleaseLock}
            onActivity={onActivity}
          />
        );
      case 'circle':
        return (
          <Circle 
            key={shape.id} 
            shape={shape}
            isSelected={shape.id === selectedShapeId}
            onSelect={() => onSelectShape(shape.id)}
            onUpdate={onUpdateShape}
            onAcquireLock={onAcquireLock}
            onReleaseLock={onReleaseLock}
            onActivity={onActivity}
          />
        );
      case 'text':
        return (
          <Text 
            key={shape.id} 
            shape={shape}
            isSelected={shape.id === selectedShapeId}
            onSelect={() => onSelectShape(shape.id)}
            onUpdate={onUpdateShape}
            onAcquireLock={onAcquireLock}
            onReleaseLock={onReleaseLock}
            onActivity={onActivity}
            scale={scale}
            stagePosition={position}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Stage
      ref={stageRef}
      width={dimensions.width}
      height={dimensions.height}
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
        
        {/* Transformer for resize/rotate */}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}

