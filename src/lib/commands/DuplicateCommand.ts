/**
 * DuplicateCommand - Duplicate selected objects with undo/redo support
 *
 * Implements the Command pattern for object duplication:
 * - execute(): Duplicates selected objects
 * - undo(): Deletes the duplicated objects
 * - redo(): Re-creates the duplicated objects
 *
 * Preserves group structure and handles batch operations efficiently
 */

import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';

export class DuplicateCommand extends BaseCommand {
  private objectIds: string[];
  private userId: string;
  private duplicatedIds: string[] = [];

  /**
   * Create a new DuplicateCommand
   * @param objectIds - IDs of objects to duplicate
   * @param userId - Current user ID
   */
  constructor(objectIds: string[], userId: string) {
    super();
    this.objectIds = objectIds;
    this.userId = userId;
  }

  /**
   * Execute: Duplicate the objects
   */
  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    
    // Call the store's duplicateObjects method
    this.duplicatedIds = await store.duplicateObjects(this.objectIds, this.userId);
    
    this.executed = true;
  }

  /**
   * Undo: Delete the duplicated objects
   */
  async undo(): Promise<void> {
    if (!this.executed || this.duplicatedIds.length === 0) {
      return;
    }

    const store = usePaperboxStore.getState();
    
    // Delete the duplicated objects
    await store.deleteObjects(this.duplicatedIds);
  }

  /**
   * Redo: Re-duplicate the objects
   */
  async redo(): Promise<void> {
    // Re-execute the duplication
    return this.execute();
  }

  /**
   * Get human-readable description
   */
  getDescription(): string {
    const count = this.objectIds.length;
    return count === 1 ? 'Duplicate Object' : `Duplicate ${count} Objects`;
  }

  /**
   * Get metadata for AI integration
   */
  getMetadata(): CommandMetadata {
    return {
      type: 'DUPLICATE_OBJECTS',
      objectIds: this.objectIds,
      parameters: {
        userId: this.userId,
        duplicatedIds: this.duplicatedIds,
      },
      timestamp: Date.now(),
    };
  }
}

