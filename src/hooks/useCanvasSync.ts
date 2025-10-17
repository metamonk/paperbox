/**
 * Canvas Sync Initialization Hook
 *
 * W1.D4.8: Initialize Zustand store and SyncManager for authenticated users
 *
 * Responsibilities:
 * 1. Fetch initial canvas objects from Supabase on mount
 * 2. Setup realtime subscription via SyncManager
 * 3. Cleanup subscriptions on unmount
 *
 * Usage:
 * ```tsx
 * function CanvasApp() {
 *   const { initialized, error } = useCanvasSync();
 *
 *   if (!initialized) return <Loading />;
 *   if (error) return <Error message={error} />;
 *
 *   return <Canvas />;
 * }
 * ```
 */

import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { usePaperboxStore } from '../stores';
import { getSyncManager, cleanupSyncManager } from '../lib/sync/SyncManager';

interface UseCanvasSyncResult {
  initialized: boolean;
  error: string | null;
}

/**
 * Initialize canvas state and realtime synchronization
 *
 * Lifecycle:
 * 1. Wait for authentication
 * 2. Initialize Zustand store (fetch objects from Supabase)
 * 3. Setup SyncManager realtime subscription
 * 4. Cleanup on unmount or auth change
 */
export function useCanvasSync(): UseCanvasSyncResult {
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeCanvas = usePaperboxStore((state) => state.initialize);
  const storeError = usePaperboxStore((state) => state.error);

  useEffect(() => {
    if (!user?.id) {
      setInitialized(false);
      setError(null);
      return;
    }

    let syncManager: ReturnType<typeof getSyncManager> | null = null;
    let mounted = true;

    const setup = async () => {
      try {
        console.log('[useCanvasSync] Starting initialization for user:', user.id);

        // Step 1: Initialize Zustand store (fetch objects from Supabase)
        await initializeCanvas(user.id);

        if (!mounted) return;

        // Step 2: Setup realtime subscription via SyncManager
        syncManager = getSyncManager(user.id);
        await syncManager.initialize();

        if (!mounted) return;

        setInitialized(true);
        setError(null);
        console.log('[useCanvasSync] Initialization complete');
      } catch (err) {
        if (!mounted) return;

        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize canvas';
        setError(errorMessage);
        setInitialized(false);
        console.error('[useCanvasSync] Initialization error:', err);
      }
    };

    setup();

    // Cleanup on unmount or user change
    return () => {
      mounted = false;
      console.log('[useCanvasSync] Cleaning up');

      if (syncManager) {
        cleanupSyncManager().catch((err) => {
          console.error('[useCanvasSync] Cleanup error:', err);
        });
      }
    };
  }, [user?.id, initializeCanvas]);

  // Propagate store errors to hook state
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  return {
    initialized,
    error,
  };
}
