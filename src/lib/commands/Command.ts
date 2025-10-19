/**
 * Command Pattern - Base Interface & Implementation
 *
 * Purpose: AI-ready command system for undo/redo and natural language execution
 * Created: Phase II, Week 2, Day 2
 *
 * This provides the foundational command pattern structure that enables:
 * - Undo/redo functionality (Phase II)
 * - Phase III AI integration (natural language → command execution)
 * - Keyboard shortcuts and macros
 */

/**
 * Base Command interface
 *
 * All operations (create, update, delete, transform, style) implement this interface
 */
export interface Command {
  /**
   * Execute the command
   *
   * @returns Promise resolving when execution completes
   */
  execute(): Promise<void>;

  /**
   * Undo the command (reverse the operation)
   *
   * @returns Promise resolving when undo completes
   */
  undo(): Promise<void>;

  /**
   * Redo the command (re-execute after undo)
   *
   * @returns Promise resolving when redo completes
   */
  redo(): Promise<void>;

  /**
   * Merge with another command of same type (for batching)
   *
   * @param command - Command to merge with
   * @returns true if merge successful, false if incompatible
   */
  merge?(command: Command): boolean;

  /**
   * Get command description for history display
   *
   * @returns Human-readable description (e.g., "Create Rectangle")
   */
  getDescription(): string;

  /**
   * Get command metadata for AI integration (Phase III)
   *
   * @returns Metadata object with command details
   */
  getMetadata(): CommandMetadata;
}

/**
 * Command metadata for AI integration
 */
export interface CommandMetadata {
  type: CommandType;
  objectIds: string[];
  parameters: Record<string, any>;
  timestamp: number;
}

/**
 * Command types (maps to AI.md command categories)
 */
export type CommandType =
  // Object Creation
  | 'CREATE_RECTANGLE'
  | 'CREATE_CIRCLE'
  | 'CREATE_TEXT'
  | 'CREATE_LINE'
  | 'CREATE_FRAME'

  // Transformation
  | 'MOVE_OBJECT'
  | 'RESIZE_OBJECT'
  | 'ROTATE_OBJECT'
  | 'SCALE_OBJECT'

  // Styling
  | 'CHANGE_FILL'
  | 'CHANGE_STROKE'
  | 'CHANGE_OPACITY'
  | 'APPLY_GRADIENT'

  // Layout
  | 'ALIGN_OBJECTS'
  | 'DISTRIBUTE_OBJECTS'
  | 'GROUP_OBJECTS'
  | 'UNGROUP_OBJECTS'

  // Layer Management
  | 'BRING_TO_FRONT'
  | 'SEND_TO_BACK'
  | 'BRING_FORWARD'
  | 'SEND_BACKWARD'

  // Selection
  | 'SELECT_OBJECT'
  | 'SELECT_MULTIPLE'
  | 'DESELECT_ALL'

  // Deletion
  | 'DELETE_OBJECTS'

  // Copy/Paste
  | 'COPY_OBJECTS'
  | 'PASTE_OBJECTS'
  | 'DUPLICATE_OBJECTS'
  
  // Complex
  | 'COMPOSITE'
  | 'GRID_LAYOUT';

/**
 * Abstract base command class
 *
 * Provides common functionality for all commands
 */
export abstract class BaseCommand implements Command {
  protected executed = false;

  abstract execute(): Promise<void>;
  abstract undo(): Promise<void>;
  abstract getDescription(): string;
  abstract getMetadata(): CommandMetadata;

  /**
   * Default redo implementation (re-execute)
   */
  async redo(): Promise<void> {
    return this.execute();
  }

  /**
   * Check if command has been executed
   */
  isExecuted(): boolean {
    return this.executed;
  }
}

/**
 * Command Registry (for AI integration - Phase III)
 *
 * Maps natural language → Command constructors
 */
export const CommandRegistry: Record<string, any> = {};

/**
 * Register a command class in the registry
 */
export function registerCommand(type: CommandType, commandClass: any) {
  CommandRegistry[type] = commandClass;
}

/**
 * Command Factory (for AI integration - Phase III)
 *
 * Creates command instances from AI-parsed parameters
 */
export function createCommand(
  type: CommandType,
  parameters: Record<string, any>
): Command | null {
  const CommandClass = CommandRegistry[type];
  if (!CommandClass) {
    console.warn('[CommandFactory] Unknown command type:', type);
    return null;
  }

  try {
    return new CommandClass(...Object.values(parameters));
  } catch (error) {
    console.error('[CommandFactory] Error creating command:', error);
    return null;
  }
}
