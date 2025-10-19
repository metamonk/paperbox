import { memo } from 'react';
import type { CursorPosition } from '../../types/user';
import type { FabricCanvasManager } from '../../lib/fabric/FabricCanvasManager';

interface CursorOverlayProps {
  cursors: Map<string, CursorPosition>;
  fabricManager: FabricCanvasManager | null;
}

/**
 * Renders remote user cursors on top of the canvas
 * W2.D9: Optimized with React.memo to prevent unnecessary re-renders
 * W5.D5+: Now uses Fabric.js viewport transformation for accurate cursor positioning
 *
 * - Receives cursor positions in canvas world coordinates (from broadcast)
 * - Transforms to screen coordinates using Fabric.js viewport (zoom/pan)
 * - Displays colored cursor with user's name
 * - Smooth CSS transitions for cursor movement
 *
 * Performance: Memoized to avoid re-renders when parent updates
 * but cursor positions haven't changed
 */
function CursorOverlayComponent({ cursors, fabricManager }: CursorOverlayProps) {
  const fabricCanvas = fabricManager?.getCanvas();

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from(cursors.values()).map((cursor) => {
        // W5.D5+: Transform canvas coordinates to screen coordinates using Fabric.js viewport
        let screenX = cursor.x;
        let screenY = cursor.y;

        if (fabricCanvas) {
          // Get viewport transformation matrix [a, b, c, d, e, f]
          // e = panX, f = panY in screen coordinates
          const vpt = fabricCanvas.viewportTransform;
          const zoom = fabricCanvas.getZoom();

          // Apply viewport transformation: screen = (canvas * zoom) + pan
          screenX = cursor.x * zoom + vpt[4];
          screenY = cursor.y * zoom + vpt[5];
        }
        // Note: If Fabric.js not ready, we just use cursor coordinates as-is (no transformation)

        return (
          <div
            key={cursor.userId}
            className="absolute transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
            }}
          >
            {/* SVG Cursor - Classic Pointer */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              {/* Classic mouse pointer shape */}
              <path
                d="M3 3L3 17L7.5 12.5L10 17L12 16L9.5 11.5L15 11L3 3Z"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Name Label */}
            <div
              className="absolute top-5 left-5 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap pointer-events-none"
              style={{
                backgroundColor: cursor.color,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {cursor.displayName}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Memoized CursorOverlay with custom comparison
 * Prevents re-renders when cursor Map reference changes but content is the same
 * W5.D5+: Updated to check fabricManager reference instead of scale/position
 */
export const CursorOverlay = memo(CursorOverlayComponent, (prevProps, nextProps) => {
  // Check if cursors Map has same entries
  if (prevProps.cursors.size !== nextProps.cursors.size) return false;

  // Check if fabricManager changed (viewport transformation might have changed)
  // Note: fabricManager is stable, but we check for consistency
  if (prevProps.fabricManager !== nextProps.fabricManager) return false;

  // Check if cursor positions changed (shallow comparison)
  for (const [userId, cursor] of prevProps.cursors.entries()) {
    const nextCursor = nextProps.cursors.get(userId);
    if (!nextCursor) return false;
    if (cursor.x !== nextCursor.x || cursor.y !== nextCursor.y) return false;
  }

  return true; // Props are equal, skip re-render
});

