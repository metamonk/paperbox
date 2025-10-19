/**
 * AI Integration Types
 * Type definitions for AI-powered canvas operations
 */

import type { CanvasObject } from './canvas';

/**
 * Canvas context provided to AI for understanding the current state
 */
export interface CanvasContext {
  canvasId: string;
  userId: string;
  viewport: {
    zoom: number;
    panX: number;
    panY: number;
    centerX: number; // Calculated center point in canvas coordinates
    centerY: number;
    width: number; // Viewport width
    height: number; // Viewport height
  };
  selectedObjects: CanvasObject[];
  allObjects: CanvasObject[];
}

/**
 * AI command request sent to Edge Function
 */
export interface AICommandRequest {
  prompt: string;
  context: CanvasContext;
}

/**
 * AI command response from Edge Function
 */
export interface AICommandResponse {
  success: boolean;
  message?: string;
  toolCalls?: ToolCall[];
  error?: string;
}

/**
 * Tool call from AI
 */
export interface ToolCall {
  toolName: string;
  parameters: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  message?: string;
  objectId?: string;
  error?: string;
}

/**
 * Streaming AI response chunk
 */
export interface AIStreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'done';
  content?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  error?: string;
}

