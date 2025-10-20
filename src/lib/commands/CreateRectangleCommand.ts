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
import { DEFAULT_SHAPE_PROPS, SHAPE_DEFAULTS } from '../../lib/constants';

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

    // STROKE VALIDATION: Use consistent defaults matching user-created shapes
    // If AI provides stroke color, ensure strokeWidth is numeric (visible)
    const finalStroke = this.params.stroke ?? DEFAULT_SHAPE_PROPS.stroke;
    const finalStrokeWidth = this.params.stroke 
      ? (this.params.stroke_width ?? DEFAULT_SHAPE_PROPS.stroke_width)
      : DEFAULT_SHAPE_PROPS.stroke_width; // Always visible (2px) by default

    // Create rectangle object with complete defaults
    const rectangleData: Partial<RectangleObject> = {
      type: 'rectangle',
      x: this.params.x,
      y: this.params.y,
      width: this.params.width,
      height: this.params.height,
      fill: this.params.fill ?? SHAPE_DEFAULTS.rectangle.fill, // Consistent blue default
      stroke: finalStroke,
      stroke_width: finalStrokeWidth,
      opacity: this.params.opacity ?? DEFAULT_SHAPE_PROPS.opacity,
      rotation: DEFAULT_SHAPE_PROPS.rotation,
      group_id: DEFAULT_SHAPE_PROPS.group_id,
      z_index: DEFAULT_SHAPE_PROPS.z_index,
      style_properties: DEFAULT_SHAPE_PROPS.style_properties,
      metadata: DEFAULT_SHAPE_PROPS.metadata,
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

