/**
 * TransformCommand - Captures interactive transformations (drag, resize, rotate)
 * 
 * This command is automatically created when users interact with objects on the canvas.
 * It stores before/after states and can undo/redo the complete transformation.
 * 
 * Unlike MoveCommand/ResizeCommand/RotateCommand which are for programmatic changes,
 * TransformCommand handles user interactions where multiple properties might change simultaneously.
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { CanvasObject } from '../../types/canvas';

interface TransformState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // Store type_properties for circles (radius changes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type_properties?: any;
}

export class TransformCommand extends BaseCommand {
  private objectId: string;
  private beforeState: TransformState;
  private afterState: TransformState;
  private changeType: 'move' | 'resize' | 'rotate' | 'transform';

  constructor(objectId: string, beforeState: TransformState, afterState: TransformState) {
    super();
    this.objectId = objectId;
    this.beforeState = beforeState;
    this.afterState = afterState;
    this.changeType = this.detectChangeType();
  }

  /**
   * Detect what type of change occurred
   */
  private detectChangeType(): 'move' | 'resize' | 'rotate' | 'transform' {
    const posChanged = 
      Math.abs(this.beforeState.x - this.afterState.x) > 0.01 ||
      Math.abs(this.beforeState.y - this.afterState.y) > 0.01;
    
    const sizeChanged = 
      Math.abs(this.beforeState.width - this.afterState.width) > 0.01 ||
      Math.abs(this.beforeState.height - this.afterState.height) > 0.01;
    
    const rotChanged = 
      Math.abs(this.beforeState.rotation - this.afterState.rotation) > 0.01;

    // Count how many things changed
    const changeCount = [posChanged, sizeChanged, rotChanged].filter(Boolean).length;

    if (changeCount === 0) {
      return 'transform'; // No significant change, but keep for safety
    } else if (changeCount > 1) {
      return 'transform'; // Multiple properties changed
    } else if (posChanged) {
      return 'move';
    } else if (sizeChanged) {
      return 'resize';
    } else {
      return 'rotate';
    }
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    
    // Apply the after state
    const updates: Partial<CanvasObject> = {
      x: this.afterState.x,
      y: this.afterState.y,
      width: this.afterState.width,
      height: this.afterState.height,
      rotation: this.afterState.rotation,
    };

    // Include type_properties if they changed (e.g., circle radius)
    if (this.afterState.type_properties) {
      updates.type_properties = this.afterState.type_properties;
    }

    await store.updateObject(this.objectId, updates);
    this.executed = true;
  }

  async undo(): Promise<void> {
    const store = usePaperboxStore.getState();
    
    // Restore the before state
    const updates: Partial<CanvasObject> = {
      x: this.beforeState.x,
      y: this.beforeState.y,
      width: this.beforeState.width,
      height: this.beforeState.height,
      rotation: this.beforeState.rotation,
    };

    // Restore type_properties if they were captured
    if (this.beforeState.type_properties) {
      updates.type_properties = this.beforeState.type_properties;
    }

    await store.updateObject(this.objectId, updates);
    this.executed = false;
  }

  getDescription(): string {
    switch (this.changeType) {
      case 'move':
        return 'Move Object';
      case 'resize':
        return 'Resize Object';
      case 'rotate':
        return 'Rotate Object';
      default:
        return 'Transform Object';
    }
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'MOVE_OBJECT', // Use generic type
      objectIds: [this.objectId],
      parameters: {
        changeType: this.changeType,
        before: this.beforeState,
        after: this.afterState,
      },
      timestamp: Date.now(),
    };
  }
}

