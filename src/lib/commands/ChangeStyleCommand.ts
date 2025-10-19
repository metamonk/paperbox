/**
 * ChangeStyleCommand - Changes styling properties of object(s)
 * Part of AI Integration - Phase III - Style Commands
 * 
 * Supports changing:
 * - Fill color
 * - Stroke color
 * - Stroke width
 * - Opacity
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { CanvasObject } from '../../types/canvas';

export interface ChangeStyleCommandParams {
  objectId: string;       // ID of object to style
  fill?: string;          // New fill color (hex)
  stroke?: string;        // New stroke color (hex)
  stroke_width?: number;  // New stroke width
  opacity?: number;       // New opacity (0-1)
}

interface ObjectStyle {
  id: string;
  oldFill?: string;
  oldStroke?: string;
  oldStrokeWidth?: number;
  oldOpacity?: number;
  newFill?: string;
  newStroke?: string;
  newStrokeWidth?: number;
  newOpacity?: number;
}

export class ChangeStyleCommand extends BaseCommand {
  private params: ChangeStyleCommandParams;
  private style: ObjectStyle | null = null;

  constructor(params: ChangeStyleCommandParams) {
    super();
    this.params = params;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    const object = store.getObjectById(this.params.objectId);

    if (!object) {
      throw new Error(`Cannot change style: object ${this.params.objectId} not found`);
    }

    // Build updates object
    const updates: Partial<CanvasObject> = {};
    const oldStyle: ObjectStyle = { id: this.params.objectId };

    if (this.params.fill !== undefined) {
      oldStyle.oldFill = object.fill;
      oldStyle.newFill = this.params.fill;
      updates.fill = this.params.fill;
    }

    if (this.params.stroke !== undefined) {
      oldStyle.oldStroke = object.stroke ?? undefined;
      oldStyle.newStroke = this.params.stroke;
      updates.stroke = this.params.stroke;
    }

    if (this.params.stroke_width !== undefined) {
      oldStyle.oldStrokeWidth = object.stroke_width ?? undefined;
      oldStyle.newStrokeWidth = this.params.stroke_width;
      updates.stroke_width = this.params.stroke_width;
    }

    if (this.params.opacity !== undefined) {
      oldStyle.oldOpacity = object.opacity;
      oldStyle.newOpacity = this.params.opacity;
      updates.opacity = this.params.opacity;
    }

    // Store old style for undo
    this.style = oldStyle;

    // Update object style
    await store.updateObject(this.params.objectId, updates);
    this.executed = true;

    console.log('[ChangeStyleCommand] Changed style:', {
      id: this.params.objectId,
      changes: updates,
    });
  }

  async undo(): Promise<void> {
    if (!this.style) {
      throw new Error('Cannot undo: no style data stored');
    }

    const store = usePaperboxStore.getState();
    const updates: Partial<CanvasObject> = {};

    if (this.style.oldFill !== undefined) {
      updates.fill = this.style.oldFill;
    }

    if (this.style.oldStroke !== undefined) {
      updates.stroke = this.style.oldStroke;
    }

    if (this.style.oldStrokeWidth !== undefined) {
      updates.stroke_width = this.style.oldStrokeWidth;
    }

    if (this.style.oldOpacity !== undefined) {
      updates.opacity = this.style.oldOpacity;
    }

    await store.updateObject(this.style.id, updates);
    this.executed = false;

    console.log('[ChangeStyleCommand] Undone style change:', {
      id: this.style.id,
      restoredStyle: updates,
    });
  }

  getDescription(): string {
    const changes: string[] = [];
    
    if (this.params.fill) changes.push(`fill: ${this.params.fill}`);
    if (this.params.stroke) changes.push(`stroke: ${this.params.stroke}`);
    if (this.params.stroke_width !== undefined) changes.push(`stroke width: ${this.params.stroke_width}px`);
    if (this.params.opacity !== undefined) changes.push(`opacity: ${Math.round(this.params.opacity * 100)}%`);

    return `Change style: ${changes.join(', ')}`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'CHANGE_FILL', // Generic type for style changes
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

