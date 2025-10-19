/**
 * AITextBox - Scira-style AI input interface
 * Bottom-centered floating text box for AI commands
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAICommand } from '@/hooks/useAICommand';
import { usePaperboxStore } from '@/stores';
import {
  CreateCircleCommand,
  CreateRectangleCommand,
  CreateTextCommand,
  type CreateCircleParams,
  type CreateRectangleParams,
  type CreateTextParams,
} from '@/lib/commands';
import { Button } from '@/components/ui/button';

interface AITextBoxProps {
  onClose?: () => void;
}

export function AITextBox({ onClose }: AITextBoxProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { execute, isLoading, error, streamingText, toolCalls, isStreaming } = useAICommand();
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'executing' | 'success' | 'error'>('idle');

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Execute tool calls received from AI
  useEffect(() => {
    console.log('[AITextBox] 🎯 Tool calls updated, count:', toolCalls.length);
    if (toolCalls.length === 0) return;

    const executeToolCalls = async () => {
      console.log('[AITextBox] 🚀 Starting tool call execution for', toolCalls.length, 'calls');
      setExecutionStatus('executing');
      const store = usePaperboxStore.getState();
      const userId = store.currentUserId;

      if (!userId) {
        console.error('[AITextBox] ❌ No user ID available');
        setExecutionStatus('error');
        return;
      }

      console.log('[AITextBox] ✅ User ID:', userId);

      try {
        for (const toolCall of toolCalls) {
          console.log('[AITextBox] 🔨 Executing tool call:', toolCall.toolName, toolCall.parameters);

          let command;
          switch (toolCall.toolName) {
            case 'createCircle':
              command = new CreateCircleCommand(toolCall.parameters as CreateCircleParams, userId);
              break;
            case 'createRectangle':
              command = new CreateRectangleCommand(toolCall.parameters as CreateRectangleParams, userId);
              break;
            case 'createText':
              command = new CreateTextCommand(toolCall.parameters as CreateTextParams, userId);
              break;
            default:
              console.warn('[AITextBox] Unknown tool:', toolCall.toolName);
              continue;
          }

          if (command) {
            // Execute command through history for undo/redo support
            console.log('[AITextBox] 📝 Executing command via history store...');
            store.executeCommand(command);
            console.log('[AITextBox] ✅ Command executed successfully');
          } else {
            console.warn('[AITextBox] ⚠️ Command was null/undefined');
          }
        }

        console.log('[AITextBox] 🎉 All tool calls executed successfully!');
        setExecutionStatus('success');

        // Auto-clear after success
        setTimeout(() => {
          setInput('');
          setExecutionStatus('idle');
        }, 2000);
      } catch (err) {
        console.error('[AITextBox] ❌ Failed to execute tool calls:', err);
        setExecutionStatus('error');
      }
    };

    executeToolCalls();
  }, [toolCalls]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;

    console.log('[AITextBox] Submitting prompt:', input);
    setExecutionStatus('idle');

    try {
      await execute(input.trim());
    } catch (err) {
      console.error('[AITextBox] Error executing command:', err);
      setExecutionStatus('error');
    }
  }, [input, isLoading, execute]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose?.();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Show status icon
  const StatusIcon = () => {
    if (isLoading || isStreaming) {
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    }
    if (executionStatus === 'executing') {
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    }
    if (executionStatus === 'success') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (error || executionStatus === 'error') {
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
    return <Sparkles className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[600px]">
      {/* Streaming response popover */}
      {(streamingText || error) && (
        <div className="mb-3 bg-card border border-border rounded-xl px-4 py-3 shadow-lg max-h-[400px] overflow-y-auto">
          {error ? (
            <div className="text-sm text-red-500">
              <p className="font-medium mb-1">Error</p>
              <p>{error}</p>
            </div>
          ) : (
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {streamingText}
            </div>
          )}
        </div>
      )}

      {/* Input box */}
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm">
          <StatusIcon />
          
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI to create, modify, or arrange..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            disabled={isLoading || isStreaming}
          />

          {input.trim() && !isLoading && (
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              className="h-6 px-2"
            >
              Submit
            </Button>
          )}

          <kbd className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded">
            {isLoading ? '...' : '⏎'}
          </kbd>
        </div>
      </form>

      {/* Helper text */}
      <div className="mt-2 text-center text-xs text-muted-foreground">
        Press <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to close • <kbd className="px-1 py-0.5 bg-muted rounded">Enter</kbd> to submit
      </div>
    </div>
  );
}
