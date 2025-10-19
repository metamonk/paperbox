/**
 * RemoteSelectionOverlay - Visual Indicators for Other Users' Selections
 *
 * CRITICAL FIX for group movement synchronization bug
 *
 * Displays colored borders around objects selected by other users,
 * with user name labels. This makes collaborative editing visible
 * and helps users understand what others are doing.
 *
 * Pattern: Similar to CursorOverlay but for object selections
 */

import { usePaperboxStore } from '../../stores';

/**
 * Get viewport transform to position selection overlays correctly
 * This ensures overlays move/zoom with the canvas
 */
function useViewportTransform() {
  const viewport = usePaperboxStore(state => state.viewport);
  return {
    zoom: viewport.zoom,
    panX: viewport.panX,
    panY: viewport.panY,
  };
}

export function RemoteSelectionOverlay() {
  const presence = usePaperboxStore(state => state.presence);
  const currentUserId = usePaperboxStore(state => state.currentUserId);
  const objects = usePaperboxStore(state => state.objects);
  const viewport = useViewportTransform();

  // Get all remote users (not current user)
  const remoteUsers = Object.values(presence).filter(
    user => user.userId !== currentUserId && user.isActive
  );

  console.log('[RemoteSelectionOverlay] Rendering:', {
    remoteUserCount: remoteUsers.length,
    usersWithSelections: remoteUsers.filter(u => u.selection?.objectIds.length).length,
  });

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        zIndex: 1000, // Above canvas but below UI
        transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        transformOrigin: 'top left',
      }}
    >
      {remoteUsers.map(user => {
        const selection = user.selection;
        if (!selection || selection.objectIds.length === 0) {
          return null; // No selection to show
        }

        return selection.objectIds.map(objectId => {
          const obj = objects[objectId];
          if (!obj) {
            console.warn('[RemoteSelectionOverlay] Object not found:', objectId);
            return null; // Object doesn't exist (deleted or not loaded yet)
          }

          // Calculate bounding box (account for rotation)
          const halfWidth = obj.width / 2;
          const halfHeight = obj.height / 2;

          return (
            <div
              key={`${user.userId}-${objectId}`}
              className="absolute"
              style={{
                left: obj.x - halfWidth,
                top: obj.y - halfHeight,
                width: obj.width,
                height: obj.height,
                border: `2px solid ${user.userColor}`,
                borderRadius: '2px',
                opacity: 0.7,
                transition: 'all 0.15s ease-out', // Smooth movement
                pointerEvents: 'none',
              }}
            >
              {/* User name label (only show once per user) */}
              {selection.objectIds[0] === objectId && (
                <div
                  className="absolute -top-7 left-0 px-2 py-1 text-xs font-medium rounded whitespace-nowrap shadow-sm"
                  style={{
                    backgroundColor: user.userColor,
                    color: 'white',
                    transform: `scale(${1 / viewport.zoom})`, // Keep label readable at any zoom
                    transformOrigin: 'left top',
                  }}
                >
                  {user.userName}
                </div>
              )}
            </div>
          );
        });
      })}
    </div>
  );
}

