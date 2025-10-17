/**
 * FabricCanvasManager - Canvas Layer Implementation
 *
 * Manages Fabric.js canvas lifecycle and provides the bridge between
 * the Canvas Layer (Layer 4) and State Layer (Layer 2) in the PRD architecture.
 *
 * Responsibilities:
 * - Canvas initialization and lifecycle management
 * - Fabric.js event handling and routing to Zustand
 * - Object creation and synchronization with state
 * - Canvas rendering and viewport management
 *
 * @see docs/PHASE_2_PRD.md for architecture details
 */

import { Canvas as FabricCanvas, FabricObject, Rect, Circle, Textbox } from 'fabric';
import type { CanvasObject } from '@/types/canvas';

/**
 * Configuration options for FabricCanvasManager
 */
export interface FabricCanvasConfig {
  /**
   * Canvas background color (default: white)
   */
  backgroundColor?: string;

  /**
   * Canvas width in pixels
   */
  width?: number;

  /**
   * Canvas height in pixels
   */
  height?: number;

  /**
   * Enable selection of objects (default: true)
   */
  selection?: boolean;

  /**
   * Render on object addition (default: true)
   */
  renderOnAddRemove?: boolean;
}

/**
 * Event handlers for canvas events
 */
export interface FabricCanvasEventHandlers {
  /**
   * Called when an object is modified (moved, scaled, rotated)
   */
  onObjectModified?: (target: FabricObject) => void;

  /**
   * Called when selection is created
   */
  onSelectionCreated?: (targets: FabricObject[]) => void;

  /**
   * Called when selection is updated
   */
  onSelectionUpdated?: (targets: FabricObject[]) => void;

  /**
   * Called when selection is cleared
   */
  onSelectionCleared?: () => void;
}

/**
 * Default canvas configuration
 */
const DEFAULT_CONFIG: Required<FabricCanvasConfig> = {
  backgroundColor: '#ffffff',
  width: 800,
  height: 600,
  selection: true,
  renderOnAddRemove: true,
};

/**
 * FabricCanvasManager class
 *
 * Singleton pattern to manage a single Fabric.js canvas instance.
 */
export class FabricCanvasManager {
  private canvas: FabricCanvas | null = null;
  private config: Required<FabricCanvasConfig>;
  private eventHandlers: FabricCanvasEventHandlers = {};

  constructor(config: FabricCanvasConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the Fabric.js canvas
   *
   * @param canvasElement - HTML canvas element or element ID
   * @param config - Optional configuration override
   * @returns The initialized Fabric.js canvas instance
   */
  initialize(
    canvasElement: HTMLCanvasElement | string,
    config?: FabricCanvasConfig
  ): FabricCanvas {
    // Merge config if provided
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Create Fabric.js canvas instance
    this.canvas = new FabricCanvas(canvasElement, {
      backgroundColor: this.config.backgroundColor,
      width: this.config.width,
      height: this.config.height,
      selection: this.config.selection,
      renderOnAddRemove: this.config.renderOnAddRemove,
    });

    return this.canvas;
  }

  /**
   * Setup event listeners for Fabric.js canvas events
   *
   * Routes canvas events to registered handlers, which typically
   * update the Zustand state store.
   *
   * @param handlers - Event handler callbacks
   */
  setupEventListeners(handlers: FabricCanvasEventHandlers): void {
    if (!this.canvas) {
      throw new Error(
        'Canvas not initialized. Call initialize() before setupEventListeners()'
      );
    }

    this.eventHandlers = handlers;

    // Object modification events
    this.canvas.on('object:modified', (event) => {
      const target = event.target;
      if (target && this.eventHandlers.onObjectModified) {
        this.eventHandlers.onObjectModified(target);
      }
    });

    // Selection events
    this.canvas.on('selection:created', (event) => {
      const targets = event.selected || [];
      if (this.eventHandlers.onSelectionCreated) {
        this.eventHandlers.onSelectionCreated(targets);
      }
    });

    this.canvas.on('selection:updated', (event) => {
      const targets = event.selected || [];
      if (this.eventHandlers.onSelectionUpdated) {
        this.eventHandlers.onSelectionUpdated(targets);
      }
    });

    this.canvas.on('selection:cleared', () => {
      if (this.eventHandlers.onSelectionCleared) {
        this.eventHandlers.onSelectionCleared();
      }
    });
  }

  /**
   * Create a Fabric.js object from a CanvasObject (database representation)
   *
   * Factory method that converts our database CanvasObject schema to
   * Fabric.js objects.
   *
   * @param canvasObject - Database CanvasObject to convert
   * @returns Fabric.js object or null if type is unknown
   */
  createFabricObject(canvasObject: CanvasObject): FabricObject | null {
    let fabricObject: FabricObject | null = null;

    // Common properties for all objects
    const commonProps = {
      left: canvasObject.x,
      top: canvasObject.y,
      angle: canvasObject.rotation,
      fill: canvasObject.fill,
      stroke: canvasObject.stroke || undefined,
      strokeWidth: canvasObject.stroke_width || undefined,
      opacity: canvasObject.opacity,
      data: {
        id: canvasObject.id,
        type: canvasObject.type,
      },
    };

    // Create type-specific Fabric.js object
    switch (canvasObject.type) {
      case 'rectangle': {
        const cornerRadius = canvasObject.type_properties.corner_radius || 0;
        fabricObject = new Rect({
          ...commonProps,
          width: canvasObject.width,
          height: canvasObject.height,
          rx: cornerRadius,
          ry: cornerRadius,
        });
        break;
      }

      case 'circle': {
        const radius = canvasObject.type_properties.radius;
        fabricObject = new Circle({
          ...commonProps,
          radius,
        });
        break;
      }

      case 'text': {
        const {
          text_content,
          font_size,
          font_family,
          font_weight,
          font_style,
          text_align,
        } = canvasObject.type_properties;

        fabricObject = new Textbox(text_content, {
          ...commonProps,
          width: canvasObject.width,
          fontSize: font_size,
          fontFamily: font_family || 'Arial',
          fontWeight: font_weight || 'normal',
          fontStyle: font_style || 'normal',
          textAlign: text_align || 'left',
        });
        break;
      }

      default:
        // Unknown type, return null
        return null;
    }

    return fabricObject;
  }

  /**
   * Get the canvas instance
   *
   * @returns Fabric.js canvas instance or null if not initialized
   */
  getCanvas(): FabricCanvas | null {
    return this.canvas;
  }

  /**
   * Dispose of the canvas and clean up resources
   */
  dispose(): void {
    if (this.canvas) {
      this.canvas.dispose();
      this.canvas = null;
    }
    this.eventHandlers = {};
  }
}
