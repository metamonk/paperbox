/**
 * CreateTextCommand - Creates a text object on the canvas
 * Part of AI Integration - Phase III
 * 
 * Coordinate System: Uses center-origin coordinates (-4000 to +4000)
 * The command receives center-origin coordinates and passes them to the store.
 * Translation to Fabric.js coordinates happens in FabricCanvasManager.
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { TextObject } from '../../types/canvas';
import { DEFAULT_SHAPE_PROPS, SHAPE_DEFAULTS, DEFAULT_FONT_FAMILY } from '../../lib/constants';

export interface CreateTextParams {
  x: number;  // Center-origin X coordinate (-4000 to +4000)
  y: number;  // Center-origin Y coordinate (-4000 to +4000)
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fill?: string;
  opacity?: number;
  text_align?: 'left' | 'center' | 'right';
}

export class CreateTextCommand extends BaseCommand {
  private objectId: string | null = null;
  private params: CreateTextParams;
  private userId: string;

  constructor(params: CreateTextParams, userId: string) {
    super();
    this.params = params;
    this.userId = userId;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();

    const fontSize = this.params.fontSize ?? 24;
    
    // Create text object with complete defaults
    // Note: For text, width/height are calculated based on content
    // We'll use approximate values that will be adjusted by Fabric.js
    const textData: Partial<TextObject> = {
      type: 'text',
      x: this.params.x,
      y: this.params.y,
      width: this.params.text.length * fontSize * 0.6, // Approximate width
      height: fontSize * 1.2, // Approximate height
      fill: this.params.fill ?? SHAPE_DEFAULTS.text.fill, // Consistent black default
      stroke: DEFAULT_SHAPE_PROPS.stroke,
      stroke_width: DEFAULT_SHAPE_PROPS.stroke_width, // Visible border (consistent with shapes)
      opacity: this.params.opacity ?? DEFAULT_SHAPE_PROPS.opacity,
      rotation: DEFAULT_SHAPE_PROPS.rotation,
      group_id: DEFAULT_SHAPE_PROPS.group_id,
      z_index: DEFAULT_SHAPE_PROPS.z_index,
      style_properties: DEFAULT_SHAPE_PROPS.style_properties,
      metadata: DEFAULT_SHAPE_PROPS.metadata,
      type_properties: {
        text_content: this.params.text,
        font_size: fontSize,
        font_family: this.params.fontFamily ?? DEFAULT_FONT_FAMILY,
        font_weight: this.params.fontWeight ?? 'normal',
        text_align: this.params.text_align ?? 'left',
      },
    };

    // Create object in store (optimistic + Supabase sync)
    this.objectId = await store.createObject(textData, this.userId);
    this.executed = true;

    console.log('[CreateTextCommand] Created text:', {
      id: this.objectId,
      x: this.params.x,
      y: this.params.y,
      text: this.params.text,
      fontSize,
    });
  }

  async undo(): Promise<void> {
    if (!this.objectId) {
      throw new Error('Cannot undo: object was not created');
    }

    const store = usePaperboxStore.getState();
    await store.deleteObjects([this.objectId]);
    this.executed = false;

    console.log('[CreateTextCommand] Undone text creation:', this.objectId);
  }

  getDescription(): string {
    const preview = this.params.text.length > 20 
      ? this.params.text.substring(0, 20) + '...'
      : this.params.text;
    return `Create text: "${preview}"`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'CREATE_TEXT',
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

