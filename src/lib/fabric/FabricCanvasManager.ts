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

// W2.D12 FIX: Use Fabric.js v6 official import pattern (named imports)
// v6 removed the fabric namespace - use named exports instead
// Official v6 pattern: import { Canvas, Rect, ... } from 'fabric'
// See: https://github.com/fabricjs/fabric.js/issues/8299
import { Canvas, Rect, Circle, Textbox, FabricObject, Path, Point, Text } from 'fabric';

import type { CanvasObject, RectangleObject, CircleObject, TextObject, ShapeType } from '@/types/canvas';
import type { CursorPosition, UserPresence } from '@/stores/slices/collaborationSlice';

/**
 * Extended FabricObject type with custom data property
 * Fabric.js v6 allows arbitrary properties but TypeScript needs explicit declaration
 */
interface FabricObjectWithData extends FabricObject {
  data?: { id: string; type: string };
}

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

  /**
   * W2.D12: Called when user clicks canvas during placement mode (Figma pattern)
   * Provides canvas-relative coordinates from click position
   */
  onPlacementClick?: (x: number, y: number) => void;
}

/**
 * Default canvas configuration
 */
const DEFAULT_CONFIG: Required<FabricCanvasConfig> = {
  backgroundColor: '#f5f5f5', // Light gray background (Figma-style) for white object contrast
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
  private canvas: Canvas | null = null;
  private config: Required<FabricCanvasConfig>;
  private eventHandlers: FabricCanvasEventHandlers = {};
  private cursorObjects: FabricObject[] = []; // W1.D6: Track cursor overlay objects
  private viewportSyncCallback: ((zoom: number, panX: number, panY: number) => void) | null = null; // W2.D6.6: Viewport sync callback

  // W2.D7.7: Performance optimization - RAF throttling
  private rafId: number | null = null; // requestAnimationFrame ID for throttling
  private pendingViewportSync: boolean = false; // Flag for pending sync

  // W2.D8.4-5: Pixel grid visualization
  private pixelGridInitialized: boolean = false;
  private pixelGridPattern: FabricObject[] = []; // Grid lines
  private readonly PIXEL_GRID_THRESHOLD = 8; // Show grid when zoom > 8x

  // W2.D8.7: Canvas boundary limits (Figma-style)
  private readonly CANVAS_BOUNDARY = 50000; // ±50,000 pixels from origin

  // W4.D3: Canvas resize observer for responsive rendering
  private resizeObserver: ResizeObserver | null = null;
  private canvasContainer: HTMLElement | null = null;

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
  ): Canvas {
    // Merge config if provided
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // W2.D12 FIX: Fabric.js v6 expects string ID, not HTMLCanvasElement
    // If we have an HTMLCanvasElement, get its ID instead
    let canvasId: string;
    let element: HTMLCanvasElement;

    if (typeof canvasElement === 'string') {
      canvasId = canvasElement;
      element = document.getElementById(canvasElement) as HTMLCanvasElement;
    } else {
      // Get ID from element - it MUST have an ID for Fabric.js to work correctly
      canvasId = canvasElement.id;
      element = canvasElement;

      if (!canvasId) {
        throw new Error('Canvas element must have an ID attribute for Fabric.js initialization');
      }
    }

    if (!element) {
      throw new Error('Canvas element not found');
    }

    // W2.D12 DEBUG: Check canvas element state before Fabric.js initialization
    console.log('[FabricCanvasManager] Canvas element BEFORE Fabric init:', {
      id: element.id,
      widthAttr: element.width,
      heightAttr: element.height,
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      hasGetContext: typeof element.getContext !== 'undefined'
    });

    // Calculate dimensions from parent container for full viewport sizing
    const parent = element.parentElement;
    const width = parent ? parent.clientWidth : this.config.width;
    const height = parent ? parent.clientHeight : this.config.height;

    // W2.D12 FIX: Fabric.js v6 Canvas constructor expects ID string, not HTMLCanvasElement
    // From official docs: new fabric.Canvas('canvasId', options)
    // Passing HTMLCanvasElement directly may cause rendering issues
    console.log(`[FabricCanvasManager] Initializing Fabric.js v6 Canvas with ID: "${canvasId}"`);
    console.log(`[FabricCanvasManager] Config:`, {
      backgroundColor: this.config.backgroundColor,
      width,
      height,
      selection: this.config.selection,
      renderOnAddRemove: this.config.renderOnAddRemove,
    });

    this.canvas = new Canvas(canvasId, {
      backgroundColor: this.config.backgroundColor,
      width,
      height,
      selection: this.config.selection,
      renderOnAddRemove: this.config.renderOnAddRemove,
    });

    console.log(`[FabricCanvasManager] Canvas created:`, this.canvas);
    console.log(`[FabricCanvasManager] Canvas type:`, this.canvas.constructor.name);
    console.log(`[FabricCanvasManager] Canvas dimensions: ${this.canvas.width}x${this.canvas.height}`);
    console.log(`[FabricCanvasManager] Canvas element:`, this.canvas.lowerCanvasEl);

    // W2.D12 DEBUG: Expose canvas instance globally for debugging
    (window as any).__fabricCanvas = this.canvas;
    console.log('[FabricCanvasManager] Canvas instance exposed as window.__fabricCanvas for debugging');

    // W4.D3: Setup ResizeObserver for responsive canvas rendering
    this.setupResizeObserver(element);

    return this.canvas;
  }

  /**
   * W4.D3: Setup ResizeObserver to handle canvas resizing
   *
   * Watches the canvas container for size changes (e.g., when DevTools opens/closes)
   * and updates Fabric.js canvas dimensions accordingly.
   *
   * Fixes white space issue where canvas doesn't re-render when viewport changes.
   */
  private setupResizeObserver(canvasElement: HTMLCanvasElement): void {
    const container = canvasElement.parentElement;
    if (!container) {
      console.warn('[FabricCanvasManager] No parent container found for ResizeObserver');
      return;
    }

    this.canvasContainer = container;

    // Create ResizeObserver to watch container size changes
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!this.canvas) return;

        const { width, height } = entry.contentRect;

        console.log('[FabricCanvasManager] Container resized:', {
          width,
          height,
          prevWidth: this.canvas.width,
          prevHeight: this.canvas.height,
        });

        // Update Fabric canvas dimensions
        this.canvas.setDimensions({
          width,
          height,
        });

        // Re-render with new dimensions
        this.canvas.requestRenderAll();

        console.log('[FabricCanvasManager] Canvas resized and re-rendered');
      }
    });

    // Start observing the container
    this.resizeObserver.observe(container);
    console.log('[FabricCanvasManager] ResizeObserver initialized for container');
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

    // W4.D3: Update cursor based on placement mode
    if (handlers.onPlacementClick) {
      // Entering placement mode - set crosshair cursor
      this.canvas.defaultCursor = 'crosshair';
      this.canvas.setCursor('crosshair');
      this.canvas.hoverCursor = 'crosshair';
    } else {
      // Exiting placement mode - restore default cursor
      this.canvas.defaultCursor = 'default';
      this.canvas.setCursor('default');
      this.canvas.hoverCursor = 'move';
    }

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
      originX: 'center', // W4.D3 FIX: Center object origin for placement
      originY: 'center', // W4.D3 FIX: Center object origin for placement
      angle: canvasObject.rotation,
      fill: canvasObject.fill,
      stroke: canvasObject.stroke || undefined,
      strokeWidth: canvasObject.stroke_width || undefined,
      opacity: canvasObject.opacity,
      visible: true, // W2.D12 FIX: Explicitly set visible to ensure objects render
      selectable: true, // W2.D12 FIX: Explicitly set selectable
      evented: true, // W2.D12 FIX: Explicitly set evented to ensure interaction
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
    const obj = fabricObject as FabricObjectWithData;
    if (!obj || !obj.data) {
      return null;
    }

    // Extract stored database type and ID from data property
    // These were set when the object was created via createFabricObject()
    const dbType = obj.data.type as ShapeType;
    const dbId = obj.data.id as string;

    // Extract common properties from Fabric.js object
    // Maps Fabric.js property names to our database schema
    const baseProperties = {
      id: dbId,
      x: obj.left || 0,
      y: obj.top || 0,
      width: obj.width || 0,
      height: obj.height || 0,
      rotation: obj.angle || 0,
      group_id: null, // TODO: Implement group support in W1.D3
      z_index: 1, // TODO: Calculate from canvas.getObjects() index in W1.D3
      fill: obj.fill as string,
      stroke: (obj.stroke as string) || null,
      stroke_width: obj.strokeWidth || null,
      opacity: obj.opacity ?? 1,
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
      console.log('[FabricCanvasManager] addObject: canvas is null');
      return null;
    }

    // Convert database object to Fabric.js object
    const fabricObject = this.createFabricObject(canvasObject);

    if (!fabricObject) {
      console.log('[FabricCanvasManager] addObject: createFabricObject returned null');
      return null;
    }

    console.log('[FabricCanvasManager] Adding object to canvas:', {
      id: canvasObject.id,
      type: canvasObject.type,
      x: canvasObject.x,
      y: canvasObject.y,
      objectCount: this.canvas.getObjects().length
    });

    // W2.D12 DEBUG: Log object details BEFORE adding
    console.log('[FabricCanvasManager] fabricObject details:', {
      type: fabricObject.type,
      left: (fabricObject as any).left,
      top: (fabricObject as any).top,
      width: (fabricObject as any).width,
      height: (fabricObject as any).height,
      fill: (fabricObject as any).fill,
      visible: (fabricObject as any).visible,
      opacity: (fabricObject as any).opacity,
    });

    // Add to canvas and render
    this.canvas.add(fabricObject);

    // W2.D12 FIX: Use synchronous renderAll() instead of requestRenderAll()
    // requestRenderAll() schedules render on next animation frame (async)
    // renderAll() renders immediately (sync) - critical for initial object visibility
    this.canvas.renderAll();

    console.log('[FabricCanvasManager] Object added, new count:', this.canvas.getObjects().length);

    // W2.D12 DEBUG: Check if object is actually in canvas
    const objectsInCanvas = this.canvas.getObjects();
    console.log('[FabricCanvasManager] Objects in canvas:', objectsInCanvas);
    console.log('[FabricCanvasManager] Last object in canvas:', objectsInCanvas[objectsInCanvas.length - 1]);

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
      const objWithData = obj as FabricObjectWithData;
      if (objWithData.data?.id === id) {
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
        .map((obj: FabricObject) => (obj as FabricObjectWithData).data?.id)
        .filter((id: string | undefined) => id !== undefined) as string[];
    }

    // Single object selected
    const id = (activeObject as FabricObjectWithData).data?.id;
    return id ? [id] : [];
  }

  /**
   * Get the canvas instance
   *
   * @returns Fabric.js canvas instance or null if not initialized
   */
  getCanvas(): Canvas | null {
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
      if (this.canvas) {
        this.canvas.add(cursorIcon as FabricObject, nameLabel as FabricObject);
        this.cursorObjects.push(cursorIcon as FabricObject, nameLabel as FabricObject);
      }
    });

    // Render all cursor objects
    this.canvas.renderAll();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Viewport Management (W2.D6.4-6.6)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * W2.D6.6: Set viewport sync callback
   *
   * This callback is called after zoom/pan events to sync viewport state to Zustand.
   *
   * @param callback - Function to call with (zoom, panX, panY) values
   */
  setViewportSyncCallback(callback: (zoom: number, panX: number, panY: number) => void): void {
    this.viewportSyncCallback = callback;
  }

  /**
   * W2.D7.7: Throttled viewport sync using requestAnimationFrame
   *
   * Ensures viewport updates are batched to animation frames (~60fps)
   * to prevent excessive state updates during rapid zoom/pan operations.
   *
   * Pattern: RAF-based throttling
   * - Only one RAF callback pending at a time
   * - Always executes with latest viewport state
   * - Automatically debounces rapid updates to next frame
   */
  private requestViewportSync(): void {
    // If RAF already scheduled, just mark pending
    if (this.rafId !== null) {
      this.pendingViewportSync = true;
      return;
    }

    // Schedule RAF callback
    this.rafId = requestAnimationFrame(() => {
      // Execute sync with current viewport state
      if (this.viewportSyncCallback && this.canvas) {
        const viewport = this.getViewport();
        this.viewportSyncCallback(viewport.zoom, viewport.panX, viewport.panY);
      }

      // Clear RAF ID
      this.rafId = null;

      // If another sync was requested during this frame, schedule next
      if (this.pendingViewportSync) {
        this.pendingViewportSync = false;
        this.requestViewportSync();
      }
    });
  }

  /**
   * W2.D6.6: Setup mousewheel zoom functionality
   *
   * Implements official Fabric.js pattern for zoom-to-cursor.
   * Formula: zoom *= 0.999 ** deltaY
   * Clamped: 0.01 <= zoom <= 20
   */
  setupMousewheelZoom(): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    this.canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = this.canvas!.getZoom();

      // Apply zoom formula
      zoom *= 0.999 ** delta;

      // Clamp zoom to range
      if (zoom > 20) zoom = 20;
      if (zoom < 0.01) zoom = 0.01;

      // Zoom to cursor position
      this.canvas!.zoomToPoint(
        new Point(opt.e.offsetX || 0, opt.e.offsetY || 0),
        zoom
      );

      // Prevent default browser scroll
      opt.e.preventDefault();
      opt.e.stopPropagation();

      // Sync viewport to Zustand (throttled via RAF)
      this.requestViewportSync();
    });
  }

  /**
   * W2.D6.8: Setup spacebar + drag panning controls
   * W2.D8.9: Add cursor visual feedback for pan mode
   *
   * Pattern: Spacebar activates pan mode, mouse drag pans canvas
   * - Spacebar key detection via document keydown/keyup
   * - Pan mode disables canvas selection during pan
   * - Cursor changes: default → grab → grabbing → default
   * - Mouse drag updates viewport via relativePan()
   * - Syncs viewport to Zustand on mouse:up
   */
  setupSpacebarPan(): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    let isPanning = false;
    let isSpacePressed = false;
    let lastPosX = 0;
    let lastPosY = 0;

    // Spacebar keydown - enable pan mode
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !isSpacePressed) {
        isSpacePressed = true;
        if (this.canvas) {
          this.canvas.selection = false; // Disable selection during pan
          // W2.D8.9: Change cursor to grab (hand open)
          this.canvas.defaultCursor = 'grab';
          // Fabric.js v6: Use setCursor() to immediately apply cursor change
          this.canvas.setCursor('grab');
        }
      }
    };

    // Spacebar keyup - disable pan mode
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        isSpacePressed = false;
        isPanning = false;
        if (this.canvas) {
          this.canvas.selection = true; // Re-enable selection
          // W2.D8.9: Restore default cursor
          this.canvas.defaultCursor = 'default';
          // Fabric.js v6: Use setCursor() to immediately apply cursor change
          this.canvas.setCursor('default');
        }
      }
    };

    // Mouse down - handle placement mode OR start panning if spacebar held
    this.canvas.on('mouse:down', (opt: any) => {
      // W2.D12: Check for placement mode first (higher priority than panning)
      // Only trigger placement if clicking empty canvas (no target object)
      if (!opt.target && this.eventHandlers.onPlacementClick) {
        // Get fabric space coordinates (accounts for pan/zoom)
        // ignoreZoom: false = fabric space coordinates (correct for object placement)
        // This ensures objects are placed at the correct position regardless of zoom level
        const pointer = this.canvas!.getPointer(opt.e, false);

        console.log('[FabricCanvasManager] Placement click detected:', {
          fabricX: pointer.x,
          fabricY: pointer.y,
          zoom: this.canvas!.getZoom(),
          vpt: this.canvas!.viewportTransform,
        });

        // Trigger placement handler with fabric space coordinates
        this.eventHandlers.onPlacementClick(pointer.x, pointer.y);
        return; // Don't process as pan event
      }

      // Spacebar panning (existing logic)
      if (isSpacePressed && this.canvas) {
        isPanning = true;
        lastPosX = opt.e.clientX || 0;
        lastPosY = opt.e.clientY || 0;
        // W2.D8.9: Change cursor to grabbing (hand closed)
        this.canvas.defaultCursor = 'grabbing';
        // Fabric.js v6: Use setCursor() to immediately apply cursor change
        this.canvas.setCursor('grabbing');
      }
    });

    // Mouse move - pan viewport if panning active
    this.canvas.on('mouse:move', (opt: any) => {
      if (isPanning && this.canvas) {
        const e = opt.e;
        const currentX = e.clientX || 0;
        const currentY = e.clientY || 0;

        // Calculate delta from last position
        const deltaX = currentX - lastPosX;
        const deltaY = currentY - lastPosY;

        // Update viewport using relativePan
        // W2.D7.6: CRITICAL - Always call requestRenderAll() after modifying matrix
        // Fabric.js v6 pattern: Direct matrix modification + requestRenderAll()
        const vpt = this.canvas.viewportTransform;
        const zoom = this.canvas.getZoom();

        // W2.D8.7: Calculate new pan position with boundary enforcement
        let newPanX = vpt[4] + deltaX;
        let newPanY = vpt[5] + deltaY;

        // Clamp pan to canvas boundaries (±50,000 pixels from origin)
        const maxPan = this.CANVAS_BOUNDARY * zoom;
        const minPan = -this.CANVAS_BOUNDARY * zoom;

        newPanX = Math.max(minPan, Math.min(maxPan, newPanX));
        newPanY = Math.max(minPan, Math.min(maxPan, newPanY));

        vpt[4] = newPanX;
        vpt[5] = newPanY;

        // W4.D1 FIX: Update selection controls after spacebar pan
        const activeObject = this.canvas.getActiveObject();
        if (activeObject) {
          activeObject.setCoords(); // Recalculate control positions
        }

        this.canvas.requestRenderAll(); // Triggers recalculation

        // Update last position
        lastPosX = currentX;
        lastPosY = currentY;
      }
    });

    // Mouse up - end panning and sync viewport
    this.canvas.on('mouse:up', () => {
      if (isPanning && this.canvas) {
        isPanning = false;
        // W2.D8.9: Return cursor to grab (ready to pan again)
        this.canvas.defaultCursor = 'grab';
        // Fabric.js v6: Use setCursor() to immediately apply cursor change
        this.canvas.setCursor('grab');

        // Sync viewport to Zustand (throttled via RAF)
        this.requestViewportSync();

        // Update pixel grid after panning
        this.updatePixelGridVisibility();
      }
    });

    // Add event listeners to document
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Store references for cleanup (attach to canvas instance)
    (this.canvas as any).__spacebarHandlers = {
      keydown: handleKeyDown,
      keyup: handleKeyUp,
    };
  }

  /**
   * W2.D12+: Setup scroll pan and zoom interactions (Figma-style)
   *
   * Behavior:
   * - Scroll (no modifier) = Pan canvas vertically/horizontally
   * - Cmd/Ctrl + Scroll = Zoom in/out at cursor position
   * - Shift + Scroll = Pan horizontally
   *
   * Disabled during placement mode to avoid interference.
   */
  setupScrollPanAndZoom(): void {
    if (!this.canvas) return;

    this.canvas.on('mouse:wheel', (opt: any) => {
      const event = opt.e as WheelEvent;

      // Prevent default scroll behavior
      event.preventDefault();

      // Get delta value (normalized for cross-browser compatibility)
      const delta = event.deltaY;

      // Check for zoom modifier (Cmd on Mac, Ctrl on Windows/Linux)
      const isZoomModifier = event.metaKey || event.ctrlKey;

      console.log('[FabricCanvasManager] mouse:wheel:', {
        deltaX: event.deltaX,
        deltaY: event.deltaY,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        isZoomModifier,
        action: isZoomModifier ? 'ZOOM' : 'PAN',
      });

      if (isZoomModifier) {
        // Cmd/Ctrl + Scroll = Zoom
        this.handleScrollZoom(event, delta);
      } else {
        // Scroll = Pan (default Figma behavior)
        this.handleScrollPan(event, delta);
      }
    });
  }

  /**
   * Handle scroll panning (Figma default behavior)
   *
   * - Vertical scroll = Pan up/down
   * - Horizontal scroll = Pan left/right (trackpad horizontal scroll)
   * - Shift + Vertical Scroll = Pan left/right
   */
  private handleScrollPan(event: WheelEvent, _delta: number) {
    if (!this.canvas) return;

    // Get both horizontal and vertical deltas
    const deltaX = event.deltaX;
    const deltaY = event.deltaY;

    // Determine pan direction:
    // - Horizontal scroll (deltaX) OR Shift + vertical scroll = Pan left/right
    // - Vertical scroll (deltaY) = Pan up/down
    let panX = deltaX; // Trackpad horizontal scroll
    let panY = deltaY; // Trackpad vertical scroll

    // Shift modifier: Convert vertical scroll to horizontal pan
    if (event.shiftKey) {
      panX = deltaY;
      panY = 0;
    }

    // Apply pan (negative to match natural scroll direction)
    const vpt = this.canvas.viewportTransform;
    const zoom = this.canvas.getZoom();

    // Calculate new pan with boundary enforcement
    let newPanX = vpt[4] - panX;
    let newPanY = vpt[5] - panY;

    // Clamp to canvas boundaries
    const maxPan = this.CANVAS_BOUNDARY * zoom;
    const minPan = -this.CANVAS_BOUNDARY * zoom;

    newPanX = Math.max(minPan, Math.min(maxPan, newPanX));
    newPanY = Math.max(minPan, Math.min(maxPan, newPanY));

    vpt[4] = newPanX;
    vpt[5] = newPanY;

    // W4.D1 FIX: Update selection controls after viewport change
    // Fabric.js v6 doesn't automatically update controls with requestRenderAll()
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      activeObject.setCoords(); // Recalculate control positions
    }

    this.canvas.requestRenderAll();

    // Sync viewport to Zustand
    this.requestViewportSync();

    // Update pixel grid visibility
    this.updatePixelGridVisibility();
  }

  /**
   * Handle scroll zoom (Cmd/Ctrl + Scroll)
   *
   * Zoom centered on cursor position (Figma behavior)
   * - Scroll up = Zoom in
   * - Scroll down = Zoom out
   */
  private handleScrollZoom(event: WheelEvent, delta: number) {
    if (!this.canvas) return;

    // Get current zoom
    const zoom = this.canvas.getZoom();

    // Calculate zoom factor (10% increment/decrement)
    const zoomFactor = delta > 0 ? 0.9 : 1.1;
    let newZoom = zoom * zoomFactor;

    // Clamp zoom range (0.1x to 10x)
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 10;
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

    // Get cursor position for zoom center (viewport coordinates)
    const pointer = this.canvas.getPointer(event, true);

    // Zoom to cursor position
    this.canvas.zoomToPoint(
      new Point(pointer.x, pointer.y),
      newZoom
    );

    // W4.D1 FIX: Update selection controls after zoom
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      activeObject.setCoords(); // Recalculate control positions
    }

    this.canvas.requestRenderAll();

    // Sync viewport to Zustand
    this.requestViewportSync();

    // Update pixel grid visibility based on new zoom
    this.updatePixelGridVisibility();
  }

  /**
   * W2.D6.4: Get current viewport state from Fabric.js canvas
   *
   * Reads zoom and pan from viewportTransform matrix.
   * viewportTransform is a 6-element array: [scaleX, skewY, skewX, scaleY, translateX, translateY]
   *
   * @returns Object with zoom, panX, panY values
   */
  getViewport(): { zoom: number; panX: number; panY: number } {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    const zoom = this.canvas.getZoom();
    const vpt = this.canvas.viewportTransform;

    return {
      zoom,
      panX: vpt[4],
      panY: vpt[5],
    };
  }

  /**
   * W2.D6.4: Restore viewport state to Fabric.js canvas
   *
   * Applies zoom and pan using setZoom() and absolutePan().
   * This is called during initialization to restore saved viewport.
   *
   * @param zoom - Zoom level to apply
   * @param panX - Horizontal pan offset
   * @param panY - Vertical pan offset
   */
  restoreViewport(zoom: number, panX: number, panY: number): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Apply zoom first
    this.canvas.setZoom(zoom);

    // Then apply pan using absolutePan
    this.canvas.absolutePan(new Point(panX, panY));

    // Render the canvas with new viewport
    this.canvas.renderAll();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Pixel Grid Visualization (W2.D8.4-5)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * W2.D8.4: Setup pixel grid visualization system
   *
   * Initializes the pixel grid system that shows/hides grid lines based on zoom level.
   * Grid appears when zoom > 8x for precision design work (like Figma).
   *
   * Pattern:
   * - Grid lines are rendered as Fabric.js Line objects
   * - Lines are non-selectable and non-evented (don't interfere with canvas)
   * - Grid visibility is controlled by zoom event listener
   * - Grid spacing = zoom level (1:1 pixel ratio)
   */
  setupPixelGrid(): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Prevent multiple initializations
    if (this.pixelGridInitialized) {
      return;
    }

    // Register zoom event listener to update grid visibility
    this.canvas.on('mouse:wheel', () => {
      this.updatePixelGridVisibility();
    });

    // Mark as initialized
    this.pixelGridInitialized = true;

    console.log('[FabricCanvasManager] Pixel grid system initialized');
  }

  /**
   * W2.D8.4: Check if pixel grid is currently visible
   *
   * Grid is visible when zoom > 8x threshold.
   *
   * @returns true if grid should be visible, false otherwise
   */
  isPixelGridVisible(): boolean {
    if (!this.canvas) {
      return false;
    }

    const zoom = this.canvas.getZoom();
    return zoom > this.PIXEL_GRID_THRESHOLD;
  }

  /**
   * W2.D8.5: Get pixel grid styling properties
   *
   * Returns styling configuration for grid lines.
   * Uses subtle gray color with low opacity for minimal distraction.
   *
   * @returns Object with stroke, opacity, and strokeWidth
   */
  getPixelGridStyle(): { stroke: string; opacity: number; strokeWidth: number } {
    return {
      stroke: '#dddddd', // Light gray
      opacity: 0.5, // Subtle opacity (0.3-0.6 range)
      strokeWidth: 1, // Thin 1px lines
    };
  }

  /**
   * W2.D8.5: Get pixel grid spacing
   *
   * Grid spacing equals zoom level, maintaining 1:1 pixel ratio.
   * At 10x zoom, grid spacing = 10px (representing 1 source pixel).
   * At 20x zoom, grid spacing = 20px (representing 1 source pixel).
   *
   * @returns Grid spacing in canvas pixels
   */
  getPixelGridSpacing(): number {
    if (!this.canvas) {
      return 0;
    }

    const zoom = this.canvas.getZoom();
    return zoom; // 1:1 ratio
  }

  /**
   * W2.D8.4: Check if pixel grid system is initialized
   *
   * @returns true if setupPixelGrid() has been called
   */
  isPixelGridInitialized(): boolean {
    return this.pixelGridInitialized;
  }

  /**
   * W2.D8.4: Update pixel grid visibility based on current zoom
   *
   * Called automatically on zoom events.
   * Shows grid when zoom > 8x, hides when zoom <= 8x.
   *
   * Pattern:
   * - Removes old grid lines
   * - Calculates new grid lines if zoom > threshold
   * - Renders grid with subtle styling
   */
  private updatePixelGridVisibility(): void {
    if (!this.canvas) {
      return;
    }

    // Clear existing grid lines
    this.pixelGridPattern.forEach((line) => {
      this.canvas?.remove(line);
    });
    this.pixelGridPattern = [];

    // Check if grid should be visible
    if (!this.isPixelGridVisible()) {
      this.canvas.requestRenderAll();
      return;
    }

    // Generate grid lines
    const spacing = this.getPixelGridSpacing();
    const style = this.getPixelGridStyle();
    const width = this.canvas.getWidth();
    const height = this.canvas.getHeight();

    // Calculate viewport bounds
    const vpt = this.canvas.viewportTransform;
    const zoom = this.canvas.getZoom();
    const viewportLeft = -vpt[4] / zoom;
    const viewportTop = -vpt[5] / zoom;
    const viewportRight = viewportLeft + width / zoom;
    const viewportBottom = viewportTop + height / zoom;

    // Generate vertical lines
    const startX = Math.floor(viewportLeft / spacing) * spacing;
    const endX = Math.ceil(viewportRight / spacing) * spacing;

    for (let x = startX; x <= endX; x += spacing) {
      const line = new Path(`M ${x} ${viewportTop} L ${x} ${viewportBottom}`, {
        stroke: style.stroke,
        strokeWidth: style.strokeWidth / zoom, // Scale stroke with zoom
        opacity: style.opacity,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });

      this.canvas.add(line);
      this.pixelGridPattern.push(line);
    }

    // Generate horizontal lines
    const startY = Math.floor(viewportTop / spacing) * spacing;
    const endY = Math.ceil(viewportBottom / spacing) * spacing;

    for (let y = startY; y <= endY; y += spacing) {
      const line = new Path(`M ${viewportLeft} ${y} L ${viewportRight} ${y}`, {
        stroke: style.stroke,
        strokeWidth: style.strokeWidth / zoom, // Scale stroke with zoom
        opacity: style.opacity,
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });

      this.canvas.add(line);
      this.pixelGridPattern.push(line);
    }

    // Render grid
    this.canvas.requestRenderAll();
  }

  /**
   * W2.D11: Batch add multiple objects to canvas
   *
   * Optimized batch operation that adds multiple objects with a single render call.
   * Temporarily disables auto-rendering during additions for performance.
   *
   * @param canvasObjects - Array of CanvasObjects to add
   * @returns Array of created Fabric.js objects (null entries for failed creations)
   */
  batchAddObjects(canvasObjects: CanvasObject[]): (FabricObject | null)[] {
    if (!this.canvas) {
      return [];
    }

    // Temporarily disable auto-rendering for performance
    const originalRenderOnAddRemove = this.canvas.renderOnAddRemove;
    this.canvas.renderOnAddRemove = false;

    const fabricObjects: (FabricObject | null)[] = [];

    for (const canvasObject of canvasObjects) {
      const fabricObject = this.createFabricObject(canvasObject);

      if (fabricObject) {
        this.canvas.add(fabricObject);
        fabricObjects.push(fabricObject);
      } else {
        fabricObjects.push(null);
      }
    }

    // Restore auto-rendering and trigger single render
    this.canvas.renderOnAddRemove = originalRenderOnAddRemove;
    this.canvas.requestRenderAll();

    return fabricObjects;
  }

  /**
   * W2.D11: Batch remove multiple objects from canvas
   *
   * Optimized batch operation that removes multiple objects with a single render call.
   * Temporarily disables auto-rendering during removals for performance.
   *
   * @param ids - Array of database IDs to remove
   * @returns Number of objects successfully removed
   */
  batchRemoveObjects(ids: string[]): number {
    if (!this.canvas) {
      return 0;
    }

    // Temporarily disable auto-rendering for performance
    const originalRenderOnAddRemove = this.canvas.renderOnAddRemove;
    this.canvas.renderOnAddRemove = false;

    let removedCount = 0;

    for (const id of ids) {
      const fabricObject = this.findObjectById(id);
      if (fabricObject) {
        this.canvas.remove(fabricObject);
        removedCount++;
      }
    }

    // Restore auto-rendering and trigger single render
    this.canvas.renderOnAddRemove = originalRenderOnAddRemove;
    this.canvas.requestRenderAll();

    return removedCount;
  }

  /**
   * W2.D11: Save canvas state to JSON
   *
   * Serializes the entire canvas state including all objects, viewport, and configuration.
   * Can be used for state persistence, undo/redo, or canvas snapshots.
   *
   * @returns Canvas state as JSON object
   */
  saveState(): {
    objects: CanvasObject[];
    backgroundColor: string;
    width: number;
    height: number;
    zoom: number;
    panX: number;
    panY: number;
  } {
    if (!this.canvas) {
      return {
        objects: [],
        backgroundColor: this.config.backgroundColor,
        width: this.config.width,
        height: this.config.height,
        zoom: 1,
        panX: 0,
        panY: 0,
      };
    }

    // Serialize all canvas objects to CanvasObject format
    const fabricObjects = this.canvas.getObjects().filter(obj => (obj as FabricObjectWithData).data?.id);
    const canvasObjects: CanvasObject[] = fabricObjects
      .map(obj => this.toCanvasObject(obj))
      .filter((obj): obj is CanvasObject => obj !== null);

    // Get viewport state
    const vpt = this.canvas.viewportTransform;
    const zoom = this.canvas.getZoom();

    return {
      objects: canvasObjects,
      backgroundColor: this.canvas.backgroundColor as string || this.config.backgroundColor,
      width: this.canvas.getWidth(),
      height: this.canvas.getHeight(),
      zoom,
      panX: vpt[4],
      panY: vpt[5],
    };
  }

  /**
   * W2.D11: Load canvas state from JSON
   *
   * Restores canvas state from a previously saved state object.
   * Clears current canvas and recreates all objects from the saved state.
   *
   * @param state - Previously saved canvas state
   */
  loadState(state: {
    objects?: CanvasObject[];
    backgroundColor?: string;
    width?: number;
    height?: number;
    zoom?: number;
    panX?: number;
    panY?: number;
  }): void {
    if (!this.canvas) {
      return;
    }

    // Clear current canvas
    this.canvas.clear();

    // Restore configuration
    if (state.backgroundColor) {
      this.canvas.backgroundColor = state.backgroundColor;
    }
    if (state.width && state.height) {
      this.canvas.setDimensions({ width: state.width, height: state.height });
    }

    // Restore objects
    if (state.objects && state.objects.length > 0) {
      this.batchAddObjects(state.objects);
    }

    // Restore viewport
    if (state.zoom !== undefined && state.panX !== undefined && state.panY !== undefined) {
      const vpt: [number, number, number, number, number, number] = [
        state.zoom,     // scaleX
        0,              // skewY
        0,              // skewX
        state.zoom,     // scaleY
        state.panX,     // translateX
        state.panY      // translateY
      ];
      this.canvas.setViewportTransform(vpt);
    }

    // Render restored canvas
    this.canvas.requestRenderAll();
  }

  /**
   * Dispose of the canvas and clean up resources
   */
  dispose(): void {
    // W2.D7.7: Cancel pending RAF callback to prevent memory leaks
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingViewportSync = false;

    // W2.D8.4: Clean up pixel grid
    this.pixelGridPattern.forEach((line) => {
      this.canvas?.remove(line);
    });
    this.pixelGridPattern = [];
    this.pixelGridInitialized = false;

    // W4.D3: Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
      console.log('[FabricCanvasManager] ResizeObserver disconnected');
    }
    this.canvasContainer = null;

    if (this.canvas) {
      // Clean up spacebar pan event listeners
      const handlers = (this.canvas as any).__spacebarHandlers;
      if (handlers) {
        document.removeEventListener('keydown', handlers.keydown);
        document.removeEventListener('keyup', handlers.keyup);
      }

      this.canvas.dispose();
      this.canvas = null;
    }
    this.eventHandlers = {};
    this.cursorObjects = [];
    this.viewportSyncCallback = null;
  }
}
