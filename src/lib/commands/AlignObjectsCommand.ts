import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { CanvasObject } from '../../types/canvas';

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export interface AlignObjectsCommandParams {
  objectIds: string[];
  alignment: AlignmentType;
}

interface ObjectPosition {
  objectId: string;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}

export class AlignObjectsCommand extends BaseCommand {
  private params: AlignObjectsCommandParams;
  private positions: ObjectPosition[] = [];

  constructor(params: AlignObjectsCommandParams) {
    super();
    this.params = params;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    const objects = this.params.objectIds
      .map((id) => store.getObjectById(id))
      .filter((obj): obj is CanvasObject => obj !== null);

    if (objects.length === 0) {
      throw new Error('Cannot align: no valid objects found');
    }

    if (objects.length === 1) {
      throw new Error('Cannot align: need at least 2 objects');
    }

    // Calculate alignment anchor based on all objects
    let alignmentValue: number;

    switch (this.params.alignment) {
      case 'left': {
        // Align to leftmost edge
        alignmentValue = Math.min(...objects.map((obj) => obj.x - obj.width / 2));
        break;
      }
      case 'center': {
        // Align to horizontal center
        const leftmost = Math.min(...objects.map((obj) => obj.x - obj.width / 2));
        const rightmost = Math.max(...objects.map((obj) => obj.x + obj.width / 2));
        alignmentValue = (leftmost + rightmost) / 2;
        break;
      }
      case 'right': {
        // Align to rightmost edge
        alignmentValue = Math.max(...objects.map((obj) => obj.x + obj.width / 2));
        break;
      }
      case 'top': {
        // Align to topmost edge
        alignmentValue = Math.min(...objects.map((obj) => obj.y - obj.height / 2));
        break;
      }
      case 'middle': {
        // Align to vertical middle
        const topmost = Math.min(...objects.map((obj) => obj.y - obj.height / 2));
        const bottommost = Math.max(...objects.map((obj) => obj.y + obj.height / 2));
        alignmentValue = (topmost + bottommost) / 2;
        break;
      }
      case 'bottom': {
        // Align to bottommost edge
        alignmentValue = Math.max(...objects.map((obj) => obj.y + obj.height / 2));
        break;
      }
      default:
        throw new Error(`Invalid alignment type: ${this.params.alignment}`);
    }

    // Calculate new positions
    this.positions = [];
    const isHorizontal = ['left', 'center', 'right'].includes(this.params.alignment);

    for (const obj of objects) {
      const oldX = obj.x;
      const oldY = obj.y;
      let newX = oldX;
      let newY = oldY;

      if (isHorizontal) {
        // Adjust X position based on alignment
        if (this.params.alignment === 'left') {
          newX = alignmentValue + obj.width / 2;
        } else if (this.params.alignment === 'center') {
          newX = alignmentValue;
        } else if (this.params.alignment === 'right') {
          newX = alignmentValue - obj.width / 2;
        }
      } else {
        // Adjust Y position based on alignment
        if (this.params.alignment === 'top') {
          newY = alignmentValue + obj.height / 2;
        } else if (this.params.alignment === 'middle') {
          newY = alignmentValue;
        } else if (this.params.alignment === 'bottom') {
          newY = alignmentValue - obj.height / 2;
        }
      }

      this.positions.push({ objectId: obj.id, oldX, oldY, newX, newY });
      await store.updateObject(obj.id, { x: newX, y: newY });
    }

    this.executed = true;
    console.log(
      `[AlignObjectsCommand] Aligned ${objects.length} objects to ${this.params.alignment}`
    );
  }

  async undo(): Promise<void> {
    if (this.positions.length === 0) {
      throw new Error('Cannot undo: align command was not executed');
    }

    const store = usePaperboxStore.getState();
    for (const pos of this.positions) {
      await store.updateObject(pos.objectId, { x: pos.oldX, y: pos.oldY });
    }

    this.executed = false;
    console.log(
      `[AlignObjectsCommand] Undone align for ${this.positions.length} objects`
    );
  }

  getDescription(): string {
    return `Align ${this.params.objectIds.length} Objects (${this.params.alignment})`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'ALIGN_OBJECTS',
      objectIds: this.params.objectIds,
      parameters: this.params,
      timestamp: Date.now(),
    };
  }
}

