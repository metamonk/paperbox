/**
 * EditingShortcuts.ts
 * Manages keyboard shortcuts for canvas editing operations
 *
 * Shortcuts:
 * - Cmd+D: Duplicate selected objects
 * - Cmd+Z: Undo last action
 * - Cmd+Shift+Z: Redo last undone action
 */

import hotkeys from 'hotkeys-js';
import { usePaperboxStore } from '../../stores';
import { DuplicateCommand } from '../../lib/commands/DuplicateCommand';

export interface EditingShortcutsConfig {
  userId: string;
}

export class EditingShortcuts {
  private userId: string;
  private boundHandlers: Map<string, () => void> = new Map();

  constructor(config: EditingShortcutsConfig) {
    this.userId = config.userId;
  }

  /**
   * Initialize all editing shortcuts
   */
  public initialize(): void {
    this.registerShortcut('cmd+d,ctrl+d', this.handleDuplicate);
    this.registerShortcut('cmd+z,ctrl+z', this.handleUndo);
    this.registerShortcut('cmd+shift+z,ctrl+shift+z', this.handleRedo);
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
   * Cmd+D: Duplicate selected objects
   * Creates clones at the same position, preserves groups, selects duplicates
   * Registers with history for undo/redo support
   */
  private async handleDuplicate(): Promise<void> {
    const store = usePaperboxStore.getState();
    const { selectedIds, executeCommand } = store;

    // No-op if nothing selected
    if (selectedIds.length === 0) {
      return;
    }

    // Create and execute DuplicateCommand for undo/redo support
    const command = new DuplicateCommand(selectedIds, this.userId);
    executeCommand(command);
  }

  /**
   * Cmd+Z: Undo last action
   * Reverts the most recent command in the history stack
   */
  private handleUndo(): void {
    const store = usePaperboxStore.getState();
    const { canUndo, undo } = store;

    // Only undo if there's something to undo
    if (canUndo) {
      undo();
    }
  }

  /**
   * Cmd+Shift+Z: Redo last undone action
   * Re-applies the most recently undone command
   */
  private handleRedo(): void {
    const store = usePaperboxStore.getState();
    const { canRedo, redo } = store;

    // Only redo if there's something to redo
    if (canRedo) {
      redo();
    }
  }
}

