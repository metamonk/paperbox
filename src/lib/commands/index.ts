/**
 * Commands Module
 * Exports all command classes and registers them in the registry
 */

import { registerCommand } from './Command';
import { CreateCircleCommand } from './CreateCircleCommand';
import { CreateRectangleCommand } from './CreateRectangleCommand';
import { CreateTextCommand } from './CreateTextCommand';
import { MoveCommand } from './MoveCommand';
import { ResizeCommand } from './ResizeCommand';
import { RotateCommand } from './RotateCommand';
import { ChangeStyleCommand } from './ChangeStyleCommand';
import { AlignObjectsCommand } from './AlignObjectsCommand';
import { DistributeObjectsCommand } from './DistributeObjectsCommand';
import { CompositeCommand } from './CompositeCommand';
import { GridLayoutCommand } from './GridLayoutCommand';
// @ts-expect-error - Import is used for export
import { BatchTransformCommand } from './BatchTransformCommand';

// Register creation commands
registerCommand('CREATE_CIRCLE', CreateCircleCommand);
registerCommand('CREATE_RECTANGLE', CreateRectangleCommand);
registerCommand('CREATE_TEXT', CreateTextCommand);

// Register manipulation commands
registerCommand('MOVE_OBJECT', MoveCommand);
registerCommand('RESIZE_OBJECT', ResizeCommand);
registerCommand('ROTATE_OBJECT', RotateCommand);

// Register style commands
registerCommand('CHANGE_FILL', ChangeStyleCommand);

// Register layout commands
registerCommand('ALIGN_OBJECTS', AlignObjectsCommand);
registerCommand('DISTRIBUTE_OBJECTS', DistributeObjectsCommand);

// Register complex commands
registerCommand('COMPOSITE', CompositeCommand);
registerCommand('GRID_LAYOUT', GridLayoutCommand);

// Export everything
export * from './Command';
export * from './CreateCircleCommand';
export * from './CreateRectangleCommand';
export * from './CreateTextCommand';
export * from './MoveCommand';
export * from './ResizeCommand';
export * from './RotateCommand';
export * from './ChangeStyleCommand';
export * from './AlignObjectsCommand';
export * from './DistributeObjectsCommand';
export * from './CompositeCommand';
export * from './GridLayoutCommand';
export * from './BatchTransformCommand';

// console.log('[Commands] Registered 11 commands (3 creation, 3 manipulation, 1 style, 2 layout, 2 complex)');

