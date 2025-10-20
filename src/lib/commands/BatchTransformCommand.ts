/**
 * BatchTransformCommand.ts
 * Command for batch transforming multiple objects (move/resize/rotate)
 * Used for efficient group operations with undo/redo support
 */

import { BaseCommand } from './Command';
import type { CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { CanvasObject } from '../../types/canvas';

interface TransformState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type_properties?: Record<string, any>;
}

interface BatchTransformState {
  id: string;
  beforeState: TransformState;
  afterState: TransformState;
}

/**
 * Command that batch transforms multiple objects
 * Optimized for group movements with single RPC call + single realtime broadcast
 */
export class BatchTransformCommand extends BaseCommand {
  private transforms: BatchTransformState[];

  constructor(transforms: BatchTransformState[]) {
    super();
    this.transforms = transforms;
  }

  getDescription(): string {
    const count = this.transforms.length;
    return `Transform ${count} object${count > 1 ? 's' : ''}`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'TRANSFORM_BATCH',
      objectIds: this.transforms.map(t => t.id),
      parameters: {
        count: this.transforms.length,
      },
      timestamp: Date.now(),
    };
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    
    // Prepare batch updates
    const batchUpdates = this.transforms.map(({ id, afterState }) => ({
      id,
      updates: {
        x: afterState.x,
        y: afterState.y,
        width: afterState.width,
        height: afterState.height,
        rotation: afterState.rotation,
        type_properties: afterState.type_properties,
      } as Partial<CanvasObject>,
    }));

    console.log(`[BatchTransformCommand] 🚀 Calling batchUpdateObjects for ${batchUpdates.length} objects`);
    // Apply batch update (single RPC call + single realtime broadcast)
    await store.batchUpdateObjects(batchUpdates);
    console.log(`[BatchTransformCommand] ✅ batchUpdateObjects completed`);
    this.executed = true;
  }

  async undo(): Promise<void> {
    const store = usePaperboxStore.getState();
    
    // Prepare batch updates for undo
    const batchUpdates = this.transforms.map(({ id, beforeState }) => ({
      id,
      updates: {
        x: beforeState.x,
        y: beforeState.y,
        width: beforeState.width,
        height: beforeState.height,
        rotation: beforeState.rotation,
        type_properties: beforeState.type_properties,
      } as Partial<CanvasObject>,
    }));

    // Apply batch update (single RPC call + single realtime broadcast)
    await store.batchUpdateObjects(batchUpdates);
    this.executed = false;
  }
}

