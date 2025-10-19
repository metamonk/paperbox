import { memo } from 'react';
import type { CursorPosition } from '../../types/user';
import type { FabricCanvasManager } from '../../lib/fabric/FabricCanvasManager';
import { centerToFabric } from '../../lib/fabric/coordinateTranslation';

interface CursorOverlayProps {
  cursors: Map<string, CursorPosition>;
  fabricManager: FabricCanvasManager | null;
}

/**
 * Renders remote user cursors on top of the canvas
 * 
 * Coordinate System Flow:
 * 1. Receives cursor positions in center-origin coordinates (-4000 to +4000)
 * 2. Translates to Fabric coordinates (0 to 8000)
 * 3. Applies viewer's viewport transform (zoom + pan) to get screen coordinates
 * 
 * Formula:
 *   fabricCoord = centerCoord + 4000
 *   viewportCoord = (fabricCoord * zoom) + pan
 *
 * Performance: Memoized to avoid re-renders when parent updates
 * but cursor positions haven't changed
 */
function CursorOverlayComponent({ cursors, fabricManager }: CursorOverlayProps) {
  const canvas = fabricManager?.getCanvas();
  
  if (!canvas) {
    return null;
  }

  // Get viewer's viewport transform
  const vpt = canvas.viewportTransform;
  const zoom = canvas.getZoom();

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-50"
    >
      {Array.from(cursors.values()).map((cursor) => {
        // Step 1: Translate center-origin (-4000 to +4000) to Fabric (0 to 8000)
        const fabricCoords = centerToFabric(cursor.x, cursor.y);
        
        // Step 2: Transform Fabric coordinates to viewport coordinates using viewer's transform
        // Formula: viewportX = (fabricX * zoom) + panX
        const viewportX = (fabricCoords.x * zoom) + vpt[4];
        const viewportY = (fabricCoords.y * zoom) + vpt[5];

        return (
          <div
            key={cursor.userId}
            className="absolute"
            style={{
              left: `${viewportX}px`,
              top: `${viewportY}px`,
              transition: 'left 100ms ease-out, top 100ms ease-out',
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
 * Only re-render when cursor positions actually change
 */
export const CursorOverlay = memo(CursorOverlayComponent, (prevProps, nextProps) => {
  // Check if cursors Map has same entries
  if (prevProps.cursors.size !== nextProps.cursors.size) return false;

  // Check if cursor positions changed (shallow comparison)
  for (const [userId, cursor] of prevProps.cursors.entries()) {
    const nextCursor = nextProps.cursors.get(userId);
    if (!nextCursor) return false;
    if (cursor.x !== nextCursor.x || cursor.y !== nextCursor.y) return false;
  }

  return true; // Props are equal, skip re-render
});

