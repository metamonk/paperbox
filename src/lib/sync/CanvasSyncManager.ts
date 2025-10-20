/**
 * CanvasSyncManager - Bidirectional Sync Coordination
 *
 * Coordinates synchronization between Fabric.js canvas and Zustand store
 *
 * Architecture:
 * - Canvas → State: Wire Fabric events to Zustand actions
 * - State → Canvas: Subscribe to Zustand changes, update Fabric
 * - Loop Prevention: Use sync flags to prevent infinite updates
 * - Lifecycle: Initialize, cleanup, resource management
 */

import type { FabricObject } from 'fabric';
import type { StoreApi } from 'zustand';
import type { FabricCanvasManager } from '../fabric/FabricCanvasManager';
import type { PaperboxStore } from '../../stores';
import type { CanvasObject } from '../../types/canvas';
import { UpdateQueue } from './UpdateQueue';
import { toast } from 'sonner';
import { TransformCommand } from '../commands/TransformCommand';
import { fabricToCenter } from '../fabric/coordinateTranslation';

interface FabricObjectWithData extends FabricObject {
  data?: { id: string; type: string };
}

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

  // Update queue to prevent race conditions during rapid edits
  private updateQueue: UpdateQueue = new UpdateQueue();

  // Track actively editing state (during drag, not just selected)
  private activelyEditingIds: Set<string> = new Set();

  // Capture object state before transformations for undo/redo
  private transformStartState: Map<string, {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    type_properties?: any;
  }> = new Map();

  // PERFORMANCE OPTIMIZATION #5: Batch movement updates during drag
  private movementBatchQueue: Map<string, Partial<CanvasObject>> = new Map();
  private movementBatchTimeout: number | null = null;
  private readonly MOVEMENT_BATCH_DELAY_MS = 50; // Flush after 50ms of inactivity

  // CRITICAL FIX: State→Canvas sync batching to prevent selection issues
  // When multiple realtime UPDATE events arrive rapidly (from batch_update_canvas_objects),
  // we need to process them together to avoid removing/re-adding objects individually
  private stateToCanvasBatchQueue: Set<string> = new Set();
  private stateToCanvasBatchTimeout: number | null = null;
  private readonly STATE_TO_CANVAS_BATCH_DELAY_MS = 16; // ~1 frame (60fps)

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
      this.setupCanvasToStateSync();
      this.setupStateToCanvasSync();
      this.setupLayersSync();
      this.setupViewportSync();
      this.syncInitialState();
      this.setupCollaborativeSelectionSync();
    } catch (error) {
      console.error('[CanvasSyncManager] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Setup collaborative selection synchronization
   * Subscribes to remote users' selection changes and applies conflict resolution
   */
  private setupCollaborativeSelectionSync(): void {
    const unsubscribePresence = this.store.subscribe(
      (state) => state.presence,
      (presence, prevPresence) => {
        // Check each user's selection for conflicts
        Object.keys(presence).forEach((userId) => {
          const user = presence[userId];
          const prevUser = prevPresence[userId];

          // Skip if no selection or selection unchanged
          if (!user.selection) return;
          if (prevUser?.selection?.updatedAt === user.selection.updatedAt) return;

          // Handle selection conflict with this user
          const conflictingIds = this.store.getState().handleSelectionConflict(userId, user.selection);

          if (conflictingIds.length > 0) {
            const currentSelectedIds = this.store.getState().selectedIds;
            const newSelectedIds = currentSelectedIds.filter(id => !conflictingIds.includes(id));

            // Update local selection state
            this.store.getState().selectObjects(newSelectedIds);

            // Update Fabric.js canvas selection to match
            this._isSyncingFromStore = true;
            try {
              const canvas = this.fabricManager.getCanvas();
              if (canvas) {
                const activeObjects = canvas.getActiveObjects();
                const objectsToDeselect = activeObjects.filter(obj => {
                  const data = (obj as FabricObjectWithData).data;
                  return data?.id && conflictingIds.includes(data.id);
                });

                if (objectsToDeselect.length > 0) {
                  const newSelection = activeObjects.filter(obj => !objectsToDeselect.includes(obj));

                  if (newSelection.length > 0) {
                    canvas.setActiveObject(newSelection.length === 1
                      ? newSelection[0]
                      : new (canvas.constructor as any).ActiveSelection(newSelection, { canvas })
                    );
                  } else {
                    canvas.discardActiveObject();
                  }

                  canvas.renderAll();
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
  }

  /**
   * Sync initial state from Zustand to Fabric
   * Called during initialization to render objects loaded from database
   */
  private syncInitialState(): void {
    const objects = this.store.getState().objects;
    const objectCount = Object.keys(objects).length;

    if (objectCount === 0) return;

    this._isSyncingFromStore = true;
    try {
      Object.values(objects).forEach((obj: any) => {
        try {
          const result = this.fabricManager.addObject(obj);
          if (!result) {
            console.warn('[CanvasSyncManager] Failed to add object:', obj.id);
          }
        } catch (error) {
          console.error('[CanvasSyncManager] Error adding object:', error);
        }
      });
    } finally {
      this._isSyncingFromStore = false;
    }
  }

  /**
   * Setup viewport controls and sync
   * Initializes pixel grid, zoom/pan, and viewport persistence
   */
  private setupViewportSync(): void {
    // Setup pixel grid visualization (shows when zoom > 4x)
    this.fabricManager.setupPixelGrid();

    // Setup viewport→Zustand sync callback
    this.fabricManager.setViewportSyncCallback((zoom, panX, panY) => {
      this.store.getState().syncViewport(zoom, panX, panY);
    });
  }

  /**
   * PERFORMANCE OPTIMIZATION #5: Flush batched movement updates
   * Applies accumulated position updates as a single batch operation
   */
  private flushMovementBatch(): void {
    if (this.movementBatchQueue.size === 0) return;

    // Convert Map to array of updates
    const updates = Array.from(this.movementBatchQueue.entries()).map(([id, updates]) => ({
      id,
      updates,
    }));

    // Clear the queue first to allow new batches during async operation
    this.movementBatchQueue.clear();

    // Apply batch update to store (optimistic)
    // This uses the existing batchUpdateObjects which handles database sync
    this.updateQueue.enqueue(async () => {
      await this.store.getState().batchUpdateObjects(updates);
    }).catch((error) => {
      console.error('[CanvasSyncManager] Batch movement flush failed:', error);
    });
  }

  /**
   * Canvas → State: Wire Fabric.js events to Zustand actions
   */
  private setupCanvasToStateSync(): void {
    const handlers = {
      // PERFORMANCE OPTIMIZATION #5: Batch movement updates during drag
      // Track active editing during drag and capture initial state
      onObjectMoving: (target: FabricObject) => {
        if (this._isSyncingFromStore) return;

        const objects = (target as any)._objects || [target];
        const ids = objects
          .map((obj: FabricObject) => (obj as any).data?.id)
          .filter(Boolean) as string[];

        this.activelyEditingIds = new Set(ids);
        // DISABLED: Collaborative features temporarily disabled
        // this.store.getState().broadcastActivelyEditing(ids);

        // Capture initial state on first movement for undo/redo
        objects.forEach((obj: FabricObject) => {
          const objWithData = obj as FabricObjectWithData;
          const id = objWithData.data?.id;
          if (id && !this.transformStartState.has(id)) {
            // Get current state from store (before transformation)
            const storeObj = this.store.getState().objects[id];
            if (storeObj) {
              this.transformStartState.set(id, {
                id: id,
                x: storeObj.x,
                y: storeObj.y,
                width: storeObj.width,
                height: storeObj.height,
                rotation: storeObj.rotation,
                type_properties: storeObj.type_properties,
              });
            }
          }

          // PERFORMANCE OPTIMIZATION #5: Queue position updates for batching
          // This prevents excessive state updates during rapid movement
          // CRITICAL FIX: Convert Fabric coordinates to center-origin before storing
          if (id && obj.left !== undefined && obj.top !== undefined) {
            const centerCoords = fabricToCenter(obj.left, obj.top);
            this.movementBatchQueue.set(id, {
              x: centerCoords.x,
              y: centerCoords.y,
            });
          }
        });

        // PERFORMANCE OPTIMIZATION #5: Debounce batch flush
        // Flush after 50ms of inactivity to group rapid movements
        if (this.movementBatchTimeout) {
          clearTimeout(this.movementBatchTimeout);
        }

        this.movementBatchTimeout = window.setTimeout(() => {
          this.flushMovementBatch();
          this.movementBatchTimeout = null;
        }, this.MOVEMENT_BATCH_DELAY_MS);
      },

      onObjectModified: (target: FabricObject) => {
        if (this._isSyncingFromStore) return;

        console.log('[CanvasSyncManager] 🎯 onObjectModified triggered');

        // PERFORMANCE OPTIMIZATION #5: Flush any pending batched updates immediately
        // This ensures all movement updates are applied before final modified state
        if (this.movementBatchTimeout) {
          console.log('[CanvasSyncManager] 🔄 Flushing pending movement batch...');
          clearTimeout(this.movementBatchTimeout);
          this.movementBatchTimeout = null;
          this.flushMovementBatch();
        }

        // DON'T clear transformStartState yet - we need it to build batch updates!
        console.log(`[CanvasSyncManager] 📊 Transform state has ${this.transformStartState.size} items`);
        
        // Clear actively editing
        this.activelyEditingIds.clear();
        // DISABLED: Collaborative features temporarily disabled
        // this.store.getState().broadcastActivelyEditing([]);

        this._isSyncingFromCanvas = true;
        try {
          // Check for ActiveSelection (group) by ._objects property
          // Constructor names get minified in production
          const objects = (target as any)._objects || [];
          const isGroupSelection = objects.length > 0;
          
          console.log(`[CanvasSyncManager] 📊 Selection: ${isGroupSelection ? 'GROUP' : 'SINGLE'} (${isGroupSelection ? objects.length : 1} objects)`);
          
          const objectsToProcess = isGroupSelection ? objects : [target];

          // CRITICAL FIX: For group selections, batch all updates together
          // This ensures single RPC call + single realtime broadcast for group movements
          if (isGroupSelection && objectsToProcess.length > 1) {
            const batchUpdates: Array<{ id: string; updates: Partial<CanvasObject> }> = [];
            const beforeStates: Array<{ id: string; beforeState: any; afterState: any }> = [];

            objectsToProcess.forEach((obj: FabricObject) => {
              const canvasObject = this.fabricManager.toCanvasObject(obj);
              if (!canvasObject) return;

              const id = canvasObject.id;
              const beforeState = this.transformStartState.get(id);

              if (beforeState) {
                const afterState = {
                  id: id,
                  x: canvasObject.x,
                  y: canvasObject.y,
                  width: canvasObject.width,
                  height: canvasObject.height,
                  rotation: canvasObject.rotation,
                  type_properties: canvasObject.type_properties,
                };

                // Check if there's a meaningful change
                const hasChanged = 
                  Math.abs(beforeState.x - afterState.x) > 0.01 ||
                  Math.abs(beforeState.y - afterState.y) > 0.01 ||
                  Math.abs(beforeState.width - afterState.width) > 0.01 ||
                  Math.abs(beforeState.height - afterState.height) > 0.01 ||
                  Math.abs(beforeState.rotation - afterState.rotation) > 0.01;

                console.log(`[CanvasSyncManager] 📏 ${id.slice(0, 8)}: before(${beforeState.x}, ${beforeState.y}) → after(${afterState.x}, ${afterState.y}) ${hasChanged ? '✅' : '⏭️'}`);

                if (hasChanged) {
                  beforeStates.push({ id, beforeState, afterState });
                  batchUpdates.push({
                    id,
                    updates: {
                      x: canvasObject.x,
                      y: canvasObject.y,
                      width: canvasObject.width,
                      height: canvasObject.height,
                      rotation: canvasObject.rotation,
                      type_properties: canvasObject.type_properties as any,
                    },
                  });
                }

                this.transformStartState.delete(id);
              }
            });

            // Apply batch update if there are changes
            if (batchUpdates.length > 0) {
              console.log(`[CanvasSyncManager] 📦 Queueing batch update for ${batchUpdates.length} objects`);
              this.updateQueue.enqueue(async () => {
                // Create batch transform command for undo/redo
                console.log(`[CanvasSyncManager] ⚡ Creating BatchTransformCommand with ${beforeStates.length} transforms`);
                const { BatchTransformCommand } = await import('../commands/BatchTransformCommand');
                const command = new BatchTransformCommand(beforeStates);
                
                // Execute command (which calls batchUpdateObjects internally)
                console.log(`[CanvasSyncManager] 🚀 Executing BatchTransformCommand...`);
                await this.store.getState().executeCommand(command);
                console.log(`[CanvasSyncManager] ✅ BatchTransformCommand completed`);
              }).catch((error) => {
                console.error('[CanvasSyncManager] ❌ Batch transform failed:', error);
              });
            } else {
              console.warn('[CanvasSyncManager] ⚠️ No batch updates to apply (all objects unchanged?)');
            }
          } else {
            // Single object selection: use existing individual command logic
            objectsToProcess.forEach((obj: FabricObject) => {
              const canvasObject = this.fabricManager.toCanvasObject(obj);
              if (!canvasObject) return;

              const id = canvasObject.id;
              const beforeState = this.transformStartState.get(id);

              if (beforeState) {
                // We have before state, create undo-able command
                const afterState = {
                  id: id,
                  x: canvasObject.x,
                  y: canvasObject.y,
                  width: canvasObject.width,
                  height: canvasObject.height,
                  rotation: canvasObject.rotation,
                  type_properties: canvasObject.type_properties,
                };

                // Check if there's a meaningful change
                const hasChanged = 
                  Math.abs(beforeState.x - afterState.x) > 0.01 ||
                  Math.abs(beforeState.y - afterState.y) > 0.01 ||
                  Math.abs(beforeState.width - afterState.width) > 0.01 ||
                  Math.abs(beforeState.height - afterState.height) > 0.01 ||
                  Math.abs(beforeState.rotation - afterState.rotation) > 0.01;

                if (hasChanged) {
                  // Create and execute transform command
                  const command = new TransformCommand(id, beforeState, afterState);
                  this.updateQueue.enqueue(async () => {
                    await this.store.getState().executeCommand(command);
                  }).catch((error) => {
                    console.error('[CanvasSyncManager] Transform command failed:', error);
                  });
                }

                // Clear the captured state
                this.transformStartState.delete(id);
              } else {
                // No before state captured (shouldn't happen in normal use)
                // Fall back to direct update without undo
                this.updateQueue.enqueue(async () => {
                  await this.store.getState().updateObject(id, canvasObject);
                }).catch((error) => {
                  console.error('[CanvasSyncManager] Update failed:', error);
                });
              }
            });
          }

          // Clear active editing state after drag ends
          this.activelyEditingIds.clear();
          this.store.getState().broadcastActivelyEditing([]);
        } finally {
          this._isSyncingFromCanvas = false;
        }

        // DISABLED: Collaborative overlays temporarily disabled
        // this.fabricManager.updateOverlayPositions();
      },

      onSelectionCreated: async (targets: FabricObject[]) => {
        if (this._isSyncingFromStore) return;

        const ids = targets.map(t => (t as FabricObjectWithData).data?.id).filter(Boolean) as string[];

        // Try to acquire locks for all selected objects
        const state = this.store.getState();
        const userId = state.currentUserId;
        // const userName = state.presence[userId ?? '']?.userName || 'Unknown'; // DISABLED with locking
        
        // Check if any objects are locked by others
        const lockedByOthers: string[] = [];
        for (const id of ids) {
          const existingLock = state.locks[id];
          if (existingLock && existingLock.userId !== userId) {
            lockedByOthers.push(existingLock.userName);
          }
        }

        // If any objects are locked, prevent selection
        if (lockedByOthers.length > 0) {
          this.fabricManager.getCanvas()?.discardActiveObject();
          this.fabricManager.getCanvas()?.requestRenderAll();
          
          const lockerName = lockedByOthers[0];
          const message = lockedByOthers.length === 1
            ? `This object is being edited by ${lockerName}`
            : `These objects are being edited by ${lockedByOthers.join(', ')}`;
          
          toast.error('Cannot Select Object', { description: message, duration: 3000 });
          return;
        }

        // TEMPORARILY DISABLED: Locking causing sync issues
        // TODO: Re-enable after fixing core synchronization
        // Acquire locks for all selected objects
        // for (const id of ids) {
        //   const success = state.acquireLock(id, userId!, userName);
        //   if (!success) {
        //     console.error('[CanvasSyncManager] Failed to acquire lock:', id);
        //     this.fabricManager.getCanvas()?.discardActiveObject();
        //     this.fabricManager.getCanvas()?.requestRenderAll();
        //     return;
        //   }
        // }

        // Update selection state
        state.selectObjects(ids);
        // DISABLED: Collaborative features temporarily disabled
        // state.broadcastSelection(ids);
      },

      onSelectionUpdated: async (targets: FabricObject[]) => {
        if (this._isSyncingFromStore) return;

        const ids = targets.map(t => (t as FabricObjectWithData).data?.id).filter(Boolean) as string[];

        // Release old locks, acquire new locks
        const state = this.store.getState();
        // const userId = state.currentUserId; // DISABLED with locking
        // const userName = state.presence[userId ?? '']?.userName || 'Unknown'; // DISABLED with locking
        // const previouslySelectedIds = state.selectedIds; // DISABLED with locking

        // TEMPORARILY DISABLED: Locking causing sync issues
        // TODO: Re-enable after fixing core synchronization
        
        // // Release locks for objects no longer selected
        // for (const oldId of previouslySelectedIds) {
        //   if (!ids.includes(oldId)) {
        //     const lock = state.locks[oldId];
        //     if (lock && lock.userId === userId) {
        //       state.releaseLock(oldId);
        //     }
        //   }
        // }

        // // Check if any NEW objects are locked by others
        // const lockedByOthers: string[] = [];
        // for (const id of ids) {
        //   if (!previouslySelectedIds.includes(id)) {
        //     const existingLock = state.locks[id];
        //     if (existingLock && existingLock.userId !== userId) {
        //       lockedByOthers.push(existingLock.userName);
        //     }
        //   }
        // }

        // // If any new objects are locked, prevent selection
        // if (lockedByOthers.length > 0) {
        //   this.fabricManager.getCanvas()?.discardActiveObject();
        //   this.fabricManager.getCanvas()?.requestRenderAll();
          
        //   const lockerName = lockedByOthers[0];
        //   const message = `This object is being edited by ${lockerName}`;
          
        //   toast.error('Cannot Select Object', { description: message, duration: 3000 });
        //   return;
        // }

        // // Acquire locks for newly selected objects
        // for (const id of ids) {
        //   if (!previouslySelectedIds.includes(id)) {
        //     const success = state.acquireLock(id, userId!, userName);
        //     if (!success) {
        //       console.error('[CanvasSyncManager] Failed to acquire lock:', id);
        //       this.fabricManager.getCanvas()?.discardActiveObject();
        //       this.fabricManager.getCanvas()?.requestRenderAll();
        //       return;
        //     }
        //   }
        // }

        // Update selection state
        state.selectObjects(ids);
        // DISABLED: Collaborative features temporarily disabled
        // state.broadcastSelection(ids);
      },

      onSelectionCleared: () => {
        if (this._isSyncingFromStore) return;

        // Release locks for previously selected objects
        const state = this.store.getState();
        // const userId = state.currentUserId; // DISABLED with locking
        // const previouslySelectedIds = state.selectedIds; // DISABLED with locking

        // TEMPORARILY DISABLED: Locking causing sync issues
        // TODO: Re-enable after fixing core synchronization
        
        // for (const id of previouslySelectedIds) {
        //   const lock = state.locks[id];
        //   if (lock && lock.userId === userId) {
        //     state.releaseLock(id);
        //   }
        // }

        // Clear any captured transform states
        this.transformStartState.clear();

        // Update selection state
        state.deselectAll();
        // DISABLED: Collaborative features temporarily disabled
        // state.broadcastSelection([]);
      },
    };
    
    this.fabricManager.setupEventListeners(handlers);
  }

  /**
   * State → Canvas: Subscribe to Zustand changes, update Fabric.js
   * Watches canvasStore.objects and syncs to Fabric (adds/updates/deletes)
   */
  private setupStateToCanvasSync(): void {
    this.unsubscribe = this.store.subscribe(
      (state) => state.objects,
      (objects, prevObjects) => {
        if (this._isSyncingFromCanvas) return;

        this._isSyncingFromStore = true;
        try {
          const canvas = this.fabricManager.getCanvas();
          const selectedIds = this.store.getState().selectedIds;

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
          // CRITICAL FIX: Queue updates and process in batch to prevent selection issues
          // This allows multiple rapid realtime UPDATE events to be processed together
          currentIds.forEach((id) => {
            if (prevIds.has(id)) {
              const current = objects[id];
              const prev = prevObjects[id];

              if (this.hasObjectChanged(current, prev)) {
                this.stateToCanvasBatchQueue.add(id);
              }
            }
          });

          // Debounce batch processing
          if (this.stateToCanvasBatchQueue.size > 0) {
            if (this.stateToCanvasBatchTimeout) {
              clearTimeout(this.stateToCanvasBatchTimeout);
            }

            this.stateToCanvasBatchTimeout = window.setTimeout(() => {
              this.flushStateToCanvasBatch();
              this.stateToCanvasBatchTimeout = null;
            }, this.STATE_TO_CANVAS_BATCH_DELAY_MS);
          }

          // Restore ActiveSelection after updates
          // When objects are removed and re-added, Fabric loses the selection
          if (canvas && selectedIds.length > 0) {
            const objectsToSelect = selectedIds
              .map(id => {
                const fabricObj = canvas.getObjects().find(obj => 
                  (obj as FabricObjectWithData).data?.id === id
                );
                return fabricObj;
              })
              .filter(Boolean) as FabricObject[];

            if (objectsToSelect.length > 0) {
              if (objectsToSelect.length === 1) {
                canvas.setActiveObject(objectsToSelect[0]);
              } else {
                const fabric = (window as any).fabric;
                if (fabric && fabric.ActiveSelection) {
                  const activeSelection = new fabric.ActiveSelection(objectsToSelect, { canvas });
                  canvas.setActiveObject(activeSelection);
                }
              }
              canvas.renderAll();
            }
          }
        } finally {
          this._isSyncingFromStore = false;
        }
      }
    );
  }

  /**
   * CRITICAL FIX: Flush batched State→Canvas updates
   * Process all queued object updates together to prevent selection issues
   */
  private flushStateToCanvasBatch(): void {
    if (this.stateToCanvasBatchQueue.size === 0) return;

    const objectsToUpdate = Array.from(this.stateToCanvasBatchQueue);
    this.stateToCanvasBatchQueue.clear();

    const objects = this.store.getState().objects;
    const canvas = this.fabricManager.getCanvas();
    const selectedIds = this.store.getState().selectedIds;

    // Process all updates at once
    this._isSyncingFromStore = true;
    try {
      objectsToUpdate.forEach((id) => {
        const current = objects[id];
        if (current) {
          // Remove and re-add to ensure all properties are in sync
          this.fabricManager.removeObject(id);
          this.fabricManager.addObject(current);
        }
      });

      // Restore ActiveSelection after batch update
      // When objects are removed and re-added, Fabric loses the selection
      if (canvas && selectedIds.length > 0) {
        const objectsToSelect = selectedIds
          .map(id => {
            const fabricObj = canvas.getObjects().find(obj => 
              (obj as FabricObjectWithData).data?.id === id
            );
            return fabricObj;
          })
          .filter(Boolean) as FabricObject[];

        if (objectsToSelect.length > 0) {
          if (objectsToSelect.length === 1) {
            canvas.setActiveObject(objectsToSelect[0]);
          } else {
            const fabric = (window as any).fabric;
            if (fabric && fabric.ActiveSelection) {
              const activeSelection = new fabric.ActiveSelection(objectsToSelect, { canvas });
              canvas.setActiveObject(activeSelection);
            }
          }
          canvas.renderAll();
        }
      }
    } finally {
      this._isSyncingFromStore = false;
    }
  }

  /**
   * Setup layers visibility/lock/z-index sync
   * Watches layersSlice.layers and syncs to Fabric.js
   */
  private setupLayersSync(): void {
    this.store.subscribe(
      (state) => state.layers,
      (layers, prevLayers) => {
        // Check each layer for changes
        Object.entries(layers).forEach(([objectId, layer]) => {
          const prevLayer = prevLayers[objectId];
          if (!prevLayer) return;

          const canvas = this.fabricManager.getCanvas();
          if (!canvas) return;

          const fabricObj = canvas.getObjects().find(
            (obj: FabricObjectWithData) => obj.data?.id === objectId
          );

          if (!fabricObj) return;

          // Handle visibility change
          if (layer.visible !== prevLayer.visible) {
            fabricObj.visible = layer.visible;
          }

          // Handle lock change
          if (layer.locked !== prevLayer.locked) {
            fabricObj.selectable = !layer.locked;
            fabricObj.evented = !layer.locked;
          }

          // Handle z-index change
          if (layer.zIndex !== prevLayer.zIndex) {
            this.fabricManager.setZIndex(objectId, layer.zIndex);
          }
        });

        this.fabricManager.getCanvas()?.requestRenderAll();
      }
    );
  }

  /**
   * Check if canvas object has meaningful changes
   * Uses precision tolerance to prevent false positives from database rounding
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
   */
  dispose(): void {
    // PERFORMANCE OPTIMIZATION #5: Clear batch timeout and flush pending updates
    if (this.movementBatchTimeout) {
      clearTimeout(this.movementBatchTimeout);
      this.movementBatchTimeout = null;
    }
    this.movementBatchQueue.clear();

    // CRITICAL FIX: Clear State→Canvas batch timeout
    if (this.stateToCanvasBatchTimeout) {
      clearTimeout(this.stateToCanvasBatchTimeout);
      this.stateToCanvasBatchTimeout = null;
    }
    this.stateToCanvasBatchQueue.clear();

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.updateQueue.clear();
    this.activelyEditingIds.clear();
  }
}
