/**
 * CanvasLayout - Figma-style 3-column layout
 * Left Sidebar: Pages + Layers
 * Center: Canvas area
 * Right Sidebar: Properties panel
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasLayoutProps {
  leftSidebar: ReactNode;
  rightSidebar: ReactNode;
  children: ReactNode;
}

export function CanvasLayout({ leftSidebar, rightSidebar, children }: CanvasLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - Pages + Layers */}
      <aside
        className={cn(
          'bg-sidebar border-r border-border transition-all duration-200 ease-in-out flex-shrink-0 relative',
          leftOpen ? 'w-60' : 'w-0'
        )}
      >
        {leftOpen && (
          <div className="h-full overflow-hidden flex flex-col">
            {leftSidebar}
          </div>
        )}

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-3 -right-3 h-6 w-6 rounded-full border border-border bg-card shadow-sm z-10',
            'hover:bg-accent'
          )}
          onClick={() => setLeftOpen(!leftOpen)}
          aria-label={leftOpen ? 'Collapse left sidebar' : 'Expand left sidebar'}
        >
          {leftOpen ? (
            <PanelLeftClose className="h-3 w-3" />
          ) : (
            <PanelLeftOpen className="h-3 w-3" />
          )}
        </Button>
      </aside>

      {/* Center Canvas Area */}
      <main className="flex-1 relative overflow-hidden">
        {children}
      </main>

      {/* Right Sidebar - Properties */}
      <aside
        className={cn(
          'bg-card border-l border-border transition-all duration-200 ease-in-out flex-shrink-0 relative',
          rightOpen ? 'w-70' : 'w-0'
        )}
      >
        {rightOpen && (
          <div className="h-full overflow-hidden flex flex-col">
            {rightSidebar}
          </div>
        )}

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-3 -left-3 h-6 w-6 rounded-full border border-border bg-card shadow-sm z-10',
            'hover:bg-accent'
          )}
          onClick={() => setRightOpen(!rightOpen)}
          aria-label={rightOpen ? 'Collapse right sidebar' : 'Expand right sidebar'}
        >
          {rightOpen ? (
            <PanelRightClose className="h-3 w-3" />
          ) : (
            <PanelRightOpen className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </div>
  );
}

