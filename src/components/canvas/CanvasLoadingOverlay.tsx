/**
 * Canvas Loading Overlay Component
 * W2.D9: Extracted from Canvas.tsx for better separation of concerns
 *
 * Displays a loading state while the canvas initializes:
 * - Fabric.js canvas setup
 * - Realtime sync connection
 * - Initial data fetch from Supabase
 *
 * Theme-aware with simple centered loading state.
 */

export function CanvasLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-50 bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        <p className="text-foreground text-lg font-medium">Loading canvas...</p>
        <p className="text-muted-foreground text-sm mt-2">
          Initializing workspace...
        </p>
      </div>
    </div>
  );
}
