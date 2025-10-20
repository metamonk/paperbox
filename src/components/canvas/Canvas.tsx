/**
 * Main canvas component with Fabric.js integration
 *
 * Architecture:
 * Supabase ←→ SyncManager ←→ Zustand Store ←→ CanvasSyncManager ←→ Fabric.js
 *
 * This component provides the canvas element and initializes the complete sync pipeline.
 * User interactions on the Fabric canvas automatically sync through the pipeline.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useCanvasSync } from '../../hooks/useCanvasSync';
// TEMPORARILY DISABLED: Collaborative features causing sync issues
// import { useBroadcastCursors } from '../../hooks/useBroadcastCursors';
// import { usePresence } from '../../hooks/usePresence';
// import { useCollaborativeOverlays } from '../../hooks/useCollaborativeOverlays';
import type { PresenceUser } from '../../hooks/usePresence';
import { useAuth } from '../../hooks/useAuth';
import { useShapeCreation } from '../../hooks/useShapeCreation';
import { ShapeCreationShortcuts, UIShortcuts } from '../../features/shortcuts';
import { CursorOverlay } from '../collaboration/CursorOverlay';
import { RemoteSelectionOverlay } from '../collaboration/RemoteSelectionOverlay';
import { Header } from '../layout/Header';
import { CanvasLayout } from '../layout/CanvasLayout';
import { LeftSidebar } from '../sidebar/LeftSidebar';
import { BottomToolbar } from '../toolbar/BottomToolbar';
import { AITextBox } from '../ai/AITextBox';
import { PropertyPanel } from '../properties/PropertyPanel';
import { CanvasLoadingOverlay } from './CanvasLoadingOverlay';
import { CanvasNavigationIndicator } from './CanvasNavigationIndicator';
import { Minimap } from './Minimap';
import { usePaperboxStore } from '../../stores';
import { generateColorFromId } from '../../lib/constants';
import { fabricToCenter } from '../../lib/fabric/coordinateTranslation';

export function Canvas() {
  // Canvas element ref for Fabric.js - use state to trigger hook when element mounts
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
  
  // AI interface state
  const [isAIOpen, setIsAIOpen] = useState(false);

  // Refs for managing keyboard shortcuts
  const shapeCreationShortcutsRef = useRef<ShapeCreationShortcuts | null>(null);
  const uiShortcutsRef = useRef<UIShortcuts | null>(null);

  // Callback ref to capture canvas element immediately
  const canvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      // STATIC CANVAS MIGRATION: Set fixed 8000x8000 canvas dimensions
      // Canvas is always 8000x8000, viewport scrolls to show different portions
      const CANVAS_SIZE = 8000;
      node.width = CANVAS_SIZE;
      node.height = CANVAS_SIZE;

      setCanvasElement(node);
    }
  }, []);

  // Initialize complete sync pipeline (Supabase ↔ Zustand ↔ Fabric.js)
  const { initialized: canvasInitialized, error: syncError, fabricManager } = useCanvasSync(canvasElement);

  // Get active canvas ID for scoped realtime channels
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);

  // TEMPORARILY DISABLED: Collaborative features causing sync issues
  // TODO: Re-enable after fixing core synchronization
  
  // // Multiplayer cursors (canvas-scoped)
  // const { cursors, sendCursorUpdate } = useBroadcastCursors(activeCanvasId);

  // // Presence tracking (canvas-scoped)
  // const { onlineUsers, updateActivity, currentUserId } = usePresence(activeCanvasId);

  // // Collaborative overlays (lock/selection indicators)
  // useCollaborativeOverlays(fabricManager);

  // Stub values for temporarily disabled features
  const cursors = new Map();
  const sendCursorUpdate = (_x: number, _y: number) => { void _x; void _y; };
  const onlineUsers: PresenceUser[] = [];
  const updateActivity = () => {};
  const currentUserId = '';

  // Auth
  const { signOut, user } = useAuth();

  // Setup presence channel for selection broadcasting
  const setupPresenceChannel = usePaperboxStore((state) => state.setupPresenceChannel);
  const cleanupPresenceChannel = usePaperboxStore((state) => state.cleanupPresenceChannel);
  const setCurrentUser = usePaperboxStore((state) => state.setCurrentUser);

  useEffect(() => {
    if (!user?.id || !activeCanvasId) {
      return;
    }

    const userName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Anonymous';
    const userColor = generateColorFromId(user.id); // Consistent color based on user ID

    // Set current user in collaboration slice
    setCurrentUser(user.id, userName, userColor);

    // Setup presence channel for selection broadcasting
    setupPresenceChannel(user.id, userName, userColor, activeCanvasId);

    return () => {
      cleanupPresenceChannel();
    };
  }, [user?.id, activeCanvasId, setupPresenceChannel, cleanupPresenceChannel, setCurrentUser, user?.email, user?.user_metadata?.display_name]);

  // Shape creation logic
  const { handleAddShape, createObjectAtPosition } = useShapeCreation({ fabricManager, user });
  
  // AI toggle handler
  const handleAIToggle = () => {
    setIsAIOpen((prev) => !prev);
  };

  // Placement mode state
  const isPlacementMode = usePaperboxStore((state) => state.isPlacementMode);

  /**
   * Wire up placement click handler to fabricManager
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
  }, [fabricManager, isPlacementMode, createObjectAtPosition]);

  /**
   * STATIC CANVAS MIGRATION: Handle mouse movement to broadcast cursor position
   * 
   * Simplified coordinate system - direct pixel coordinates on 8000x8000 canvas
   * All users share the same coordinate space, no viewport transforms needed
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!fabricManager) {
      updateActivity();
      return;
    }

    const canvas = fabricManager.getCanvas();
    if (!canvas) {
      updateActivity();
      return;
    }

    // CRITICAL FIX: Use Fabric's viewport transform, not DOM scroll!
    // The system uses Fabric's pan/zoom (viewportTransform), not DOM scrolling
    const canvasElement = canvas.getElement();
    const rect = canvasElement.getBoundingClientRect();
    
    // Get mouse position relative to canvas element (viewport coordinates)
    const viewportX = e.clientX - rect.left;
    const viewportY = e.clientY - rect.top;
    
    // Get Fabric's viewport transform
    const vpt = canvas.viewportTransform;
    const zoom = canvas.getZoom();
    
    // Transform viewport coordinates to Fabric canvas coordinates
    // Formula: fabricCoord = (viewportCoord - pan) / zoom
    const fabricX = (viewportX - vpt[4]) / zoom;
    const fabricY = (viewportY - vpt[5]) / zoom;

    // Translate Fabric coordinates (0 to 8000) to center-origin (-4000 to +4000)
    const centerCoords = fabricToCenter(fabricX, fabricY);

    // Broadcast center-origin coordinates to other users
    sendCursorUpdate(centerCoords.x, centerCoords.y);

    updateActivity();
  };



  /**
   * Initialize keyboard shortcuts for shape creation (R, C, T) and UI (Cmd+/)
   * Note: Other shortcuts (delete, select all, layering, duplicate, undo/redo, navigation)
   * are initialized in useCanvasSync hook for better lifecycle management.
   */
  useEffect(() => {
    if (!fabricManager) return;

    // Initialize shape creation shortcuts
    const shapeShortcuts = new ShapeCreationShortcuts({
      onCreateRectangle: () => handleAddShape('rectangle'),
      onCreateCircle: () => handleAddShape('circle'),
      onCreateText: () => handleAddShape('text'),
    });
    shapeShortcuts.initialize();
    shapeCreationShortcutsRef.current = shapeShortcuts;

    // Initialize UI shortcuts
    const uiShortcuts = new UIShortcuts({
      onToggleAI: handleAIToggle,
    });
    uiShortcuts.initialize();
    uiShortcutsRef.current = uiShortcuts;

    // Cleanup on unmount
    return () => {
      if (shapeCreationShortcutsRef.current) {
        shapeCreationShortcutsRef.current.dispose();
        shapeCreationShortcutsRef.current = null;
      }
      if (uiShortcutsRef.current) {
        uiShortcutsRef.current.dispose();
        uiShortcutsRef.current = null;
      }
    };
  }, [fabricManager, handleAddShape]);


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
        <div className="flex flex-1 overflow-hidden relative">
          {/* STATIC CANVAS MIGRATION: Scrollable canvas container for 8000x8000 viewport */}
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

          {/* STATIC CANVAS MIGRATION: 8000x8000 canvas within scrollable viewport */}
          <canvas
            id="fabric-canvas"
            ref={canvasCallbackRef}
            className="absolute top-0 left-0"
            onClick={(e) => {
              // FIX: React onClick fallback for placement mode
              // Use Fabric's getPointer() to handle zoom/pan correctly
              if (isPlacementMode && fabricManager) {
                const canvas = fabricManager.getCanvas();
                if (!canvas) return;

                // Create a mock event object for Fabric's getPointer
                // getPointer(e, false) applies zoom/pan transform automatically
                const mockEvent = {
                  clientX: e.clientX,
                  clientY: e.clientY,
                } as MouseEvent;
                const pointer = canvas.getPointer(mockEvent, false);
                const canvasX = pointer.x;
                const canvasY = pointer.y;

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
              width: '8000px',
              height: '8000px',
              cursor: isPlacementMode ? 'crosshair' : 'default',
            }}
          />

          {/* Multiplayer Cursors Overlay */}
          <CursorOverlay
            cursors={cursors}
            fabricManager={fabricManager}
          />

          {/* Remote Selection Overlay - shows other users' selections */}
          <RemoteSelectionOverlay fabricManager={fabricManager} />

          {/* Navigation indicator (zoom, pan position) */}
          <CanvasNavigationIndicator />

          {/* Loading overlay - shown until canvas initializes */}
          {!canvasInitialized && <CanvasLoadingOverlay />}

          {/* Minimap - fixed to viewport, positioned within scrollable area */}
          {canvasInitialized && <Minimap fabricManager={fabricManager} />}
          </div>

          {/* AI Text Box Overlay - fixed to viewport, replaces toolbar when open */}
          {isAIOpen && <AITextBox onClose={() => setIsAIOpen(false)} />}

          {/* Bottom Toolbar - Figma-style centered tool palette, fixed to viewport */}
          {!isAIOpen && canvasInitialized && (
            <BottomToolbar
              onAddShape={handleAddShape}
              activeTool={isPlacementMode ? 'rectangle' : 'select'}
              onAIToggle={handleAIToggle}
              isAIOpen={isAIOpen}
            />
          )}
        </div>
      </CanvasLayout>
    </div>
  );
}
