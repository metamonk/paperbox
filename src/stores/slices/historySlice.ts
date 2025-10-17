/**
 * History Slice - Zustand Store
 *
 * Manages undo/redo command history
 * Part of 6-slice architecture for Phase II
 *
 * Responsibilities:
 * - Command history stack (will be implemented in Week 1 Day 5)
 * - Undo/redo operations
 * - Command execution tracking
 * - History limits and cleanup
 */

import type { StateCreator } from 'zustand';
import type { PaperboxStore } from '../index';

/**
 * Command interface (placeholder for Week 1 Day 5)
 */
export interface Command {
  id: string;
  type: string;
  execute: () => void;
  undo: () => void;
  timestamp: number;
}

/**
 * History slice state interface
 */
export interface HistorySlice {
  // State
  undoStack: Command[];
  redoStack: Command[];
  maxHistorySize: number;
  canUndo: boolean;
  canRedo: boolean;

  // Actions (placeholders for Week 1 Day 5)
  executeCommand: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  setMaxHistorySize: (size: number) => void;
}

/**
 * Create history slice
 *
 * NOTE: Full implementation in Week 1 Day 5 (Command Pattern)
 * This provides the basic structure
 */
export const createHistorySlice: StateCreator<
  PaperboxStore,
  [['zustand/immer', never], ['zustand/devtools', never]],
  [],
  HistorySlice
> = (set, get) => ({
  // Initial state
  undoStack: [],
  redoStack: [],
  maxHistorySize: 50,
  canUndo: false,
  canRedo: false,

  // Actions

  /**
   * Execute command and add to history
   *
   * TODO Week 1 Day 5: Implement full command pattern
   */
  executeCommand: (command: Command) =>
    set(
      (state) => {
        // Execute the command
        command.execute();

        // Add to undo stack
        state.undoStack.push(command);

        // Clear redo stack (new action invalidates redo)
        state.redoStack = [];

        // Enforce max history size
        if (state.undoStack.length > state.maxHistorySize) {
          state.undoStack.shift();
        }

        // Update can undo/redo flags
        state.canUndo = state.undoStack.length > 0;
        state.canRedo = false;
      },
      undefined,
      'history/executeCommand',
    ),

  /**
   * Undo last command
   *
   * TODO Week 1 Day 5: Implement
   */
  undo: () =>
    set(
      (state) => {
        if (state.undoStack.length === 0) return;

        const command = state.undoStack.pop();
        if (command) {
          command.undo();
          state.redoStack.push(command);

          state.canUndo = state.undoStack.length > 0;
          state.canRedo = true;
        }
      },
      undefined,
      'history/undo',
    ),

  /**
   * Redo last undone command
   *
   * TODO Week 1 Day 5: Implement
   */
  redo: () =>
    set(
      (state) => {
        if (state.redoStack.length === 0) return;

        const command = state.redoStack.pop();
        if (command) {
          command.execute();
          state.undoStack.push(command);

          state.canUndo = true;
          state.canRedo = state.redoStack.length > 0;
        }
      },
      undefined,
      'history/redo',
    ),

  /**
   * Clear all history
   */
  clearHistory: () =>
    set(
      (state) => {
        state.undoStack = [];
        state.redoStack = [];
        state.canUndo = false;
        state.canRedo = false;
      },
      undefined,
      'history/clearHistory',
    ),

  /**
   * Set maximum history size
   */
  setMaxHistorySize: (size: number) =>
    set(
      (state) => {
        state.maxHistorySize = size;

        // Trim existing stacks if needed
        if (state.undoStack.length > size) {
          state.undoStack = state.undoStack.slice(-size);
        }
      },
      undefined,
      'history/setMaxHistorySize',
    ),
});
