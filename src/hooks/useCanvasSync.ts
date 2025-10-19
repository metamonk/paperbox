/**
 * Canvas Sync Initialization Hook
 *
 * W1.D10: Initialize complete sync pipeline with Fabric.js integration
 *
 * Responsibilities:
 * 1. Initialize FabricCanvasManager (W1.D1-D2)
 * 2. Fetch initial canvas objects from Supabase on mount
 * 3. Setup Supabase→Zustand realtime subscription (W1.D4 SyncManager)
 * 4. Setup Fabric↔Zustand bidirectional sync (W1.D9 CanvasSyncManager)
 * 5. Cleanup subscriptions on unmount
 *
 * Architecture:
 * ```
 * Supabase ←→ SyncManager ←→ Zustand Store ←→ CanvasSyncManager ←→ Fabric.js
 * ```
 *
 * Usage:
 * ```tsx
 * function CanvasApp() {
 *   const { initialized, error, fabricManager } = useCanvasSync(canvasElement);
 *
 *   if (!initialized) return <Loading />;
 *   if (error) return <Error message={error} />;
 *
 *   return <Canvas fabricManager={fabricManager} />;
 * }
 * ```
 */

import { useEffect, useState, useRef } from 'react';
import { useAuth } from './useAuth';
import { usePaperboxStore } from '../stores';
import { getSyncManager, cleanupSyncManager } from '../lib/sync/SyncManager';
import { CanvasSyncManager } from '../lib/sync/CanvasSyncManager';
import { FabricCanvasManager } from '../lib/fabric/FabricCanvasManager';
import { NavigationShortcuts } from '../features/shortcuts/NavigationShortcuts';

// Debug flag - set to true to enable verbose sync logs
const DEBUG = false;

interface UseCanvasSyncResult {
  initialized: boolean;
  error: string | null;
  fabricManager: FabricCanvasManager | null;
}

/**
 * Initialize complete canvas sync pipeline
 *
 * Lifecycle:
 * 1. Wait for authentication and canvas element
 * 2. Initialize FabricCanvasManager with canvas element
 * 3. Initialize Zustand store (fetch objects from Supabase)
 * 4. Setup SyncManager (Supabase realtime subscription)
 * 5. Setup CanvasSyncManager (Fabric↔Zustand bidirectional sync)
 * 6. Cleanup on unmount or auth change
 *
 * @param canvasElement - HTML canvas element for Fabric.js rendering
 */
