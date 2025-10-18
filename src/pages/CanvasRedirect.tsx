/**
 * Canvas Redirect Page
 * Handles /canvas route by redirecting to /canvas/:canvasId
 * W5.D4: URL-based canvas routing - redirect component
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
      const currentActiveId = usePaperboxStore.getState().activeCanvasId;
      const targetCanvasId = currentActiveId || currentCanvases[0]?.id;

      if (targetCanvasId) {
        console.log('[CanvasRedirect] Redirecting to canvas:', targetCanvasId);
        navigate(`/canvas/${targetCanvasId}`, { replace: true });
      }
    };

    loadAndRedirect();
  }, [user?.id, loadCanvases, createCanvas, navigate]);

  // Also handle case where canvases are already loaded (e.g., coming from another canvas)
  useEffect(() => {
    if (canvasesLoading || !canvases.length) return;

    const targetCanvasId = activeCanvasId || canvases[0].id;
    console.log('[CanvasRedirect] Canvases already loaded, redirecting to:', targetCanvasId);
    navigate(`/canvas/${targetCanvasId}`, { replace: true });
  }, [canvases, canvasesLoading, activeCanvasId, navigate]);

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
