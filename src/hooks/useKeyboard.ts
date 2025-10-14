/**
 * Keyboard shortcuts hook
 * Provides keyboard shortcut functionality for canvas operations
 */

import { useEffect } from 'react';

/**
 * Hook to handle keyboard shortcuts
 * @param handlers - Object mapping keys to handler functions
 * 
 * @example
 * useKeyboard({
 *   'r': () => addShape('rectangle'),
 *   'c': () => addShape('circle'),
 *   't': () => addShape('text'),
 * });
 */
export function useKeyboard(handlers: Record<string, () => void>) {
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
        handlers[key]();
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

