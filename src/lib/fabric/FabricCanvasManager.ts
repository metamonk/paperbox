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
import { Canvas, Rect, Circle, Textbox, FabricObject, Point } from 'fabric';

import type { CanvasObject, RectangleObject, CircleObject, TextObject, ShapeType } from '@/types/canvas';
import type { UserPresence } from '@/stores/slices/collaborationSlice';
import { CollaborativeOverlayManager } from './CollaborativeOverlayManager';
import { GRID_SIZE, GRID_ENABLED, DEFAULT_FONT_FAMILY } from '@/lib/constants';
import { centerToFabric, fabricToCenter, getFabricCenterPoint } from './coordinateTranslation';
import { QuadTree, type QuadTreeObject } from './QuadTree';

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
   * Fires AFTER mouse release - use for final position updates
   */
  onObjectModified?: (target: FabricObject) => void;

  /**
   * W5.D5+ Real-time collaboration: Called DURING object movement
   * Fires continuously while dragging - use for real-time position broadcasts
   */
  onObjectMoving?: (target: FabricObject) => void;

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
 * Helper function to get theme-aware background color from CSS variables
 * Converts oklch() format to rgb() that Fabric.js understands
 */
function getThemeBackgroundColor(): string {
  const computedStyle = getComputedStyle(document.documentElement);
  const bgValue = computedStyle.getPropertyValue('--muted').trim();
  
  // If it's oklch() or other CSS color format, convert using a temp element
  if (bgValue && (bgValue.startsWith('oklch(') || bgValue.startsWith('hsl(') || bgValue.startsWith('var('))) {
    const temp = document.createElement('div');
    temp.style.color = bgValue;
    document.body.appendChild(temp);
    const computed = getComputedStyle(temp).color;
    document.body.removeChild(temp);
    return computed; // returns rgb() format that Fabric.js understands
  }
  
  // Return the value as-is if it's already in a compatible format (hex, rgb, etc.)
  return bgValue || '#f5f5f5'; // fallback to light gray
}

/**
 * Default canvas configuration
 * STATIC CANVAS MIGRATION: Fixed 8000x8000 canvas for simple coordinate system
 */
