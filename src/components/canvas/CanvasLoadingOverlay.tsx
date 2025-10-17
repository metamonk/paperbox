/**
 * Canvas Loading Overlay Component
 * W2.D9: Extracted from Canvas.tsx for better separation of concerns
 *
 * Displays a loading state while the canvas initializes:
 * - Fabric.js canvas setup
 * - Realtime sync connection
 * - Initial data fetch from Supabase
 */

export function CanvasLoadingOverlay() {
  return (
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
}
