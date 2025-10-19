/**
 * MoveCommand - Moves object(s) to new position(s)
 * Part of AI Integration - Phase III - Manipulation Commands
 * 
 * Coordinate System: Uses center-origin coordinates (-4000 to +4000)
 * Supports both absolute positioning (x, y) and relative offsets (deltaX, deltaY)
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';

export interface MoveCommandParams {
  objectId: string;  // ID of object to move
  x?: number;        // Absolute X position (center-origin coords)
  y?: number;        // Absolute Y position (center-origin coords)
  deltaX?: number;   // Relative X offset (e.g., "move 100px right" = deltaX: 100)
  deltaY?: number;   // Relative Y offset (e.g., "move 50px down" = deltaY: 50)
}

interface ObjectPosition {
  id: string;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}

export class MoveCommand extends BaseCommand {
  private params: MoveCommandParams;
  private position: ObjectPosition | null = null;

  constructor(params: MoveCommandParams) {
    super();
    this.params = params;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    const object = store.getObjectById(this.params.objectId);

    if (!object) {
      throw new Error(`Cannot move: object ${this.params.objectId} not found`);
    }

    // Calculate new position
    let newX: number;
    let newY: number;

    if (this.params.x !== undefined && this.params.y !== undefined) {
      // Absolute positioning
      newX = this.params.x;
      newY = this.params.y;
    } else if (this.params.deltaX !== undefined || this.params.deltaY !== undefined) {
      // Relative positioning
      newX = object.x + (this.params.deltaX ?? 0);
      newY = object.y + (this.params.deltaY ?? 0);
    } else {
      throw new Error('MoveCommand requires either (x, y) or (deltaX, deltaY)');
    }

    // Store old position for undo
    this.position = {
      id: this.params.objectId,
      oldX: object.x,
      oldY: object.y,
      newX,
      newY,
    };

    // Update object position
    await store.updateObject(this.params.objectId, {
      x: newX,
      y: newY,
    });

    this.executed = true;

    console.log('[MoveCommand] Moved object:', {
      id: this.params.objectId,
      from: { x: this.position.oldX, y: this.position.oldY },
      to: { x: newX, y: newY },
    });
  }

  async undo(): Promise<void> {
    if (!this.position) {
      throw new Error('Cannot undo: no position data stored');
    }

    const store = usePaperboxStore.getState();
    await store.updateObject(this.position.id, {
      x: this.position.oldX,
      y: this.position.oldY,
    });

    this.executed = false;

    console.log('[MoveCommand] Undone move:', {
      id: this.position.id,
      restoredPosition: { x: this.position.oldX, y: this.position.oldY },
    });
  }

  getDescription(): string {
    if (this.params.x !== undefined && this.params.y !== undefined) {
      return `Move to (${Math.round(this.params.x)}, ${Math.round(this.params.y)})`;
    } else {
      const dx = this.params.deltaX ?? 0;
      const dy = this.params.deltaY ?? 0;
      return `Move by (${dx >= 0 ? '+' : ''}${dx}, ${dy >= 0 ? '+' : ''}${dy})`;
    }
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'MOVE_OBJECT',
      objectIds: [this.params.objectId],
      parameters: this.params,
      timestamp: Date.now(),
    };
  }

  /**
   * Get the object ID for this command (used by AI integration)
   */
  getObjectId(): string {
    return this.params.objectId;
  }
}

