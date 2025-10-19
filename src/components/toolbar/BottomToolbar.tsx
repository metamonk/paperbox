/**
 * BottomToolbar - Figma-style centered toolbar at the bottom of canvas
 * Provides quick access to primary tools
 */

import type { ShapeType } from '../../types/canvas';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MousePointer2, Square, Circle as CircleIcon, Type } from 'lucide-react';
import { usePaperboxStore } from '@/stores';

interface BottomToolbarProps {
  onAddShape: (type: ShapeType) => void;
  activeTool?: 'select' | ShapeType;
}

export function BottomToolbar({ onAddShape, activeTool = 'select' }: BottomToolbarProps) {
  const isPlacementMode = usePaperboxStore((state) => state.isPlacementMode);

  // Tool button config
  const tools = [
    {
      id: 'select',
      label: 'Select',
      icon: MousePointer2,
      shortcut: 'V',
      onClick: () => {
        // Exit placement mode to return to select tool
        if (isPlacementMode) {
          usePaperboxStore.setState({ isPlacementMode: false, placementConfig: null });
        }
      },
    },
    {
      id: 'rectangle',
      label: 'Rectangle',
      icon: Square,
      shortcut: 'R',
      onClick: () => onAddShape('rectangle'),
    },
    {
      id: 'circle',
      label: 'Circle',
      icon: CircleIcon,
      shortcut: 'C',
      onClick: () => onAddShape('circle'),
    },
    {
      id: 'text',
      label: 'Text',
      icon: Type,
      shortcut: 'T',
      onClick: () => onAddShape('text'),
    },
  ] as const;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-2 py-2 shadow-xl backdrop-blur-sm">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id || (isPlacementMode && activeTool === tool.id);

            return (
              <Tooltip key={tool.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size="icon"
                    className="h-10 w-10 transition-colors"
                    onClick={tool.onClick}
                    aria-label={tool.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex items-center gap-2">
                  <span>{tool.label}</span>
                  <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">{tool.shortcut}</kbd>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

