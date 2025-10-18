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
import { useAuth } from '../../hooks/useAuth';
import { useShapeCreation } from '../../hooks/useShapeCreation';
import { useSidebarState } from '../../hooks/useSidebarState';
import { CursorOverlay } from '../collaboration/CursorOverlay';
import { UsersPanel } from '../collaboration/UsersPanel';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { ToolsSidebar } from './ToolsSidebar';
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

  // Multiplayer cursors via Broadcast
  const { cursors, sendCursorUpdate } = useBroadcastCursors();

  // Presence tracking and online users
  const { onlineUsers, updateActivity, currentUserId } = usePresence();

  // Auth for logout
  const { signOut, user } = useAuth();

  // Shape creation logic
  const { handleAddShape, createObjectAtPosition } = useShapeCreation({ fabricManager, user });

  // W2.D12 DEBUG: Test button to bypass placement mode completely
  const handleTestDirectAdd = useCallback(() => {
    if (!fabricManager || !user) {
      console.error('[Canvas] Cannot test - fabricManager or user not ready');
      return;
    }

    console.log('[Canvas] TEST: Creating rectangle directly at (100, 100)');

    const testObject = {
      id: `test-rect-${Date.now()}`,
      type: 'rectangle' as const,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      rotation: 0,
      opacity: 1,
      fill: '#FF00FF', // Bright magenta for visibility
      stroke: '#000000',
      stroke_width: 3,
      group_id: null,
      z_index: 1,
      style_properties: {},
      metadata: {},
      locked_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id,
      lock_acquired_at: null,
      type_properties: { corner_radius: 0 },
    };

    console.log('[Canvas] TEST: Calling fabricManager.addObject with:', testObject);
    const fabricObject = fabricManager.addObject(testObject as any);

    console.log('[Canvas] TEST: Result:', {
      fabricObject,
      visible: (fabricObject as any)?.visible,
      opacity: (fabricObject as any)?.opacity,
      fill: (fabricObject as any)?.fill,
      canvasObjectCount: fabricManager.getCanvas()?.getObjects().length,
    });

    // Force manual render
    fabricManager.getCanvas()?.renderAll();
    console.log('[Canvas] TEST: Manual renderAll() called');
  }, [fabricManager, user]);

  // Sidebar state management
  const { sidebarOpen, sidebarContent, handleToggleTools, handleToggleUsers, handleToggleProperties, handleToggleLayers } = useSidebarState();

  // Zustand store for accessing canvas state
  const selectedIds = usePaperboxStore((state) => state.selectedIds);
  const deleteObjects = usePaperboxStore((state) => state.deleteObjects);

  // W2.D12: Placement mode state for click-to-place pattern
  const isPlacementMode = usePaperboxStore((state) => state.isPlacementMode);

  // Canvas transform state (for cursor overlay)
  const [scale] = useState(1);
  const [position] = useState({ x: 0, y: 0 });

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
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    sendCursorUpdate(canvasX, canvasY);
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


  return (
    <div className="flex flex-col h-screen bg-gray-50">
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
          className="relative flex-1 overflow-hidden bg-white"
          onMouseMove={handleMouseMove}
        >
          {/* Error banner */}
          {syncError && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
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

          {/* Multiplayer Cursors Overlay */}
          <CursorOverlay
            cursors={cursors}
            scale={scale}
            stagePosition={position}
          />

          {/* W2.D12+: Navigation indicator (zoom, pan position) */}
          <CanvasNavigationIndicator />

          {/* Loading overlay - shown until canvas initializes */}
          {!canvasInitialized && <CanvasLoadingOverlay />}
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
              onTestDirectAdd={handleTestDirectAdd}
            />
          )}
        </Sidebar>
      </div>
    </div>
  );
}
