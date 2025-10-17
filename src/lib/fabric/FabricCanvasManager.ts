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

import { Canvas as FabricCanvas, FabricObject, Rect, Circle, Textbox, Path, Text } from 'fabric';
import type { CanvasObject, RectangleObject, CircleObject, TextObject, ShapeType } from '@/types/canvas';
import type { CursorPosition, UserPresence } from '@/stores/slices/collaborationSlice';

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
  private cursorObjects: FabricObject[] = []; // W1.D6: Track cursor overlay objects

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
   * Converts a Fabric.js object back to our database CanvasObject format
   * This is the reverse operation of createFabricObject()
   *
   * NOTE: This method is primarily used for:
   * 1. Serializing modified objects back to database format
   * 2. Testing round-trip serialization
   * 3. State synchronization with Zustand
   *
   * @param fabricObject - The Fabric.js object to serialize
   * @returns CanvasObject suitable for database storage, or null if input is null
   */
  toCanvasObject(fabricObject: FabricObject | null): CanvasObject | null {
    if (!fabricObject || !fabricObject.data) {
      return null;
    }

    // Extract stored database type and ID from data property
    // These were set when the object was created via createFabricObject()
    const dbType = fabricObject.data.type as ShapeType;
    const dbId = fabricObject.data.id as string;

    // Extract common properties from Fabric.js object
    // Maps Fabric.js property names to our database schema
    const baseProperties = {
      id: dbId,
      x: fabricObject.left || 0,
      y: fabricObject.top || 0,
      width: fabricObject.width || 0,
      height: fabricObject.height || 0,
      rotation: fabricObject.angle || 0,
      group_id: null, // TODO: Implement group support in W1.D3
      z_index: 1, // TODO: Calculate from canvas.getObjects() index in W1.D3
      fill: fabricObject.fill as string,
      stroke: (fabricObject.stroke as string) || null,
      stroke_width: fabricObject.strokeWidth || null,
      opacity: fabricObject.opacity ?? 1,
      style_properties: {}, // TODO: Implement style properties in W2.D1
      metadata: {}, // TODO: Implement metadata in W2.D1
      // Audit fields: These should ideally be preserved from original object
      // For now, using fresh timestamps (will be overwritten by Zustand layer)
      created_by: 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      locked_by: null,
      lock_acquired_at: null,
    };

    // Create type-specific CanvasObject based on stored type
    switch (dbType) {
      case 'rectangle': {
        const rect = fabricObject as any; // Cast to access rx/ry
        return {
          ...baseProperties,
          type: 'rectangle',
          type_properties: {
            corner_radius: rect.rx || 0,
          },
        } as RectangleObject;
      }

      case 'circle': {
        const circle = fabricObject as any; // Cast to access radius
        return {
          ...baseProperties,
          type: 'circle',
          type_properties: {
            radius: circle.radius || 0,
          },
        } as CircleObject;
      }

      case 'text': {
        const textbox = fabricObject as any; // Cast to access text properties
        return {
          ...baseProperties,
          type: 'text',
          type_properties: {
            text_content: textbox.text || '',
            font_size: textbox.fontSize || 16,
            font_family: textbox.fontFamily || 'Arial',
            font_weight: textbox.fontWeight || 'normal',
            font_style: textbox.fontStyle || 'normal',
            text_align: textbox.textAlign || 'left',
          },
        } as TextObject;
      }

      default:
        return null;
    }
  }

  /**
   * Add a CanvasObject to the canvas
   *
   * Converts a database CanvasObject to a Fabric.js object and adds it to the canvas.
   * The Fabric.js object is automatically rendered on the canvas.
   *
   * @param canvasObject - Database CanvasObject to add
   * @returns The created Fabric.js object, or null if canvas not initialized or object creation failed
   */
  addObject(canvasObject: CanvasObject): FabricObject | null {
    if (!this.canvas) {
      return null;
    }

    // Convert database object to Fabric.js object
    const fabricObject = this.createFabricObject(canvasObject);

    if (!fabricObject) {
      return null;
    }

    // Add to canvas and render
    this.canvas.add(fabricObject);

    return fabricObject;
  }

  /**
   * Remove an object from the canvas by its database ID
   *
   * Searches for an object with the specified database ID and removes it from the canvas.
   *
   * @param id - Database ID of the object to remove
   * @returns true if object was found and removed, false otherwise
   */
  removeObject(id: string): boolean {
    if (!this.canvas) {
      return false;
    }

    // Find the object by ID
    const fabricObject = this.findObjectById(id);

    if (!fabricObject) {
      return false;
    }

    // Remove from canvas
    this.canvas.remove(fabricObject);

    return true;
  }

  /**
   * Find a Fabric.js object on the canvas by its database ID
   *
   * Searches all objects on the canvas for one with matching database ID
   * stored in the data property.
   *
   * @param id - Database ID to search for
   * @returns The Fabric.js object if found, null otherwise
   */
  findObjectById(id: string): FabricObject | null {
    if (!this.canvas) {
      return null;
    }

    // Search through all canvas objects
    const objects = this.canvas.getObjects();

    for (const obj of objects) {
      if (obj.data?.id === id) {
        return obj;
      }
    }

    return null;
  }

  /**
   * Select an object on the canvas by its database ID
   *
   * Sets the specified object as the active selection on the canvas.
   *
   * @param id - Database ID of the object to select
   * @returns true if object was found and selected, false otherwise
   */
  selectObject(id: string): boolean {
    if (!this.canvas) {
      return false;
    }

    // Find the object by ID
    const fabricObject = this.findObjectById(id);

    if (!fabricObject) {
      return false;
    }

    // Set as active object (select it)
    this.canvas.setActiveObject(fabricObject);
    this.canvas.renderAll();

    return true;
  }

  /**
   * Deselect all selected objects on the canvas
   *
   * Clears the current selection, leaving no objects selected.
   */
  deselectAll(): void {
    if (!this.canvas) {
      return;
    }

    this.canvas.discardActiveObject();
    this.canvas.renderAll();
  }

  /**
   * Get the database IDs of all currently selected objects
   *
   * Returns an array of database IDs for objects in the current selection.
   * For single selection, returns array with one ID.
   * For multiple selection, returns array with all selected IDs.
   *
   * @returns Array of database IDs of selected objects, empty array if none selected
   */
  getSelectedObjects(): string[] {
    if (!this.canvas) {
      return [];
    }

    const activeObject = this.canvas.getActiveObject();

    if (!activeObject) {
      return [];
    }

    // Check if it's a multi-selection (ActiveSelection)
    if (activeObject.type === 'activeSelection') {
      // Get all objects in the selection
      const objects = (activeObject as any)._objects || [];
      return objects
        .map((obj: FabricObject) => obj.data?.id)
        .filter((id: string | undefined) => id !== undefined) as string[];
    }

    // Single object selected
    const id = activeObject.data?.id;
    return id ? [id] : [];
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
   * W1.D6: Render remote collaborator cursors on the canvas
   *
   * Displays cursor icons and user name labels for all active collaborators.
   * Clears previous cursor overlays before rendering new ones.
   *
   * @param cursors - Map of userId -> cursor position
   * @param presence - Map of userId -> user presence data
   */
  renderRemoteCursors(
    cursors: Record<string, CursorPosition>,
    presence: Record<string, UserPresence>
  ): void {
    if (!this.canvas) {
      return;
    }

    // Clear previous cursor objects from canvas
    this.cursorObjects.forEach((obj) => {
      this.canvas?.remove(obj);
    });
    this.cursorObjects = [];

    // Render cursor for each user
    Object.entries(cursors).forEach(([userId, cursor]) => {
      const user = presence[userId];

      // Skip if presence data is missing
      if (!user) {
        return;
      }

      // Create cursor icon (SVG path for pointer shape)
      const cursorIcon = new Path('M0,0 L0,20 L5,15 L10,22 L14,20 L9,13 L17,13 Z', {
        fill: user.userColor,
        left: cursor.x,
        top: cursor.y,
        selectable: false,
        evented: false, // Don't interfere with canvas events
        hoverCursor: 'default',
      });

      // Create user name label
      const nameLabel = new Text(user.userName, {
        left: cursor.x + 20, // Offset 20px to the right of cursor
        top: cursor.y,
        fontSize: 12,
        fill: user.userColor,
        backgroundColor: 'white',
        padding: 2,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
      });

      // Add to canvas and track for cleanup
      this.canvas.add(cursorIcon, nameLabel);
      this.cursorObjects.push(cursorIcon, nameLabel);
    });

    // Render all cursor objects
    this.canvas.renderAll();
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
    this.cursorObjects = [];
  }
}
