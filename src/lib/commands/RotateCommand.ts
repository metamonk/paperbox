/**
 * RotateCommand - Rotates object(s) by specified angle
 * Part of AI Integration - Phase III - Manipulation Commands
 * 
 * Supports:
 * - Absolute rotation (angle in degrees)
 * - Relative rotation (deltaAngle in degrees)
 * - Angles are normalized to 0-360 range
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';

export interface RotateCommandParams {
  objectId: string;      // ID of object to rotate
  angle?: number;        // Absolute angle in degrees (0-360)
  deltaAngle?: number;   // Relative angle change (e.g., +45 = rotate 45° clockwise)
}

interface ObjectRotation {
  id: string;
  oldAngle: number;
  newAngle: number;
}

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  // Reduce to 0-360 range
  angle = angle % 360;
  // Handle negative angles
  if (angle < 0) {
    angle += 360;
  }
  return angle;
}

export class RotateCommand extends BaseCommand {
  private params: RotateCommandParams;
  private rotation: ObjectRotation | null = null;

  constructor(params: RotateCommandParams) {
    super();
    this.params = params;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    const object = store.getObjectById(this.params.objectId);

    if (!object) {
      throw new Error(`Cannot rotate: object ${this.params.objectId} not found`);
    }

    // Calculate new rotation
    let newAngle: number;

    if (this.params.angle !== undefined) {
      // Absolute rotation
      newAngle = normalizeAngle(this.params.angle);
    } else if (this.params.deltaAngle !== undefined) {
      // Relative rotation
      newAngle = normalizeAngle(object.rotation + this.params.deltaAngle);
    } else {
      throw new Error('RotateCommand requires either angle or deltaAngle');
    }

    // Store old rotation for undo
    this.rotation = {
      id: this.params.objectId,
      oldAngle: object.rotation,
      newAngle,
    };

    // Update object rotation
    await store.updateObject(this.params.objectId, {
      rotation: newAngle,
    });

    this.executed = true;

    console.log('[RotateCommand] Rotated object:', {
      id: this.params.objectId,
      from: this.rotation.oldAngle,
      to: newAngle,
    });
  }

  async undo(): Promise<void> {
    if (!this.rotation) {
      throw new Error('Cannot undo: no rotation data stored');
    }

    const store = usePaperboxStore.getState();
    await store.updateObject(this.rotation.id, {
      rotation: this.rotation.oldAngle,
    });

    this.executed = false;

    console.log('[RotateCommand] Undone rotation:', {
      id: this.rotation.id,
      restoredAngle: this.rotation.oldAngle,
    });
  }

  getDescription(): string {
    if (this.params.angle !== undefined) {
      return `Rotate to ${Math.round(this.params.angle)}°`;
    } else {
      const delta = this.params.deltaAngle ?? 0;
      return `Rotate by ${delta >= 0 ? '+' : ''}${Math.round(delta)}°`;
    }
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'ROTATE_OBJECT',
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

