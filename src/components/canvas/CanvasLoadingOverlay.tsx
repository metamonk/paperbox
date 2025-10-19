import { LoadingScreen } from '@/components/ui/LoadingScreen';

/**
 * Canvas Loading Overlay Component
 * W2.D9: Extracted from Canvas.tsx for better separation of concerns
 *
 * Displays a loading state while the canvas initializes:
 * - Fabric.js canvas setup
 * - Realtime sync connection
 * - Initial data fetch from Supabase
 *
 * Uses unified LoadingScreen component with animated logo.
 */

export function CanvasLoadingOverlay() {
  return <LoadingScreen fullscreen={false} />;
}
