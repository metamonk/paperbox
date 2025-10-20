/**
 * Shortcuts Module
 * Centralized keyboard shortcuts management
 *
 * All keyboard shortcuts are organized into dedicated classes:
 * - EditingShortcuts: Delete, duplicate, undo, redo
 * - NavigationShortcuts: Viewport navigation and zoom
 * - ShapeCreationShortcuts: Create shapes (R, C, T)
 * - SelectionShortcuts: Select all
 * - LayeringShortcuts: Z-index operations
 * - UIShortcuts: UI interactions (toggle AI, etc.)
 */

export { EditingShortcuts } from './EditingShortcuts';
export type { EditingShortcutsConfig } from './EditingShortcuts';

export { NavigationShortcuts } from './NavigationShortcuts';
export type { NavigationShortcutsConfig } from './NavigationShortcuts';

export { ShapeCreationShortcuts } from './ShapeCreationShortcuts';
export type { ShapeCreationShortcutsConfig } from './ShapeCreationShortcuts';

export { SelectionShortcuts } from './SelectionShortcuts';

export { LayeringShortcuts } from './LayeringShortcuts';

export { UIShortcuts } from './UIShortcuts';
export type { UIShortcutsConfig } from './UIShortcuts';

