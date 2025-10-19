/**
 * ResizeCommand - Resizes object(s) by changing width/height
 * Part of AI Integration - Phase III - Manipulation Commands
 * 
 * Supports:
 * - Rectangles: width & height
 * - Circles: radius (width/height calculated automatically)
 * - Text: width & height (for text box bounds)
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { CanvasObject, CircleObject } from '../../types/canvas';

export interface ResizeCommandParams {
  objectId: string;     // ID of object to resize
  width?: number;       // New width (for rectangles, text)
  height?: number;      // New height (for rectangles, text)
  radius?: number;      // New radius (for circles)
  scaleX?: number;      // Scale factor for width (e.g., 2 = double width)
  scaleY?: number;      // Scale factor for height (e.g., 0.5 = half height)
}

interface ObjectSize {
  id: string;
  type: string;
  oldWidth?: number;
  oldHeight?: number;
  oldRadius?: number;
  newWidth?: number;
  newHeight?: number;
  newRadius?: number;
}

export class ResizeCommand extends BaseCommand {
  private params: ResizeCommandParams;
  private size: ObjectSize | null = null;

  constructor(params: ResizeCommandParams) {
    super();
    this.params = params;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    const object = store.getObjectById(this.params.objectId);

    if (!object) {
      throw new Error(`Cannot resize: object ${this.params.objectId} not found`);
    }

    // Calculate new size based on object type
    const updates: Partial<CanvasObject> = {};

    if (object.type === 'circle') {
      // Handle circle resizing (via radius)
      const circleObject = object as CircleObject;
      const oldRadius = circleObject.type_properties.radius;

      let newRadius: number;
      if (this.params.radius !== undefined) {
        // Absolute radius
        newRadius = this.params.radius;
      } else if (this.params.scaleX !== undefined) {
        // Scale by factor (use scaleX for uniform scaling)
        newRadius = oldRadius * this.params.scaleX;
      } else if (this.params.width !== undefined) {
        // Width/height for circle means diameter, so radius = diameter / 2
        newRadius = this.params.width / 2;
      } else {
        throw new Error('ResizeCommand for circle requires radius, scaleX, or width');
      }

      // Store old size for undo
      this.size = {
        id: this.params.objectId,
        type: 'circle',
        oldRadius,
        newRadius,
      };

      // Update circle (radius + width/height for consistency)
      updates.type_properties = {
        radius: newRadius,
      };
      updates.width = newRadius * 2;
      updates.height = newRadius * 2;

    } else {
      // Handle rectangle/text resizing (via width/height)
      const oldWidth = object.width;
      const oldHeight = object.height;

      let newWidth: number;
      let newHeight: number;

      if (this.params.width !== undefined && this.params.height !== undefined) {
        // Absolute size
        newWidth = this.params.width;
        newHeight = this.params.height;
      } else if (this.params.scaleX !== undefined || this.params.scaleY !== undefined) {
        // Scale by factors
        newWidth = oldWidth * (this.params.scaleX ?? 1);
        newHeight = oldHeight * (this.params.scaleY ?? 1);
      } else if (this.params.width !== undefined) {
        // Only width specified, maintain aspect ratio
        const aspectRatio = oldHeight / oldWidth;
        newWidth = this.params.width;
        newHeight = newWidth * aspectRatio;
      } else if (this.params.height !== undefined) {
        // Only height specified, maintain aspect ratio
        const aspectRatio = oldWidth / oldHeight;
        newHeight = this.params.height;
        newWidth = newHeight * aspectRatio;
      } else {
        throw new Error('ResizeCommand requires width, height, scaleX, or scaleY');
      }

      // Store old size for undo
      this.size = {
        id: this.params.objectId,
        type: object.type,
        oldWidth,
        oldHeight,
        newWidth,
        newHeight,
      };

      // Update object
      updates.width = newWidth;
      updates.height = newHeight;
    }

    await store.updateObject(this.params.objectId, updates);
    this.executed = true;

    console.log('[ResizeCommand] Resized object:', {
      id: this.params.objectId,
      type: object.type,
      oldSize: this.size,
      newSize: updates,
    });
  }

  async undo(): Promise<void> {
    if (!this.size) {
      throw new Error('Cannot undo: no size data stored');
    }

    const store = usePaperboxStore.getState();
    const updates: Partial<CanvasObject> = {};

    if (this.size.type === 'circle') {
      updates.type_properties = {
        radius: this.size.oldRadius!,
      };
      updates.width = this.size.oldRadius! * 2;
      updates.height = this.size.oldRadius! * 2;
    } else {
      updates.width = this.size.oldWidth!;
      updates.height = this.size.oldHeight!;
    }

    await store.updateObject(this.size.id, updates);
    this.executed = false;

    console.log('[ResizeCommand] Undone resize:', {
      id: this.size.id,
      restoredSize: updates,
    });
  }

  getDescription(): string {
    if (this.size?.type === 'circle') {
      return `Resize to radius ${Math.round(this.size.newRadius!)}px`;
    } else {
      return `Resize to ${Math.round(this.size?.newWidth ?? 0)}×${Math.round(this.size?.newHeight ?? 0)}px`;
    }
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'RESIZE_OBJECT',
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

