/**
 * Canvas state management hook
 * Handles zoom, pan, canvas transformations, and shape management
 *
 * W1.D4: Updated to use Zustand store instead of useRealtimeObjects hook
 * Follows PRD's 5-layer architecture with middleware sync pattern
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Konva from 'konva';
import { DEFAULT_ZOOM, ZOOM_SPEED, SHAPE_DEFAULTS } from '../lib/constants';
import { clampZoom, getViewportCenter } from '../utils/canvas-helpers';
import { usePaperboxStore } from '../stores';
import { useAuth } from './useAuth';
import type { CanvasObject, ShapeType, ToolMode } from '../types/canvas';

export function useCanvas() {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [scale, setScaleState] = useState(DEFAULT_ZOOM);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isCommandPressed, setIsCommandPressed] = useState(false);

  // Get user for createObject calls and lock operations
  const { user } = useAuth();

  // Use Zustand store for canvas state (W1.D4 - PRD architecture)
  const objectsMap = usePaperboxStore((state) => state.objects);
  const loading = usePaperboxStore((state) => state.loading);
  const error = usePaperboxStore((state) => state.error);
  const createObjectAction = usePaperboxStore((state) => state.createObject);
  const updateObjectAction = usePaperboxStore((state) => state.updateObject);
  const deleteObjectsAction = usePaperboxStore((state) => state.deleteObjects);
  const acquireLockAction = usePaperboxStore((state) => state.acquireLock);
  const releaseLockAction = usePaperboxStore((state) => state.releaseLock);

  // Convert objects Record to array for rendering (memoized)
  const shapes = useMemo(() => Object.values(objectsMap), [objectsMap]);

  // Wrapper for acquireLock that provides userId and userName
  const acquireLock = useCallback(
    async (objectId: string): Promise<boolean> => {
      if (!user) return false;
      const userName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
      return acquireLockAction(objectId, user.id, userName);
    },
    [user, acquireLockAction]
  );

  // Wrapper for releaseLock to match expected signature
  const releaseLock = useCallback(
    async (objectId: string): Promise<void> => {
      releaseLockAction(objectId);
    },
    [releaseLockAction]
  );

  /**
   * Keyboard event handlers for tool switching and delete
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Space key for temporary hand tool
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      // Command (Mac) or Control (Windows/Linux) key
      if ((e.metaKey || e.ctrlKey) && !e.repeat) {
        setIsCommandPressed(true);
      }

      // Delete/Backspace key to delete selected shape
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeId) {
        e.preventDefault();
        deleteObjectsAction([selectedShapeId]);
        setSelectedShapeId(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpacePressed(false);
      }
      
      if (!e.metaKey && !e.ctrlKey) {
        setIsCommandPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedShapeId, deleteObjectsAction]);

  /**
   * Determine effective tool mode (considering modifiers)
   */
  const effectiveToolMode: ToolMode = isSpacePressed || isCommandPressed ? 'hand' : toolMode;

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
      if (!user?.id) {
        console.error('Cannot create shape: user not authenticated');
        return;
      }

      const stage = stageRef.current;

      // Get viewport center for new shape position
      // If no stage (during tests), use canvas center (0, 0 in center-origin coordinates)
      const center = stage
        ? getViewportCenter(stage)
        : { x: 0, y: 0 }; // Center in center-origin coordinate system

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
            type_properties: {}, // No type-specific properties for basic rectangle
          };
          break;

        case 'circle':
          newShape = {
            type: 'circle',
            x: center.x,
            y: center.y,
            width: SHAPE_DEFAULTS.circle.radius * 2, // Bounding box
            height: SHAPE_DEFAULTS.circle.radius * 2,
            fill: SHAPE_DEFAULTS.circle.fill,
            type_properties: {
              radius: SHAPE_DEFAULTS.circle.radius,
            },
          };
          break;

        case 'text':
          newShape = {
            type: 'text',
            x: center.x,
            y: center.y,
            width: 200, // Default text box width
            height: 50, // Default text box height
            fill: SHAPE_DEFAULTS.text.fill,
            type_properties: {
              text_content: SHAPE_DEFAULTS.text.textContent,
              font_size: SHAPE_DEFAULTS.text.fontSize,
            },
          };
          break;
      }

      // Create object via Zustand store (optimistic update + database write)
      await createObjectAction(newShape, user.id);
    },
    [createObjectAction, user?.id]
  );

  /**
   * Update an existing shape
   */
  const updateShape = useCallback(
    (id: string, updates: Partial<CanvasObject>) => {
      // Update via Zustand store (optimistic update + database write)
      updateObjectAction(id, updates);
    },
    [updateObjectAction]
  );

  /**
   * Select a shape for transformation
   */
  const selectShape = useCallback((shapeId: string | null) => {
    setSelectedShapeId(shapeId);
  }, []);

  /**
   * Deselect current shape
   */
  const deselectShape = useCallback(() => {
    setSelectedShapeId(null);
  }, []);

  /**
   * Delete the currently selected shape
   */
  const deleteSelected = useCallback(() => {
    if (selectedShapeId) {
      deleteObjectsAction([selectedShapeId]);
      setSelectedShapeId(null);
    }
  }, [selectedShapeId, deleteObjectsAction]);

  return {
    stageRef,
    transformerRef,
    scale,
    position,
    shapes,
    loading,
    error,
    selectedShapeId,
    toolMode,
    effectiveToolMode,
    setScale,
    setPosition,
    setToolMode,
    handleWheel,
    handleDragEnd,
    addShape,
    updateShape,
    selectShape,
    deselectShape,
    deleteSelected,
    acquireLock,
    releaseLock,
  };
}

