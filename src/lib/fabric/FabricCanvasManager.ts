/**
 * TEMPLATE: Fabric.js Canvas Manager
 *
 * Purpose: Imperative Fabric.js canvas management layer
 * Location: src/lib/fabric/FabricCanvasManager.ts
 *
 * Created: Day 1 of Phase II Implementation
 *
 * This template provides the structure for the core Fabric.js manager.
 * Replace TODO comments with actual implementation during Day 1-2.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fabric from 'fabric';
import type { CanvasObject } from '../../types/canvas';

export interface FabricCanvasConfig {
  containerId: string;
  width: number;
  height: number;
  backgroundColor?: string;
}

export class FabricCanvasManager {
  private canvas: fabric.Canvas | null = null;
  private containerElement: HTMLCanvasElement | null = null;

  /**
   * Initialize Fabric.js canvas
   *
   * Creates canvas element and initializes Fabric.js with optimized configuration
   * for production use with Zustand state management.
   *
   * @param config - Canvas configuration
   * @returns Initialized canvas instance
   */
  initialize(config: FabricCanvasConfig): fabric.Canvas {
    this.createCanvasElement(config.containerId);
    this.initializeFabricCanvas(config);
    this.setupEventListeners();

    return this.canvas!;
  }

  /**
   * Create canvas DOM element
   *
   * @param containerId - ID for the canvas element
   */
  private createCanvasElement(containerId: string): void {
    this.containerElement = document.createElement('canvas');
    this.containerElement.id = containerId;
  }

  /**
   * Initialize Fabric.js canvas with performance-optimized configuration
   *
   * Configuration choices:
   * - renderOnAddRemove: false for manual control (batch updates)
   * - preserveObjectStacking: true for layer order consistency
   * - enableRetinaScaling: true for HiDPI display support
   * - selection: true for multi-object selection
   *
   * @param config - Canvas configuration
   */
  private initializeFabricCanvas(config: FabricCanvasConfig): void {
    if (!this.containerElement) {
      throw new Error('Canvas element not created');
    }

    this.canvas = new fabric.Canvas(this.containerElement, {
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor || '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: false,
      skipTargetFind: false,
      enableRetinaScaling: true,
    });
  }

  /**
   * Setup Fabric.js event listeners
   *
   * Events to handle:
   * - object:modified (for Zustand sync)
   * - selection:created (for selection state)
   * - selection:updated (for multi-select)
   * - selection:cleared (for deselect)
   */
  private setupEventListeners(): void {
    if (!this.canvas) return;

    // TODO Day 2: Object modification events
    this.canvas.on('object:modified', (e: any) => {
      const target = e.target;
      if (!target) return;

      // TODO: Sync to Zustand store
      console.log('[Fabric] Object modified:', target);
    });

    // TODO Day 2: Selection events
    this.canvas.on('selection:created', (e: any) => {
      console.log('[Fabric] Selection created:', e.selected);
      // TODO: Update selectionStore
    });

    this.canvas.on('selection:updated', (e: any) => {
      console.log('[Fabric] Selection updated:', e.selected);
      // TODO: Update selectionStore
    });

    this.canvas.on('selection:cleared', () => {
      console.log('[Fabric] Selection cleared');
      // TODO: Clear selectionStore
    });

    // TODO Day 2: Mouse events for collaboration
    this.canvas.on('mouse:move', (_e: any) => {
      // TODO: Broadcast cursor position
    });
  }

  /**
   * Create Fabric.js object from CanvasObject
   *
   * @param obj - Supabase CanvasObject
   * @returns Fabric.js object instance
   */
  createFabricObject(obj: CanvasObject): fabric.Object | null {
    // TODO Day 3: Implement object factory pattern
    switch (obj.type) {
      case 'rectangle':
        return new fabric.Rect({
          left: obj.x,
          top: obj.y,
          width: obj.width,
          height: obj.height,
          fill: obj.fill,
          stroke: obj.stroke || undefined,
          strokeWidth: obj.stroke_width || 0,
          angle: obj.rotation,
          opacity: obj.opacity,

          // Store database ID for sync
          data: { id: obj.id },
        });

      case 'circle':
        return new fabric.Circle({
          left: obj.x,
          top: obj.y,
          radius: obj.type_properties.radius,
          fill: obj.fill,
          stroke: obj.stroke || undefined,
          strokeWidth: obj.stroke_width || 0,
          angle: obj.rotation,
          opacity: obj.opacity,
          data: { id: obj.id },
        });

      case 'text':
        return new fabric.Text(obj.type_properties.text_content, {
          left: obj.x,
          top: obj.y,
          fontSize: obj.type_properties.font_size,
          fill: obj.fill,
          angle: obj.rotation,
          opacity: obj.opacity,
          data: { id: obj.id },
        });

      default:
        console.warn('[Fabric] Unknown object type:', obj.type);
        return null;
    }
  }

  /**
   * Convert Fabric.js object to CanvasObject
   *
   * @param fabricObj - Fabric.js object
   * @returns Partial CanvasObject for database sync
   */
  toCanvasObject(fabricObj: any): Partial<CanvasObject> {
    // TODO Day 3: Implement serialization
    const baseProps = {
      x: fabricObj.left || 0,
      y: fabricObj.top || 0,
      width: fabricObj.width || 0,
      height: fabricObj.height || 0,
      rotation: fabricObj.angle || 0,
      fill: (fabricObj.fill as string) || '#000000',
      stroke: fabricObj.stroke as string | null,
      stroke_width: fabricObj.strokeWidth || null,
      opacity: fabricObj.opacity || 1,
    };

    // TODO: Type-specific properties
    if (fabricObj instanceof fabric.Circle) {
      return {
        ...baseProps,
        type: 'circle',
        type_properties: {
          radius: fabricObj.radius || 0,
        },
      };
    }

    if (fabricObj instanceof fabric.Text) {
      return {
        ...baseProps,
        type: 'text',
        type_properties: {
          text_content: fabricObj.text || '',
          font_size: fabricObj.fontSize || 16,
        },
      };
    }

    // Default to rectangle
    return {
      ...baseProps,
      type: 'rectangle',
      type_properties: {},
    };
  }

  /**
   * Add object to canvas
   */
  addObject(fabricObj: fabric.Object): void {
    if (!this.canvas) return;
    this.canvas.add(fabricObj);
    this.canvas.requestRenderAll();
  }

  /**
   * Remove object from canvas
   */
  removeObject(fabricObj: fabric.Object): void {
    if (!this.canvas) return;
    this.canvas.remove(fabricObj);
    this.canvas.requestRenderAll();
  }

  /**
   * Find object by database ID
   */
  findObjectById(id: string): any {
    if (!this.canvas) return null;

    const objects = this.canvas.getObjects();
    return objects.find((obj: any) => obj.data?.id === id) || null;
  }

  /**
   * Get selected objects
   */
  getActiveObjects(): fabric.Object[] {
    if (!this.canvas) return [];
    return this.canvas.getActiveObjects();
  }

  /**
   * Clear selection
   */
  discardActiveObject(): void {
    if (!this.canvas) return;
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
  }

  /**
   * Render canvas (call after batch updates)
   */
  render(): void {
    if (!this.canvas) return;
    this.canvas.requestRenderAll();
  }

  /**
   * Dispose canvas and cleanup
   */
  dispose(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }

    if (this.containerElement) {
      this.containerElement.remove();
      this.containerElement = null;
    }
  }

  /**
   * Get canvas instance (use sparingly)
   */
  getCanvas(): fabric.Canvas | null {
    return this.canvas;
  }
}

// Singleton instance
let instance: FabricCanvasManager | null = null;

export function getFabricCanvasManager(): FabricCanvasManager {
  if (!instance) {
    instance = new FabricCanvasManager();
  }
  return instance;
}
