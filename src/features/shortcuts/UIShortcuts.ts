/**
 * UIShortcuts.ts
 * Manages keyboard shortcuts for UI interactions
 *
 * Shortcuts:
 * - Cmd+/: Toggle AI interface
 */

import hotkeys from 'hotkeys-js';

export interface UIShortcutsConfig {
  onToggleAI: () => void;
}

export class UIShortcuts {
  private config: UIShortcutsConfig;
  private boundHandlers: Map<string, () => void> = new Map();

  constructor(config: UIShortcutsConfig) {
    this.config = config;
  }

  /**
   * Initialize all UI shortcuts
   */
  public initialize(): void {
    this.registerShortcut('cmd+/,ctrl+/', this.handleToggleAI);
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
   * Cmd+/: Toggle AI interface
   */
  private handleToggleAI(): void {
    this.config.onToggleAI();
  }
}

