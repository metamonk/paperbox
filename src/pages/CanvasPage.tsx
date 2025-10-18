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
  const isSettingActiveCanvas = useRef(false);

  const canvases = usePaperboxStore((state) => state.canvases);
  const canvasesLoading = usePaperboxStore((state) => state.canvasesLoading);
  const setActiveCanvas = usePaperboxStore((state) => state.setActiveCanvas);

  /**
   * W5.D4: URL-Canvas State Synchronization (SINGLE SOURCE OF TRUTH: URL)
   *
   * Strategy: URL is the source of truth, store follows URL
   * This prevents circular updates between URL and store
   *
   * Scenarios:
   * 1. /canvas (no ID) → Redirect to /canvas/:activeCanvasId or /canvas/:firstCanvasId
   * 2. /canvas/:canvasId (valid ID) → Set as active canvas in store (if different)
   * 3. /canvas/:canvasId (invalid ID) → Redirect to /canvas/:activeCanvasId or first canvas
   */
  useEffect(() => {
    console.log('[CanvasPage] useEffect fired:', {
      canvasId,
      canvasesCount: canvases.length,
      canvasesLoading,
    });

    // Wait for canvases to load
    if (canvasesLoading || canvases.length === 0) {
      console.log('[CanvasPage] Waiting for canvases to load...');
      return;
    }

    // Scenario 1: No canvasId in URL → Redirect to first canvas
    if (!canvasId) {
      const firstCanvas = canvases[0];
      console.log('[CanvasPage] No canvasId in URL, redirecting to:', firstCanvas.id);
      navigate(`/canvas/${firstCanvas.id}`, { replace: true });
      return;
    }

    // Scenario 2: Invalid canvasId in URL → Redirect to first canvas
    const canvasExists = canvases.some((c: CanvasType) => c.id === canvasId);
    if (!canvasExists) {
      const firstCanvas = canvases[0];
      console.log('[CanvasPage] Invalid canvasId in URL, redirecting to:', firstCanvas.id);
      navigate(`/canvas/${firstCanvas.id}`, { replace: true });
      return;
    }

    // Scenario 3: Valid canvasId in URL → Sync store to match URL
    // IMPORTANT: Only run once per canvasId change (don't depend on activeCanvasId)
    if (!isSettingActiveCanvas.current) {
      console.log('[CanvasPage] Syncing store to match URL:', canvasId);
      isSettingActiveCanvas.current = true;

      setActiveCanvas(canvasId).finally(() => {
        // Reset flag after setActiveCanvas completes
        isSettingActiveCanvas.current = false;
      });
    }
  }, [canvasId, canvases, canvasesLoading, navigate, setActiveCanvas]); // REMOVED activeCanvasId

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

