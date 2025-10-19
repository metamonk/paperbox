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
import { UpdateQueue } from './UpdateQueue';
import { perfMonitor } from '../monitoring/PerformanceMonitor';
import { toast } from 'sonner';

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

  // W5.D5+++++: Update queue to prevent race conditions during rapid edits
  private updateQueue: UpdateQueue = new UpdateQueue();

  // W5.D5+++++: Track actively editing state (during drag, not just selected)
  private activelyEditingIds: Set<string> = new Set();

  constructor(fabricManager: FabricCanvasManager, store: any) {
    this.fabricManager = fabricManager;
    this.store = store;
  }

  /**
   * Initialize bidirectional sync
   * Call this after both fabricManager and store are ready
   */
  initialize(): void {
    try {
      console.log('[CanvasSyncManager] Starting initialization...');

      console.log('[CanvasSyncManager] 1/6 Setting up Canvas → State sync...');
      this.setupCanvasToStateSync();

      console.log('[CanvasSyncManager] 2/6 Setting up State → Canvas sync...');
      this.setupStateToCanvasSync();

      console.log('[CanvasSyncManager] 3/6 Setting up layers sync...');
      this.setupLayersSync(); // W4.D3: Sync layer visibility/lock to Fabric

      console.log('[CanvasSyncManager] 4/6 Setting up viewport sync...');
      this.setupViewportSync(); // W2.D6-D7: Initialize viewport controls

      console.log('[CanvasSyncManager] 5/6 Syncing initial state...');
      this.syncInitialState(); // W4.D3 FIX: Sync existing objects on initialization

      console.log('[CanvasSyncManager] 6/6 Setting up collaborative selection sync...');
      this.setupCollaborativeSelectionSync(); // W5.D5++++++ PHASE 1: Collaborative selection

      console.log('[CanvasSyncManager] ✅ Initialization complete');
    } catch (error) {
      console.error('[CanvasSyncManager] ❌ Initialization failed:', error);
      throw error;
    }
  }

  /**
   * W5.D5++++++ PHASE 1: Setup collaborative selection synchronization
   *
   * Subscribes to remote users' selection state changes and applies conflict resolution
   * to prevent ghost selections and simultaneous editing conflicts.
   */
  private setupCollaborativeSelectionSync(): void {
    // Subscribe to presence changes (remote users' selection updates)
    const unsubscribePresence = this.store.subscribe(
      (state) => state.presence,
      (presence, prevPresence) => {
        console.log('[🎯 DEBUG] Presence changed, checking for remote selections:', {
          userCount: Object.keys(presence).length,
          users: Object.keys(presence).map(userId => ({
            userId: userId.slice(0, 8),
            userName: presence[userId].userName,
            hasSelection: !!presence[userId].selection,
            selectionCount: presence[userId].selection?.objectIds.length || 0
          }))
        });

        // Check each user's selection for conflicts
        Object.keys(presence).forEach((userId) => {
          const user = presence[userId];
          const prevUser = prevPresence[userId];

          // Skip if no selection or selection unchanged
          if (!user.selection) return;
          if (prevUser?.selection?.updatedAt === user.selection.updatedAt) return;

          console.log('[🎯 DEBUG] Remote selection detected:', {
            userId: userId.slice(0, 8),
            userName: user.userName,
            objectIds: user.selection.objectIds,
            count: user.selection.objectIds.length
          });

          // Handle selection conflict with this user
          const conflictingIds = this.store.getState().handleSelectionConflict(userId, user.selection);

          if (conflictingIds.length > 0) {
            console.log('[CanvasSyncManager] Selection conflict detected, auto-deselecting:', conflictingIds);

            // Get current selected IDs
            const currentSelectedIds = this.store.getState().selectedIds;

            // Remove conflicting IDs from selection
            const newSelectedIds = currentSelectedIds.filter(id => !conflictingIds.includes(id));

            // Update local selection state
            this.store.getState().selectObjects(newSelectedIds);

            // Update Fabric.js canvas selection to match
            this._isSyncingFromStore = true;
            try {
              const canvas = this.fabricManager.getCanvas();
              if (canvas) {
                // Get currently selected objects
                const activeObjects = canvas.getActiveObjects();

                // Find objects that should be deselected
                const objectsToDeselect = activeObjects.filter(obj => {
                  const data = (obj as FabricObjectWithData).data;
                  return data?.id && conflictingIds.includes(data.id);
                });

                if (objectsToDeselect.length > 0) {
                  // Remove conflicting objects from selection
                  const newSelection = activeObjects.filter(obj => !objectsToDeselect.includes(obj));

                  // Update canvas selection
                  if (newSelection.length > 0) {
                    canvas.setActiveObject(newSelection.length === 1
                      ? newSelection[0]
                      : new (canvas.constructor as any).ActiveSelection(newSelection, { canvas })
                    );
                  } else {
                    canvas.discardActiveObject();
                  }

                  canvas.renderAll();
                  console.log('[CanvasSyncManager] Canvas selection updated after conflict resolution');
                }
              }
            } finally {
              this._isSyncingFromStore = false;
            }
          }
        });
      }
    );

    // Store unsubscribe function for cleanup
    const prevUnsubscribe = this.unsubscribe;
    this.unsubscribe = () => {
      prevUnsubscribe?.();
      unsubscribePresence();
    };

    console.log('[CanvasSyncManager] Collaborative selection sync initialized');
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
        try {
          console.log('[CanvasSyncManager] Adding initial object to Fabric:', {
            id: obj.id.slice(0, 8),
            type: obj.type,
            position: `(${obj.x}, ${obj.y})`,
          });
          const result = this.fabricManager.addObject(obj);
          if (!result) {
            console.warn('[CanvasSyncManager] Failed to add object (returned null):', obj.id);
          }
        } catch (error) {
          console.error('[CanvasSyncManager] Error adding individual object:', error);
          console.error('[CanvasSyncManager] Problematic object data:', obj);
          // Continue with next object instead of crashing
        }
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
      // W5.D5+++++: Track active editing during drag (for future locking)
      onObjectMoving: (target: FabricObject) => {
        if (this._isSyncingFromStore) return;

        // Track which objects are being actively edited
        const objects = (target as any)._objects || [target];
        const ids = objects
          .map((obj: FabricObject) => (obj as any).data?.id)
          .filter(Boolean) as string[];

        this.activelyEditingIds = new Set(ids);
        this.store.getState().broadcastActivelyEditing(ids);
      },

      onObjectModified: (target: FabricObject) => {
        if (this._isSyncingFromStore) return; // Prevent loop

        this._isSyncingFromCanvas = true;
        try {
          // W5.D5++++ UNIFIED STATE MANAGEMENT FIX: Handle ActiveSelection (group) movements
          // When moving multiple objects, Fabric.js fires object:modified with ActiveSelection
          // Use batchUpdateObjects() for atomic group updates instead of individual updateObject() calls

          // CRITICAL FIX: Check for ._objects property instead of constructor name
          // Constructor names get minified in production (e.g., 'ActiveSelection' → '_Jo')
          // The ._objects property is reliably present on ActiveSelection instances and won't be minified
          const objects = (target as any)._objects || [];
          const isGroupSelection = objects.length > 0;

          if (isGroupSelection) {
            console.log(`[CanvasSyncManager] 🎯 Group modification detected - batch updating ${objects.length} objects`);

            // CRITICAL FIX: Use Fabric.js getBoundingRect for TRUE absolute coordinates
            // Previous approach was wrong - Fabric.js internal coordinates are complex
            const batchUpdates: Array<{ id: string; updates: Partial<CanvasObject> }> = [];

            objects.forEach((obj: FabricObject) => {
              // CORRECT: Use getBoundingRect to get absolute canvas coordinates
              // absolute=true means canvas coordinates, not viewport coordinates
              // withTransform=true includes object's own transformations
              const rect = obj.getBoundingRect(true, true);
              
              console.log('[CanvasSyncManager] 🎯 Object absolute position:', {
                id: (obj as any).data?.id?.slice(0, 8),
                absoluteRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
              });

              // Convert to CanvasObject with CORRECT absolute coords
              const canvasObject = this.fabricManager.toCanvasObject(obj);
              if (canvasObject) {
                batchUpdates.push({
                  id: canvasObject.id,
                  updates: {
                    ...canvasObject,
                    // Use bounding rect for accurate position
                    // Note: Fabric's bounding rect gives top-left corner
                    // But our canvas objects store center position
                    // So we need to adjust
                    x: rect.left + (rect.width / 2),   // Center X
                    y: rect.top + (rect.height / 2),   // Center Y
                    width: rect.width,
                    height: rect.height,
                  },
                });
              }
            });

            // Single atomic batch update (prevents stale broadcasts)
            // W5.D5+++++: Use update queue to prevent race conditions
            if (batchUpdates.length > 0) {
              console.log(`[CanvasSyncManager] ⚡ Batch updating ${batchUpdates.length} objects atomically`);
              
              // Queue the batch update to ensure proper ordering
              this.updateQueue.enqueue(async () => {
                await this.store.getState().batchUpdateObjects(batchUpdates);
              }).catch((error) => {
                console.error('[CanvasSyncManager] ❌ Batch update failed:', error);
              });
            }
          } else {
            // Single object path
            const canvasObject = this.fabricManager.toCanvasObject(target);
            if (canvasObject) {
              // W5.D5+++++: Queue single update to prevent race conditions
              this.updateQueue.enqueue(async () => {
                await this.store.getState().updateObject(canvasObject.id, canvasObject);
              }).catch((error) => {
                console.error('[CanvasSyncManager] ❌ Update failed:', error);
              });
            }
          }

          // Clear active editing state after drag ends
          this.activelyEditingIds.clear();
          this.store.getState().broadcastActivelyEditing([]);
        } finally {
          this._isSyncingFromCanvas = false;
        }

        // W5.D5++++: Update collaborative overlays after any modification
        // This keeps lock/selection indicators positioned correctly during movement
        this.fabricManager.updateOverlayPositions();
      },

      onSelectionCreated: (targets: FabricObject[]) => {
        // CRITICAL FIX: Prevent selection events during programmatic updates
        if (this._isSyncingFromStore) return;

        console.log('[CanvasSyncManager] ✅ Selection created:', { count: targets.length });
        
        const ids = targets.map(t => (t as FabricObjectWithData).data?.id).filter(Boolean) as string[];

        // Simple immediate selection (no locks, no visual customization)
        // Focus on correctness first, visual polish later
        this.store.getState().selectObjects(ids);
        this.store.getState().broadcastSelection(ids);

        console.log('[CanvasSyncManager] ✅ Selection set immediately:', { ids });
      },

      onSelectionUpdated: (targets: FabricObject[]) => {
        // CRITICAL FIX: Prevent selection events during programmatic updates
        if (this._isSyncingFromStore) return;

        console.log('[CanvasSyncManager] ✅ Selection updated:', { count: targets.length });
        
        const ids = targets.map(t => (t as FabricObjectWithData).data?.id).filter(Boolean) as string[];

        // EMERGENCY FIX: Simple immediate selection (no locks)
        this.store.getState().selectObjects(ids);
        this.store.getState().broadcastSelection(ids);
        
        console.log('[CanvasSyncManager] ✅ Selection updated immediately:', { ids });
      },

      onSelectionCleared: () => {
        // CRITICAL FIX: Prevent selection events during programmatic updates
        if (this._isSyncingFromStore) return;

        console.log('[CanvasSyncManager] ✅ Selection cleared');

        // EMERGENCY FIX: Simple immediate deselection
        this.store.getState().deselectAll();
        this.store.getState().broadcastSelection([]);
        
        console.log('[CanvasSyncManager] ✅ Selection cleared immediately');
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
          const canvas = this.fabricManager.getCanvas();
          const activeObjects = canvas?.getActiveObjects() || [];
          const selectedIds = this.store.getState().selectedIds;

          console.log('[🎯 DEBUG] State→Canvas sync - BEFORE updates:', {
            fabricSelection: activeObjects.length,
            zustandSelection: selectedIds.length,
            selectedIds
          });

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

          // CRITICAL FIX: Restore ActiveSelection after updates
          // When objects are removed and re-added, Fabric.js loses the selection
          // We need to restore it based on Zustand state
          const selectedIdsAfter = this.store.getState().selectedIds;

          if (canvas && selectedIdsAfter.length > 0) {
            // Find the updated Fabric objects by ID
            const objectsToSelect = selectedIdsAfter
              .map(id => {
                const fabricObj = canvas.getObjects().find(obj => 
                  (obj as FabricObjectWithData).data?.id === id
                );
                return fabricObj;
              })
              .filter(Boolean) as FabricObject[];

            console.log('[🎯 DEBUG] Restoring selection after updates:', {
              zustandSelection: selectedIdsAfter.length,
              fabricObjectsFound: objectsToSelect.length,
              selectedIds: selectedIdsAfter
            });

            // Restore selection if we found matching objects
            if (objectsToSelect.length > 0) {
              if (objectsToSelect.length === 1) {
                // Single object selection
                canvas.setActiveObject(objectsToSelect[0]);
              } else {
                // Multi-object selection (ActiveSelection)
                // Import fabric for ActiveSelection constructor
                const fabric = (window as any).fabric;
                if (fabric && fabric.ActiveSelection) {
                  const activeSelection = new fabric.ActiveSelection(objectsToSelect, { canvas });
                  canvas.setActiveObject(activeSelection);
                  console.log('[🎯 DEBUG] Restored ActiveSelection with', objectsToSelect.length, 'objects');
                }
              }
              canvas.renderAll();
            }
          }

          // DEBUG: Check selection state AFTER updates and restoration
          const activeObjectsAfter = canvas?.getActiveObjects() || [];

          console.log('[🎯 DEBUG] State→Canvas sync - AFTER updates & restoration:', {
            fabricSelection: activeObjectsAfter.length,
            zustandSelection: selectedIdsAfter.length,
            selectedIds: selectedIdsAfter,
            selectionRestored: selectedIdsAfter.length > 0 && activeObjectsAfter.length > 0
          });

          if (selectedIdsAfter.length > 0 && activeObjectsAfter.length === 0) {
            console.warn('[🎯 DEBUG] ⚠️ SELECTION RESTORATION FAILED - objects may not exist yet');
          }
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
   *
   * W5.D5+++++ Uses precision tolerance to prevent false positives from database rounding
   */
  private hasObjectChanged(current: CanvasObject, prev: CanvasObject): boolean {
    // Round to 2 decimal places (0.01 pixel precision)
    const round = (n: number) => Math.round(n * 100) / 100;

    return (
      round(current.x) !== round(prev.x) ||
      round(current.y) !== round(prev.y) ||
      round(current.width) !== round(prev.width) ||
      round(current.height) !== round(prev.height) ||
      round(current.rotation) !== round(prev.rotation) ||
      current.opacity !== prev.opacity ||
      current.fill !== prev.fill ||
      current.stroke !== prev.stroke ||
      current.stroke_width !== prev.stroke_width ||
      current.locked_by !== prev.locked_by ||
      JSON.stringify(current.type_properties) !== JSON.stringify(prev.type_properties) ||
      JSON.stringify(current.style_properties) !== JSON.stringify(prev.style_properties)
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

    // W5.D5+++++: Clear update queue and active editing state
    this.updateQueue.clear();
    this.activelyEditingIds.clear();

    console.log('[CanvasSyncManager] Cleanup complete');
  }
}
