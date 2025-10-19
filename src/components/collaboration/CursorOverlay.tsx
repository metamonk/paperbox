import { memo } from 'react';
import type { CursorPosition } from '../../types/user';
import type { FabricCanvasManager } from '../../lib/fabric/FabricCanvasManager';

interface CursorOverlayProps {
  cursors: Map<string, CursorPosition>;
  fabricManager: FabricCanvasManager | null;
}

/**
 * STATIC CANVAS MIGRATION: Renders remote user cursors on top of the canvas
 * 
 * Simplified positioning - cursor coordinates are direct canvas pixels
 * No viewport transforms needed since all users share the same 5000x5000 coordinate space
 *
 * - Receives cursor positions in direct canvas coordinates (from broadcast)
 * - Displays at exact canvas positions (simple!)
 * - Colored cursor with user's name
 * - Smooth CSS transitions for cursor movement
 *
 * Performance: Memoized to avoid re-renders when parent updates
 * but cursor positions haven't changed
 */
function CursorOverlayComponent({ cursors, fabricManager }: CursorOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from(cursors.values()).map((cursor) => {
        // STATIC CANVAS MIGRATION: Direct canvas coordinates - no transformation!
        const canvasX = cursor.x;
        const canvasY = cursor.y;

        return (
          <div
            key={cursor.userId}
            className="absolute transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${canvasX}px, ${canvasY}px)`,
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
 * STATIC CANVAS MIGRATION: Memoized CursorOverlay with custom comparison
 * 
 * Simplified - no need to check fabricManager since we don't use viewport transforms
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

