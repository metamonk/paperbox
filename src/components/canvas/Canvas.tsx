/**
 * Main canvas component
 * W1.D10: Fabric.js integration with complete sync pipeline
 *
 * Architecture:
 * Supabase ←→ SyncManager ←→ Zustand Store ←→ CanvasSyncManager ←→ Fabric.js
 *
 * This component provides the canvas element and initializes the complete sync pipeline.
 * User interactions on the Fabric canvas automatically sync through the pipeline.
 */

import { useState, useCallback, useEffect } from 'react';
import { useCanvasSync } from '../../hooks/useCanvasSync';
import { useBroadcastCursors } from '../../hooks/useBroadcastCursors';
import { usePresence } from '../../hooks/usePresence';
import { useCollaborativeOverlays } from '../../hooks/useCollaborativeOverlays';
import { useAuth } from '../../hooks/useAuth';
import { useShapeCreation } from '../../hooks/useShapeCreation';
import { useKeyboard } from '../../hooks/useKeyboard';
import { CursorOverlay } from '../collaboration/CursorOverlay';
// TEMP DISABLED: import { RemoteSelectionOverlay } from '../collaboration/RemoteSelectionOverlay';
import { Header } from '../layout/Header';
import { CanvasLayout } from '../layout/CanvasLayout';
import { LeftSidebar } from '../sidebar/LeftSidebar';
import { BottomToolbar } from '../toolbar/BottomToolbar';
import { PropertyPanel } from '../properties/PropertyPanel';
import { CanvasLoadingOverlay } from './CanvasLoadingOverlay';
import { CanvasNavigationIndicator } from './CanvasNavigationIndicator';
import { usePaperboxStore } from '../../stores';

