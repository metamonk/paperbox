/**
 * CanvasSyncManager - Bidirectional Sync Coordination
 *
 * W1.D9: Coordinates synchronization between Fabric.js canvas (Layer 4)
 * and Zustand state (Layer 2) to maintain consistency.
 *
 * Architecture:
 * - Canvas → State: Wire Fabric events to Zustand actions
 * - State → Canvas: Subscribe to Zustand changes, update Fabric
 * - Loop Prevention: Use sync flags to prevent infinite updates
 * - Lifecycle: Initialize, cleanup, resource management
 *
 * @see docs/PHASE_2_PRD.md lines 979-1028 for sync architecture
 */

import type { FabricObject } from 'fabric';
import type { StoreApi } from 'zustand';
import type { FabricCanvasManager } from '../fabric/FabricCanvasManager';
import type { PaperboxStore } from '../../stores';
import type { CanvasObject } from '../../types/canvas';

/**
 * Zustand store API type that includes both state and methods
 */
type ZustandStore = {
  getState: () => PaperboxStore;
  setState: (state: Partial<PaperboxStore>) => void;
  subscribe: (listener: (state: PaperboxStore, prevState: PaperboxStore) => void) => () => void;
} & StoreApi<PaperboxStore>;

/**
 * Manages bidirectional synchronization between Fabric.js canvas and Zustand store
 */
export class CanvasSyncManager {
  private fabricManager: FabricCanvasManager;
  private store: ZustandStore;
  private unsubscribe: (() => void) | null = null;

  // Sync flags to prevent infinite loops
  private _isSyncingFromCanvas = false;
  private _isSyncingFromStore = false;

  constructor(fabricManager: FabricCanvasManager, store: ZustandStore) {
    this.fabricManager = fabricManager;
    this.store = store;
  }

  /**
   * Initialize bidirectional sync
   * Call this after both fabricManager and store are ready
   */
  initialize(): void {
    this.setupCanvasToStateSync();
    this.setupStateToCanvasSync();
    this.setupViewportSync(); // W2.D6-D7: Initialize viewport controls
  }

  /**
   * W2.D6-D7: Setup viewport controls and sync
   *
   * Initializes:
   * - Mousewheel zoom
   * - Spacebar + drag panning
   * - Viewport→Zustand sync callback
   * - Viewport persistence
   * - W2.D8.4-5: Pixel grid visualization
   */
  private setupViewportSync(): void {
    // W2.D12+: Removed old setupMousewheelZoom() call
    // Now using setupScrollPanAndZoom() in useCanvasSync for Figma-style interactions

    // W2.D12+: Removed setupSpacebarPan() call
    // Now called in useCanvasSync along with setupScrollPanAndZoom()

    // W2.D8.4-5: Setup pixel grid visualization (shows when zoom > 8x)
    this.fabricManager.setupPixelGrid();

    // Setup viewport→Zustand sync callback
    this.fabricManager.setViewportSyncCallback((zoom, panX, panY) => {
      // Sync viewport state to Zustand (which persists to localStorage + PostgreSQL)
      this.store.getState().syncViewport(zoom, panX, panY);
    });

    console.log('[CanvasSyncManager] Viewport controls initialized (zoom + pan + pixel grid)');
  }

  /**
   * Canvas → State: Wire Fabric.js events to Zustand actions
   *
   * Handles:
   * - object:modified → updateObject()
   * - selection:created/updated → setSelected()
   * - selection:cleared → clearSelection()
   */
  private setupCanvasToStateSync(): void {
    this.fabricManager.setupEventListeners({
      onObjectModified: (target: FabricObject) => {
        if (this._isSyncingFromStore) return; // Prevent loop

        this._isSyncingFromCanvas = true;
        try {
          const canvasObject = this.fabricManager.toCanvasObject(target);
          if (canvasObject) {
            // Use updateObject() which handles optimistic updates + DB sync
            this.store.getState().updateObject(canvasObject.id, canvasObject);
          }
        } finally {
          this._isSyncingFromCanvas = false;
        }
      },

      onSelectionCreated: (targets: FabricObject[]) => {
        const ids = targets.map(t => t.data?.id).filter(Boolean) as string[];
        this.store.getState().selectObjects(ids);
      },

      onSelectionUpdated: (targets: FabricObject[]) => {
        const ids = targets.map(t => t.data?.id).filter(Boolean) as string[];
        this.store.getState().selectObjects(ids);
      },

      onSelectionCleared: () => {
        this.store.getState().deselectAll();
      },
    });
  }

  /**
   * State → Canvas: Subscribe to Zustand changes, update Fabric.js
   *
   * Watches canvasStore.objects and syncs changes to Fabric.js:
   * - Additions: Add new Fabric objects
   * - Deletions: Remove Fabric objects
   * - Updates: Update existing Fabric objects
   *
   * Note: Uses internal _addObject/_updateObject/_removeObject methods
   * from canvasSlice.ts (lines 385-457) which are triggered by realtime
   * subscriptions to avoid duplicating database writes.
   */
  private setupStateToCanvasSync(): void {
    this.unsubscribe = this.store.subscribe(
      (state) => state.objects,
      (objects, prevObjects) => {
        if (this._isSyncingFromCanvas) return; // Prevent loop

        this._isSyncingFromStore = true;
        try {
          // Detect additions, updates, deletions
          const currentIds = new Set(Object.keys(objects));
          const prevIds = new Set(Object.keys(prevObjects));

          // Handle additions
          currentIds.forEach((id) => {
            if (!prevIds.has(id)) {
              this.fabricManager.addObject(objects[id]);
            }
          });

          // Handle deletions
          prevIds.forEach((id) => {
            if (!currentIds.has(id)) {
              this.fabricManager.removeObject(id);
            }
          });

          // Handle updates
          currentIds.forEach((id) => {
            if (prevIds.has(id)) {
              const current = objects[id];
              const prev = prevObjects[id];

              // Check if object actually changed (avoid unnecessary updates)
              if (this.hasObjectChanged(current, prev)) {
                // Update strategy: remove and re-add
                // This ensures all properties are in sync
                this.fabricManager.removeObject(id);
                this.fabricManager.addObject(current);
              }
            }
          });
        } finally {
          this._isSyncingFromStore = false;
        }
      }
    );
  }

  /**
   * Check if canvas object has meaningful changes
   * Compares key properties that affect rendering
   */
  private hasObjectChanged(current: CanvasObject, prev: CanvasObject): boolean {
    return (
      current.x !== prev.x ||
      current.y !== prev.y ||
      current.width !== prev.width ||
      current.height !== prev.height ||
      current.rotation !== prev.rotation ||
      current.opacity !== prev.opacity ||
      current.fill !== prev.fill ||
      current.locked_by !== prev.locked_by ||
      JSON.stringify(current.type_properties) !== JSON.stringify(prev.type_properties)
    );
  }

  /**
   * Cleanup subscriptions and resources
   * Call this on component unmount or when sync is no longer needed
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
