import { BaseCommand, type CommandMetadata } from './Command';

/**
 * CompositeCommand - Chain multiple commands together
 * Useful for complex operations that require multiple steps (e.g., creating a login form)
 *
 * Features:
 * - Execute multiple commands as a single unit
 * - Undo reverses all sub-commands in reverse order
 * - Tracks all sub-command metadata
 */
export class CompositeCommand extends BaseCommand {
  private commands: BaseCommand[];
  private description: string;

  constructor(commands: BaseCommand[], description?: string) {
    super();
    this.commands = commands;
    this.description = description || `Composite (${commands.length} commands)`;
  }

  async execute(): Promise<void> {
    console.log(`[CompositeCommand] Executing ${this.commands.length} commands...`);

    for (let i = 0; i < this.commands.length; i++) {
      try {
        await this.commands[i].execute();
        console.log(`[CompositeCommand] ✓ Command ${i + 1}/${this.commands.length} executed`);
      } catch (error) {
        console.error(`[CompositeCommand] ✗ Command ${i + 1} failed:`, error);

        // Undo all previously executed commands in this composite
        console.log(`[CompositeCommand] Rolling back ${i} commands...`);
        for (let j = i - 1; j >= 0; j--) {
          try {
            await this.commands[j].undo();
          } catch (undoError) {
            console.error(`[CompositeCommand] Failed to undo command ${j}:`, undoError);
          }
        }

        throw new Error(`CompositeCommand failed at step ${i + 1}: ${error}`);
      }
    }

    this.executed = true;
    console.log(`[CompositeCommand] ✓ All ${this.commands.length} commands executed successfully`);
  }

  async undo(): Promise<void> {
    if (!this.executed) {
      throw new Error('Cannot undo: composite command was not executed');
    }

    console.log(`[CompositeCommand] Undoing ${this.commands.length} commands in reverse order...`);

    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      try {
        await this.commands[i].undo();
        console.log(`[CompositeCommand] ✓ Command ${i + 1}/${this.commands.length} undone`);
      } catch (error) {
        console.error(`[CompositeCommand] ✗ Failed to undo command ${i + 1}:`, error);
        // Continue undoing other commands even if one fails
      }
    }

    this.executed = false;
    console.log('[CompositeCommand] ✓ All commands undone');
  }

  getDescription(): string {
    return this.description;
  }

  getMetadata(): CommandMetadata {
    // Collect all object IDs from sub-commands
    const allObjectIds: string[] = [];
    const subCommands: CommandMetadata[] = [];

    for (const cmd of this.commands) {
      const metadata = cmd.getMetadata();
      subCommands.push(metadata);
      if (metadata.objectIds) {
        allObjectIds.push(...metadata.objectIds);
      }
    }

    return {
      type: 'COMPOSITE',
      objectIds: [...new Set(allObjectIds)], // Remove duplicates
      parameters: {
        commandCount: this.commands.length,
        subCommands,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Get all sub-commands
   */
  getCommands(): BaseCommand[] {
    return this.commands;
  }
}

