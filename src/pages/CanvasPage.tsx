/**
 * Canvas page
 * Main collaborative canvas workspace
 * Protected route - requires authentication
 * W5.D4: URL-based canvas routing with /canvas/:canvasId pattern
 */

import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePaperboxStore } from '../stores';
import { Canvas } from '../components/canvas/Canvas';
import type { Canvas as CanvasType } from '../types/canvas';

export function CanvasPage() {
  const { canvasId } = useParams<{ canvasId?: string }>();
  const navigate = useNavigate();
  const lastSyncedCanvasId = useRef<string | null>(null);

  const canvasesLoading = usePaperboxStore((state) => state.canvasesLoading);

  /**
   * W5.D4: URL-Canvas State Synchronization
   *
   * Strategy: Only sync when URL (canvasId) or canvasesLoading changes
   * - Use getState() inside effect to avoid canvases array reference changes
   * - Track last synced canvas ID in ref to prevent duplicate syncs
   */
  useEffect(() => {
    // Don't do anything while canvases are loading
    if (canvasesLoading) return;

    // Get current state inside effect to avoid dependency on canvases array
    const { canvases, setActiveCanvas } = usePaperboxStore.getState();

    // Need at least one canvas
    if (canvases.length === 0) return;

    // No canvas ID in URL → redirect to first canvas
    if (!canvasId) {
      navigate(`/canvas/${canvases[0].id}`, { replace: true });
      return;
    }

    // Invalid canvas ID in URL → redirect to first canvas
    if (!canvases.some((c: CanvasType) => c.id === canvasId)) {
      navigate(`/canvas/${canvases[0].id}`, { replace: true });
      return;
    }

    // Valid canvas ID - sync to store if we haven't already
    if (canvasId !== lastSyncedCanvasId.current) {
      console.log('[CanvasPage] Syncing canvas from URL:', canvasId);
      lastSyncedCanvasId.current = canvasId;
      setActiveCanvas(canvasId);
    }
  }, [canvasId, canvasesLoading, navigate]); // REMOVED canvases and setActiveCanvas

  // Show loading state while canvases load
  if (canvasesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading canvas...</p>
        </div>
      </div>
    );
  }

  return <Canvas />;
}

