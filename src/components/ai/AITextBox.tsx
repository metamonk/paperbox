/**
 * AITextBox - Scira-inspired AI text input interface
 * Appears as an overlay above the bottom toolbar when activated
 */

import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AITextBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AITextBox({ isOpen, onClose }: AITextBoxProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    if (!input.trim() || isLoading) return;
    
    // TODO: Implement AI command execution (Phase III)
    console.log('[AITextBox] Submit:', input);
    setIsLoading(true);
    
    // Placeholder - will be replaced with actual AI integration
    setTimeout(() => {
      setIsLoading(false);
      setInput('');
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    // Overlay above toolbar with slide-up and fade-in animation
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[600px] animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-2xl backdrop-blur-sm">
        {/* Input Area */}
        <div className="flex items-center gap-2 px-4 py-3">
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0" />
          <input
            type="text"
            placeholder="Ask AI to create, modify, or arrange..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
              if (e.key === 'Escape') {
                onClose();
              }
            }}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <Button
            size="icon"
            className="h-8 w-8"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Response Area (when AI is generating) */}
        {isLoading && (
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm text-muted-foreground">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

