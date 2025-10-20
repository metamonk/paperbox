/**
 * LayeringShortcuts.ts
 * Manages keyboard shortcuts for z-index layering operations
 *
 * Shortcuts:
 * - Cmd+]: Bring to front
 * - Cmd+[: Send to back
 * - Cmd+Shift+]: Bring forward (move up one layer)
 * - Cmd+Shift+[: Send backward (move down one layer)
 */

import hotkeys from 'hotkeys-js';
import { usePaperboxStore } from '../../stores';

export class LayeringShortcuts {
  private boundHandlers: Map<string, () => void> = new Map();

  /**
   * Initialize all layering shortcuts
   */
  public initialize(): void {
    this.registerShortcut('cmd+],ctrl+]', this.handleBringToFront);
    this.registerShortcut('cmd+[,ctrl+[', this.handleSendToBack);
    this.registerShortcut('cmd+shift+],ctrl+shift+]', this.handleBringForward);
    this.registerShortcut('cmd+shift+[,ctrl+shift+[', this.handleSendBackward);
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
   * Cmd+]: Bring to front (move to top of z-index stack)
   */
  private handleBringToFront(): void {
    const store = usePaperboxStore.getState();
    const { selectedIds, moveToFront } = store;

    if (selectedIds.length === 1) {
      moveToFront(selectedIds[0]);
    }
  }

  /**
   * Cmd+[: Send to back (move to bottom of z-index stack)
   */
  private handleSendToBack(): void {
    const store = usePaperboxStore.getState();
    const { selectedIds, moveToBack } = store;

    if (selectedIds.length === 1) {
      moveToBack(selectedIds[0]);
    }
  }

  /**
   * Cmd+Shift+]: Bring forward (move up one layer)
   */
  private handleBringForward(): void {
    const store = usePaperboxStore.getState();
    const { selectedIds, moveUp } = store;

    if (selectedIds.length === 1) {
      moveUp(selectedIds[0]);
    }
  }

  /**
   * Cmd+Shift+[: Send backward (move down one layer)
   */
  private handleSendBackward(): void {
    const store = usePaperboxStore.getState();
    const { selectedIds, moveDown } = store;

    if (selectedIds.length === 1) {
      moveDown(selectedIds[0]);
    }
  }
}