export function Canvas() {
  // Canvas element ref for Fabric.js - use state to trigger hook when element mounts
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);

  // Callback ref to capture canvas element immediately
  const canvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      console.log('[Canvas] Canvas element mounted, setting state');

      // STATIC CANVAS MIGRATION: Set fixed 5000x5000 canvas dimensions
      // Canvas is always 5000x5000, viewport scrolls to show different portions
      const CANVAS_SIZE = 5000;
      node.width = CANVAS_SIZE;
      node.height = CANVAS_SIZE;
      console.log('[Canvas] Set static canvas dimensions:', { width: CANVAS_SIZE, height: CANVAS_SIZE });

      setCanvasElement(node);
    }
  }, []);

  // W1.D10: Initialize complete sync pipeline (Supabase ↔ Zustand ↔ Fabric.js)
  const { initialized: canvasInitialized, error: syncError, fabricManager } = useCanvasSync(canvasElement);

  // W5.D5.1: Get active canvas ID for scoped realtime channels (cursors + presence)
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);

  // Multiplayer cursors via Broadcast (canvas-scoped)
  const { cursors, sendCursorUpdate } = useBroadcastCursors(activeCanvasId);

  // Presence tracking and online users (canvas-scoped)
  const { onlineUsers, updateActivity, currentUserId } = usePresence(activeCanvasId);

  // W5.D5++++: Collaborative overlays (lock/selection indicators)
  useCollaborativeOverlays(fabricManager);

  // Auth for logout
  const { signOut, user } = useAuth();

  // Shape creation logic
  const { handleAddShape, createObjectAtPosition } = useShapeCreation({ fabricManager, user });

  // Zustand store for accessing canvas state
  const selectedIds = usePaperboxStore((state) => state.selectedIds);
  const deleteObjects = usePaperboxStore((state) => state.deleteObjects);
  const selectAll = usePaperboxStore((state) => state.selectAll);

  // W4.D4: Z-index operations from layers slice
  const moveToFront = usePaperboxStore((state) => state.moveToFront);
  const moveToBack = usePaperboxStore((state) => state.moveToBack);
  const moveUp = usePaperboxStore((state) => state.moveUp);
  const moveDown = usePaperboxStore((state) => state.moveDown);

  // W2.D12: Placement mode state for click-to-place pattern
  const isPlacementMode = usePaperboxStore((state) => state.isPlacementMode);

  // W5.D5+: Removed dummy scale/position - CursorOverlay now gets viewport from Fabric.js directly

  /**
   * W2.D12: Wire up placement click handler to fabricManager
   *
   * When fabricManager is ready and we're in placement mode,
   * the onPlacementClick handler will be called when user clicks canvas.
   */
  useEffect(() => {
    if (!fabricManager) return;

    // Set up the placement click handler
    const canvas = fabricManager.getCanvas();
    if (!canvas) return;

    // Store current handler to avoid recreating on every render
    const handlePlacementClick = (x: number, y: number) => {
      const config = usePaperboxStore.getState().placementConfig;
      if (!config) {
        console.warn('[Canvas] Placement click but no config');
        return;
      }

      console.log('[Canvas] Handling placement click:', { x, y, config });

      // Create object at clicked position
      createObjectAtPosition(
        config.type,
        x,
        y,
        config.defaultSize.width,
        config.defaultSize.height
      );
    };

    // Register the handler with fabricManager
    // Note: This updates the event handlers object in FabricCanvasManager
    fabricManager.setupEventListeners({
      onPlacementClick: isPlacementMode ? handlePlacementClick : undefined,
    });

    console.log('[Canvas] Placement mode updated:', { isPlacementMode });
  }, [fabricManager, isPlacementMode, createObjectAtPosition]);

  /**
   * STATIC CANVAS MIGRATION: Handle mouse movement to broadcast cursor position
   * 
   * Simplified coordinate system - direct pixel coordinates on 5000x5000 canvas
   * All users share the same coordinate space, no viewport transforms needed
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Get canvas element position
    const canvasElement = document.getElementById('fabric-canvas');
    if (!canvasElement) {
      updateActivity();
      return;
    }

    const rect = canvasElement.getBoundingClientRect();
    
    // Direct pixel coordinates on the 5000x5000 canvas
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Broadcast direct canvas coordinates (simple!)
    sendCursorUpdate(canvasX, canvasY);

    updateActivity();
  };



  /**
   * W4.D4: Keyboard shortcuts for delete, selection, and z-index operations
   * - Delete/Backspace: Delete selected objects
   * - Ctrl/Cmd + A: Select all objects
   * - Ctrl/Cmd + ]: Bring to front
   * - Ctrl/Cmd + [: Send to back
   * - Ctrl/Cmd + Shift + ]: Bring forward (move up)
   * - Ctrl/Cmd + Shift + [: Send backward (move down)
   */
  useKeyboard({
    'delete': () => {
      if (selectedIds.length > 0) {
        deleteObjects(selectedIds);
      }
    },
    'backspace': () => {
      if (selectedIds.length > 0) {
        deleteObjects(selectedIds);
      }
    },
    'a': (e) => {
      if (e && (e.ctrlKey || e.metaKey)) {
        // Ctrl/Cmd + A: Select all objects
        selectAll();
      }
    },
    ']': (e) => {
      if (e && (e.ctrlKey || e.metaKey) && selectedIds.length === 1) {
        if (e.shiftKey) {
          // Ctrl/Cmd + Shift + ]: Move up (bring forward)
          moveUp(selectedIds[0]);
        } else {
          // Ctrl/Cmd + ]: Move to front
          moveToFront(selectedIds[0]);
        }
      }
    },
    '[': (e) => {
      if (e && (e.ctrlKey || e.metaKey) && selectedIds.length === 1) {
        if (e.shiftKey) {
          // Ctrl/Cmd + Shift + [: Move down (send backward)
          moveDown(selectedIds[0]);
        } else {
          // Ctrl/Cmd + [: Move to back
          moveToBack(selectedIds[0]);
        }
      }
    },
  });


  return (
    <div className="flex flex-col h-screen bg-background">
      <Header
        onlineUsers={onlineUsers}
        currentUserId={currentUserId}
        onSignOut={() => signOut()}
        userName={user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
      />

      <CanvasLayout
        leftSidebar={<LeftSidebar />}
        rightSidebar={<PropertyPanel />}
      >
        <div className="flex flex-1 overflow-hidden">
        {/* STATIC CANVAS MIGRATION: Scrollable canvas container for 5000x5000 viewport */}
        <div
          className="relative flex-1 overflow-auto bg-muted"
          onMouseMove={handleMouseMove}
        >
          {/* Error banner */}
          {syncError && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{syncError}</span>
            </div>
          )}

          {/* STATIC CANVAS MIGRATION: 5000x5000 canvas within scrollable viewport */}
          <canvas
            id="fabric-canvas"
            ref={canvasCallbackRef}
            className="absolute top-0 left-0"
            onClick={(e) => {
              // STATIC CANVAS MIGRATION: React onClick fallback for placement mode
              // Simplified coordinate system - direct pixel coordinates on 5000x5000 canvas
              if (isPlacementMode && fabricManager) {
                // Direct pixel coordinates - no transforms needed
                const rect = e.currentTarget.getBoundingClientRect();
                const canvasX = e.clientX - rect.left;
                const canvasY = e.clientY - rect.top;

                console.log('[Canvas] React onClick placement (static canvas):', {
                  canvasX,
                  canvasY,
                  clientX: e.clientX,
                  clientY: e.clientY,
                  isPlacementMode
                });

                // Get placement config and create shape
                const config = usePaperboxStore.getState().placementConfig;
                if (config) {
                  createObjectAtPosition(
                    config.type,
                    canvasX,
                    canvasY,
                    config.defaultSize.width,
                    config.defaultSize.height
                  );
                }
              }
            }}
            style={{
              width: '5000px',
              height: '5000px',
              cursor: isPlacementMode ? 'crosshair' : 'default',
            }}
          />

          {/* Multiplayer Cursors Overlay - W5.D5+: Now uses Fabric.js viewport */}
          <CursorOverlay
            cursors={cursors}
            fabricManager={fabricManager}
          />

          {/* TEMP DISABLED: Remote Selection Overlay - coordinate system issues
          <RemoteSelectionOverlay />
          */}

          {/* W2.D12+: Navigation indicator (zoom, pan position) */}
          <CanvasNavigationIndicator />

          {/* Loading overlay - shown until canvas initializes */}
          {!canvasInitialized && <CanvasLoadingOverlay />}

          {/* Bottom Toolbar - Figma-style centered tool palette */}
          {canvasInitialized && (
            <BottomToolbar
              onAddShape={handleAddShape}
              activeTool={isPlacementMode ? 'rectangle' : 'select'}
            />
          )}
        </div>
      </div>
      </CanvasLayout>
    </div>
  );
}
