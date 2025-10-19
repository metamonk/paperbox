/**
 * Debug Configuration
 * Central place to control debug logging across the application
 */

export const DEBUG_FLAGS = {
  // AI Integration (keep these enabled during AI development)
  AI_COMMAND: true,
  AI_TEXTBOX: true,
  
  // Core Systems (disable to reduce noise)
  FABRIC_CANVAS: false,
  CANVAS_SLICE: false,
  CANVAS_COMPONENT: false,
  SYNC_MANAGER: false,
  CANVAS_SYNC: false,
  
  // Other features
  PRESENCE: false,
  COLLABORATION: false,
  SHORTCUTS: false,
};

/**
 * Conditional logger helper
 * Usage: debugLog('AI_COMMAND', 'Message', data);
 */
export function debugLog(flag: keyof typeof DEBUG_FLAGS, ...args: any[]) {
  if (DEBUG_FLAGS[flag]) {
    console.log(...args);
  }
}

