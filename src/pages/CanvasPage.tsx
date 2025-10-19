/**
 * Canvas page
 * Main collaborative canvas workspace
 * Protected route - requires authentication
 * W5.D4+W5.D5.2: URL-based canvas routing with /canvas/:canvasId pattern
 */

import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Canvas } from '../components/canvas/Canvas';
import { usePaperboxStore } from '../stores';

// Debug flag - set to true to enable verbose CanvasPage logs
const DEBUG = false;

/**
 * Canvas Page - Renders Canvas component and syncs URL params to store
 *
 * W5.D5.2: URL Navigation Sync Fix
 * URL as single source of truth for active canvas:
 * 1. Read canvasId from URL params
 * 2. Sync to Zustand activeCanvasId if different
 * 3. Handle invalid canvas IDs (404 or redirect to first canvas)
 *
 * This ensures copy-pasting canvas URLs navigates correctly.
 */
export function CanvasPage() {
  const { canvasId } = useParams<{ canvasId: string }>();
  const navigate = useNavigate();

  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const canvases = usePaperboxStore((state) => state.canvases);
  const canvasesLoading = usePaperboxStore((state) => state.canvasesLoading);
  const setActiveCanvas = usePaperboxStore((state) => state.setActiveCanvas);

  // W5.D5.2+W5.D5+: Sync URL canvasId to store activeCanvasId
  // W5.D5+ PUBLIC CANVAS FIX: Wait for canvases to load AND verify canvas exists
  // before redirecting. This allows public canvas URLs to work properly.
  useEffect(() => {
    // Wait for canvases to load
    if (canvasesLoading) {
      if (DEBUG) console.log('[CanvasPage] Waiting for canvases to load...');
      return;
    }

    // If no canvasId in URL, this should not happen (CanvasRedirect handles it)
    if (!canvasId) {
      console.warn('[CanvasPage] No canvasId in URL, redirecting to /canvas');
      navigate('/canvas', { replace: true });
      return;
    }

    // Check if canvas exists (includes owned + public canvases)
    const canvasExists = canvases.some((c) => c.id === canvasId);

    if (!canvasExists) {
      // W5.D5+ BUG FIX: Only redirect if canvases have actually loaded
      // If canvases array is empty, it means initial load hasn't happened yet
      // This prevents premature redirects when visiting public canvas URLs
      if (canvases.length === 0) {
        if (DEBUG) console.log('[CanvasPage] Canvases not loaded yet, waiting...');
        return;
      }

      console.warn('[CanvasPage] Canvas not found:', canvasId);
      // Redirect to /canvas which will redirect to first available canvas
      navigate('/canvas', { replace: true });
      return;
    }

    // Sync URL to store if different
    if (canvasId !== activeCanvasId) {
      if (DEBUG) console.log('[CanvasPage] Syncing URL → Store:', { url: canvasId, store: activeCanvasId });
      setActiveCanvas(canvasId);
    }
  }, [canvasId, activeCanvasId, canvases, canvasesLoading, navigate, setActiveCanvas]);

  return <Canvas />;
}

