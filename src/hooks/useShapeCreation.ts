/**
 * Shape Creation Hook
 * W2.D9: Extracted from Canvas.tsx for better separation of concerns
 *
 * Encapsulates logic for creating new canvas shapes (rectangles, circles, text)
 * and delegating to FabricCanvasManager for rendering.
 */

import { useCallback } from 'react';
import type { FabricCanvasManager } from '../lib/fabric/FabricCanvasManager';
import type { User } from '@supabase/supabase-js';

export interface UseShapeCreationOptions {
  fabricManager: FabricCanvasManager | null;
  user: User | null;
}

/**
 * Custom hook for creating shapes on the canvas
 *
 * @param options - Configuration including fabricManager and user
 * @returns handleAddShape callback for shape creation
 */
export function useShapeCreation({ fabricManager, user }: UseShapeCreationOptions) {
  /**
   * Handle shape creation requests
   * Creates shapes at viewport center with type-specific properties
   */
  const handleAddShape = useCallback(
    (type: 'rectangle' | 'circle' | 'text') => {
      console.log('[useShapeCreation] handleAddShape called with type:', type);
      console.log('[useShapeCreation] fabricManager:', fabricManager);
      console.log('[useShapeCreation] user:', user);

      if (!fabricManager || !user) {
        console.log('[useShapeCreation] Early return - fabricManager or user is null');
        return;
      }

      // Calculate center position for new shape
      const centerX = (window.innerWidth / 2) - 100;
      const centerY = (window.innerHeight / 2) - 75;

      // Build type-specific properties
      let typeProperties: Record<string, any> = {};
      let width = 200;
      let height = 150;

      if (type === 'circle') {
        // Circle requires radius in type_properties
        const radius = 75;
        typeProperties = { radius };
        width = radius * 2;
        height = radius * 2;
      } else if (type === 'text') {
        // Text requires text_content and font_size
        typeProperties = {
          text_content: 'New Text',
          font_size: 16
        };
        width = 200;
        height = 50;
      } else if (type === 'rectangle') {
        // Rectangle has optional corner_radius
        typeProperties = { corner_radius: 0 };
        width = 200;
        height = 150;
      }

      // Build base canvas object matching database schema
      const baseObject = {
        id: `${type}-${Date.now()}-${Math.random()}`,
        type,
        x: centerX,
        y: centerY,
        width,
        height,
        rotation: 0,
        opacity: 1,
        fill: type === 'rectangle' ? '#3B82F6' : type === 'circle' ? '#10B981' : '#EF4444',
        stroke: null,
        stroke_width: null,
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

      console.log('[useShapeCreation] Calling fabricManager.addObject with:', baseObject);

      // Add to Fabric canvas
      // CanvasSyncManager will sync to Zustand → SyncManager syncs to Supabase
      fabricManager.addObject(baseObject as any);

      console.log('[useShapeCreation] addObject call completed');
    },
    [fabricManager, user]
  );

  return { handleAddShape };
}
