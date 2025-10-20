/**
 * CollaborativeOverlayManager - Visual Collaboration Indicators
 *
 * Manages visual overlays for collaborative editing:
 * - Lock indicators (solid borders) - Who's actively editing
 * - Selection indicators (dashed borders) - Who's viewing/selected
 * - User name labels - Tooltips showing user info
 *
 * Uses Fabric.js native objects (not HTML) to avoid coordinate system issues
 * Overlays are automatically positioned and styled based on the underlying object
 */

import { Rect, Text, Group, FabricObject } from 'fabric';
import type { UserPresence } from '@/stores/slices/collaborationSlice';

/**
 * Overlay configuration
 */
interface OverlayConfig {
  strokeWidth: number;
  selectionStrokeWidth: number;
  padding: number;
  labelFontSize: number;
  labelPadding: number;
}

const DEFAULT_CONFIG: OverlayConfig = {
  strokeWidth: 3, // Solid border for active editing
  selectionStrokeWidth: 2, // Dashed border for selection
  padding: 4, // Extra space around object
  labelFontSize: 12,
  labelPadding: 4,
};

/**
 * Manages collaborative visual overlays on Fabric.js canvas
 */
export class CollaborativeOverlayManager {
  private canvas: any; // Fabric.js Canvas instance
  private overlays: Map<string, FabricObject> = new Map(); // overlayKey -> Fabric object
  private config: OverlayConfig;

