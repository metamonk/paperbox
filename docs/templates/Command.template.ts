/**
 * TEMPLATE: Command Pattern Interface & Base Implementation
 *
 * Purpose: AI-ready command system for undo/redo and natural language execution
 * Location: src/lib/commands/Command.ts
 *
 * Created: Day 5 of Phase II Implementation
 *
 * This template provides the foundational command pattern structure that enables:
 * - Undo/redo functionality
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
  | 'DUPLICATE_OBJECTS';

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
 * EXAMPLE: CreateRectangleCommand
 *
 * TODO Day 5-6: Implement all 57 feature commands
 */
export class CreateRectangleCommand extends BaseCommand {
  private objectId: string | null = null;

  constructor(
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    private fill: string
  ) {
    super();
  }

  async execute(): Promise<void> {
    // TODO Day 6: Implement using canvasStore.createObject
    console.log('[Command] Creating rectangle:', {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      fill: this.fill,
    });

    // const { useCanvasStore } = await import('../../stores/slices/canvasStore');
    // this.objectId = await useCanvasStore.getState().createObject({
    //   type: 'rectangle',
    //   x: this.x,
    //   y: this.y,
    //   width: this.width,
    //   height: this.height,
    //   fill: this.fill,
    // });

    this.executed = true;
  }

  async undo(): Promise<void> {
    if (!this.objectId) return;

    // TODO Day 6: Implement using canvasStore.deleteObjects
    console.log('[Command] Undoing rectangle creation:', this.objectId);

    // const { useCanvasStore } = await import('../../stores/slices/canvasStore');
    // await useCanvasStore.getState().deleteObjects([this.objectId]);

    this.executed = false;
  }

  getDescription(): string {
    return 'Create Rectangle';
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'CREATE_RECTANGLE',
      objectIds: this.objectId ? [this.objectId] : [],
      parameters: {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        fill: this.fill,
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * EXAMPLE: MoveObjectCommand
 *
 * TODO Day 7: Implement transformation commands
 */
export class MoveObjectCommand extends BaseCommand {
  private previousX: number = 0;
  private previousY: number = 0;

  constructor(
    private objectId: string,
    private newX: number,
    private newY: number
  ) {
    super();
  }

  async execute(): Promise<void> {
    // TODO Day 7: Save previous position and update
    console.log('[Command] Moving object:', this.objectId, 'to', this.newX, this.newY);

    // const { useCanvasStore } = await import('../../stores/slices/canvasStore');
    // const object = useCanvasStore.getState().objects.get(this.objectId);
    // if (object) {
    //   this.previousX = object.x;
    //   this.previousY = object.y;
    //
    //   await useCanvasStore.getState().updateObject(this.objectId, {
    //     x: this.newX,
    //     y: this.newY,
    //   });
    // }

    this.executed = true;
  }

  async undo(): Promise<void> {
    // TODO Day 7: Restore previous position
    console.log('[Command] Undoing move:', this.objectId, 'to', this.previousX, this.previousY);

    // const { useCanvasStore } = await import('../../stores/slices/canvasStore');
    // await useCanvasStore.getState().updateObject(this.objectId, {
    //   x: this.previousX,
    //   y: this.previousY,
    // });

    this.executed = false;
  }

  /**
   * Merge consecutive move commands for same object
   */
  merge(command: Command): boolean {
    if (!(command instanceof MoveObjectCommand)) return false;
    if (command.objectId !== this.objectId) return false;

    // Update target position (keep original start position)
    this.newX = command.newX;
    this.newY = command.newY;

    return true;
  }

  getDescription(): string {
    return `Move Object`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'MOVE_OBJECT',
      objectIds: [this.objectId],
      parameters: {
        x: this.newX,
        y: this.newY,
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * EXAMPLE: DeleteObjectsCommand
 *
 * TODO Day 8: Implement deletion command
 */
export class DeleteObjectsCommand extends BaseCommand {
  private deletedObjects: Map<string, any> = new Map();

  constructor(private objectIds: string[]) {
    super();
  }

  async execute(): Promise<void> {
    // TODO Day 8: Save objects before deletion (for undo)
    console.log('[Command] Deleting objects:', this.objectIds);

    // const { useCanvasStore } = await import('../../stores/slices/canvasStore');
    // const state = useCanvasStore.getState();
    //
    // // Save for undo
    // this.objectIds.forEach((id) => {
    //   const obj = state.objects.get(id);
    //   if (obj) {
    //     this.deletedObjects.set(id, obj);
    //   }
    // });
    //
    // // Delete
    // await state.deleteObjects(this.objectIds);

    this.executed = true;
  }

  async undo(): Promise<void> {
    // TODO Day 8: Restore deleted objects
    console.log('[Command] Undoing deletion:', this.objectIds);

    // const { useCanvasStore } = await import('../../stores/slices/canvasStore');
    //
    // // Restore each object
    // for (const [id, obj] of this.deletedObjects) {
    //   await useCanvasStore.getState().createObject(obj);
    // }

    this.executed = false;
  }

  getDescription(): string {
    return `Delete ${this.objectIds.length} Object(s)`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'DELETE_OBJECTS',
      objectIds: this.objectIds,
      parameters: {},
      timestamp: Date.now(),
    };
  }
}

/**
 * Command Registry (for AI integration - Phase III)
 *
 * Maps natural language → Command constructors
 *
 * TODO Phase III: Expand with all command types
 */
export const CommandRegistry = {
  CREATE_RECTANGLE: CreateRectangleCommand,
  MOVE_OBJECT: MoveObjectCommand,
  DELETE_OBJECTS: DeleteObjectsCommand,

  // TODO Day 5-12: Add all 57 feature commands
  // CREATE_CIRCLE: CreateCircleCommand,
  // CREATE_TEXT: CreateTextCommand,
  // RESIZE_OBJECT: ResizeObjectCommand,
  // ROTATE_OBJECT: RotateObjectCommand,
  // CHANGE_FILL: ChangeFillCommand,
  // ALIGN_OBJECTS: AlignObjectsCommand,
  // GROUP_OBJECTS: GroupObjectsCommand,
  // etc...
};

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

  // TODO Phase III: Intelligent parameter mapping
  // For now, pass parameters directly to constructor
  try {
    return new CommandClass(...Object.values(parameters));
  } catch (error) {
    console.error('[CommandFactory] Error creating command:', error);
    return null;
  }
}
