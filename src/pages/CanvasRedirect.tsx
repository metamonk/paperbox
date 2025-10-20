/**
 * Canvas Redirect Page
 * Handles /canvas route by redirecting to /canvas/:canvasId
 * W5.D4: URL-based canvas routing - redirect component
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePaperboxStore } from '@/stores';

/**
 * CanvasRedirect - Redirects /canvas to /canvas/:canvasId
 *
 * This component loads canvases and redirects to the appropriate canvas URL.
 * NOTE: This runs BEFORE Canvas component mounts, so it must handle canvas loading.
 */
export function CanvasRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canvases = usePaperboxStore((state) => state.canvases);
  const canvasesLoading = usePaperboxStore((state) => state.canvasesLoading);
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const loadCanvases = usePaperboxStore((state) => state.loadCanvases);
  const createCanvas = usePaperboxStore((state) => state.createCanvas);

  // Load canvases on mount
  useEffect(() => {
    if (!user?.id) return;

    const loadAndRedirect = async () => {
      console.log('[CanvasRedirect] Loading canvases for user:', user.id);

      // Load canvases from database
      await loadCanvases(user.id);

      // If no canvases exist, create a default one
      let currentCanvases = usePaperboxStore.getState().canvases;

      if (currentCanvases.length === 0) {
        console.log('[CanvasRedirect] No canvases found, creating default canvas...');
        await createCanvas('Untitled Canvas', 'Your first canvas');
        currentCanvases = usePaperboxStore.getState().canvases;
      }

      // Redirect to active canvas or first canvas
      // SAFETY: Verify activeCanvasId exists before using it
      const currentActiveId = usePaperboxStore.getState().activeCanvasId;
      const activeCanvasExists = currentActiveId && currentCanvases.some(c => c.id === currentActiveId);
      const targetCanvasId = activeCanvasExists ? currentActiveId : currentCanvases[0]?.id;

      if (targetCanvasId) {
        console.log('[CanvasRedirect] Redirecting to canvas:', targetCanvasId);
        navigate(`/canvas/${targetCanvasId}`, { replace: true });
      }
    };

    loadAndRedirect();
  }, [user?.id, loadCanvases, createCanvas, navigate]);

  // Also handle case where canvases are already loaded (e.g., coming from another canvas)
  // W5.D5+ BUG FIX: Only redirect if we're on /canvas route (not /canvas/:canvasId)
  // Without this check, pasting canvas URLs gets overridden by redirect to activeCanvasId
  useEffect(() => {
    // CRITICAL: Only run this redirect when on /canvas route (no canvasId param)
    if (location.pathname !== '/canvas') return;

    if (canvasesLoading || !canvases.length) return;

    // SAFETY: Verify activeCanvasId exists in canvases array before using it
    // This prevents infinite redirect loops if activeCanvasId references deleted canvas
    const activeCanvasExists = activeCanvasId && canvases.some(c => c.id === activeCanvasId);
    const targetCanvasId = activeCanvasExists ? activeCanvasId : canvases[0].id;
    
    console.log('[CanvasRedirect] Canvases already loaded, redirecting to:', targetCanvasId);
    navigate(`/canvas/${targetCanvasId}`, { replace: true });
  }, [location.pathname, canvases, canvasesLoading, activeCanvasId, navigate]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading canvas...</p>
      </div>
    </div>
  );
}
