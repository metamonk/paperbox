/**
 * Main canvas component
 * Provides layout and integrates CanvasStage with Toolbar and other UI elements
 */

import { useCanvas } from '../../hooks/useCanvas';
import { useBroadcastCursors } from '../../hooks/useBroadcastCursors';
import { useAuth } from '../../hooks/useAuth';
import { CanvasStage } from './CanvasStage';
import { Toolbar } from './Toolbar';
import { CursorOverlay } from '../collaboration/CursorOverlay';
import { screenToCanvas } from '../../utils/canvas-helpers';

export function Canvas() {
  const {
    stageRef,
    scale,
    position,
    shapes,
    loading,
    error,
    handleWheel,
    handleDragEnd,
    addShape,
    updateShape,
    acquireLock,
    releaseLock,
  } = useCanvas();

  // Multiplayer cursors via Broadcast
  const { cursors, sendCursorUpdate } = useBroadcastCursors();

  // Auth for logout
  const { signOut, user } = useAuth();

  /**
   * Handle mouse movement to broadcast cursor position
   * Converts screen coordinates to canvas coordinates before sending
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // Convert to canvas coordinates
    const canvasPos = screenToCanvas(screenX, screenY, scale, position);
    
    // Send cursor update (throttled to 30 FPS in hook)
    sendCursorUpdate(canvasPos.x, canvasPos.y);
  };

  /**
   * Stop broadcasting cursor when mouse leaves canvas
   */
  const handleMouseLeave = () => {
    // Cursor will automatically timeout and disappear on other clients
    // after 3 seconds of no updates (handled in useBroadcastCursors)
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
          <p className="text-gray-700 text-lg font-medium">Loading canvas...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching objects from database</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-gray-100"
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

      {/* User info and logout button */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-3 z-10">
        <div className="text-sm">
          <p className="font-medium text-gray-900">
            {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User'}
          </p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <button
          onClick={() => signOut()}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
          title="Sign Out"
        >
          Logout
        </button>
      </div>
      
      <Toolbar onAddShape={addShape} />
      <CanvasStage
        stageRef={stageRef}
        scale={scale}
        position={position}
        shapes={shapes}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onUpdateShape={updateShape}
        onAcquireLock={acquireLock}
        onReleaseLock={releaseLock}
      />

      {/* Multiplayer Cursors Overlay */}
      <CursorOverlay 
        cursors={cursors}
        scale={scale}
        stagePosition={position}
      />
    </div>
  );
}

