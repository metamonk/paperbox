/**
 * Canvas state management hook
 * Handles zoom, pan, canvas transformations, and shape management
 */

import { useState, useRef, useCallback } from 'react';
import Konva from 'konva';
import { DEFAULT_ZOOM, ZOOM_SPEED, SHAPE_DEFAULTS } from '../lib/constants';
import { clampZoom, getViewportCenter } from '../utils/canvas-helpers';
import { CanvasObject, ShapeType } from '../types/canvas';

export function useCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScaleState] = useState(DEFAULT_ZOOM);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [shapes, setShapes] = useState<CanvasObject[]>([]);

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

  /**
   * Add a new shape at the viewport center
   */
  const addShape = useCallback(
    (type: ShapeType) => {
      const stage = stageRef.current;
      
      // Get viewport center for new shape position
      // If no stage (during tests), use canvas center
      const center = stage 
        ? getViewportCenter(stage)
        : { x: 2500, y: 2500 }; // Center of 5000x5000 canvas

      // Generate unique ID (in PR #6 this will come from database)
      const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create shape object based on type
      let newShape: CanvasObject;

      const now = new Date().toISOString();
      const userId = 'local-user'; // Will be replaced with actual user ID in PR #6

      switch (type) {
        case 'rectangle':
          newShape = {
            id,
            type: 'rectangle',
            x: center.x - SHAPE_DEFAULTS.rectangle.width / 2,
            y: center.y - SHAPE_DEFAULTS.rectangle.height / 2,
            width: SHAPE_DEFAULTS.rectangle.width,
            height: SHAPE_DEFAULTS.rectangle.height,
            fill: SHAPE_DEFAULTS.rectangle.fill,
            created_by: userId,
            created_at: now,
            updated_at: now,
            locked_by: null,
            lock_acquired_at: null,
          };
          break;

        case 'circle':
          newShape = {
            id,
            type: 'circle',
            x: center.x,
            y: center.y,
            radius: SHAPE_DEFAULTS.circle.radius,
            fill: SHAPE_DEFAULTS.circle.fill,
            created_by: userId,
            created_at: now,
            updated_at: now,
            locked_by: null,
            lock_acquired_at: null,
          };
          break;

        case 'text':
          newShape = {
            id,
            type: 'text',
            x: center.x,
            y: center.y,
            text_content: SHAPE_DEFAULTS.text.textContent,
            font_size: SHAPE_DEFAULTS.text.fontSize,
            fill: SHAPE_DEFAULTS.text.fill,
            created_by: userId,
            created_at: now,
            updated_at: now,
            locked_by: null,
            lock_acquired_at: null,
          };
          break;
      }

      setShapes((prev) => [...prev, newShape]);
    },
    []
  );

  /**
   * Update an existing shape
   */
  const updateShape = useCallback((id: string, updates: Partial<CanvasObject>) => {
    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === id
          ? { ...shape, ...updates, updated_at: new Date().toISOString() }
          : shape
      )
    );
  }, []);

  return {
    stageRef,
    scale,
    position,
    shapes,
    setScale,
    setPosition,
    handleWheel,
    handleDragEnd,
    addShape,
    updateShape,
  };
}

