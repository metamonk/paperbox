/**
 * RemoteSelectionOverlay - Visual Indicators for Other Users' Selections
 *
 * Coordinate System Flow:
 * 1. Objects stored in center-origin coordinates (-4000 to +4000)
 * 2. Translate to Fabric coordinates (0 to 8000) 
 * 3. Convert center-based to top-left for div positioning
 * 4. Apply viewer's viewport transform (zoom + pan) to screen coordinates
 * 
 * Displays colored borders around objects selected by other users,
 * with user name labels. This makes collaborative editing visible
 * and helps users understand what others are doing.
 */

import { usePaperboxStore } from '../../stores';
import type { FabricCanvasManager } from '../../lib/fabric/FabricCanvasManager';
import { centerToFabric } from '../../lib/fabric/coordinateTranslation';

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

          // Step 1: Translate center-origin (-4000 to +4000) to Fabric (0 to 8000)
          const fabricCoords = centerToFabric(obj.x, obj.y);
          
          // Step 2: Objects use center-based positioning, convert to top-left for div
          const fabricLeft = fabricCoords.x - (obj.width / 2);
          const fabricTop = fabricCoords.y - (obj.height / 2);
          
          // Step 3: Apply viewer's viewport transform to get screen coordinates
          const viewportLeft = (fabricLeft * zoom) + vpt[4];
          const viewportTop = (fabricTop * zoom) + vpt[5];
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

