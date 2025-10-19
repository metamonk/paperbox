/**
 * useCollaborativeOverlays Hook
 *
 * Automatically updates collaborative overlays (lock/selection indicators)
 * when presence or selection state changes.
 *
 * Usage:
 *   const fabricManager = useFabricManager();
 *   useCollaborativeOverlays(fabricManager);
 *
 * The hook subscribes to:
 * - Presence data (who's online, what they're editing/viewing)
 * - Current user ID (to skip own overlays)
 *
 * And automatically updates visual indicators on the canvas.
 */

import { useEffect } from 'react';
import { usePaperboxStore } from '../stores';
import type { FabricCanvasManager } from '../lib/fabric/FabricCanvasManager';

/**
 * Hook to manage collaborative overlays (lock and selection indicators)
 *
 * @param fabricManager - FabricCanvasManager instance
 */
export function useCollaborativeOverlays(fabricManager: FabricCanvasManager | null): void {
  const presence = usePaperboxStore((state) => state.presence);
  const currentUserId = usePaperboxStore((state) => state.currentUserId);

  useEffect(() => {
    if (!fabricManager || !currentUserId) {
      return;
    }

    // Update overlays whenever presence data changes
    fabricManager.updateCollaborativeOverlays(presence, currentUserId);
  }, [fabricManager, presence, currentUserId]);

  // Cleanup overlays on unmount
  useEffect(() => {
    return () => {
      if (fabricManager) {
        fabricManager.updateCollaborativeOverlays({}, '');
      }
    };
  }, [fabricManager]);
}

