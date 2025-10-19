/**
 * CreateCircleCommand - Creates a circle object on the canvas
 * Part of AI Integration - Phase III
 * 
 * Coordinate System: Uses center-origin coordinates (-4000 to +4000)
 * The command receives center-origin coordinates and passes them to the store.
 * Translation to Fabric.js coordinates happens in FabricCanvasManager.
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { CircleObject } from '../../types/canvas';

export interface CreateCircleParams {
  x: number;  // Center-origin X coordinate (-4000 to +4000)
  y: number;  // Center-origin Y coordinate (-4000 to +4000)
  radius: number;
  fill?: string;
  stroke?: string;
  stroke_width?: number;
  opacity?: number;
}

export class CreateCircleCommand extends BaseCommand {
  private objectId: string | null = null;
  private params: CreateCircleParams;
  private userId: string;

  constructor(params: CreateCircleParams, userId: string) {
    super();
    this.params = params;
    this.userId = userId;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();

    // Create circle object
    const circleData: Partial<CircleObject> = {
      type: 'circle',
      x: this.params.x,
      y: this.params.y,
      // NOTE: width/height are required by BaseCanvasObject but redundant for circles
      // They're derived from radius for database consistency (diameter = radius * 2)
      // Fabric.js Circle uses only the radius property from type_properties
      width: this.params.radius * 2,
      height: this.params.radius * 2,
      fill: this.params.fill ?? '#3b82f6', // Default blue
      stroke: this.params.stroke ?? null,
      stroke_width: this.params.stroke_width ?? null,
      opacity: this.params.opacity ?? 1,
      rotation: 0,
      type_properties: {
        radius: this.params.radius, // Source of truth for circle size
      },
    };

    // Create object in store (optimistic + Supabase sync)
    this.objectId = await store.createObject(circleData, this.userId);
    this.executed = true;

    console.log('[CreateCircleCommand] Created circle:', {
      id: this.objectId,
      x: this.params.x,
      y: this.params.y,
      radius: this.params.radius,
    });
  }

  async undo(): Promise<void> {
    if (!this.objectId) {
      throw new Error('Cannot undo: object was not created');
    }

    const store = usePaperboxStore.getState();
    await store.deleteObjects([this.objectId]);
    this.executed = false;

    console.log('[CreateCircleCommand] Undone circle creation:', this.objectId);
  }

  getDescription(): string {
    return `Create circle (radius: ${this.params.radius})`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'CREATE_CIRCLE',
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

