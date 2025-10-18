/**
 * Keyboard shortcuts hook
 * Provides keyboard shortcut functionality for canvas operations
 *
 * W4.D4: Updated to support handlers that need access to KeyboardEvent for modifier keys
 */

import { useEffect } from 'react';

/**
 * Hook to handle keyboard shortcuts
 * @param handlers - Object mapping keys to handler functions
 * Handler functions can optionally receive KeyboardEvent to check modifier keys
 *
 * @example
 * useKeyboard({
 *   'r': () => addShape('rectangle'),
 *   'c': () => addShape('circle'),
 *   't': () => addShape('text'),
 *   ']': (e) => { if (e.ctrlKey) moveToFront(); },
 * });
 */
export function useKeyboard(handlers: Record<string, (e?: KeyboardEvent) => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Get the lowercase key
      const key = e.key.toLowerCase();

      // Check if we have a handler for this key
      if (handlers[key]) {
        e.preventDefault();
        handlers[key](e);
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
}

