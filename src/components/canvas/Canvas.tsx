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
import { useSidebarState } from '../../hooks/useSidebarState';
import { useKeyboard } from '../../hooks/useKeyboard';
import { CursorOverlay } from '../collaboration/CursorOverlay';
// TEMP DISABLED: import { RemoteSelectionOverlay } from '../collaboration/RemoteSelectionOverlay';
import { UsersPanel } from '../collaboration/UsersPanel';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { ToolsSidebar } from './ToolsSidebar';
import { BottomToolbar } from '../toolbar/BottomToolbar';
import { PropertyPanel } from '../properties/PropertyPanel';
import { LayersPanel } from '../layers/LayersPanel';
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

      // W2.D12 FIX: Set canvas dimensions BEFORE Fabric.js initialization
      // Fabric.js needs the canvas element to already have correct dimensions
      // when it looks it up by ID, otherwise rendering context may not initialize properly
      const parent = node.parentElement;
      if (parent) {
        const width = parent.clientWidth;
        const height = parent.clientHeight;
        node.width = width;
        node.height = height;
        console.log('[Canvas] Set canvas dimensions before Fabric init:', { width, height });
      }

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

  // Sidebar state management
  const { sidebarOpen, sidebarContent, handleToggleTools, handleToggleUsers, handleToggleProperties, handleToggleLayers } = useSidebarState();

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
   * Handle mouse movement to broadcast cursor position
   *
   * W5.D5+: Convert screen coordinates to canvas world coordinates
   * before broadcasting to ensure consistent cursor positions across
   * users with different viewports (zoom/pan)
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Get Fabric.js canvas instance
    const fabricCanvas = fabricManager?.getCanvas();

    if (fabricCanvas) {
      // Convert screen coordinates to canvas world coordinates
      // This accounts for zoom and pan transformations
      // Inverse transformation: canvas = (screen - pan) / zoom
      const vpt = fabricCanvas.viewportTransform;
      const zoom = fabricCanvas.getZoom();

      const canvasX = (screenX - vpt[4]) / zoom;
      const canvasY = (screenY - vpt[5]) / zoom;

      // Broadcast canvas coordinates (same system as canvas objects)
      sendCursorUpdate(canvasX, canvasY);

      // console.log('[Canvas] Cursor broadcast:', {
      //   screen: { x: screenX, y: screenY },
      //   canvas: { x: canvasX, y: canvasY },
      //   viewport: {
      //     zoom: zoom,
      //     pan: { x: vpt[4], y: vpt[5] }
      //   }
      // });
    } else {
      // Fallback: broadcast screen coordinates if Fabric.js not ready
      // This maintains current behavior during initialization
      sendCursorUpdate(screenX, screenY);
    }

    updateActivity();
  };


  /**
   * Handle delete requests from toolbar
   */
  const handleDelete = () => {
    if (selectedIds.length > 0) {
      deleteObjects(selectedIds);
    }
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
        userCount={onlineUsers.length}
        onSignOut={() => signOut()}
        userName={user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
        sidebarOpen={sidebarOpen}
        sidebarContent={sidebarContent}
        onToggleTools={handleToggleTools}
        onToggleUsers={handleToggleUsers}
        onToggleProperties={handleToggleProperties}
        onToggleLayers={handleToggleLayers}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div
          className="relative flex-1 overflow-hidden bg-muted"
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

          {/* Fabric.js Canvas Element */}
          <canvas
            id="fabric-canvas"
            ref={canvasCallbackRef}
            className="absolute inset-0"
            onClick={(e) => {
              // W4.D1 FIX: React onClick fallback for placement mode
              // This ensures clicks are captured even if Fabric.js event listener isn't working
              if (isPlacementMode && fabricManager) {
                const canvas = fabricManager.getCanvas();
                if (!canvas) return;

                // Get click position relative to canvas element
                const rect = e.currentTarget.getBoundingClientRect();
                const clientX = e.clientX - rect.left;
                const clientY = e.clientY - rect.top;

                // Convert to Fabric.js viewport coordinates (accounting for zoom/pan)
                const pointer = canvas.getPointer(e.nativeEvent, true);

                console.log('[Canvas] React onClick placement:', {
                  clientX,
                  clientY,
                  canvasX: pointer.x,
                  canvasY: pointer.y,
                  isPlacementMode
                });

                // Get placement config and create shape
                const config = usePaperboxStore.getState().placementConfig;
                if (config) {
                  createObjectAtPosition(
                    config.type,
                    pointer.x,
                    pointer.y,
                    config.defaultSize.width,
                    config.defaultSize.height
                  );
                }
              }
            }}
            style={{
              width: '100%',
              height: '100%',
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

        {/* Backdrop for mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => {
              // Toggle based on current sidebar content to close
              if (sidebarContent === 'tools') handleToggleTools();
              else handleToggleUsers();
            }}
            aria-hidden="true"
          />
        )}

        {/* Sidebar with dynamic content */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => {
            // On mobile, close the sidebar when backdrop is clicked
            // Desktop behavior handled by useSidebarState
            if (window.innerWidth < 768) {
              // Toggle based on current sidebar content to close
              if (sidebarContent === 'tools') handleToggleTools();
              else if (sidebarContent === 'users') handleToggleUsers();
              else if (sidebarContent === 'properties') handleToggleProperties();
              else handleToggleLayers();
            }
          }}
        >
          {sidebarContent === 'users' ? (
            <UsersPanel users={onlineUsers} currentUserId={currentUserId} />
          ) : sidebarContent === 'properties' ? (
            <PropertyPanel />
          ) : sidebarContent === 'layers' ? (
            <LayersPanel />
          ) : (
            <ToolsSidebar
              onAddShape={handleAddShape}
              onDelete={handleDelete}
              hasSelection={selectedIds.length > 0}
              onMoveToFront={selectedIds.length === 1 ? () => moveToFront(selectedIds[0]) : undefined}
              onMoveToBack={selectedIds.length === 1 ? () => moveToBack(selectedIds[0]) : undefined}
              onMoveUp={selectedIds.length === 1 ? () => moveUp(selectedIds[0]) : undefined}
              onMoveDown={selectedIds.length === 1 ? () => moveDown(selectedIds[0]) : undefined}
            />
          )}
        </Sidebar>
      </div>
    </div>
  );
}
