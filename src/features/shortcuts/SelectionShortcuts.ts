/**
 * SelectionShortcuts.ts
 * Manages keyboard shortcuts for selecting objects on the canvas
 *
 * Shortcuts:
 * - Cmd+A: Select all objects
 */

import hotkeys from 'hotkeys-js';
import { usePaperboxStore } from '../../stores';

export class SelectionShortcuts {
  private boundHandlers: Map<string, () => void> = new Map();

  /**
   * Initialize all selection shortcuts
   */
  public initialize(): void {
    this.registerShortcut('cmd+a,ctrl+a', this.handleSelectAll);
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
   * Cmd+A: Select all objects on the canvas
   */
  private handleSelectAll(): void {
    const store = usePaperboxStore.getState();
    const { selectAll } = store;
    selectAll();
  }
}

