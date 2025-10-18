/**
 * W2.D12+: Canvas Navigation Indicator
 *
 * Displays viewport position and zoom level to help users understand
 * where they are on the canvas during pan/zoom operations.
 *
 * Visual feedback includes:
 * - Zoom level (percentage)
 * - Pan position (X, Y coordinates)
 * - Optional: Mini-map showing viewport bounds
 */

import { usePaperboxStore } from '../../stores';

export function CanvasNavigationIndicator() {
  const zoom = usePaperboxStore((state) => state.viewport.zoom);
  const panX = usePaperboxStore((state) => state.viewport.panX);
  const panY = usePaperboxStore((state) => state.viewport.panY);

  // Format zoom as percentage
  const zoomPercent = Math.round(zoom * 100);

  // Round pan values for display
  const displayPanX = Math.round(panX);
  const displayPanY = Math.round(panY);

  return (
    <div className="absolute bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-md px-4 py-2 text-xs font-mono pointer-events-none select-none">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Zoom:</span>
          <span className="font-semibold text-gray-900">{zoomPercent}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Pan:</span>
          <span className="font-semibold text-gray-900">
            X: {displayPanX}, Y: {displayPanY}
          </span>
        </div>
      </div>
    </div>
  );
}
