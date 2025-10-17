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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCanvasSync } from '../../hooks/useCanvasSync';
import { useBroadcastCursors } from '../../hooks/useBroadcastCursors';
import { usePresence } from '../../hooks/usePresence';
import { useAuth } from '../../hooks/useAuth';
import { CursorOverlay } from '../collaboration/CursorOverlay';
import { UsersPanel } from '../collaboration/UsersPanel';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { ToolsSidebar } from './ToolsSidebar';
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

  // Zustand store for accessing canvas state
  const selectedIds = usePaperboxStore((state) => state.selectedIds);
  const deleteObjects = usePaperboxStore((state) => state.deleteObjects);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarContent, setSidebarContent] = useState<'users' | 'tools'>('tools');

  // Canvas transform state (for cursor overlay)
  const [scale] = useState(1);
  const [position] = useState({ x: 0, y: 0 });

  // Auto-hide sidebar on mobile, default to tools on desktop
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      setSidebarOpen(isDesktop);
      if (isDesktop) {
        setSidebarContent('tools');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle tools sidebar
  const handleToggleTools = () => {
    if (sidebarOpen && sidebarContent === 'tools') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setSidebarContent('tools');
    }
  };

  // Toggle users sidebar
  const handleToggleUsers = () => {
    if (sidebarOpen && sidebarContent === 'users') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setSidebarContent('users');
    }
  };

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
   * Handle shape creation requests from toolbar
   */
  const handleAddShape = (type: 'rectangle' | 'circle' | 'text') => {
    console.log('[Canvas] handleAddShape called with type:', type);
    console.log('[Canvas] fabricManager:', fabricManager);
    console.log('[Canvas] user:', user);

    if (!fabricManager || !user) {
      console.log('[Canvas] Early return - fabricManager or user is null');
      return;
    }

    // Create shape via Fabric.js
    // The CanvasSyncManager will automatically sync this to Zustand → Supabase
    const centerX = (window.innerWidth / 2) - 100;
    const centerY = (window.innerHeight / 2) - 75;

    // Build type-specific properties based on canvas.ts type definitions
    let typeProperties: Record<string, any> = {};
    let width = 200;
    let height = 150;

    if (type === 'circle') {
      // Circle requires radius in type_properties
      const radius = 75;
      typeProperties = { radius };
      width = radius * 2;
      height = radius * 2;
    } else if (type === 'text') {
      // Text requires text_content and font_size (note: underscore naming)
      typeProperties = {
        text_content: 'New Text',
        font_size: 16
      };
      width = 200;
      height = 50;
    } else if (type === 'rectangle') {
      // Rectangle has optional corner_radius
      typeProperties = { corner_radius: 0 };
      width = 200;
      height = 150;
    }

    const baseObject = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      x: centerX,
      y: centerY,
      width,
      height,
      rotation: 0,
      opacity: 1,
      fill: type === 'rectangle' ? '#3B82F6' : type === 'circle' ? '#10B981' : '#EF4444',
      stroke: null,
      stroke_width: null,
      group_id: null,
      z_index: 1,
      style_properties: {},
      metadata: {},
      locked_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id,
      lock_acquired_at: null,
      type_properties: typeProperties,
    };

    console.log('[Canvas] Calling fabricManager.addObject with:', baseObject);
    // Use fabricManager to add object to canvas
    // CanvasSyncManager will sync to Zustand, then SyncManager syncs to Supabase
    fabricManager.addObject(baseObject as any);
    console.log('[Canvas] addObject call completed');
  };

  /**
   * Handle delete requests from toolbar
   */
  const handleDelete = () => {
    if (selectedIds.length > 0) {
      deleteObjects(selectedIds);
    }
  };

  // Loading overlay component (shown on top of canvas during initialization)
  const LoadingOverlay = () => (
    <div className="absolute inset-0 z-50 bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1 overflow-hidden bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
            <p className="text-gray-700 text-lg font-medium">Loading canvas...</p>
            <p className="text-gray-500 text-sm mt-2">
              Initializing Fabric.js and realtime sync...
            </p>
          </div>
        </div>

        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );

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
          {!canvasInitialized && <LoadingOverlay />}
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
          onClose={() => setSidebarOpen(false)}
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
