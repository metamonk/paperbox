/**
 * Canvas page
 * Main collaborative canvas workspace
 * Protected route - requires authentication
 * W5.D4: URL-based canvas routing with /canvas/:canvasId pattern
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePaperboxStore } from '../stores';
import { Canvas } from '../components/canvas/Canvas';
import type { Canvas as CanvasType } from '../types/canvas';

export function CanvasPage() {
  const { canvasId } = useParams<{ canvasId?: string }>();
  const navigate = useNavigate();

  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const canvases = usePaperboxStore((state) => state.canvases);
  const canvasesLoading = usePaperboxStore((state) => state.canvasesLoading);
  const setActiveCanvas = usePaperboxStore((state) => state.setActiveCanvas);

  /**
   * W5.D4: URL-Canvas State Synchronization
   *
   * Scenarios:
   * 1. /canvas (no ID) → Redirect to /canvas/:activeCanvasId or /canvas/:firstCanvasId
   * 2. /canvas/:canvasId (valid ID) → Set as active canvas in store
   * 3. /canvas/:canvasId (invalid ID) → Redirect to /canvas/:activeCanvasId or first canvas
   * 4. Store activeCanvasId changes → Update URL to match
   */
  useEffect(() => {
    // Wait for canvases to load
    if (canvasesLoading || canvases.length === 0) {
      return;
    }

    // Scenario 1: No canvasId in URL → Redirect to active or first canvas
    if (!canvasId) {
      const targetCanvas = canvases.find((c: CanvasType) => c.id === activeCanvasId) || canvases[0];
      console.log('[CanvasPage] No canvasId in URL, redirecting to:', targetCanvas.id);
      navigate(`/canvas/${targetCanvas.id}`, { replace: true });
      return;
    }

    // Scenario 3: Invalid canvasId in URL → Redirect to active or first canvas
    const canvasExists = canvases.some((c: CanvasType) => c.id === canvasId);
    if (!canvasExists) {
      const targetCanvas = canvases.find((c: CanvasType) => c.id === activeCanvasId) || canvases[0];
      console.log('[CanvasPage] Invalid canvasId in URL, redirecting to:', targetCanvas.id);
      navigate(`/canvas/${targetCanvas.id}`, { replace: true });
      return;
    }

    // Scenario 2: Valid canvasId in URL → Sync with store if different
    if (canvasId !== activeCanvasId) {
      console.log('[CanvasPage] URL canvasId differs from store, updating store:', canvasId);
      setActiveCanvas(canvasId);
    }
  }, [canvasId, activeCanvasId, canvases, canvasesLoading, navigate, setActiveCanvas]);

  /**
   * Scenario 4: Store activeCanvasId changes → Update URL to match
   * This handles CanvasPicker selection and other programmatic canvas switches
   */
  useEffect(() => {
    if (canvasesLoading || !activeCanvasId) return;

    // If URL doesn't match store, update URL (unless we're already navigating)
    if (canvasId && canvasId !== activeCanvasId) {
      console.log('[CanvasPage] Store activeCanvasId changed, updating URL:', activeCanvasId);
      navigate(`/canvas/${activeCanvasId}`, { replace: true });
    }
  }, [activeCanvasId, canvasId, canvasesLoading, navigate]);

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

