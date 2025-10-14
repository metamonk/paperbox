/**
 * Canvas state management hook
 * Handles zoom, pan, canvas transformations, and shape management
 */

import { useState, useRef, useCallback } from 'react';
import Konva from 'konva';
import { DEFAULT_ZOOM, ZOOM_SPEED, SHAPE_DEFAULTS } from '../lib/constants';
import { clampZoom, getViewportCenter } from '../utils/canvas-helpers';
import { useRealtimeObjects } from './useRealtimeObjects';
import type { CanvasObject, ShapeType } from '../types/canvas';

export function useCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScaleState] = useState(DEFAULT_ZOOM);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Use realtime objects instead of local state
  const { 
    objects: shapes, 
    loading, 
    error,
    createObject, 
    updateObject,
    acquireLock,
    releaseLock 
  } = useRealtimeObjects();

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
   * Only update position if the stage itself was dragged, not a shape
   */
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    // Check if the drag target is the stage itself (not a shape)
    const target = e.target;
    const stage = target.getStage();
    
    if (target === stage) {
      // Only update position if we dragged the stage background
      setPosition({
        x: stage.x(),
        y: stage.y(),
      });
    }
  }, []);

  /**
   * Add a new shape at the viewport center
   */
  const addShape = useCallback(
    async (type: ShapeType) => {
      const stage = stageRef.current;
      
      // Get viewport center for new shape position
      // If no stage (during tests), use canvas center
      const center = stage 
        ? getViewportCenter(stage)
        : { x: 2500, y: 2500 }; // Center of 5000x5000 canvas

      // Create shape object based on type
      let newShape: Partial<CanvasObject>;

      switch (type) {
        case 'rectangle':
          newShape = {
            type: 'rectangle',
            x: center.x - SHAPE_DEFAULTS.rectangle.width / 2,
            y: center.y - SHAPE_DEFAULTS.rectangle.height / 2,
            width: SHAPE_DEFAULTS.rectangle.width,
            height: SHAPE_DEFAULTS.rectangle.height,
            fill: SHAPE_DEFAULTS.rectangle.fill,
          };
          break;

        case 'circle':
          newShape = {
            type: 'circle',
            x: center.x,
            y: center.y,
            radius: SHAPE_DEFAULTS.circle.radius,
            fill: SHAPE_DEFAULTS.circle.fill,
          };
          break;

        case 'text':
          newShape = {
            type: 'text',
            x: center.x,
            y: center.y,
            text_content: SHAPE_DEFAULTS.text.textContent,
            font_size: SHAPE_DEFAULTS.text.fontSize,
            fill: SHAPE_DEFAULTS.text.fill,
          };
          break;
      }

      // Create object in database (will sync via realtime)
      await createObject(newShape);
    },
    [createObject]
  );

  /**
   * Update an existing shape
   */
  const updateShape = useCallback((id: string, updates: Partial<CanvasObject>) => {
    // Update in database (will sync via realtime)
    updateObject(id, updates);
  }, [updateObject]);

  return {
    stageRef,
    scale,
    position,
    shapes,
    loading,
    error,
    setScale,
    setPosition,
    handleWheel,
    handleDragEnd,
    addShape,
    updateShape,
    acquireLock,
    releaseLock,
  };
}

