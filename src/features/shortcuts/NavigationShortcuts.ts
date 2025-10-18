/**
 * NavigationShortcuts.ts
 * W2.D8: Canvas Navigation & Keyboard Shortcuts
 *
 * Manages keyboard shortcuts for canvas navigation:
 * - Cmd+0: Reset viewport / fit to screen
 * - Cmd+1: Zoom to 100%
 * - Cmd+2: Zoom to 200%
 * - Cmd+9: Zoom to selection
 */

import hotkeys from 'hotkeys-js';
import type { FabricCanvasManager } from '../../lib/fabric/FabricCanvasManager';
import { usePaperboxStore } from '../../stores';

export interface NavigationShortcutsConfig {
  canvasManager: FabricCanvasManager;
}

export class NavigationShortcuts {
  private canvasManager: FabricCanvasManager;
  private boundHandlers: Map<string, () => void> = new Map();

  constructor(config: NavigationShortcutsConfig) {
    this.canvasManager = config.canvasManager;
  }

  /**
   * Initialize all navigation shortcuts
   */
  public initialize(): void {
    this.registerShortcut('cmd+0,ctrl+0', this.handleResetViewport);
    this.registerShortcut('cmd+1,ctrl+1', this.handleZoom100);
    this.registerShortcut('cmd+2,ctrl+2', this.handleZoom200);
    this.registerShortcut('cmd+9,ctrl+9', this.handleZoomToSelection);
  }

  /**
   * Cleanup all registered shortcuts
   */
  public dispose(): void {
    this.boundHandlers.forEach((_, shortcut) => {
      hotkeys.unbind(shortcut);
    });
    this.boundHandlers.clear();
  }

  /**
   * Register a keyboard shortcut with hotkeys-js
   */
  private registerShortcut(keys: string, handler: () => void): void {
    const boundHandler = handler.bind(this);
    this.boundHandlers.set(keys, boundHandler);
    hotkeys(keys, (event) => {
      event?.preventDefault();
      boundHandler();
    });
  }

  /**
   * Cmd+0: Reset viewport to default / fit to screen
   */
  private handleResetViewport(): void {
    const canvas = this.canvasManager.getCanvas();
    if (!canvas) return;

    // Reset to identity transform: [1, 0, 0, 1, 0, 0]
    canvas.setZoom(1);
    canvas.absolutePan({ x: 0, y: 0 });
    canvas.requestRenderAll();

    // Sync to store
    this.syncViewportToStore();
  }

  /**
   * Cmd+1: Zoom to 100% (1.0x)
   */
  private handleZoom100(): void {
    const canvas = this.canvasManager.getCanvas();
    if (!canvas) return;

    canvas.setZoom(1.0);
    canvas.requestRenderAll();

    // Sync to store
    this.syncViewportToStore();
  }

  /**
   * Cmd+2: Zoom to 200% (2.0x)
   */
  private handleZoom200(): void {
    const canvas = this.canvasManager.getCanvas();
    if (!canvas) return;

    canvas.setZoom(2.0);
    canvas.requestRenderAll();

    // Sync to store
    this.syncViewportToStore();
  }

  /**
   * Cmd+9: Zoom to selection bounds
   */
  private handleZoomToSelection(): void {
    const canvas = this.canvasManager.getCanvas();
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    // Calculate selection bounds
    const bounds = this.calculateSelectionBounds(activeObjects);
    if (!bounds) return;

    // Zoom to fit selection
    this.zoomToBounds(bounds);
  }

  /**
   * Calculate bounding box for selected objects
   */
  private calculateSelectionBounds(objects: any[]): { left: number; top: number; width: number; height: number } | null {
    if (objects.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    objects.forEach((obj) => {
      const bounds = obj.getBoundingRect();
      minX = Math.min(minX, bounds.left);
      minY = Math.min(minY, bounds.top);
      maxX = Math.max(maxX, bounds.left + bounds.width);
      maxY = Math.max(maxY, bounds.top + bounds.height);
    });

    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  /**
   * Zoom canvas to fit specific bounds with padding
   */
  private zoomToBounds(bounds: { left: number; top: number; width: number; height: number }): void {
    const canvas = this.canvasManager.getCanvas();
    if (!canvas) return;

    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();

    // Calculate zoom to fit with 20% padding
    const padding = 0.2;
    const zoomX = canvasWidth / (bounds.width * (1 + padding));
    const zoomY = canvasHeight / (bounds.height * (1 + padding));
    const zoom = Math.min(zoomX, zoomY);

    // Center the bounds in viewport
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;

    canvas.setZoom(zoom);
    canvas.absolutePan({
      x: canvasWidth / 2 - centerX * zoom,
      y: canvasHeight / 2 - centerY * zoom,
    });
    canvas.requestRenderAll();

    // Sync to store
    this.syncViewportToStore();
  }

  /**
   * Sync current viewport to Zustand store
   */
  private syncViewportToStore(): void {
    const canvas = this.canvasManager.getCanvas();
    if (!canvas) return;

    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform;
    if (!vpt) return;

    const panX = vpt[4];
    const panY = vpt[5];

    usePaperboxStore.getState().syncViewport(zoom, panX, panY);
  }
}
