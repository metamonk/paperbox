/**
 * OperationQueue - Offline Operation Queue with localStorage Persistence
 *
 * Manages queuing of canvas operations during network disconnection
 * and syncs them to Supabase when connection is restored.
 *
 * Features:
 * - localStorage persistence (survives page refresh)
 * - Max queue size limit (1000 operations)
 * - Retry logic for failed operations
 * - Operation deduplication
 * - Batch processing on reconnect
 */

import { toast } from 'sonner';
import { supabase } from '../supabase';
import type { CanvasObject } from '../../types/canvas';

export interface QueuedOperation {
  id: string;
  timestamp: number;
  type: 'create' | 'update' | 'delete';
  objectId: string;
  payload: Partial<CanvasObject>;
  retryCount: number;
  canvasId: string; // W5: Multi-canvas support
}

interface QueueState {
  operations: QueuedOperation[];
  lastFlushTime: number | null;
}

const STORAGE_KEY = 'paperbox_offline_queue';
const MAX_QUEUE_SIZE = 1000;
const MAX_RETRY_ATTEMPTS = 3;

export class OperationQueue {
  private static instance: OperationQueue | null = null;
  
  private queue: QueuedOperation[] = [];
  private isFlushing = false;
  private lastFlushTime: number | null = null;

  private constructor() {
    // Load queue from localStorage on init
    this.loadFromStorage();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): OperationQueue {
    if (!OperationQueue.instance) {
      OperationQueue.instance = new OperationQueue();
    }
    return OperationQueue.instance;
  }

