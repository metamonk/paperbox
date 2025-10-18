import { memo } from 'react';
import type { CursorPosition } from '../../types/user';
import { canvasToScreen } from '../../utils/canvas-helpers';

interface CursorOverlayProps {
  cursors: Map<string, CursorPosition>;
  scale: number;
  stagePosition: { x: number; y: number };
}

/**
 * Renders remote user cursors on top of the canvas
 * W2.D9: Optimized with React.memo to prevent unnecessary re-renders
 *
 * - Transforms canvas coordinates to screen coordinates
 * - Displays colored cursor with user's name
 * - Smooth CSS transitions for cursor movement
 *
 * Performance: Memoized to avoid re-renders when parent updates
 * but cursor positions haven't changed
 */
function CursorOverlayComponent({ cursors, scale, stagePosition }: CursorOverlayProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {Array.from(cursors.values()).map((cursor) => {
        // Transform canvas coordinates to screen coordinates
        const screenPos = canvasToScreen(cursor.x, cursor.y, scale, stagePosition);

        return (
          <div
            key={cursor.userId}
            className="absolute transition-transform duration-100 ease-out"
            style={{
              transform: `translate(${screenPos.x}px, ${screenPos.y}px)`,
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
 */
export const CursorOverlay = memo(CursorOverlayComponent, (prevProps, nextProps) => {
  // Check if cursors Map has same entries
  if (prevProps.cursors.size !== nextProps.cursors.size) return false;

  // Check if scale and position unchanged
  if (prevProps.scale !== nextProps.scale) return false;
  if (prevProps.stagePosition.x !== nextProps.stagePosition.x) return false;
  if (prevProps.stagePosition.y !== nextProps.stagePosition.y) return false;

  // Check if cursor positions changed (shallow comparison)
  for (const [userId, cursor] of prevProps.cursors.entries()) {
    const nextCursor = nextProps.cursors.get(userId);
    if (!nextCursor) return false;
    if (cursor.x !== nextCursor.x || cursor.y !== nextCursor.y) return false;
  }

  return true; // Props are equal, skip re-render
});

