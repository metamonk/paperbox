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
  createFabricObject(obj: CanvasObject | Partial<CanvasObject>): fabric.Object | null {
    if (!obj.type) return null;

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
          stroke: obj.stroke || undefined,
          strokeWidth: obj.stroke_width || 0,
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
    if (!fabricObj) {
      throw new Error('Cannot serialize null or undefined Fabric object');
    }

    const baseProps = {
      id: fabricObj.data?.id,
      x: fabricObj.left || 0,
      y: fabricObj.top || 0,
      width: fabricObj.width || 0,
      height: fabricObj.height || 0,
      rotation: fabricObj.angle || 0,
      fill: (fabricObj.fill as string) || '#000000',
      stroke: fabricObj.stroke ? (fabricObj.stroke as string) : null,
      stroke_width: fabricObj.strokeWidth ? fabricObj.strokeWidth : null,
      opacity: fabricObj.opacity !== undefined ? fabricObj.opacity : 1,
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
   * Batch add multiple objects
   *
   * Efficiently adds multiple CanvasObjects in a single render cycle.
   * Uses renderOnAddRemove: false configuration for performance.
   *
   * @param objects - Array of CanvasObjects to add
   */
  batchAddObjects(objects: CanvasObject[]): void {
    if (!this.canvas || objects.length === 0) return;

    const fabricObjects: fabric.Object[] = [];

    for (const obj of objects) {
      const fabricObj = this.createFabricObject(obj);
      if (fabricObj) {
        fabricObjects.push(fabricObj);
      }
    }

    // Add all objects at once without individual renders
    this.canvas.add(...fabricObjects);

    // Single render after all objects added
    this.canvas.requestRenderAll();
  }

  /**
   * Batch remove multiple objects by their database IDs
   *
   * Efficiently removes multiple objects in a single render cycle.
   *
   * @param ids - Array of database IDs to remove
   */
  batchRemoveObjects(ids: string[]): void {
    if (!this.canvas || ids.length === 0) return;

    const objectsToRemove: fabric.Object[] = [];

    for (const id of ids) {
      const obj = this.findObjectById(id);
      if (obj) {
        objectsToRemove.push(obj);
      }
    }

    // Remove all objects at once
    this.canvas.remove(...objectsToRemove);

    // Single render after all objects removed
    this.canvas.requestRenderAll();
  }

  /**
   * Save canvas state to serializable format
   *
   * Captures current canvas state including all objects and configuration.
   * Useful for undo/redo, persistence, and state recovery.
   *
   * @returns Canvas state object
   */
  saveState(): {
    objects: Partial<CanvasObject>[];
    backgroundColor: string;
    width: number;
    height: number;
  } {
    if (!this.canvas) {
      return {
        objects: [],
        backgroundColor: '#ffffff',
        width: 0,
        height: 0,
      };
    }

    const fabricObjects = this.canvas.getObjects();
    const objects = fabricObjects.map((obj) => this.toCanvasObject(obj));

    return {
      objects,
      backgroundColor: this.canvas.backgroundColor as string || '#ffffff',
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight(),
    };
  }

  /**
   * Load canvas state from serialized format
   *
   * Restores canvas state from previously saved state object.
   * Clears existing canvas and recreates all objects.
   *
   * @param state - Previously saved canvas state
   */
  loadState(state: {
    objects: Partial<CanvasObject>[];
    backgroundColor?: string;
    width?: number;
    height?: number;
  }): void {
    if (!this.canvas) return;

    // Clear existing objects
    this.canvas.clear();

    // Restore canvas configuration
    if (state.backgroundColor) {
      this.canvas.backgroundColor = state.backgroundColor;
    }
    if (state.width && state.height) {
      this.canvas.setWidth(state.width);
      this.canvas.setHeight(state.height);
    }

    // Restore objects
    const fabricObjects: fabric.Object[] = [];

    for (const obj of state.objects) {
      const fabricObj = this.createFabricObject(obj as CanvasObject);
      if (fabricObj) {
        fabricObjects.push(fabricObj);
      }
    }

    // Add all objects at once
    if (fabricObjects.length > 0) {
      this.canvas.add(...fabricObjects);
    }

    // Render
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