export function useCanvasSync(canvasElement: HTMLCanvasElement | null): UseCanvasSyncResult {
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fabricManager, setFabricManager] = useState<FabricCanvasManager | null>(null);

  // Refs to hold manager instances for cleanup
  const canvasSyncManagerRef = useRef<CanvasSyncManager | null>(null);
  const fabricManagerRef = useRef<FabricCanvasManager | null>(null);
  const navigationShortcutsRef = useRef<NavigationShortcuts | null>(null);

  // W5: Multi-canvas API (loadCanvases + setActiveCanvas replaces deprecated initialize)
  const loadCanvases = usePaperboxStore((state) => state.loadCanvases);
  const setActiveCanvas = usePaperboxStore((state) => state.setActiveCanvas);
  const createCanvas = usePaperboxStore((state) => state.createCanvas);
  const storeError = usePaperboxStore((state) => state.error);

  useEffect(() => {
    if (!user?.id || !canvasElement) {
      setInitialized(false);
      setError(null);
      return;
    }

    let syncManager: ReturnType<typeof getSyncManager> | null = null;
    let mounted = true;

    const setup = async () => {
      try {
        if (DEBUG) console.log('[useCanvasSync] Starting initialization for user:', user.id);

        // Step 1: Initialize FabricCanvasManager
        if (DEBUG) console.log('[useCanvasSync] Initializing FabricCanvasManager...');
        const fabric = new FabricCanvasManager();
        await fabric.initialize(canvasElement);

        if (!mounted) {
          fabric.dispose();
          return;
        }

        fabricManagerRef.current = fabric;
        setFabricManager(fabric);
        if (DEBUG) console.log('[useCanvasSync] FabricCanvasManager initialized');

        // Step 2: Load canvases from database (W5: Multi-canvas architecture)
        if (DEBUG) console.log('[useCanvasSync] Loading canvases from Supabase...');
        await loadCanvases(user.id);

        if (!mounted) {
          fabric.dispose();
          return;
        }

        // Step 2b: Ensure user has at least one canvas (create default if needed)
        let currentCanvases = usePaperboxStore.getState().canvases;

        if (currentCanvases.length === 0) {
          if (DEBUG) console.log('[useCanvasSync] No canvases found, creating default canvas...');
          await createCanvas('Untitled Canvas', 'Your first canvas');

          if (!mounted) {
            fabric.dispose();
            return;
          }

          // Reload to get the newly created canvas
          currentCanvases = usePaperboxStore.getState().canvases;
          if (DEBUG) console.log('[useCanvasSync] Default canvas created:', currentCanvases[0]?.id);
        }

        // Step 2c: Set active canvas if none is set
        const currentActiveId = usePaperboxStore.getState().activeCanvasId;

        if (currentCanvases.length > 0 && !currentActiveId) {
          if (DEBUG) console.log('[useCanvasSync] Setting active canvas:', currentCanvases[0].id);
          await setActiveCanvas(currentCanvases[0].id);
        }

        if (DEBUG) console.log('[useCanvasSync] Canvases loaded and active canvas set');

        // Step 3: Setup Supabase→Zustand realtime subscription (SyncManager)
        if (DEBUG) console.log('[useCanvasSync] Setting up Supabase realtime subscription...');
        syncManager = getSyncManager(user.id);
        await syncManager.initialize();

        if (!mounted) {
          fabric.dispose();
          return;
        }

        if (DEBUG) console.log('[useCanvasSync] Supabase subscription active');

        // Step 4: Setup Fabric↔Zustand bidirectional sync (CanvasSyncManager)
        if (DEBUG) console.log('[useCanvasSync] Setting up Fabric↔Zustand sync...');
        const canvasSync = new CanvasSyncManager(fabric, usePaperboxStore);
        canvasSync.initialize();

        if (!mounted) {
          canvasSync.dispose();
          fabric.dispose();
          return;
        }

        canvasSyncManagerRef.current = canvasSync;
        if (DEBUG) console.log('[useCanvasSync] CanvasSyncManager initialized');

        // Step 5: Setup navigation shortcuts (W2.D8)
        if (DEBUG) console.log('[useCanvasSync] Setting up navigation shortcuts...');
        const navShortcuts = new NavigationShortcuts({ canvasManager: fabric });
        navShortcuts.initialize();

        if (!mounted) {
          navShortcuts.dispose();
          canvasSync.dispose();
          fabric.dispose();
          return;
        }

        navigationShortcutsRef.current = navShortcuts;
        if (DEBUG) console.log('[useCanvasSync] NavigationShortcuts initialized');

        // Step 6: Setup scroll pan and zoom (W2.D12+: Figma-style interactions)
        if (DEBUG) console.log('[useCanvasSync] Setting up scroll pan and zoom...');
        fabric.setupSpacebarPan();
        fabric.setupScrollPanAndZoom();
        if (DEBUG) console.log('[useCanvasSync] Scroll pan and zoom initialized');

        setInitialized(true);
        setError(null);
        if (DEBUG) console.log('[useCanvasSync] Complete initialization successful ✅');
      } catch (err) {
        if (!mounted) return;

        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize canvas';
        setError(errorMessage);
        setInitialized(false);
        console.error('[useCanvasSync] Initialization error:', err);

        // Cleanup on error
        if (navigationShortcutsRef.current) {
          navigationShortcutsRef.current.dispose();
          navigationShortcutsRef.current = null;
        }
        if (canvasSyncManagerRef.current) {
          canvasSyncManagerRef.current.dispose();
          canvasSyncManagerRef.current = null;
        }
        if (fabricManagerRef.current) {
          fabricManagerRef.current.dispose();
          fabricManagerRef.current = null;
          setFabricManager(null);
        }
      }
    };

    setup();

    // Cleanup on unmount or user change
    return () => {
      mounted = false;
      if (DEBUG) console.log('[useCanvasSync] Cleaning up');

      // Cleanup NavigationShortcuts (W2.D8)
      if (navigationShortcutsRef.current) {
        navigationShortcutsRef.current.dispose();
        navigationShortcutsRef.current = null;
      }

      // Cleanup CanvasSyncManager (Fabric↔Zustand sync)
      if (canvasSyncManagerRef.current) {
        canvasSyncManagerRef.current.dispose();
        canvasSyncManagerRef.current = null;
      }

      // Cleanup SyncManager (Supabase→Zustand subscription)
      if (syncManager) {
        cleanupSyncManager().catch((err) => {
          console.error('[useCanvasSync] SyncManager cleanup error:', err);
        });
      }

      // Cleanup FabricCanvasManager
      if (fabricManagerRef.current) {
        fabricManagerRef.current.dispose();
        fabricManagerRef.current = null;
        setFabricManager(null);
      }
    };
  }, [user?.id, canvasElement, loadCanvases, setActiveCanvas, createCanvas]);

  // Propagate store errors to hook state
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  return {
    initialized,
    error,
    fabricManager,
  };
}