  constructor(canvas: any, config: Partial<OverlayConfig> = {}) {
    this.canvas = canvas;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update overlays for all users
   * Call this whenever presence data changes
   */
  updateOverlays(presence: Record<string, UserPresence>, currentUserId: string): void {
    // DISABLED: Collaborative overlays temporarily disabled
    this.clearAll();
    return;
    
    // Track which overlays should exist
    const activeOverlays = new Set<string>();

    // Process each user's presence
    Object.entries(presence).forEach(([userId, user]) => {
      // Skip current user (don't show your own overlays)
      if (userId === currentUserId) return;

      // Show lock indicator if user is actively editing
      if (user.activelyEditing) {
        const overlayKey = `lock-${userId}-${user.activelyEditing}`;
        activeOverlays.add(overlayKey);
        this.createOrUpdateLockOverlay(overlayKey, user.activelyEditing, user);
      }

      // Show selection indicators for selected objects
      if (user.selection?.objectIds && user.selection.objectIds.length > 0) {
        user.selection.objectIds.forEach((objectId) => {
          // Don't show selection if they're actively editing (lock takes precedence)
          if (objectId === user.activelyEditing) return;

          const overlayKey = `selection-${userId}-${objectId}`;
          activeOverlays.add(overlayKey);
          this.createOrUpdateSelectionOverlay(overlayKey, objectId, user);
        });
      }
    });

    // Remove overlays that are no longer needed
    this.overlays.forEach((_overlay, key) => {
      if (!activeOverlays.has(key)) {
        this.removeOverlay(key);
      }
    });

    // Render canvas to show changes
    this.canvas?.requestRenderAll();
  }

  /**
   * Create or update a lock indicator (solid border + user label)
   */
  private createOrUpdateLockOverlay(
    overlayKey: string,
    objectId: string,
    user: UserPresence
  ): void {
    // Find the target object on canvas
    const targetObject = this.findCanvasObject(objectId);
    if (!targetObject) {
      // Object not found, remove overlay if it exists
      this.removeOverlay(overlayKey);
      return;
    }

    // Get or create overlay
    let overlay = this.overlays.get(overlayKey);

    if (!overlay) {
      // Create new lock overlay
      overlay = this.createLockIndicator(targetObject, user);
      this.overlays.set(overlayKey, overlay);
      this.canvas.add(overlay);
    } else {
      // Update existing overlay position/size
      this.updateOverlayPosition(overlay as Group, targetObject, user.userColor, true);
    }

    // Bring overlay to front
    this.canvas.bringObjectToFront(overlay);
  }

  /**
   * Create or update a selection indicator (dashed border)
   */
  private createOrUpdateSelectionOverlay(
    overlayKey: string,
    objectId: string,
    user: UserPresence
  ): void {
    // Find the target object on canvas
    const targetObject = this.findCanvasObject(objectId);
    if (!targetObject) {
      this.removeOverlay(overlayKey);
      return;
    }

    // Get or create overlay
    let overlay = this.overlays.get(overlayKey);

    if (!overlay) {
      // Create new selection overlay
      overlay = this.createSelectionIndicator(targetObject, user);
      this.overlays.set(overlayKey, overlay);
      this.canvas.add(overlay);
    } else {
      // Update existing overlay position/size
      this.updateOverlayPosition(overlay as Group, targetObject, user.userColor, false);
    }

    // Bring overlay to front (but below lock indicators)
    this.canvas.bringObjectToFront(overlay);
  }

  /**
   * Create a lock indicator (solid border + label)
   */
  private createLockIndicator(targetObject: FabricObject, user: UserPresence): Group {
    const bounds = this.getObjectBounds(targetObject);
    const { padding, strokeWidth, labelFontSize } = this.config;

    // Solid border rectangle
    const border = new Rect({
      left: bounds.left - padding,
      top: bounds.top - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
      fill: 'transparent',
      stroke: user.userColor,
      strokeWidth: strokeWidth,
      strokeDashArray: undefined, // Solid line for locks
      selectable: false,
      evented: false,
      absolutePositioned: true,
    });

    // User name label (top-right corner)
    const label = new Text(`${user.userName} (editing)`, {
      left: bounds.left + bounds.width - padding,
      top: bounds.top - padding - labelFontSize - 4,
      fontSize: labelFontSize,
      fill: 'white',
      backgroundColor: user.userColor,
      padding: 4,
      selectable: false,
      evented: false,
      absolutePositioned: true,
    });

    // Group border and label together
    const group = new Group([border, label], {
      selectable: false,
      evented: false,
    });

    // Store metadata for updates
    (group as any).overlayType = 'lock';
    (group as any).targetObjectId = (targetObject as any).data?.id;

    return group;
  }

  /**
   * Create a selection indicator (dashed border, no label)
   */
  private createSelectionIndicator(targetObject: FabricObject, user: UserPresence): Group {
    const bounds = this.getObjectBounds(targetObject);
    const { padding, selectionStrokeWidth } = this.config;

    // Dashed border rectangle
    const border = new Rect({
      left: bounds.left - padding,
      top: bounds.top - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
      fill: 'transparent',
      stroke: user.userColor,
      strokeWidth: selectionStrokeWidth,
      strokeDashArray: [5, 5], // Dashed line for selections
      selectable: false,
      evented: false,
      absolutePositioned: true,
      opacity: 0.7, // Slightly transparent
    });

    // Group (just the border for selection)
    const group = new Group([border], {
      selectable: false,
      evented: false,
    });

    // Store metadata for updates
    (group as any).overlayType = 'selection';
    (group as any).targetObjectId = (targetObject as any).data?.id;

    return group;
  }

  /**
   * Update overlay position to match target object
   */
  private updateOverlayPosition(
    overlay: Group,
    targetObject: FabricObject,
    userColor: string,
    isLock: boolean
  ): void {
    const bounds = this.getObjectBounds(targetObject);
    const { padding, strokeWidth, selectionStrokeWidth } = this.config;

    const strokeW = isLock ? strokeWidth : selectionStrokeWidth;

    // Update border (first item in group)
    const border = overlay.getObjects()[0] as Rect;
    if (border) {
      border.set({
        left: bounds.left - padding,
        top: bounds.top - padding,
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
        stroke: userColor,
        strokeWidth: strokeW,
      });
    }

    // Update label if it exists (lock overlays only)
    if (isLock && overlay.getObjects().length > 1) {
      const label = overlay.getObjects()[1] as Text;
      if (label) {
        label.set({
          left: bounds.left + bounds.width - padding,
          top: bounds.top - padding - this.config.labelFontSize - 4,
          backgroundColor: userColor,
        });
      }
    }

    overlay.setCoords();
  }

  /**
   * Get absolute bounding box of an object
   */
  private getObjectBounds(obj: FabricObject): {
    left: number;
    top: number;
    width: number;
    height: number;
  } {
    const boundingRect = obj.getBoundingRect(); // Get bounding rect

    return {
      left: boundingRect.left,
      top: boundingRect.top,
      width: boundingRect.width,
      height: boundingRect.height,
    };
  }

  /**
   * Find a canvas object by its ID
   */
  private findCanvasObject(objectId: string): FabricObject | null {
    const objects = this.canvas?.getObjects() || [];

    for (const obj of objects) {
      const data = (obj as any).data;
      if (data?.id === objectId) {
        return obj;
      }
    }

    return null;
  }

  /**
   * Remove an overlay by key
   */
  private removeOverlay(overlayKey: string): void {
    const overlay = this.overlays.get(overlayKey);
    if (overlay) {
      this.canvas?.remove(overlay);
      this.overlays.delete(overlayKey);
    }
  }

  /**
   * Clear all overlays
   */
  clearAll(): void {
    this.overlays.forEach((overlay) => {
      this.canvas?.remove(overlay);
    });
    this.overlays.clear();
    this.canvas?.requestRenderAll();
  }

  /**
   * Handle object movement - update overlays in real-time
   * Call this during object:modified events
   */
  updateOverlaysForMovement(): void {
    // Update all overlays to match their target objects
    this.overlays.forEach((overlay, key) => {
      const targetObjectId = (overlay as any).targetObjectId;
      if (!targetObjectId) return;

      const targetObject = this.findCanvasObject(targetObjectId);
      if (!targetObject) {
        // Object no longer exists, remove overlay
        this.removeOverlay(key);
        return;
      }

      // Extract user color and type from overlay
      const isLock = (overlay as any).overlayType === 'lock';
      const border = (overlay as Group).getObjects()[0] as Rect;
      const userColor = border.stroke as string;

      // Update position
      this.updateOverlayPosition(overlay as Group, targetObject, userColor, isLock);
    });

    this.canvas?.requestRenderAll();
  }

  /**
   * Cleanup - remove all overlays and listeners
   */
  destroy(): void {
    this.clearAll();
    this.overlays.clear();
  }
}

