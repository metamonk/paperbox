/**
 * Main canvas component
 * Provides layout and integrates CanvasStage with Toolbar and other UI elements
 */

import { useState, useEffect } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useBroadcastCursors } from '../../hooks/useBroadcastCursors';
import { usePresence } from '../../hooks/usePresence';
import { useAuth } from '../../hooks/useAuth';
import { useKeyboard } from '../../hooks/useKeyboard';
import { CanvasStage } from './CanvasStage';
import { ToolsSidebar } from './ToolsSidebar';
import { CursorOverlay } from '../collaboration/CursorOverlay';
import { UsersPanel } from '../collaboration/UsersPanel';
import { Header } from '../layout/Header';
import { Sidebar } from '../layout/Sidebar';
import { screenToCanvas } from '../../utils/canvas-helpers';

export function Canvas() {
  const {
    stageRef,
    transformerRef,
    scale,
    position,
    shapes,
    loading,
    error,
    selectedShapeId,
    toolMode: _toolMode, // eslint-disable-line @typescript-eslint/no-unused-vars -- Reserved for future tool UI indicator
    effectiveToolMode,
    handleWheel,
    handleDragEnd,
    addShape,
    updateShape,
    selectShape,
    deselectShape,
    deleteSelected,
    acquireLock,
    releaseLock,
  } = useCanvas();

  // Multiplayer cursors via Broadcast
  const { cursors, sendCursorUpdate } = useBroadcastCursors();

  // Presence tracking and online users
  const { onlineUsers, updateActivity, currentUserId } = usePresence();

  // Auth for logout
  const { signOut, user } = useAuth();

  // Sidebar state - which content and whether it's open
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarContent, setSidebarContent] = useState<'users' | 'tools'>('tools');
  
  // Auto-hide sidebar on mobile, default to tools on desktop
  useEffect(() => {
    const handleResize = () => {
      // 768px = Tailwind's md breakpoint
      const isDesktop = window.innerWidth >= 768;
      setSidebarOpen(isDesktop);
      // Default to tools sidebar on desktop
      if (isDesktop) {
        setSidebarContent('tools');
      }
    };
    
    // Set initial state
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Toggle tools sidebar
  const handleToggleTools = () => {
    if (sidebarOpen && sidebarContent === 'tools') {
      // Already open with tools → close
      setSidebarOpen(false);
    } else {
      // Either closed or showing users → open with tools
      setSidebarOpen(true);
      setSidebarContent('tools');
    }
  };

  // Toggle users sidebar  
  const handleToggleUsers = () => {
    if (sidebarOpen && sidebarContent === 'users') {
      // Already open with users → close
      setSidebarOpen(false);
    } else {
      // Either closed or showing tools → open with users
      setSidebarOpen(true);
      setSidebarContent('users');
    }
  };

  // Keyboard shortcuts for shape creation
  useKeyboard({
    'r': () => addShape('rectangle'),
    'c': () => addShape('circle'),
    't': () => addShape('text'),
  });

  /**
   * Handle mouse movement to broadcast cursor position
   * Converts screen coordinates to canvas coordinates before sending
   * Also updates activity for presence tracking
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to canvas coordinates
    const canvasPos = screenToCanvas(screenX, screenY, scale, position);
    
    // Send cursor update (throttled to 30 FPS in hook)
    sendCursorUpdate(canvasPos.x, canvasPos.y);

    // Update activity for presence (throttled to 5 seconds in hook)
    updateActivity();
  };

  /**
   * Stop broadcasting cursor when mouse leaves canvas
   */
  const handleMouseLeave = () => {
    // Cursor will automatically timeout and disappear on other clients
    // after 3 seconds of no updates (handled in useBroadcastCursors)
  };

  // Loading state with skeleton UI
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header skeleton */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Main content skeleton */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas area skeleton */}
          <div className="relative flex-1 overflow-hidden bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
              <p className="text-gray-700 text-lg font-medium">Loading canvas...</p>
              <p className="text-gray-500 text-sm mt-2">Fetching objects from database</p>
            </div>
          </div>

          {/* Sidebar skeleton */}
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
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with tools button, presence badge, and sign out */}
      <Header 
        userCount={onlineUsers.length}
        onSignOut={() => signOut()}
        userName={user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
        sidebarOpen={sidebarOpen}
        sidebarContent={sidebarContent}
        onToggleTools={handleToggleTools}
        onToggleUsers={handleToggleUsers}
      />

      {/* Main content area with canvas and sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div 
          className="relative flex-1 overflow-hidden bg-gray-100"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Error banner - only shown for critical errors */}
          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          <CanvasStage
            stageRef={stageRef}
            transformerRef={transformerRef}
            scale={scale}
            position={position}
            shapes={shapes}
            selectedShapeId={selectedShapeId}
            effectiveToolMode={effectiveToolMode}
            onWheel={handleWheel}
            onDragEnd={handleDragEnd}
            onUpdateShape={updateShape}
            onSelectShape={selectShape}
            onDeselectShape={deselectShape}
            onAcquireLock={acquireLock}
            onReleaseLock={releaseLock}
            onActivity={updateActivity}
          />

          {/* Multiplayer Cursors Overlay */}
          <CursorOverlay 
            cursors={cursors}
            scale={scale}
            stagePosition={position}
          />
        </div>

        {/* Backdrop for mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar with dynamic content - responsive overlay/inline */}
        <Sidebar 
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        >
          {sidebarContent === 'users' ? (
            <UsersPanel users={onlineUsers} currentUserId={currentUserId} />
          ) : (
            <ToolsSidebar 
              onAddShape={addShape}
              onDelete={deleteSelected}
              hasSelection={!!selectedShapeId}
            />
          )}
        </Sidebar>
      </div>
    </div>
  );
}

