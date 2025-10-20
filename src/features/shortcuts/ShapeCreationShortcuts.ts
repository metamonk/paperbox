/**
 * ShapeCreationShortcuts.ts
 * Manages keyboard shortcuts for creating shapes on the canvas
 *
 * Shortcuts:
 * - R: Create rectangle
 * - C: Create circle
 * - T: Create text
 */

import hotkeys from 'hotkeys-js';

export interface ShapeCreationShortcutsConfig {
  onCreateRectangle: () => void;
  onCreateCircle: () => void;
  onCreateText: () => void;
}

export class ShapeCreationShortcuts {
  private config: ShapeCreationShortcutsConfig;
  private boundHandlers: Map<string, () => void> = new Map();

  constructor(config: ShapeCreationShortcutsConfig) {
    this.config = config;
  }

  /**
   * Initialize all shape creation shortcuts
   */
  public initialize(): void {
    this.registerShortcut('r', this.handleCreateRectangle);
    this.registerShortcut('c', this.handleCreateCircle);
    this.registerShortcut('t', this.handleCreateText);
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
   * R: Create rectangle at center of viewport
   */
  private handleCreateRectangle(): void {
    this.config.onCreateRectangle();
  }

  /**
   * C: Create circle at center of viewport
   */
  private handleCreateCircle(): void {
    this.config.onCreateCircle();
  }

  /**
   * T: Create text at center of viewport
   */
  private handleCreateText(): void {
    this.config.onCreateText();
  }
}