const DEFAULT_CONFIG: Required<FabricCanvasConfig> = {
  backgroundColor: '#f5f5f5', // Fallback - will be overridden with theme-aware color at runtime
  width: 8000,  // Static canvas width
  height: 8000, // Static canvas height
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
  private viewportSyncCallback: ((zoom: number, panX: number, panY: number) => void) | null = null; // W2.D6.6: Viewport sync callback

  // W2.D7.7: Performance optimization - RAF throttling
  private rafId: number | null = null; // requestAnimationFrame ID for throttling
  private pendingViewportSync: boolean = false; // Flag for pending sync

  // Pixel grid visualization - optimized with direct canvas rendering
  private pixelGridInitialized: boolean = false;
  private pixelGridRenderHandler: (() => void) | null = null;
  private readonly PIXEL_GRID_THRESHOLD = 4; // Show grid when zoom > 4x (increased for better performance)

  // W2.D8.7: Canvas boundary limits (matches 8000x8000 canvas size)
  private readonly CANVAS_BOUNDARY = 8000; // Match actual canvas size (8000x8000)

  // STATIC CANVAS MIGRATION: Resize handler properties removed (no longer needed)

  // W5.D5++++: Collaborative overlays (lock/selection indicators)
  private overlayManager: CollaborativeOverlayManager | null = null;

  // PERFORMANCE: Object culling for large canvases
  private cullInterval: number | null = null;
  private readonly CULL_MARGIN = 500; // pixels - show objects 500px outside viewport

  // PERFORMANCE OPTIMIZATION #1: Throttle render during movement (60fps)
  private movementRenderThrottle: number | null = null;
  private readonly MOVEMENT_RENDER_MS = 16; // 60fps

  // PERFORMANCE OPTIMIZATION #2: Disable culling during active drag
  private isDragging: boolean = false;

  // PERFORMANCE OPTIMIZATION #3: Track large selection mode
  private readonly LARGE_SELECTION_THRESHOLD = 50;

  // PERFORMANCE OPTIMIZATION #4: Level of Detail (LOD) rendering
  private enableLOD: boolean = false;
  private readonly LOD_ZOOM_THRESHOLD = 0.3; // Enable LOD when zoomed out below 30%
  private readonly LOD_OBJECT_THRESHOLD = 100; // Enable LOD with 100+ selected objects
  private lodOriginalStates: Map<string, {
    strokeWidth?: number;
    shadow?: any;
  }> = new Map();

  // PERFORMANCE OPTIMIZATION #6: Spatial indexing with QuadTree
  private quadTree: QuadTree | null = null;
  private quadTreeDirty: boolean = true; // Flag to track if QuadTree needs rebuild
  private readonly CANVAS_BOUNDS = { x: 0, y: 0, width: 8000, height: 8000 }; // Match 8000x8000 canvas

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
    // if (DEBUG) console.log('[FabricCanvasManager] Canvas element BEFORE Fabric init:', {
    //   id: element.id,
    //   widthAttr: element.width,
    //   heightAttr: element.height,
    //   clientWidth: element.clientWidth,
    //   clientHeight: element.clientHeight,
    //   hasGetContext: typeof element.getContext !== 'undefined'
    // });

    // STATIC CANVAS MIGRATION: Always use fixed 8000x8000 size
    // No dynamic sizing based on viewport - canvas is always 8000x8000
    const width = this.config.width;
    const height = this.config.height;

    // Get theme-aware background color from CSS variables
    const backgroundColor = getThemeBackgroundColor();

    // W2.D12 FIX: Fabric.js v6 Canvas constructor expects ID string, not HTMLCanvasElement
    // From official docs: new fabric.Canvas('canvasId', options)
    // Passing HTMLCanvasElement directly may cause rendering issues
    // console.log(`[FabricCanvasManager] Initializing Fabric.js v6 Canvas with ID: "${canvasId}"`);
    // console.log(`[FabricCanvasManager] Element dimensions after CSS layout:`, {
    //   elementClientWidth: element.clientWidth,
    //   elementClientHeight: element.clientHeight,
    //   parentClientWidth: element.parentElement?.clientWidth,
    //   parentClientHeight: element.parentElement?.clientHeight,
    // });
    // console.log(`[FabricCanvasManager] Config:`, {
    //   backgroundColor,
    //   width,
    //   height,
    //   selection: this.config.selection,
    //   renderOnAddRemove: this.config.renderOnAddRemove,
    // });

    this.canvas = new Canvas(canvasId, {
      backgroundColor,
      width,
      height,
      selection: this.config.selection,
      renderOnAddRemove: this.config.renderOnAddRemove,
      preserveObjectStacking: true, // CRITICAL FIX: Prevent selection from bringing objects to front
    });

    // console.log(`[FabricCanvasManager] Canvas created:`, this.canvas);
    // console.log(`[FabricCanvasManager] Canvas type:`, this.canvas.constructor.name);
    // console.log(`[FabricCanvasManager] Canvas dimensions: ${this.canvas.width}x${this.canvas.height}`);

    // W2.D12 DEBUG: Expose canvas instance globally for debugging
    (window as any).__fabricCanvas = this.canvas;
    // if (DEBUG) console.log('[FabricCanvasManager] Canvas instance exposed as window.__fabricCanvas for debugging');

    // STATIC CANVAS MIGRATION: No window resize handler needed (fixed size canvas)
    // Window resizing only affects the scrollable viewport, not the canvas itself

    // W5.D5++++: Initialize collaborative overlay manager
    this.overlayManager = new CollaborativeOverlayManager(this.canvas);
    // if (DEBUG) console.log('[FabricCanvasManager] Collaborative overlay manager initialized');

    // PERFORMANCE: Start object culling for large canvases
    this.startObjectCulling();

    return this.canvas;
  }

  // STATIC CANVAS MIGRATION: Window resize handler removed
  // Canvas is fixed at 8000x8000, viewport resizing handled by browser scroll container

  /**
   * SNAP-TO-GRID: Snap a coordinate value to the nearest grid point
   * 
   * With static canvas, snap-to-grid is trivial: value % gridSize
   * 
   * @param value - Coordinate value (x or y)
   * @param gridSize - Grid size in pixels
   * @returns Snapped coordinate value
   */
  private snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
  }

  // PERFORMANCE OPTIMIZATION #6: Old updateObjectCulling removed in favor of QuadTree version
  // The new updateObjectCullingWithQuadTree() provides O(log n) performance instead of O(n)

  /**
   * PERFORMANCE: Start periodic object culling
   * 
   * PERFORMANCE OPTIMIZATION #6: Uses QuadTree for efficient spatial queries
   * Runs culling check every 500ms to hide off-screen objects
   */
  private startObjectCulling(): void {
    if (this.cullInterval !== null) return;

    // Initial cull with QuadTree
    this.updateObjectCullingWithQuadTree();

    // Periodic culling (500ms interval) using QuadTree
    this.cullInterval = window.setInterval(() => {
      this.updateObjectCullingWithQuadTree();
    }, 500);
  }

  /**
   * PERFORMANCE: Stop object culling and restore all objects
   */
  private stopObjectCulling(): void {
    if (this.cullInterval !== null) {
      window.clearInterval(this.cullInterval);
      this.cullInterval = null;
    }

    // Restore all objects
    if (this.canvas) {
      this.canvas.getObjects().forEach((obj) => {
        const objWithData = obj as FabricObjectWithData;
        if (objWithData.data && objWithData.data.id) {
          obj.visible = true;
        }
      });
      this.canvas.requestRenderAll();
    }
  }

  /**
   * PERFORMANCE OPTIMIZATION #4: Apply Level of Detail (LOD) rendering
   * 
   * Simplifies object rendering during movement for better performance:
   * - Reduces stroke width to 1px
   * - Removes shadows
   * - Stores original properties for restoration
   */
  private applyLODRendering(): void {
    if (!this.canvas) return;

    this.canvas.getObjects().forEach((obj) => {
      const objWithData = obj as FabricObjectWithData;
      if (!objWithData.data?.id) return;

      // Store original rendering settings if not already stored
      if (!this.lodOriginalStates.has(objWithData.data.id)) {
        this.lodOriginalStates.set(objWithData.data.id, {
          strokeWidth: obj.strokeWidth,
          shadow: obj.shadow,
        });
      }

      // Apply simplified rendering
      obj.strokeWidth = 1; // Thinner strokes
      obj.shadow = null; // No shadows
    });

    this.canvas.requestRenderAll();
  }

  /**
   * PERFORMANCE OPTIMIZATION #4: Disable LOD rendering and restore original properties
   * 
   * Restores full-quality rendering after movement ends.
   */
  private disableLODRendering(): void {
    if (!this.canvas) return;

    this.canvas.getObjects().forEach((obj) => {
      const objWithData = obj as FabricObjectWithData;
      if (!objWithData.data?.id) return;

      // Restore original rendering settings
      const originalState = this.lodOriginalStates.get(objWithData.data.id);
      if (originalState) {
        if (originalState.strokeWidth !== undefined) {
          obj.strokeWidth = originalState.strokeWidth;
        }
        if (originalState.shadow !== undefined) {
          obj.shadow = originalState.shadow;
        }
      }
    });

    // Clear stored states
    this.lodOriginalStates.clear();
    this.canvas.requestRenderAll();
  }

  /**
   * PERFORMANCE OPTIMIZATION #6: Build QuadTree spatial index
   * 
   * Constructs a QuadTree from all canvas objects for efficient spatial queries.
   * Should be called after adding/removing objects or when objects move significantly.
   */
  private buildQuadTree(): void {
    if (!this.canvas) return;

    // Create new QuadTree
    this.quadTree = new QuadTree({
      bounds: this.CANVAS_BOUNDS,
      maxObjects: 10, // Max objects per node before subdivision
      maxLevels: 5,   // Max tree depth
    });

    // Insert all objects into QuadTree
    this.canvas.getObjects().forEach((obj) => {
      const objWithData = obj as FabricObjectWithData;
      if (!objWithData.data?.id) return;

      // Get object bounding rectangle
      const bounds = obj.getBoundingRect();
      
      const quadTreeObj: QuadTreeObject = {
        id: objWithData.data.id,
        bounds: {
          x: bounds.left,
          y: bounds.top,
          width: bounds.width,
          height: bounds.height,
        },
      };

      if (this.quadTree) {
        this.quadTree.insert(quadTreeObj);
      }
    });

    this.quadTreeDirty = false;
  }

  /**
   * PERFORMANCE OPTIMIZATION #6: Query visible objects using QuadTree
   * 
   * Uses spatial indexing for O(log n) viewport queries instead of O(n) linear search.
   * Significantly faster with 500+ objects.
   */
  private getViewportBounds(): { x: number; y: number; width: number; height: number } {
    if (!this.canvas) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const canvasElement = this.canvas.getElement();
    const rect = canvasElement.getBoundingClientRect();
    const viewportWidth = rect.width;
    const viewportHeight = rect.height;
    
    const vpt = this.canvas.viewportTransform;
    const zoom = this.canvas.getZoom();
    
    // Calculate visible canvas bounds
    const viewportLeft = -vpt[4] / zoom;
    const viewportTop = -vpt[5] / zoom;
    const viewportRight = viewportLeft + (viewportWidth / zoom);
    const viewportBottom = viewportTop + (viewportHeight / zoom);

    return {
      x: viewportLeft,
      y: viewportTop,
      width: viewportRight - viewportLeft,
      height: viewportBottom - viewportTop,
    };
  }

  /**
   * PERFORMANCE OPTIMIZATION #6: Update culling using QuadTree
   * 
   * Uses QuadTree for efficient spatial queries - only checks objects in/near viewport.
   * Falls back to linear search if QuadTree not built yet.
   */
  private updateObjectCullingWithQuadTree(): void {
    if (!this.canvas) return;

    // Build QuadTree if dirty or not yet built
    if (this.quadTreeDirty || !this.quadTree) {
      this.buildQuadTree();
    }

    if (!this.quadTree) return;

    // Get viewport bounds with margin
    const viewport = this.getViewportBounds();
    const viewportWithMargin = {
      x: viewport.x - this.CULL_MARGIN,
      y: viewport.y - this.CULL_MARGIN,
      width: viewport.width + (this.CULL_MARGIN * 2),
      height: viewport.height + (this.CULL_MARGIN * 2),
    };

    // Query QuadTree for visible objects (O(log n) instead of O(n))
    const visibleObjects = this.quadTree.query(viewportWithMargin);
    const visibleIds = new Set(visibleObjects.map(obj => obj.id));

    // Update visibility for all objects
    let culledCount = 0;
    this.canvas.getObjects().forEach((obj) => {
      const objWithData = obj as FabricObjectWithData;
      if (!objWithData.data?.id) return;

      const shouldBeVisible = visibleIds.has(objWithData.data.id);
      
      if (obj.visible !== shouldBeVisible) {
        obj.visible = shouldBeVisible;
        if (!shouldBeVisible) culledCount++;
      }
    });

    if (culledCount > 0) {
      this.canvas.requestRenderAll();
    }
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

    // W4.D4 CRITICAL FIX: Merge handlers instead of replacing
    // Canvas.tsx calls this with only onPlacementClick, which was overwriting
    // selection handlers set by CanvasSyncManager, breaking selection sync
    this.eventHandlers = { ...this.eventHandlers, ...handlers };

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

    // W5.D5+ Real-time collaboration: Fire during movement for live updates
    // SNAP-TO-GRID: Apply grid snapping during object movement
    // PERFORMANCE OPTIMIZATION #1: Throttle rendering to 60fps during movement
    // PERFORMANCE OPTIMIZATION #4: Enable LOD for large selections or low zoom
    this.canvas.on('object:moving', (event) => {
      const target = event.target;
      if (target) {
        // Apply snap-to-grid if enabled
        if (GRID_ENABLED && target.left !== undefined && target.top !== undefined) {
          target.left = this.snapToGrid(target.left, GRID_SIZE);
          target.top = this.snapToGrid(target.top, GRID_SIZE);
          target.setCoords(); // Update coordinates after snapping
        }

        // PERFORMANCE OPTIMIZATION #4: Enable LOD for large selections or low zoom
        if (this.canvas) {
          const activeCount = this.canvas.getActiveObjects().length;
          const zoom = this.canvas.getZoom();
          const shouldEnableLOD = activeCount > this.LOD_OBJECT_THRESHOLD || zoom < this.LOD_ZOOM_THRESHOLD;

          if (shouldEnableLOD && !this.enableLOD) {
            this.enableLOD = true;
            this.applyLODRendering();
          }
        }

        // PERFORMANCE OPTIMIZATION #1: Throttle render calls during movement
        // Limit rendering to 60fps (16ms) to prevent excessive render calls
        if (!this.movementRenderThrottle) {
          this.movementRenderThrottle = window.setTimeout(() => {
            this.canvas?.requestRenderAll();
            this.movementRenderThrottle = null;
          }, this.MOVEMENT_RENDER_MS);
        }

        // Broadcast movement for real-time collaboration
        if (this.eventHandlers.onObjectMoving) {
          this.eventHandlers.onObjectMoving(target);
        }
      }
    });

    // Selection events
    // PERFORMANCE OPTIMIZATION #3: Reduce rendering cost for large selections
    this.canvas.on('selection:created', (event) => {
      const targets = event.selected || [];
      
      // PERFORMANCE OPTIMIZATION #3: Simplify rendering for large selections
      if (targets.length > this.LARGE_SELECTION_THRESHOLD) {
        // Disable individual object controls for large selections
        targets.forEach(obj => {
          obj.hasControls = false;
          obj.hasBorders = true; // Keep borders for visual feedback
        });
        
        // Simplify group control box
        if (this.canvas) {
          const activeObject = this.canvas.getActiveObject();
          if (activeObject) {
            activeObject.cornerSize = 8; // Smaller corners
            activeObject.cornerStyle = 'circle'; // Faster to render
          }
        }
      }
      
      if (this.eventHandlers.onSelectionCreated) {
        this.eventHandlers.onSelectionCreated(targets);
      } else {
        console.warn('[FabricCanvasManager] No onSelectionCreated handler registered!');
      }
    });

    this.canvas.on('selection:updated', (event) => {
      const targets = event.selected || [];
      
      // PERFORMANCE OPTIMIZATION #3: Adjust rendering for selection size changes
      if (targets.length > this.LARGE_SELECTION_THRESHOLD) {
        // Disable individual object controls for large selections
        targets.forEach(obj => {
          obj.hasControls = false;
          obj.hasBorders = true;
        });
        
        // Simplify group control box
        if (this.canvas) {
          const activeObject = this.canvas.getActiveObject();
          if (activeObject) {
            activeObject.cornerSize = 8;
            activeObject.cornerStyle = 'circle';
          }
        }
      } else {
        // Restore controls for smaller selections
        targets.forEach(obj => {
          obj.hasControls = true;
          obj.hasBorders = true;
        });
      }
      
      if (this.eventHandlers.onSelectionUpdated) {
        this.eventHandlers.onSelectionUpdated(targets);
      } else {
        console.warn('[FabricCanvasManager] No onSelectionUpdated handler registered!');
      }
    });

    this.canvas.on('selection:cleared', () => {
      if (this.eventHandlers.onSelectionCleared) {
        this.eventHandlers.onSelectionCleared();
      } else {
        console.warn('[FabricCanvasManager] No onSelectionCleared handler registered!');
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

    // Translate center-origin coordinates (-4000 to +4000) to Fabric coordinates (0 to 8000)
    const fabricCoords = centerToFabric(canvasObject.x, canvasObject.y);

    // Common properties for all objects
    const commonProps = {
      left: fabricCoords.x,
      top: fabricCoords.y,
      originX: 'center' as const, // W4.D3 FIX: Center object origin for placement
      originY: 'center' as const, // W4.D3 FIX: Center object origin for placement
      angle: canvasObject.rotation,
      fill: canvasObject.fill,
      stroke: canvasObject.stroke ?? undefined, // Use ?? to preserve falsy values except null/undefined
      strokeWidth: canvasObject.stroke_width ?? undefined, // Use ?? to preserve 0 as valid strokeWidth
      opacity: canvasObject.opacity,
      scaleX: 1, // FIX #3: Reset scale to 1 (dimensions already baked into width/height/radius)
      scaleY: 1, // FIX #3: Reset scale to 1 (prevents double-scaling on deserialization)
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
          fontFamily: font_family || DEFAULT_FONT_FAMILY,
          fontWeight: font_weight || 'normal',
          fontStyle: font_style || 'normal',
          textAlign: text_align || 'left',
          // FABRIC NATIVE: Lock vertical scaling so text only resizes horizontally
          // This is Fabric's built-in way to handle text boxes - text reflows naturally
          lockScalingY: true,
          lockScalingFlip: true,
        });
        break;
      }

      default:
        // Unknown type, return null
        console.error('[FabricCanvasManager] Unknown object type:', (canvasObject as any).type);
        return null;
    }

    // Validate the created object
    if (!fabricObject || typeof (fabricObject as any)._set !== 'function') {
      console.error('[FabricCanvasManager] ❌ Object creation failed - invalid Fabric.js object!', {
        type: canvasObject.type,
        fabricObject,
        hasSetMethod: fabricObject ? typeof (fabricObject as any)._set : 'object is null',
        constructor: fabricObject?.constructor?.name,
      });
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
    if (!obj || !obj.data || !this.canvas) {
      return null;
    }

    // Extract stored database type and ID from data property
    // These were set when the object was created via createFabricObject()
    const dbType = obj.data.type as ShapeType;
    const dbId = obj.data.id as string;

    // W5.D5+++++ Calculate actual z-index from canvas stacking order
    // Objects later in the array are rendered on top (higher z-index)
    const canvasObjects = this.canvas.getObjects();
    const zIndex = canvasObjects.indexOf(obj);

    // Extract common properties from Fabric.js object
    // Maps Fabric.js property names to our database schema
    // CRITICAL: Apply scale transforms to geometric properties before serialization
    
    // Translate Fabric coordinates (0 to 8000) back to center-origin (-4000 to +4000)
    const centerCoords = fabricToCenter(obj.left || 0, obj.top || 0);
    
    const baseProperties = {
      id: dbId,
      x: centerCoords.x,
      y: centerCoords.y,
      width: (obj.width || 0) * (obj.scaleX || 1), // FIX #1: Bake scaleX into width
      height: (obj.height || 0) * (obj.scaleY || 1), // FIX #1: Bake scaleY into height
      rotation: obj.angle || 0,
      group_id: null, // TODO: Implement group support in W1.D3
      z_index: zIndex >= 0 ? zIndex : 0, // W5.D5+++++ Use actual canvas position
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
            radius: (circle.radius || 0) * (circle.scaleX || 1), // FIX #2: Bake scaleX into radius
          },
        } as CircleObject;
      }

      case 'text': {
        const textbox = fabricObject as any; // Cast to access text properties
        // FABRIC NATIVE: With lockScalingY, scaleX changes width and scaleY stays 1
        // Bake scaleX into width for storage
        const scaleX = textbox.scaleX || 1;
        const effectiveWidth = (textbox.width || 100) * scaleX;
        
        return {
          ...baseProperties,
          width: effectiveWidth,  // Text box width (with scale baked in)
          height: textbox.height || 50,  // Height auto-calculated by Fabric based on text wrapping
          type: 'text',
          type_properties: {
            text_content: textbox.text || '',
            font_size: textbox.fontSize || 16,
            font_family: textbox.fontFamily || DEFAULT_FONT_FAMILY,
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

    // Validate that fabricObject is actually a Fabric.js object
    if (typeof fabricObject._set !== 'function') {
      console.error('[FabricCanvasManager] ❌ Created object is not a valid Fabric.js object!', {
        fabricObject,
        hasSet: typeof fabricObject._set,
        constructor: fabricObject.constructor?.name,
        type: canvasObject.type
      });
      return null;
    }

    // W5.D5+++++ Add to canvas at correct z-index position
    // Insert at specific index to maintain stacking order from database
    try {
      // Always use simple add() to avoid insertAt() issues
      // Z-index will be managed through bringToFront/sendToBack operations
      this.canvas.add(fabricObject);
      // console.log(`[FabricCanvasManager] ✅ Added object to canvas (z-index: ${canvasObject.z_index ?? 0})`);
      
    } catch (error) {
      console.error('[FabricCanvasManager] ❌ Error adding object to canvas:', error);
      console.error('[FabricCanvasManager] Error details:', {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        canvasObject,
        fabricObject: {
          type: fabricObject.type,
          constructor: fabricObject.constructor?.name,
          hasSetMethod: typeof (fabricObject as any)._set
        }
      });
      return null;
    }

    // W2.D12 FIX: Use synchronous renderAll() instead of requestRenderAll()
    // requestRenderAll() schedules render on next animation frame (async)
    // renderAll() renders immediately (sync) - critical for initial object visibility
    this.canvas.renderAll();

    // PERFORMANCE OPTIMIZATION #6: Mark QuadTree as dirty when objects added
    this.quadTreeDirty = true;

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

    // PERFORMANCE OPTIMIZATION #6: Mark QuadTree as dirty when objects removed
    this.quadTreeDirty = true;

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
   * W4.D4: Move object to front (highest z-index)
   *
   * @param id - Database ID of the object to move
   * @returns true if object was found and moved, false otherwise
   */
  moveToFront(id: string): boolean {
    if (!this.canvas) {
      return false;
    }

    const fabricObject = this.findObjectById(id);
    if (!fabricObject) {
      return false;
    }

    this.canvas.bringObjectToFront(fabricObject);
    this.canvas.renderAll();
    return true;
  }

  /**
   * W4.D4: Move object to back (lowest z-index)
   *
   * @param id - Database ID of the object to move
   * @returns true if object was found and moved, false otherwise
   */
  moveToBack(id: string): boolean {
    if (!this.canvas) {
      return false;
    }

    const fabricObject = this.findObjectById(id);
    if (!fabricObject) {
      return false;
    }

    this.canvas.sendObjectToBack(fabricObject);
    this.canvas.renderAll();
    return true;
  }

  /**
   * W4.D4: Move object up one position
   *
   * @param id - Database ID of the object to move
   * @returns true if object was found and moved, false otherwise
   */
  moveUp(id: string): boolean {
    if (!this.canvas) {
      return false;
    }

    const fabricObject = this.findObjectById(id);
    if (!fabricObject) {
      return false;
    }

    this.canvas.bringObjectForward(fabricObject);
    this.canvas.renderAll();
    return true;
  }

  /**
   * W4.D4: Move object down one position
   *
   * @param id - Database ID of the object to move
   * @returns true if object was found and moved, false otherwise
   */
  moveDown(id: string): boolean {
    if (!this.canvas) {
      return false;
    }

    const fabricObject = this.findObjectById(id);
    if (!fabricObject) {
      return false;
    }

    this.canvas.sendObjectBackwards(fabricObject);
    this.canvas.renderAll();
    return true;
  }

  /**
   * W4.D4: Set object to specific z-index position
   *
   * @param id - Database ID of the object
   * @param index - Target z-index (0 = back, higher = front)
   * @returns true if object was found and moved, false otherwise
   */
  setZIndex(id: string, index: number): boolean {
    if (!this.canvas) {
      return false;
    }

    const fabricObject = this.findObjectById(id);
    if (!fabricObject) {
      return false;
    }

    // Get current objects array
    const objects = this.canvas.getObjects();
    const currentIndex = objects.indexOf(fabricObject);

    if (currentIndex === -1) {
      return false;
    }

    // Clamp index to valid range
    const targetIndex = Math.max(0, Math.min(index, objects.length - 1));

    // Move object to target position using Fabric's built-in methods
    if (targetIndex > currentIndex) {
      // Moving up (to front): use bringObjectForward repeatedly
      const steps = targetIndex - currentIndex;
      for (let i = 0; i < steps; i++) {
        this.canvas.bringObjectForward(fabricObject);
      }
    } else if (targetIndex < currentIndex) {
      // Moving down (to back): use sendObjectBackwards repeatedly
      const steps = currentIndex - targetIndex;
      for (let i = 0; i < steps; i++) {
        this.canvas.sendObjectBackwards(fabricObject);
      }
    }

    this.canvas.renderAll();
    return true;
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
      // STATIC CANVAS MIGRATION: Check for placement mode first (higher priority than panning)
      // Only trigger placement if clicking empty canvas (no target object)
      if (!opt.target && this.eventHandlers.onPlacementClick && this.canvas) {
        // FIX: Use Fabric's getPointer WITHOUT ignoreZoom to respect viewport transform
        // getPointer(e, false) applies zoom/pan transform: canvasCoord = (screenCoord - pan) / zoom
        const pointer = this.canvas.getPointer(opt.e, false);
        const fabricX = pointer.x;
        const fabricY = pointer.y;
        
        // Translate Fabric coordinates (0 to 8000) to center-origin (-4000 to +4000)
        const centerCoords = fabricToCenter(fabricX, fabricY);

        // console.log('[FabricCanvasManager] Placement click with center-origin coordinates:', {
        //   screen: { x: opt.e.clientX, y: opt.e.clientY },
        //   fabric: { x: Math.round(fabricX), y: Math.round(fabricY) },
        //   centerOrigin: { x: Math.round(centerCoords.x), y: Math.round(centerCoords.y) },
        //   zoom: this.canvas.getZoom(),
        //   pan: { x: this.canvas.viewportTransform[4], y: this.canvas.viewportTransform[5] },
        // });

        // Trigger placement handler with center-origin coordinates
        this.eventHandlers.onPlacementClick(centerCoords.x, centerCoords.y);
        return; // Don't process as pan event
      }

      // PERFORMANCE OPTIMIZATION #2 & #7: Handle large selection drag start
      if (this.canvas && this.canvas.getActiveObjects().length > 10) {
        this.isDragging = true;
        
        // PERFORMANCE OPTIMIZATION #2: Disable culling during drag
        this.stopObjectCulling();
        
        // PERFORMANCE OPTIMIZATION #7: Disable events for non-selected objects
        const activeIds = new Set(
          this.canvas.getActiveObjects().map(obj => 
            (obj as FabricObjectWithData).data?.id
          )
        );
        
        if (activeIds.size > 50) {
          this.canvas.getObjects().forEach(obj => {
            const data = (obj as FabricObjectWithData).data;
            if (data?.id && !activeIds.has(data.id)) {
              obj.evented = false; // Disable events for non-selected objects
            }
          });
        }
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

        // Clamp pan to canvas boundaries (8000×8000 canvas)
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
      // PERFORMANCE OPTIMIZATION #2 & #7: Re-enable culling and events after drag
      if (this.isDragging && this.canvas) {
        this.isDragging = false;
        
        // PERFORMANCE OPTIMIZATION #2: Re-enable culling
        this.startObjectCulling();
        
        // PERFORMANCE OPTIMIZATION #7: Re-enable events for all objects
        this.canvas.getObjects().forEach(obj => {
          obj.evented = true;
        });
      }

      // PERFORMANCE OPTIMIZATION #4: Disable LOD and restore full-quality rendering
      if (this.enableLOD && this.canvas) {
        this.enableLOD = false;
        this.disableLODRendering();
      }
      
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

      if (isZoomModifier) {
        // Cmd/Ctrl + Scroll = Zoom
        this.handleScrollZoom(event, delta);
      } else {
        // Scroll = Pan (default Figma behavior)
        this.handleScrollPan(event);
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
  private handleScrollPan(event: WheelEvent) {
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

  /**
   * Center viewport on (0, 0) in center-origin coordinates
   * 
   * This is the default initial view - centered on the canvas.
   * In Fabric coordinates, this means centering on (4000, 4000).
   * 
   * @param viewportWidth - Visible viewport width in pixels
   * @param viewportHeight - Visible viewport height in pixels
   * @param zoom - Optional zoom level (default: 1)
   */
  centerViewportOnOrigin(viewportWidth: number, viewportHeight: number, zoom: number = 1): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Get center point in Fabric coordinates (4000, 4000)
    const fabricCenter = getFabricCenterPoint();

    // Calculate pan to center the viewport on this point
    // Formula: panX = viewportCenterX - (fabricCenterX * zoom)
    const panX = (viewportWidth / 2) - (fabricCenter.x * zoom);
    const panY = (viewportHeight / 2) - (fabricCenter.y * zoom);

    // Apply zoom and pan
    this.canvas.setZoom(zoom);
    this.canvas.absolutePan(new Point(panX, panY));

    // Render the canvas
    this.canvas.renderAll();

    // console.log('[FabricCanvasManager] Viewport centered on origin (0,0):', {
    //   fabricCenter,
    //   viewportSize: { width: viewportWidth, height: viewportHeight },
    //   zoom,
    //   pan: { x: panX, y: panY },
    // });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Pixel Grid Visualization (W2.D8.4-5)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Setup pixel grid visualization system - OPTIMIZED
   *
   * Uses Fabric's after:render event to draw grid directly to canvas context.
   * Much faster than creating individual Fabric objects for each line.
   *
   * Performance improvements:
   * - No Fabric object creation (100-1000x faster)
   * - Direct canvas 2D API rendering
   * - Only draws visible viewport
   * - Single render pass per frame
   */
  setupPixelGrid(): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized');
    }

    // Prevent multiple initializations
    if (this.pixelGridInitialized) {
      return;
    }

    // Create optimized render handler using SCREEN SPACE algorithm
    // This prevents gaps from floating point errors
    this.pixelGridRenderHandler = () => {
      if (!this.canvas || !this.isPixelGridVisible()) {
        return;
      }

      const ctx = this.canvas.getContext() as CanvasRenderingContext2D;
      const zoom = this.canvas.getZoom();
      const vpt = this.canvas.viewportTransform;
      
      if (!vpt) return;

      // Grid spacing in SCREEN SPACE (pixels on screen)
      const spacing = this.getPixelGridSpacing();
      const screenSpacing = spacing * zoom;
      
      // If spacing is less than 0.5px on screen, skip rendering (too dense)
      if (screenSpacing < 0.5) {
        return;
      }

      const style = this.getPixelGridStyle();
      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();

      // Calculate grid offset using modulo arithmetic
      // This ensures perfect alignment regardless of pan/zoom
      const offsetX = vpt[4] % screenSpacing;
      const offsetY = vpt[5] % screenSpacing;

      // Setup drawing style
      ctx.save();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = 1; // Always 1px in screen space for crisp lines
      ctx.globalAlpha = style.opacity;

      // Begin path for all lines (single path is much faster)
      ctx.beginPath();

      // Draw vertical lines in SCREEN SPACE with INTEGER coordinates
      // Start from the offset and draw at regular intervals
      for (let x = offsetX; x < canvasWidth; x += screenSpacing) {
        const screenX = Math.round(x); // Round to integer for crisp lines
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvasHeight);
      }
      
      // Also draw lines in negative direction if offset is positive
      if (offsetX > 0) {
        for (let x = offsetX - screenSpacing; x >= 0; x -= screenSpacing) {
          const screenX = Math.round(x);
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, canvasHeight);
        }
      }

      // Draw horizontal lines in SCREEN SPACE with INTEGER coordinates
      for (let y = offsetY; y < canvasHeight; y += screenSpacing) {
        const screenY = Math.round(y);
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvasWidth, screenY);
      }
      
      // Also draw lines in negative direction if offset is positive
      if (offsetY > 0) {
        for (let y = offsetY - screenSpacing; y >= 0; y -= screenSpacing) {
          const screenY = Math.round(y);
          ctx.moveTo(0, screenY);
          ctx.lineTo(canvasWidth, screenY);
        }
      }

      // Stroke all lines at once
      ctx.stroke();
      ctx.restore();
    };

    // Register after:render handler for efficient drawing
    this.canvas.on('after:render', this.pixelGridRenderHandler);

    // Mark as initialized
    this.pixelGridInitialized = true;
  }

  /**
   * W2.D8.4: Check if pixel grid is currently visible
   *
   * Grid is visible when zoom > 4x threshold.
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
   * Update pixel grid visibility - NO LONGER NEEDED
   * 
   * Grid now renders automatically via after:render event.
   * This method is kept for backward compatibility but does nothing.
   */
  private updatePixelGridVisibility(): void {
    // Grid auto-updates via after:render event handler
    // No action needed
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
   * W5.D5++++: Update collaborative overlays (lock/selection indicators)
   *
   * Call this whenever presence data changes to update visual indicators
   * showing who's editing and who has what selected.
   *
   * @param presence - User presence data from collaboration store
   * @param currentUserId - Current user's ID (to skip their own overlays)
   */
  updateCollaborativeOverlays(
    presence: Record<string, UserPresence>,
    currentUserId: string
  ): void {
    if (!this.overlayManager) {
      console.warn('[FabricCanvasManager] Overlay manager not initialized');
      return;
    }

    this.overlayManager.updateOverlays(presence, currentUserId);
  }

  /**
   * W5.D5++++: Update overlay positions during object movement
   *
   * Call this during object:modified or object:moving events to keep
   * overlays synchronized with their target objects.
   */
  updateOverlayPositions(): void {
    if (!this.overlayManager) {
      return;
    }

    this.overlayManager.updateOverlaysForMovement();
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

    // Clean up pixel grid event handler
    if (this.pixelGridRenderHandler && this.canvas) {
      this.canvas.off('after:render', this.pixelGridRenderHandler);
      this.pixelGridRenderHandler = null;
    }
    this.pixelGridInitialized = false;

    // STATIC CANVAS MIGRATION: No resize handler to clean up

    // PERFORMANCE: Stop object culling
    this.stopObjectCulling();

    // W5.D5++++: Clean up collaborative overlays
    if (this.overlayManager) {
      this.overlayManager.destroy();
      this.overlayManager = null;
    }

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
    this.viewportSyncCallback = null;
  }
}
