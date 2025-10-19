/**
 * Shape Creation Hook
 * W2.D9: Extracted from Canvas.tsx for better separation of concerns
 * W2.D12: Refactored to use Figma-style click-to-place pattern
 *
 * Encapsulates logic for creating new canvas shapes (rectangles, circles, text)
 * and delegating to FabricCanvasManager for rendering.
 */

import { useCallback } from 'react';
import type { FabricCanvasManager } from '../lib/fabric/FabricCanvasManager';
import type { User } from '@supabase/supabase-js';
import { usePaperboxStore } from '../stores';
import { GRID_SIZE, GRID_ENABLED } from '../lib/constants';

export interface UseShapeCreationOptions {
  fabricManager: FabricCanvasManager | null;
  user: User | null;
}

/**
 * Custom hook for creating shapes on the canvas
 *
 * @param options - Configuration including fabricManager and user
 * @returns handleAddShape callback for triggering placement mode
 */
export function useShapeCreation({ fabricManager, user }: UseShapeCreationOptions) {
  // Access placement mode actions from toolsSlice
  const enterPlacementMode = usePaperboxStore((state) => state.enterPlacementMode);
  const exitPlacementMode = usePaperboxStore((state) => state.exitPlacementMode);
  const resetToSelectTool = usePaperboxStore((state) => state.resetToSelectTool);
  // Access canvas store action for creating objects (syncs to database)
  const createObject = usePaperboxStore((state) => state.createObject);

  /**
   * W2.D12: Trigger placement mode for shape creation (Figma pattern)
   *
   * Instead of creating shapes immediately with hardcoded window coordinates,
   * we now enter placement mode and wait for user to click canvas.
   */
  const handleAddShape = useCallback(
    (type: 'rectangle' | 'circle' | 'text') => {
      console.log('[useShapeCreation] handleAddShape - entering placement mode for:', type);

      // Define default sizes for each shape type
      const defaultSizes = {
        rectangle: { width: 200, height: 150 },
        circle: { width: 150, height: 150 },
        text: { width: 200, height: 50 },
      };

      // Enter placement mode - user will click canvas to place object
      enterPlacementMode({
        type,
        defaultSize: defaultSizes[type],
      });
    },
    [enterPlacementMode]
  );

  /**
   * W2.D12: Create object at specified canvas position
   *
   * Called when user clicks canvas during placement mode.
   * Uses real canvas coordinates (not window coordinates).
   *
   * @param type - Shape type to create
   * @param x - Canvas X coordinate (accounts for zoom/pan)
   * @param y - Canvas Y coordinate (accounts for zoom/pan)
   * @param width - Shape width
   * @param height - Shape height
   */
  const createObjectAtPosition = useCallback(
    (type: 'rectangle' | 'circle' | 'text', x: number, y: number, width: number, height: number) => {
      console.log('[useShapeCreation] createObjectAtPosition CALLED:', { 
        type, 
        x, 
        y, 
        width, 
        height,
        fabricManager: !!fabricManager,
        user: !!user 
      });

      // SNAP-TO-GRID: Apply grid snapping to placement coordinates
      if (GRID_ENABLED) {
        const originalX = x;
        const originalY = y;
        x = Math.round(x / GRID_SIZE) * GRID_SIZE;
        y = Math.round(y / GRID_SIZE) * GRID_SIZE;
        console.log('[useShapeCreation] Grid snapping applied:', { originalX, originalY, snappedX: x, snappedY: y });
      }

      if (!fabricManager || !user) {
        console.error('[useShapeCreation] Cannot create object - fabricManager or user is null', { fabricManager: !!fabricManager, user: !!user });
        return;
      }

      // Build type-specific properties
      let typeProperties: Record<string, any> = {};

      if (type === 'circle') {
        typeProperties = { radius: width / 2 };
      } else if (type === 'text') {
        typeProperties = {
          text_content: 'Double click to edit',
          font_size: 16,
        };
      } else if (type === 'rectangle') {
        typeProperties = { corner_radius: 0 };
      }

      // Build canvas object at clicked position
      const baseObject = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        x,
        y,
        width,
        height,
        rotation: 0,
        opacity: 1,
        fill: type === 'rectangle' ? '#3B82F6' : type === 'circle' ? '#10B981' : '#EF4444',
        stroke: '#000000', // W4.D1 FIX: Add black stroke for visibility
        stroke_width: 2, // W4.D1 FIX: Add stroke width for visibility
        group_id: null,
        z_index: 1,
        style_properties: {},
        metadata: {},
        locked_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id,
        lock_acquired_at: null,
        type_properties: typeProperties,
      };

      console.log('[useShapeCreation] Creating object at canvas position:', baseObject);
      console.log('[useShapeCreation] Canvas dimensions:', {
        width: fabricManager.getCanvas()?.width,
        height: fabricManager.getCanvas()?.height,
      });
      console.log('[useShapeCreation] Object will be at:', { x, y, width, height });

      // W4.D2 FIX: Use createObject() to trigger full sync pipeline
      // This will: Zustand → SyncManager → Supabase → CanvasSyncManager → Fabric.js
      // Instead of directly calling fabricManager.addObject() which bypasses sync
      createObject(baseObject as any, user.id)
        .then(() => {
          console.log('[useShapeCreation] Object created and synced to database');

          // Exit placement mode and return to select tool
          exitPlacementMode();
          resetToSelectTool();

          console.log('[useShapeCreation] Placement mode exited');
        })
        .catch((error) => {
          console.error('[useShapeCreation] Failed to create object:', error);
          // Still exit placement mode on error
          exitPlacementMode();
          resetToSelectTool();
        });
    },
    [fabricManager, user, createObject, exitPlacementMode, resetToSelectTool]
  );

  return { handleAddShape, createObjectAtPosition };
}
