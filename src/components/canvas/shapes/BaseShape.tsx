/**
 * BaseShape - Universal shape component with render props pattern
 * Handles ALL common behavior for shapes (DRY principle):
 * - Selection logic
 * - Object locking (acquire/release)
 * - Dragging with boundary constraints
 * - Transform (resize/rotate) callbacks
 * - Activity tracking for presence
 * - Error recovery on failed updates
 * - Visual feedback for lock state
 * 
 * Child components only need to render their specific Konva shape
 * and pass geometry-specific properties.
 */

import { useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import Konva from 'konva';
import { useAuth } from '../../../hooks/useAuth';
import type { CanvasObject } from '../../../types/canvas';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../lib/constants';

/**
 * Props passed to the BaseShape component
 */
export interface BaseShapeProps<T extends CanvasObject> {
  shape: T;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<T>) => void;
  onAcquireLock: (id: string) => Promise<boolean>;
  onReleaseLock: (id: string) => Promise<void>;
  onActivity?: () => void;
  children: (props: ShapeRenderProps<T>) => ReactNode;
}

/**
 * Props passed to child render function
 */
export interface ShapeRenderProps<T extends CanvasObject> {
  shape: T;
  shapeRef: React.RefObject<Konva.Node | null>;
  isLockedByOther: boolean;
  isLockedByMe: boolean;
  
  /**
   * Common Konva props to spread onto shape component
   * Includes all event handlers and visual feedback
   */
  commonProps: {
    id: string;
    x: number;
    y: number;
    rotation: number;
    draggable: boolean;
    onClick: () => void;
    onTap: () => void;
    onDragStart: () => Promise<void>;
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => Promise<void>;
    onTransformEnd: () => Promise<void>;
    dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number };
    
    // Visual feedback for lock state
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    
    // Performance optimizations
    perfectDrawEnabled: boolean;
    shadowForStrokeEnabled: boolean;
  };
}

/**
 * BaseShape component with render props pattern
 */
export function BaseShape<T extends CanvasObject>({
  shape,
  isSelected: _isSelected, // eslint-disable-line @typescript-eslint/no-unused-vars -- Used by parent for Transformer
  onSelect,
  onUpdate,
  onAcquireLock,
  onReleaseLock,
  onActivity,
  children
}: BaseShapeProps<T>) {
  const { user } = useAuth();
  const shapeRef = useRef<Konva.Node>(null);
  
  // Determine lock state
  const isLockedByOther = Boolean(shape.locked_by && shape.locked_by !== user?.id);
  const isLockedByMe = shape.locked_by === user?.id;

  /**
   * Constrain dragging to canvas boundaries
   * Calculates bounds based on shape dimensions
   */
  const handleDragBound = useCallback((pos: { x: number; y: number }) => {
    const node = shapeRef.current;
    if (!node) return pos;

    // Get bounding box accounting for rotation
    const box = node.getClientRect({ skipTransform: false, skipShadow: true, skipStroke: true });
    
    return {
      x: Math.max(0, Math.min(pos.x, CANVAS_WIDTH - box.width)),
      y: Math.max(0, Math.min(pos.y, CANVAS_HEIGHT - box.height)),
    };
  }, []);

  /**
   * Acquire lock when starting to drag
   * Also updates activity for presence tracking
   */
  const handleDragStart = useCallback(async () => {
    onActivity?.();
    await onAcquireLock(shape.id);
    // Note: Lock acquisition failure is handled by the lock system
    // The object will show as locked if acquisition fails
  }, [shape.id, onAcquireLock, onActivity]);

  /**
   * Update position and release lock on drag end
   * Includes error recovery to revert position on failed update
   */
  const handleDragEnd = useCallback(async (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const newPos = { x: node.x(), y: node.y() };
    const originalPos = { x: shape.x, y: shape.y };
    
    try {
      // Update position in database
      await onUpdate(shape.id, newPos as Partial<T>);
    } catch (error) {
      // Revert position on failure
      console.error('Failed to update shape position:', error);
      node.position(originalPos);
    } finally {
      // Always release lock
      await onReleaseLock(shape.id);
    }
  }, [shape.id, shape.x, shape.y, onUpdate, onReleaseLock]);

  /**
   * Handle transform end (resize/rotate)
   * 
   * Konva best practice:
   * 1. Calculate new dimensions from scale
   * 2. Apply new dimensions to node BEFORE resetting scale
   * 3. Reset scale to 1
   * 4. Sync to database
   * 
   * This prevents visual "snap back" to original size
   */
  const handleTransformEnd = useCallback(async () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Calculate new dimensions
    const newWidth = Math.max(5, node.width() * scaleX);
    const newHeight = Math.max(5, node.height() * scaleY);

    // Apply new dimensions to node BEFORE resetting scale (prevents snap-back)
    node.width(newWidth);
    node.height(newHeight);

    // Now reset scale
    node.scaleX(1);
    node.scaleY(1);

    try {
      await onUpdate(shape.id, {
        x: node.x(),
        y: node.y(),
        width: newWidth,
        height: newHeight,
        rotation: node.rotation(),
      } as Partial<T>);
    } catch (error) {
      console.error('Failed to update shape transform:', error);
      // Could revert transform here, but keeping new state for better UX
    }
  }, [shape.id, onUpdate]);

  /**
   * Common Konva props for all shapes
   */
  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    rotation: shape.rotation || 0,
    draggable: !isLockedByOther,
    onClick: onSelect,
    onTap: onSelect,
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
    dragBoundFunc: handleDragBound,
    
    // Visual feedback for lock state
    stroke: isLockedByOther ? '#EF4444' : isLockedByMe ? '#10B981' : undefined,
    strokeWidth: isLockedByOther || isLockedByMe ? 3 : 0,
    opacity: isLockedByOther ? 0.7 : shape.opacity,
    
    // Performance optimizations
    perfectDrawEnabled: false,
    shadowForStrokeEnabled: false,
  };

  return <>{children({ shape, shapeRef, isLockedByOther, isLockedByMe, commonProps })}</>;
}

