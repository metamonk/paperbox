/**
 * useAICommand Hook
 * Handles AI command execution with streaming responses
 */

import { useState, useCallback } from 'react';
import { getCanvasContext } from '../lib/ai/CanvasContextProvider';
import type { AICommandRequest } from '../types/ai';
import { supabase } from '../lib/supabase';

export interface AIStreamResponse {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'done';
  content?: string;
  toolCall?: {
    toolName: string;
    parameters: Record<string, any>;
  };
  toolResult?: {
    success: boolean;
    message?: string;
    objectId?: string;
  };
  error?: string;
}

export interface UseAICommandReturn {
  execute: (prompt: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  streamingText: string;
  toolCalls: Array<{ toolName: string; parameters: Record<string, any> }>;
  isStreaming: boolean;
}

/**
 * Hook for executing AI commands with streaming responses
 * 
 * Usage:
 * ```tsx
 * const { execute, isLoading, streamingText } = useAICommand();
 * 
 * const handleSubmit = async () => {
 *   await execute("Create a red circle at the center");
 * };
 * ```
 */
export function useAICommand(): UseAICommandReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [toolCalls, setToolCalls] = useState<Array<{ toolName: string; parameters: Record<string, any> }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const execute = useCallback(async (prompt: string) => {
    console.log('[useAICommand] 🚀 Starting AI command execution:', prompt);
    setIsLoading(true);
    setError(null);
    setStreamingText('');
    setToolCalls([]);
    setIsStreaming(true);

    try {
      // Get canvas context
      console.log('[useAICommand] 📊 Getting canvas context...');
      const context = getCanvasContext();
      if (!context) {
        throw new Error('Cannot execute AI command: missing canvas context');
      }
      console.log('[useAICommand] ✅ Canvas context:', {
        canvasId: context.canvasId,
        userId: context.userId,
        objectCount: context.allObjects.length,
        selectedCount: context.selectedObjects.length,
        viewportCenter: { x: context.viewport.centerX, y: context.viewport.centerY }
      });

      // Get Supabase auth session for Edge Function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Get Edge Function URL
      const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured. Make sure VITE_PUBLIC_SUPABASE_URL is set in .env.local');
      }

      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-command`;
      console.log('[useAICommand] 🌐 Edge Function URL:', edgeFunctionUrl);

      // Prepare request
      const request: AICommandRequest = {
        prompt,
        context,
      };

      console.log('[useAICommand] 📤 Sending request to Edge Function...');

      // Call Edge Function with streaming
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(request),
      });

      console.log('[useAICommand] 📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useAICommand] ❌ Error response:', errorText);
        throw new Error(`AI command failed: ${errorText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      console.log('[useAICommand] 📖 Starting to read stream...');

      let buffer = '';
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[useAICommand] ✅ Stream complete. Total chunks:', chunkCount);
          break;
        }
        
        chunkCount++;

        // Decode chunk
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim() || line.startsWith(':')) {
            // Skip empty lines and SSE comments
            continue;
          }

          // Parse SSE data
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              continue;
            }

            try {
              const chunk: AIStreamResponse = JSON.parse(data);
              console.log('[useAICommand] 📦 Received chunk:', chunk.type, chunk);

              // Handle different chunk types
              switch (chunk.type) {
                case 'text':
                  if (chunk.content) {
                    console.log('[useAICommand] 💬 Text chunk:', chunk.content);
                    setStreamingText((prev) => prev + chunk.content);
                  }
                  break;

                case 'tool-call':
                  if (chunk.toolCall) {
                    console.log('[useAICommand] 🔧 Tool call received:', chunk.toolCall);
                    setToolCalls((prev) => [...prev, chunk.toolCall!]);
                  }
                  break;

                case 'tool-result':
                  console.log('[useAICommand] ✅ Tool result:', chunk.toolResult);
                  break;

                case 'error':
                  console.error('[useAICommand] ❌ Error chunk:', chunk.error);
                  setError(chunk.error || 'Unknown error');
                  break;

                case 'done':
                  console.log('[useAICommand] 🏁 Stream done signal received');
                  break;
              }
            } catch (parseError) {
              console.warn('[useAICommand] ⚠️ Failed to parse chunk:', data, parseError);
            }
          }
        }
      }

      setIsStreaming(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useAICommand] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    execute,
    isLoading,
    error,
    streamingText,
    toolCalls,
    isStreaming,
  };
}

