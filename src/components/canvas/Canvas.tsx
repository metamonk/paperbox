/**
 * Main canvas component
 * Provides layout and integrates CanvasStage with Toolbar and other UI elements
 */

import { useCanvas } from '../../hooks/useCanvas';
import { CanvasStage } from './CanvasStage';
import { Toolbar } from './Toolbar';

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
    <div className="relative w-full h-screen overflow-hidden bg-gray-100">
      {/* Error banner - only shown for critical errors */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}
      
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
    </div>
  );
}

