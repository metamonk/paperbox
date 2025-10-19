import { BaseCommand, type CommandMetadata } from './Command';
import { usePaperboxStore } from '../../stores';
import type { CanvasObject } from '../../types/canvas';

export type DistributionDirection = 'horizontal' | 'vertical';

export interface DistributeObjectsCommandParams {
  objectIds: string[];
  direction: DistributionDirection;
  spacing?: number; // Optional fixed spacing, if not provided, distribute evenly
}

interface ObjectPosition {
  objectId: string;
  oldX: number;
  oldY: number;
  newX: number;
  newY: number;
}

export class DistributeObjectsCommand extends BaseCommand {
  private params: DistributeObjectsCommandParams;
  private positions: ObjectPosition[] = [];

  constructor(params: DistributeObjectsCommandParams) {
    super();
    this.params = params;
  }

  async execute(): Promise<void> {
    const store = usePaperboxStore.getState();
    const objects = this.params.objectIds
      .map((id) => store.getObjectById(id))
      .filter((obj): obj is CanvasObject => obj !== null);

    if (objects.length === 0) {
      throw new Error('Cannot distribute: no valid objects found');
    }

    if (objects.length < 3) {
      throw new Error('Cannot distribute: need at least 3 objects');
    }

    // Sort objects by position along the distribution axis
    const isHorizontal = this.params.direction === 'horizontal';
    const sortedObjects = [...objects].sort((a, b) => {
      return isHorizontal ? a.x - b.x : a.y - b.y;
    });

    this.positions = [];

    if (this.params.spacing !== undefined) {
      // Fixed spacing distribution
      const spacing = this.params.spacing;
      let currentPos = isHorizontal ? sortedObjects[0].x : sortedObjects[0].y;

      for (const obj of sortedObjects) {
        const oldX = obj.x;
        const oldY = obj.y;
        const newX = isHorizontal ? currentPos : oldX;
        const newY = isHorizontal ? oldY : currentPos;

        this.positions.push({ objectId: obj.id, oldX, oldY, newX, newY });
        await store.updateObject(obj.id, { x: newX, y: newY });

        // Move to next position
        const objSize = isHorizontal ? obj.width : obj.height;
        currentPos += objSize + spacing;
      }
    } else {
      // Even distribution between first and last object
      const firstObj = sortedObjects[0];
      const lastObj = sortedObjects[sortedObjects.length - 1];

      const startPos = isHorizontal ? firstObj.x : firstObj.y;
      const endPos = isHorizontal ? lastObj.x : lastObj.y;
      const totalDistance = endPos - startPos;

      // Calculate spacing between objects
      const spacing = totalDistance / (sortedObjects.length - 1);

      for (let i = 0; i < sortedObjects.length; i++) {
        const obj = sortedObjects[i];
        const oldX = obj.x;
        const oldY = obj.y;

        // Keep first and last objects in place
        if (i === 0 || i === sortedObjects.length - 1) {
          this.positions.push({ objectId: obj.id, oldX, oldY, newX: oldX, newY: oldY });
          continue;
        }

        const newPos = startPos + spacing * i;
        const newX = isHorizontal ? newPos : oldX;
        const newY = isHorizontal ? oldY : newPos;

        this.positions.push({ objectId: obj.id, oldX, oldY, newX, newY });
        await store.updateObject(obj.id, { x: newX, y: newY });
      }
    }

    this.executed = true;
    console.log(
      `[DistributeObjectsCommand] Distributed ${objects.length} objects ${this.params.direction}`
    );
  }

  async undo(): Promise<void> {
    if (this.positions.length === 0) {
      throw new Error('Cannot undo: distribute command was not executed');
    }

    const store = usePaperboxStore.getState();
    for (const pos of this.positions) {
      await store.updateObject(pos.objectId, { x: pos.oldX, y: pos.oldY });
    }

    this.executed = false;
    console.log(
      `[DistributeObjectsCommand] Undone distribute for ${this.positions.length} objects`
    );
  }

  getDescription(): string {
    return `Distribute ${this.params.objectIds.length} Objects (${this.params.direction})`;
  }

  getMetadata(): CommandMetadata {
    return {
      type: 'DISTRIBUTE_OBJECTS',
      objectIds: this.params.objectIds,
      parameters: this.params,
      timestamp: Date.now(),
    };
  }
}

