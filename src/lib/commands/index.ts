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

// Export everything
export * from './Command';
export * from './CreateCircleCommand';
export * from './CreateRectangleCommand';
export * from './CreateTextCommand';
export * from './MoveCommand';
export * from './ResizeCommand';
export * from './RotateCommand';
export * from './ChangeStyleCommand';

console.log('[Commands] Registered 7 commands (3 creation, 3 manipulation, 1 style)');

