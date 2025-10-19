/**
 * Commands Module
 * Exports all command classes and registers them in the registry
 */

import { registerCommand } from './Command';
import { CreateCircleCommand } from './CreateCircleCommand';
import { CreateRectangleCommand } from './CreateRectangleCommand';
import { CreateTextCommand } from './CreateTextCommand';

// Register creation commands
registerCommand('CREATE_CIRCLE', CreateCircleCommand);
registerCommand('CREATE_RECTANGLE', CreateRectangleCommand);
registerCommand('CREATE_TEXT', CreateTextCommand);

// Export everything
export * from './Command';
export * from './CreateCircleCommand';
export * from './CreateRectangleCommand';
export * from './CreateTextCommand';

console.log('[Commands] Registered 3 creation commands');

