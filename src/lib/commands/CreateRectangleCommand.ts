/**
 * CreateRectangleCommand - Creates a rectangle object on the canvas
 * Part of AI Integration - Phase III
 * 
 * Coordinate System: Uses center-origin coordinates (-4000 to +4000)
 * The command receives center-origin coordinates and passes them to the store.
 * Translation to Fabric.js coordinates happens in FabricCanvasManager.
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { RectangleObject } from '../../types/canvas';

export interface CreateRectangleParams {
  x: number;  // Center-origin X coordinate (-4000 to +4000)
  y: number;  // Center-origin Y coordinate (-4000 to +4000)
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  stroke_width?: number;
  opacity?: number;
  corner_radius?: number;
}

export class CreateRectangleCommand extends BaseCommand {
  private objectId: string | null = null;
  private params: CreateRectangleParams;
  private userId: string;

  constructor(params: CreateRectangleParams, userId: string) {
    super();
    this.params = params;
    this.userId = userId;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();

    // Create rectangle object
    const rectangleData: Partial<RectangleObject> = {
      type: 'rectangle',
      x: this.params.x,
      y: this.params.y,
      width: this.params.width,
      height: this.params.height,
      fill: this.params.fill ?? '#10b981', // Default green
      stroke: this.params.stroke ?? '#000000', // Default black stroke for visibility
      stroke_width: this.params.stroke_width ?? 2, // Default 2px stroke
      opacity: this.params.opacity ?? 1,
      rotation: 0,
      type_properties: {
        corner_radius: this.params.corner_radius ?? 0,
      },
    };

    // Create object in store (optimistic + Supabase sync)
    this.objectId = await store.createObject(rectangleData, this.userId);
    this.executed = true;

    console.log('[CreateRectangleCommand] Created rectangle:', {
      id: this.objectId,
      x: this.params.x,
      y: this.params.y,
      width: this.params.width,
      height: this.params.height,
    });
  }

  async undo(): Promise<void> {
    if (!this.objectId) {
      throw new Error('Cannot undo: object was not created');
    }

    const store = usePaperboxStore.getState();
    await store.deleteObjects([this.objectId]);
    this.executed = false;

    console.log('[CreateRectangleCommand] Undone rectangle creation:', this.objectId);
  }

  getDescription(): string {
    return `Create rectangle (${this.params.width}×${this.params.height})`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'CREATE_RECTANGLE',
      objectIds: this.objectId ? [this.objectId] : [],
      parameters: this.params,
      timestamp: Date.now(),
    };
  }

  /**
   * Get the created object ID (useful for AI to reference it)
   */
  getObjectId(): string | null {
    return this.objectId;
  }
}

