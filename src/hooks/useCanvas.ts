/**
 * Canvas state management hook
 * Handles zoom, pan, and canvas transformations
 */

import { useState, useRef, useCallback } from 'react';
import Konva from 'konva';
import { DEFAULT_ZOOM, ZOOM_SPEED } from '../lib/constants';
import { clampZoom } from '../utils/canvas-helpers';

export function useCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScaleState] = useState(DEFAULT_ZOOM);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  /**
   * Set zoom scale with clamping
   */
  const setScale = useCallback((newScale: number) => {
    setScaleState(clampZoom(newScale));
  }, []);

  /**
   * Handle mouse wheel zoom
   */
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stage.scaleX();
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Calculate new scale
      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      // Determine zoom direction
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = clampZoom(oldScale + direction * ZOOM_SPEED);

      // Update scale
      setScaleState(newScale);

      // Calculate new position to zoom toward mouse
      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setPosition(newPos);
    },
    []
  );

  /**
   * Handle stage drag end (pan)
   */
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target as Konva.Stage;
    setPosition({
      x: stage.x(),
      y: stage.y(),
    });
  }, []);

  return {
    stageRef,
    scale,
    position,
    setScale,
    setPosition,
    handleWheel,
    handleDragEnd,
  };
}

