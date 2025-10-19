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
  MoveCommand,
  ResizeCommand,
  RotateCommand,
  ChangeStyleCommand,
  AlignObjectsCommand,
  DistributeObjectsCommand,
  GridLayoutCommand,
  type CreateCircleParams,
  type CreateRectangleParams,
  type CreateTextParams,
  type MoveCommandParams,
  type ResizeCommandParams,
  type RotateCommandParams,
  type ChangeStyleCommandParams,
  type AlignObjectsCommandParams,
  type DistributeObjectsCommandParams,
  type GridLayoutCommandParams,
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
  
  // Track which tool calls have been executed (by index)
  const executedToolCallsRef = useRef<Set<number>>(new Set());

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset executed tracking when starting new command
  useEffect(() => {
    if (toolCalls.length === 0) {
      executedToolCallsRef.current.clear();
    }
  }, [toolCalls.length]);

  // Execute tool calls received from AI
  useEffect(() => {
    console.log('[AITextBox] 🎯 Tool calls updated, count:', toolCalls.length);
    if (toolCalls.length === 0) return;

    const executeToolCalls = async () => {
      const store = usePaperboxStore.getState();
      const userId = store.currentUserId;

      if (!userId) {
        console.error('[AITextBox] ❌ No user ID available');
        setExecutionStatus('error');
        return;
      }

      // Find new tool calls that haven't been executed yet
      const newToolCalls = toolCalls.filter((_, index) => !executedToolCallsRef.current.has(index));
      
      if (newToolCalls.length === 0) {
        console.log('[AITextBox] ⏭️  All tool calls already executed, skipping');
        return;
      }

      console.log('[AITextBox] 🚀 Executing', newToolCalls.length, 'new tool calls (out of', toolCalls.length, 'total)');
      setExecutionStatus('executing');

      try {
        for (let i = 0; i < toolCalls.length; i++) {
          // Skip already executed
          if (executedToolCallsRef.current.has(i)) {
            continue;
          }

          const toolCall = toolCalls[i];
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
            case 'moveObject':
              command = new MoveCommand(toolCall.parameters as MoveCommandParams);
              break;
            case 'resizeObject':
              command = new ResizeCommand(toolCall.parameters as ResizeCommandParams);
              break;
            case 'rotateObject':
              command = new RotateCommand(toolCall.parameters as RotateCommandParams);
              break;
            case 'changeStyle':
              command = new ChangeStyleCommand(toolCall.parameters as ChangeStyleCommandParams);
              break;
            case 'alignObjects':
              command = new AlignObjectsCommand(toolCall.parameters as AlignObjectsCommandParams);
              break;
            case 'distributeObjects':
              command = new DistributeObjectsCommand(toolCall.parameters as DistributeObjectsCommandParams);
              break;
            case 'gridLayout':
              command = new GridLayoutCommand({...(toolCall.parameters as Omit<GridLayoutCommandParams, 'userId'>), userId});
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
            
            // Mark this tool call as executed
            executedToolCallsRef.current.add(i);
          } else {
            console.warn('[AITextBox] ⚠️ Command was null/undefined');
          }
        }

        console.log('[AITextBox] 🎉 All new tool calls executed successfully!');
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