  /**
   * Add operation to queue
   */
  enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): void {
    // Check queue size limit
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      console.warn('[OperationQueue] Queue size limit reached, dropping oldest operation');
      this.queue.shift();
    }

    const queuedOp: QueuedOperation = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0,
      ...operation,
    };

    this.queue.push(queuedOp);
    this.saveToStorage();

    // console.log(`[OperationQueue] Enqueued ${operation.type} operation for object ${operation.objectId}`);
  }

  /**
   * Get number of operations in queue
   */
  getCount(): number {
    return this.queue.length;
  }

  /**
   * Check if queue has operations
   */
  hasOperations(): boolean {
    return this.queue.length > 0;
  }

  /**
   * Flush queue - sync all operations to database
   */
  async flush(): Promise<void> {
    if (this.isFlushing) {
      // console.log('[OperationQueue] Already flushing, skipping');
      return;
    }

    if (this.queue.length === 0) {
      // console.log('[OperationQueue] Queue empty, nothing to flush');
      return;
    }

    this.isFlushing = true;
    const totalOperations = this.queue.length;
    let successCount = 0;
    let failCount = 0;

    console.log(`[OperationQueue] Flushing ${totalOperations} operations...`);

    // Show progress toast
    const toastId = toast.loading('Syncing Changes', {
      description: `Syncing ${totalOperations} queued operations...`,
    });

    // Process operations in order (FIFO)
    while (this.queue.length > 0) {
      const operation = this.queue[0];
      
      // Validate operation before processing
      if (!this.isValidOperation(operation)) {
        console.error('[OperationQueue] Invalid operation, skipping:', operation);
        this.queue.shift();
        failCount++;
        continue;
      }

      try {
        await this.processOperation(operation);
        
        // Remove from queue on success
        this.queue.shift();
        successCount++;
        
        // Update toast progress
        if (successCount % 5 === 0 || this.queue.length === 0) {
          toast.loading('Syncing Changes', {
            id: toastId,
            description: `Synced ${successCount}/${totalOperations} operations...`,
          });
        }
      } catch (error) {
        console.error(
          `[OperationQueue] Failed to process ${operation.type} operation:`,
          operation.objectId,
          'Retry count:', operation.retryCount,
          'Error:', error
        );
        
        // Handle failed operation
        const shouldRetry = this.handleFailedOperation(operation);
        
        if (!shouldRetry) {
          // Remove from queue if max retries reached
          console.warn(
            `[OperationQueue] Discarding ${operation.type} operation after ${MAX_RETRY_ATTEMPTS} attempts:`,
            operation.objectId
          );
          this.queue.shift();
          failCount++;
        } else {
          // Move to end of queue for retry
          this.queue.shift();
          this.queue.push(operation);
        }
      }

      // Save progress to localStorage
      this.saveToStorage();
    }

    this.isFlushing = false;
    this.lastFlushTime = Date.now();
    this.saveToStorage();

    // Update final toast
    if (failCount > 0) {
      toast.error('Sync Completed with Errors', {
        id: toastId,
        description: `${successCount} succeeded, ${failCount} failed`,
        duration: 5000,
      });
    } else {
      toast.success('All Changes Synced', {
        id: toastId,
        description: `${successCount} operations synced successfully`,
        duration: 3000,
      });
    }

    // console.log(`[OperationQueue] Flush complete: ${successCount} succeeded, ${failCount} failed`);
  }

  /**
   * Validate operation has required data
   */
  private isValidOperation(operation: QueuedOperation): boolean {
    // Check basic fields
    if (!operation.objectId || !operation.canvasId || !operation.type) {
      return false;
    }

    // For create operations, check required payload fields
    if (operation.type === 'create') {
      const payload = operation.payload as any;
      if (!payload.type || !payload.created_by || payload.x === undefined || payload.y === undefined) {
        console.error('[OperationQueue] Create operation missing required fields:', {
          hasType: !!payload.type,
          hasCreatedBy: !!payload.created_by,
          hasX: payload.x !== undefined,
          hasY: payload.y !== undefined,
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Process a single operation
   */
  private async processOperation(operation: QueuedOperation): Promise<void> {
    // console.log(`[OperationQueue] Processing ${operation.type} operation for object ${operation.objectId}`);

    switch (operation.type) {
      case 'create':
        await this.processCreate(operation);
        break;
      
      case 'update':
        await this.processUpdate(operation);
        break;
      
      case 'delete':
        await this.processDelete(operation);
        break;
      
      default:
        throw new Error(`Unknown operation type: ${(operation as QueuedOperation).type}`);
    }
  }

  /**
   * Process create operation
   */
  private async processCreate(operation: QueuedOperation): Promise<void> {
    // Extract all required fields from payload
    const payload = operation.payload as any;
    
    // Build insert data with only the fields we need
    const insertData: Record<string, any> = {
      id: operation.objectId,
      canvas_id: operation.canvasId,
      type: payload.type,
      x: payload.x,
      y: payload.y,
      width: payload.width,
      height: payload.height,
      rotation: payload.rotation ?? 0,
      group_id: payload.group_id ?? null,
      z_index: payload.z_index ?? 0,
      fill: payload.fill,
      stroke: payload.stroke ?? null,
      stroke_width: payload.stroke_width ?? null,
      opacity: payload.opacity ?? 1,
      type_properties: payload.type_properties ?? {},
      style_properties: payload.style_properties ?? {},
      metadata: payload.metadata ?? {},
      created_by: payload.created_by,
    };
    
    // console.log('[OperationQueue] Inserting object:', operation.objectId, 'with canvas_id:', operation.canvasId);
    
    const { error } = await supabase
      .from('canvas_objects')
      .insert(insertData as any);

    if (error) {
      // If object already exists (duplicate), consider it success
      if (error.code === '23505') {
        // console.log('[OperationQueue] Object already exists, skipping create');
        return;
      }
      console.error('[OperationQueue] Create error:', error, 'Data:', insertData);
      throw error;
    }
  }

  /**
   * Process update operation
   */
  private async processUpdate(operation: QueuedOperation): Promise<void> {
    // console.log('[OperationQueue] Updating object:', operation.objectId);
    
    const payload = operation.payload as any;
    
    // Build sanitized update payload - only include valid updatable fields
    const updateData: Record<string, any> = {};
    
    // Positional/size fields
    if (payload.x !== undefined) updateData.x = payload.x;
    if (payload.y !== undefined) updateData.y = payload.y;
    if (payload.width !== undefined) updateData.width = payload.width;
    if (payload.height !== undefined) updateData.height = payload.height;
    if (payload.rotation !== undefined) updateData.rotation = payload.rotation;
    if (payload.z_index !== undefined) updateData.z_index = payload.z_index;
    
    // Visual properties
    if (payload.fill !== undefined) updateData.fill = payload.fill;
    if (payload.stroke !== undefined) updateData.stroke = payload.stroke;
    if (payload.stroke_width !== undefined) updateData.stroke_width = payload.stroke_width;
    if (payload.opacity !== undefined) updateData.opacity = payload.opacity;
    
    // Group/metadata
    if (payload.group_id !== undefined) {
      // Validate group_id is null or a valid UUID format
      if (payload.group_id === null || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.group_id)) {
        updateData.group_id = payload.group_id;
      } else {
        console.warn('[OperationQueue] Invalid group_id format, skipping:', payload.group_id);
      }
    }
    
    // Type-specific properties (JSON fields)
    if (payload.type_properties !== undefined) updateData.type_properties = payload.type_properties;
    if (payload.style_properties !== undefined) updateData.style_properties = payload.style_properties;
    if (payload.metadata !== undefined) updateData.metadata = payload.metadata;
    
    // Explicitly exclude read-only/system fields
    // DO NOT UPDATE: id, canvas_id, type, created_by, created_at
    
    // Log what we're updating
    // console.log('[OperationQueue] Sanitized update data:', updateData);
    
    // Only proceed if we have fields to update
    if (Object.keys(updateData).length === 0) {
      console.warn('[OperationQueue] No valid fields to update, skipping');
      return;
    }
    
    const { error } = await supabase
      .from('canvas_objects')
      .update(updateData)
      .eq('id', operation.objectId);

    if (error) {
      console.error('[OperationQueue] Update error:', error, 'Object:', operation.objectId, 'Data:', updateData);
      throw error;
    }
  }

  /**
   * Process delete operation
   */
  private async processDelete(operation: QueuedOperation): Promise<void> {
    // console.log('[OperationQueue] Deleting object:', operation.objectId);
    
    const { error } = await supabase
      .from('canvas_objects')
      .delete()
      .eq('id', operation.objectId);

    if (error) {
      // If object doesn't exist, consider it success
      if (error.code === 'PGRST116') {
        // console.log('[OperationQueue] Object not found, skipping delete');
        return;
      }
      console.error('[OperationQueue] Delete error:', error, 'Object:', operation.objectId);
      throw error;
    }
  }

  /**
   * Handle failed operation
   * Returns true if should retry, false if should discard
   */
  private handleFailedOperation(operation: QueuedOperation): boolean {
    operation.retryCount++;

    if (operation.retryCount >= MAX_RETRY_ATTEMPTS) {
      console.error(
        `[OperationQueue] Max retry attempts reached for operation ${operation.id}, discarding`
      );
      return false;
    }

    console.log(
      `[OperationQueue] Retry ${operation.retryCount}/${MAX_RETRY_ATTEMPTS} for operation ${operation.id}`
    );
    return true;
  }

  /**
   * Clear entire queue
   */
  clear(): void {
    this.queue = [];
    this.lastFlushTime = null;
    this.saveToStorage();
    // console.log('[OperationQueue] Queue cleared');
  }

  /**
   * Clear corrupted/invalid operations from localStorage
   * Useful for debugging or recovering from bad state
   */
  clearInvalidOperations(): void {
    const beforeCount = this.queue.length;
    this.queue = this.queue.filter(op => this.isValidOperation(op));
    const afterCount = this.queue.length;
    
    if (beforeCount > afterCount) {
      // console.log(`[OperationQueue] Removed ${beforeCount - afterCount} invalid operations`);
      this.saveToStorage();
    } else {
      // console.log('[OperationQueue] No invalid operations found');
    }
  }

  /**
   * Remove specific operation from queue
   */
  remove(operationId: string): void {
    const index = this.queue.findIndex((op) => op.id === operationId);
    if (index > -1) {
      this.queue.splice(index, 1);
      this.saveToStorage();
      // console.log(`[OperationQueue] Removed operation ${operationId}`);
    }
  }

  /**
   * Load queue from localStorage
   */
  loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const state = JSON.parse(stored) as QueueState;
        this.queue = state.operations || [];
        this.lastFlushTime = state.lastFlushTime || null;
        
        // console.log(`[OperationQueue] Loaded ${this.queue.length} operations from storage`);
        
        // Clean up old operations (older than 24 hours)
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const beforeCleanup = this.queue.length;
        this.queue = this.queue.filter((op) => op.timestamp > dayAgo);
        
        if (this.queue.length < beforeCleanup) {
          // console.log(`[OperationQueue] Cleaned up ${beforeCleanup - this.queue.length} old operations`);
        }
        
        // Validate and clean invalid operations
        const beforeValidation = this.queue.length;
        this.queue = this.queue.filter(op => this.isValidOperation(op));
        
        if (this.queue.length < beforeValidation) {
          console.warn(`[OperationQueue] Removed ${beforeValidation - this.queue.length} invalid operations`);
        }
        
        // Save if we cleaned anything
        if (this.queue.length < beforeCleanup) {
          this.saveToStorage();
        }
      }
    } catch (error) {
      console.error('[OperationQueue] Error loading from storage:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveToStorage(): void {
    try {
      const state: QueueState = {
        operations: this.queue,
        lastFlushTime: this.lastFlushTime,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('[OperationQueue] Error saving to storage:', error);
      
      // If localStorage is full, try to clear old operations
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[OperationQueue] localStorage quota exceeded, clearing old operations');
        this.queue = this.queue.slice(-100); // Keep only last 100 operations
        
        try {
          const state: QueueState = {
            operations: this.queue,
            lastFlushTime: this.lastFlushTime,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (retryError) {
          console.error('[OperationQueue] Failed to save even after cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Get queue state for debugging
   */
  getState(): { operations: QueuedOperation[]; count: number; lastFlushTime: number | null } {
    return {
      operations: [...this.queue],
      count: this.queue.length,
      lastFlushTime: this.lastFlushTime,
    };
  }

  /**
   * Reset queue (for testing)
   */
  reset(): void {
    this.queue = [];
    this.isFlushing = false;
    this.lastFlushTime = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}

