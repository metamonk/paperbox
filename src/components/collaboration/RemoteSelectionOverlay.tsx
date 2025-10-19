/**
 * RemoteSelectionOverlay - Visual Indicators for Other Users' Selections
 *
 * Uses Fabric's viewport transform to position selection boxes
 * 
 * Displays colored borders around objects selected by other users,
 * with user name labels. This makes collaborative editing visible
 * and helps users understand what others are doing.
 *
 * Pattern: Transforms canvas coordinates to viewport coordinates
 * using the viewer's zoom/pan so selections appear in correct position
 */

import { usePaperboxStore } from '../../stores';
import type { FabricCanvasManager } from '../../lib/fabric/FabricCanvasManager';

interface RemoteSelectionOverlayProps {
  fabricManager: FabricCanvasManager | null;
}

export function RemoteSelectionOverlay({ fabricManager }: RemoteSelectionOverlayProps) {
  const presence = usePaperboxStore(state => state.presence);
  const currentUserId = usePaperboxStore(state => state.currentUserId);
  const objects = usePaperboxStore(state => state.objects);

  const canvas = fabricManager?.getCanvas();
  if (!canvas) {
    return null;
  }

  // Get viewer's viewport transform
  const vpt = canvas.viewportTransform;
  const zoom = canvas.getZoom();

  // Get all remote users (not current user)
  const remoteUsers = Object.values(presence).filter(
    user => user.userId !== currentUserId && user.isActive
  );

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 900, // Above canvas objects but below UI
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
            return null;
          }

          // Transform canvas coordinates to viewport coordinates
          // Objects use center-based positioning, convert to top-left for div
          const canvasLeft = obj.x - (obj.width / 2);
          const canvasTop = obj.y - (obj.height / 2);
          
          const viewportLeft = (canvasLeft * zoom) + vpt[4];
          const viewportTop = (canvasTop * zoom) + vpt[5];
          const viewportWidth = obj.width * zoom;
          const viewportHeight = obj.height * zoom;

          return (
            <div
              key={`${user.userId}-${objectId}`}
              className="absolute"
              style={{
                left: `${viewportLeft}px`,
                top: `${viewportTop}px`,
                width: `${viewportWidth}px`,
                height: `${viewportHeight}px`,
                border: `3px solid ${user.userColor}`,
                borderRadius: '4px',
                opacity: 0.8,
                transition: 'all 0.15s ease-out',
                pointerEvents: 'none',
                boxShadow: `0 0 10px ${user.userColor}40`,
              }}
            >
              {/* User name label (only show once per user - on first selected object) */}
              {selection.objectIds[0] === objectId && (
                <div
                  className="absolute -top-8 left-0 px-2 py-1 text-xs font-semibold rounded-md whitespace-nowrap shadow-lg"
                  style={{
                    backgroundColor: user.userColor,
                    color: 'white',
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

