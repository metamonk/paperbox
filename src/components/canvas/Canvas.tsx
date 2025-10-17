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

import { useState, useCallback } from 'react';
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
import { CanvasLoadingOverlay } from './CanvasLoadingOverlay';
import { usePaperboxStore } from '../../stores';

export function Canvas() {
  // Canvas element ref for Fabric.js - use state to trigger hook when element mounts
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);

  // Callback ref to capture canvas element immediately
  const canvasCallbackRef = useCallback((node: HTMLCanvasElement | null) => {
    if (node) {
      console.log('[Canvas] Canvas element mounted, setting state');
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
  const { handleAddShape } = useShapeCreation({ fabricManager, user });

  // Sidebar state management
  const { sidebarOpen, sidebarContent, handleToggleTools, handleToggleUsers } = useSidebarState();

  // Zustand store for accessing canvas state
  const selectedIds = usePaperboxStore((state) => state.selectedIds);
  const deleteObjects = usePaperboxStore((state) => state.deleteObjects);

  // Canvas transform state (for cursor overlay)
  const [scale] = useState(1);
  const [position] = useState({ x: 0, y: 0 });

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
            ref={canvasCallbackRef}
            className="absolute inset-0"
            style={{
              width: '100%',
              height: '100%',
            }}
          />

          {/* Multiplayer Cursors Overlay */}
          <CursorOverlay
            cursors={cursors}
            scale={scale}
            stagePosition={position}
          />

          {/* Loading overlay - shown until canvas initializes */}
          {!canvasInitialized && <CanvasLoadingOverlay />}
        </div>

        {/* Backdrop for mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
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
              handleToggleTools(); // This will close the sidebar
            }
          }}
        >
          {sidebarContent === 'users' ? (
            <UsersPanel users={onlineUsers} currentUserId={currentUserId} />
          ) : (
            <ToolsSidebar
              onAddShape={handleAddShape}
              onDelete={handleDelete}
              hasSelection={selectedIds.length > 0}
            />
          )}
        </Sidebar>
      </div>
    </div>
  );
}
