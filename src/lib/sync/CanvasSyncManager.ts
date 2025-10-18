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
 * Extended FabricObject type with custom data property
 */
interface FabricObjectWithData extends FabricObject {
  data?: { id: string; type: string };
}

/**
 * Zustand store API type that includes both state and methods
 * Supports subscribe with selector pattern (subscribeWithSelector middleware)
 */
type ZustandStore = {
  getState: () => PaperboxStore;
  setState: (state: Partial<PaperboxStore>) => void;
  subscribe: {
    (listener: (state: PaperboxStore, prevState: PaperboxStore) => void): () => void;
    <U>(selector: (state: PaperboxStore) => U, listener: (slice: U, previousSlice: U) => void): () => void;
  };
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

  constructor(fabricManager: FabricCanvasManager, store: any) {
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
    this.setupLayersSync(); // W4.D3: Sync layer visibility/lock to Fabric
    this.setupViewportSync(); // W2.D6-D7: Initialize viewport controls
    this.syncInitialState(); // W4.D3 FIX: Sync existing objects on initialization
  }

  /**
   * W4.D3 FIX: Sync initial state from Zustand to Fabric
   *
   * Called during initialization to render objects that were loaded
   * from database before CanvasSyncManager was set up.
   *
   * The subscription in setupStateToCanvasSync() only catches changes
   * AFTER it's initialized, so we need this explicit initial sync.
   */
  private syncInitialState(): void {
    const objects = this.store.getState().objects;
    const objectCount = Object.keys(objects).length;

    console.log('[CanvasSyncManager] Syncing initial state:', {
      objectCount,
      objectIds: Object.keys(objects),
    });

    if (objectCount === 0) {
      console.log('[CanvasSyncManager] No objects to sync');
      return;
    }

    // Add all existing objects to Fabric canvas
    this._isSyncingFromStore = true;
    try {
      Object.values(objects).forEach((obj: any) => {
        console.log('[CanvasSyncManager] Adding initial object to Fabric:', {
          id: obj.id.slice(0, 8),
          type: obj.type,
          position: `(${obj.x}, ${obj.y})`,
        });
        this.fabricManager.addObject(obj);
      });
    } finally {
      this._isSyncingFromStore = false;
    }

    console.log('[CanvasSyncManager] Initial state sync complete');
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
        // CRITICAL FIX: Prevent selection events during programmatic updates
        if (this._isSyncingFromStore) return;

        console.log('[CanvasSyncManager] 🎯 onSelectionCreated handler called', {
          targetCount: targets.length,
          targets
        });
        const ids = targets.map(t => (t as FabricObjectWithData).data?.id).filter(Boolean) as string[];
        console.log('[CanvasSyncManager] Extracted IDs:', ids);
        console.log('[CanvasSyncManager] Calling store.selectObjects()');
        this.store.getState().selectObjects(ids);
        console.log('[CanvasSyncManager] Store selectedIds after selection:', this.store.getState().selectedIds);
      },

      onSelectionUpdated: (targets: FabricObject[]) => {
        // CRITICAL FIX: Prevent selection events during programmatic updates
        if (this._isSyncingFromStore) return;

        console.log('[CanvasSyncManager] 🎯 onSelectionUpdated handler called', {
          targetCount: targets.length,
          targets
        });
        const ids = targets.map(t => (t as FabricObjectWithData).data?.id).filter(Boolean) as string[];
        console.log('[CanvasSyncManager] Extracted IDs:', ids);
        console.log('[CanvasSyncManager] Calling store.selectObjects()');
        this.store.getState().selectObjects(ids);
        console.log('[CanvasSyncManager] Store selectedIds after selection:', this.store.getState().selectedIds);
      },

      onSelectionCleared: () => {
        // CRITICAL FIX: Prevent selection events during programmatic updates
        if (this._isSyncingFromStore) return;

        console.log('[CanvasSyncManager] 🎯 onSelectionCleared handler called');
        console.log('[CanvasSyncManager] Calling store.deselectAll()');
        this.store.getState().deselectAll();
        console.log('[CanvasSyncManager] Store selectedIds after deselection:', this.store.getState().selectedIds);
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
        console.log('[CanvasSyncManager] State→Canvas sync triggered', {
          currentCount: Object.keys(objects).length,
          prevCount: Object.keys(prevObjects).length,
          isSyncingFromCanvas: this._isSyncingFromCanvas
        });

        if (this._isSyncingFromCanvas) {
          console.log('[CanvasSyncManager] Skipping - sync from canvas in progress');
          return; // Prevent loop
        }

        this._isSyncingFromStore = true;
        try {
          // Detect additions, updates, deletions
          const currentIds = new Set(Object.keys(objects));
          const prevIds = new Set(Object.keys(prevObjects));

          console.log('[CanvasSyncManager] Analyzing changes', {
            current: Array.from(currentIds),
            previous: Array.from(prevIds)
          });

          // Handle additions
          currentIds.forEach((id) => {
            if (!prevIds.has(id)) {
              console.log('[CanvasSyncManager] Adding new object to Fabric:', id, objects[id]);
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
   * W4.D3: Setup layers visibility/lock sync
   * W4.D4: Extended to sync z-index changes
   *
   * Watches layersSlice.layers and syncs visibility/lock/z-index to Fabric.js:
   * - Visibility changes: Update object.visible property
   * - Lock changes: Update object.selectable and evented properties
   * - Z-index changes: Update object stacking order on canvas
   */
  private setupLayersSync(): void {
    this.store.subscribe(
      (state) => state.layers,
      (layers, prevLayers) => {
        console.log('[CanvasSyncManager] Layers sync triggered', {
          layerCount: Object.keys(layers).length,
        });

        // Check each layer for visibility/lock/z-index changes
        Object.entries(layers).forEach(([objectId, layer]) => {
          const prevLayer = prevLayers[objectId];

          // Skip if layer didn't exist before
          if (!prevLayer) return;

          const canvas = this.fabricManager.getCanvas();
          if (!canvas) return;

          // Find the Fabric object
          const fabricObj = canvas.getObjects().find(
            (obj: FabricObjectWithData) => obj.data?.id === objectId
          );

          if (!fabricObj) return;

          // Handle visibility change
          if (layer.visible !== prevLayer.visible) {
            console.log(`[CanvasSyncManager] Visibility change for ${objectId}:`, layer.visible);
            fabricObj.visible = layer.visible;
          }

          // Handle lock change
          if (layer.locked !== prevLayer.locked) {
            console.log(`[CanvasSyncManager] Lock change for ${objectId}:`, layer.locked);
            fabricObj.selectable = !layer.locked;
            fabricObj.evented = !layer.locked;
          }

          // W4.D4: Handle z-index change
          if (layer.zIndex !== prevLayer.zIndex) {
            console.log(`[CanvasSyncManager] Z-index change for ${objectId}:`, {
              from: prevLayer.zIndex,
              to: layer.zIndex,
            });
            this.fabricManager.setZIndex(objectId, layer.zIndex);
          }
        });

        // Request re-render after changes
        this.fabricManager.getCanvas()?.requestRenderAll();
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
      current.stroke !== prev.stroke || // FIX #2: Add stroke detection
      current.stroke_width !== prev.stroke_width || // FIX #2: Add stroke_width detection
      current.locked_by !== prev.locked_by ||
      JSON.stringify(current.type_properties) !== JSON.stringify(prev.type_properties) ||
      JSON.stringify(current.style_properties) !== JSON.stringify(prev.style_properties) // FIX #2: Add style_properties detection
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
