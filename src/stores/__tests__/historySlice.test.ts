/**
 * History Slice Tests
 *
 * Tests for undo/redo command history management
 * Covers command execution, undo/redo operations, and history limits
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePaperboxStore } from '../index';
import type { Command } from '../slices/historySlice';

describe('historySlice - Command History Management', () => {
  beforeEach(() => {
    // Reset history state before each test
    const store = usePaperboxStore.getState();
    store.clearHistory();
  });

  describe('Initial State', () => {
    it('should have empty undo and redo stacks on initialization', () => {
      const { undoStack, redoStack, canUndo, canRedo } =
        usePaperboxStore.getState();

      expect(undoStack).toEqual([]);
      expect(redoStack).toEqual([]);
      expect(canUndo).toBe(false);
      expect(canRedo).toBe(false);
    });

    it('should have default max history size of 50', () => {
      const { maxHistorySize } = usePaperboxStore.getState();

      expect(maxHistorySize).toBe(50);
    });
  });

  describe('executeCommand()', () => {
    it('should execute command and add to undo stack', () => {
      const executeFn = vi.fn();
      const undoFn = vi.fn();

      const command: Command = {
        id: 'cmd-1',
        type: 'test',
        execute: executeFn,
        undo: undoFn,
        timestamp: Date.now(),
      };

      usePaperboxStore.getState().executeCommand(command);

      expect(executeFn).toHaveBeenCalledTimes(1);

      const { undoStack, canUndo, canRedo } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(1);
      expect(undoStack[0].id).toBe('cmd-1');
      expect(canUndo).toBe(true);
      expect(canRedo).toBe(false);
    });

    it('should clear redo stack when new command is executed', () => {
      const cmd1: Command = {
        id: 'cmd-1',
        type: 'test',
        execute: vi.fn(),
        undo: vi.fn(),
        timestamp: Date.now(),
      };

      const cmd2: Command = {
        id: 'cmd-2',
        type: 'test',
        execute: vi.fn(),
        undo: vi.fn(),
        timestamp: Date.now(),
      };

      const store = usePaperboxStore.getState();

      // Execute cmd1, then undo it
      store.executeCommand(cmd1);
      store.undo();

      // Verify we have something in redo stack
      expect(usePaperboxStore.getState().redoStack).toHaveLength(1);

      // Execute new command
      store.executeCommand(cmd2);

      // Redo stack should be cleared
      const { redoStack, canRedo } = usePaperboxStore.getState();
      expect(redoStack).toHaveLength(0);
      expect(canRedo).toBe(false);
    });

    it('should enforce max history size', () => {
      const store = usePaperboxStore.getState();

      // Set small max size
      store.setMaxHistorySize(3);

      // Execute 5 commands
      for (let i = 0; i < 5; i++) {
        const cmd: Command = {
          id: `cmd-${i}`,
          type: 'test',
          execute: vi.fn(),
          undo: vi.fn(),
          timestamp: Date.now(),
        };
        store.executeCommand(cmd);
      }

      const { undoStack } = usePaperboxStore.getState();

      // Should only keep last 3
      expect(undoStack).toHaveLength(3);
      expect(undoStack[0].id).toBe('cmd-2'); // Oldest should be cmd-2 (cmd-0 and cmd-1 removed)
      expect(undoStack[2].id).toBe('cmd-4'); // Newest should be cmd-4
    });

    it('should execute multiple commands sequentially', () => {
      const store = usePaperboxStore.getState();

      const commands: Command[] = [];
      for (let i = 0; i < 3; i++) {
        const cmd: Command = {
          id: `cmd-${i}`,
          type: 'test',
          execute: vi.fn(),
          undo: vi.fn(),
          timestamp: Date.now(),
        };
        commands.push(cmd);
        store.executeCommand(cmd);
      }

      // All execute functions should have been called
      commands.forEach((cmd) => {
        expect(cmd.execute).toHaveBeenCalledTimes(1);
      });

      // Stack should have all commands
      const { undoStack } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(3);
    });
  });

  describe('undo()', () => {
    it('should undo last command and move it to redo stack', () => {
      const executeFn = vi.fn();
      const undoFn = vi.fn();

      const command: Command = {
        id: 'cmd-1',
        type: 'test',
        execute: executeFn,
        undo: undoFn,
        timestamp: Date.now(),
      };

      const store = usePaperboxStore.getState();
      store.executeCommand(command);
      store.undo();

      expect(undoFn).toHaveBeenCalledTimes(1);

      const { undoStack, redoStack, canUndo, canRedo } =
        usePaperboxStore.getState();
      expect(undoStack).toHaveLength(0);
      expect(redoStack).toHaveLength(1);
      expect(redoStack[0].id).toBe('cmd-1');
      expect(canUndo).toBe(false);
      expect(canRedo).toBe(true);
    });

    it('should handle undo when nothing to undo gracefully', () => {
      const store = usePaperboxStore.getState();

      // Should not throw
      expect(() => store.undo()).not.toThrow();

      const { undoStack, redoStack, canUndo } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(0);
      expect(redoStack).toHaveLength(0);
      expect(canUndo).toBe(false);
    });

    it('should undo multiple commands in reverse order', () => {
      const store = usePaperboxStore.getState();

      const commands: Command[] = [];
      for (let i = 0; i < 3; i++) {
        const cmd: Command = {
          id: `cmd-${i}`,
          type: 'test',
          execute: vi.fn(),
          undo: vi.fn(),
          timestamp: Date.now(),
        };
        commands.push(cmd);
        store.executeCommand(cmd);
      }

      // Undo twice
      store.undo();
      store.undo();

      // Should have undone cmd-2 and cmd-1 (in that order)
      expect(commands[2].undo).toHaveBeenCalledTimes(1);
      expect(commands[1].undo).toHaveBeenCalledTimes(1);
      expect(commands[0].undo).not.toHaveBeenCalled();

      const { undoStack, redoStack } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(1); // Only cmd-0 left
      expect(redoStack).toHaveLength(2); // cmd-1 and cmd-2
    });

    it('should update canUndo and canRedo flags correctly', () => {
      const store = usePaperboxStore.getState();

      const cmd: Command = {
        id: 'cmd-1',
        type: 'test',
        execute: vi.fn(),
        undo: vi.fn(),
        timestamp: Date.now(),
      };

      // Initially cannot undo or redo
      expect(usePaperboxStore.getState().canUndo).toBe(false);
      expect(usePaperboxStore.getState().canRedo).toBe(false);

      // Execute command
      store.executeCommand(cmd);
      expect(usePaperboxStore.getState().canUndo).toBe(true);
      expect(usePaperboxStore.getState().canRedo).toBe(false);

      // Undo command
      store.undo();
      expect(usePaperboxStore.getState().canUndo).toBe(false);
      expect(usePaperboxStore.getState().canRedo).toBe(true);
    });
  });

  describe('redo()', () => {
    it('should redo last undone command', () => {
      const executeFn = vi.fn();
      const undoFn = vi.fn();

      const command: Command = {
        id: 'cmd-1',
        type: 'test',
        execute: executeFn,
        undo: undoFn,
        timestamp: Date.now(),
      };

      const store = usePaperboxStore.getState();
      store.executeCommand(command);
      store.undo();

      // Clear execute mock to track redo call
      executeFn.mockClear();

      store.redo();

      expect(executeFn).toHaveBeenCalledTimes(1); // Redo calls execute again

      const { undoStack, redoStack, canUndo, canRedo } =
        usePaperboxStore.getState();
      expect(undoStack).toHaveLength(1);
      expect(undoStack[0].id).toBe('cmd-1');
      expect(redoStack).toHaveLength(0);
      expect(canUndo).toBe(true);
      expect(canRedo).toBe(false);
    });

    it('should handle redo when nothing to redo gracefully', () => {
      const store = usePaperboxStore.getState();

      // Should not throw
      expect(() => store.redo()).not.toThrow();

      const { undoStack, redoStack, canRedo } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(0);
      expect(redoStack).toHaveLength(0);
      expect(canRedo).toBe(false);
    });

    it('should redo multiple commands in correct order', () => {
      const store = usePaperboxStore.getState();

      const commands: Command[] = [];
      for (let i = 0; i < 3; i++) {
        const cmd: Command = {
          id: `cmd-${i}`,
          type: 'test',
          execute: vi.fn(),
          undo: vi.fn(),
          timestamp: Date.now(),
        };
        commands.push(cmd);
        store.executeCommand(cmd);
      }

      // Undo all
      store.undo();
      store.undo();
      store.undo();

      // Clear execute mocks
      commands.forEach((cmd) => (cmd.execute as any).mockClear());

      // Redo twice
      store.redo();
      store.redo();

      // Should have redone cmd-0 and cmd-1 (in that order)
      expect(commands[0].execute).toHaveBeenCalledTimes(1);
      expect(commands[1].execute).toHaveBeenCalledTimes(1);
      expect(commands[2].execute).not.toHaveBeenCalled();

      const { undoStack, redoStack } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(2); // cmd-0 and cmd-1
      expect(redoStack).toHaveLength(1); // Only cmd-2 left
    });
  });

  describe('clearHistory()', () => {
    it('should clear both undo and redo stacks', () => {
      const store = usePaperboxStore.getState();

      // Execute and undo some commands
      for (let i = 0; i < 3; i++) {
        const cmd: Command = {
          id: `cmd-${i}`,
          type: 'test',
          execute: vi.fn(),
          undo: vi.fn(),
          timestamp: Date.now(),
        };
        store.executeCommand(cmd);
      }

      store.undo(); // Move one to redo stack

      // Verify we have items in both stacks
      expect(usePaperboxStore.getState().undoStack.length).toBeGreaterThan(0);
      expect(usePaperboxStore.getState().redoStack.length).toBeGreaterThan(0);

      // Clear history
      store.clearHistory();

      const { undoStack, redoStack, canUndo, canRedo } =
        usePaperboxStore.getState();
      expect(undoStack).toHaveLength(0);
      expect(redoStack).toHaveLength(0);
      expect(canUndo).toBe(false);
      expect(canRedo).toBe(false);
    });

    it('should handle clearing empty history gracefully', () => {
      const store = usePaperboxStore.getState();

      expect(() => store.clearHistory()).not.toThrow();

      const { undoStack, redoStack } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(0);
      expect(redoStack).toHaveLength(0);
    });
  });

  describe('setMaxHistorySize()', () => {
    it('should update max history size', () => {
      const store = usePaperboxStore.getState();

      store.setMaxHistorySize(100);

      expect(usePaperboxStore.getState().maxHistorySize).toBe(100);
    });

    it('should trim existing undo stack when reducing max size', () => {
      const store = usePaperboxStore.getState();

      // Execute 10 commands
      for (let i = 0; i < 10; i++) {
        const cmd: Command = {
          id: `cmd-${i}`,
          type: 'test',
          execute: vi.fn(),
          undo: vi.fn(),
          timestamp: Date.now(),
        };
        store.executeCommand(cmd);
      }

      expect(usePaperboxStore.getState().undoStack).toHaveLength(10);

      // Reduce max size to 5
      store.setMaxHistorySize(5);

      const { undoStack } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(5);

      // Should keep the most recent 5 commands (cmd-5 through cmd-9)
      expect(undoStack[0].id).toBe('cmd-5');
      expect(undoStack[4].id).toBe('cmd-9');
    });

    it('should not affect stack when increasing max size', () => {
      const store = usePaperboxStore.getState();

      // Execute 5 commands
      for (let i = 0; i < 5; i++) {
        const cmd: Command = {
          id: `cmd-${i}`,
          type: 'test',
          execute: vi.fn(),
          undo: vi.fn(),
          timestamp: Date.now(),
        };
        store.executeCommand(cmd);
      }

      expect(usePaperboxStore.getState().undoStack).toHaveLength(5);

      // Increase max size
      store.setMaxHistorySize(100);

      const { undoStack } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(5); // Should remain unchanged
      expect(undoStack[0].id).toBe('cmd-0');
      expect(undoStack[4].id).toBe('cmd-4');
    });
  });

  describe('Undo/Redo Flow Integration', () => {
    it('should handle complete undo/redo cycle', () => {
      const store = usePaperboxStore.getState();

      const cmd: Command = {
        id: 'cmd-1',
        type: 'test',
        execute: vi.fn(),
        undo: vi.fn(),
        timestamp: Date.now(),
      };

      // Execute → Undo → Redo cycle
      store.executeCommand(cmd);
      expect(cmd.execute).toHaveBeenCalledTimes(1);

      store.undo();
      expect(cmd.undo).toHaveBeenCalledTimes(1);

      (cmd.execute as any).mockClear();
      store.redo();
      expect(cmd.execute).toHaveBeenCalledTimes(1);

      // Final state: command back in undo stack
      const { undoStack, redoStack } = usePaperboxStore.getState();
      expect(undoStack).toHaveLength(1);
      expect(redoStack).toHaveLength(0);
    });

    it('should handle complex undo/redo sequences', () => {
      const store = usePaperboxStore.getState();

      const commands: Command[] = [];
      for (let i = 0; i < 5; i++) {
        const cmd: Command = {
          id: `cmd-${i}`,
          type: 'test',
          execute: vi.fn(),
          undo: vi.fn(),
          timestamp: Date.now(),
        };
        commands.push(cmd);
        store.executeCommand(cmd);
      }

      // Undo 3 times
      store.undo();
      store.undo();
      store.undo();

      let state = usePaperboxStore.getState();
      expect(state.undoStack).toHaveLength(2);
      expect(state.redoStack).toHaveLength(3);

      // Redo 2 times
      store.redo();
      store.redo();

      state = usePaperboxStore.getState();
      expect(state.undoStack).toHaveLength(4);
      expect(state.redoStack).toHaveLength(1);

      // Execute new command (should clear redo)
      const newCmd: Command = {
        id: 'cmd-new',
        type: 'test',
        execute: vi.fn(),
        undo: vi.fn(),
        timestamp: Date.now(),
      };
      store.executeCommand(newCmd);

      state = usePaperboxStore.getState();
      expect(state.undoStack).toHaveLength(5);
      expect(state.redoStack).toHaveLength(0);
    });
  });
});
