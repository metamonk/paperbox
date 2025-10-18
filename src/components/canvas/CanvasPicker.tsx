/**
 * CanvasPicker - Figma-style canvas selector with command palette
 * W5.D3: Multi-Canvas Architecture UI Components
 *
 * Features:
 * - ⌘K/Ctrl+K keyboard shortcut to open
 * - Search/filter canvases
 * - Create new canvas
 * - Switch between canvases
 * - Display canvas metadata (name, date, owner)
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePaperboxStore } from '@/stores';
import type { Canvas } from '@/types/canvas';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CanvasPickerProps {
  className?: string;
}

export function CanvasPicker({ className }: CanvasPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);

  const { user } = useAuth();
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const canvases = usePaperboxStore((state) => state.canvases);
  const canvasesLoading = usePaperboxStore((state) => state.canvasesLoading);
  const setActiveCanvas = usePaperboxStore((state) => state.setActiveCanvas);
  const createCanvas = usePaperboxStore((state) => state.createCanvas);

  // Get active canvas for display
  const activeCanvas = canvases.find((c: Canvas) => c.id === activeCanvasId);

  // Keyboard shortcut: ⌘K or Ctrl+K to open command palette
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Handle canvas selection
  const handleSelectCanvas = async (canvasId: string) => {
    if (canvasId === activeCanvasId) {
      setOpen(false);
      setCommandOpen(false);
      return;
    }

    try {
      await setActiveCanvas(canvasId);
      setOpen(false);
      setCommandOpen(false);
    } catch (error) {
      console.error('[CanvasPicker] Failed to switch canvas:', error);
    }
  };

  // Handle create new canvas
  const handleCreateCanvas = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      const newCanvas = await createCanvas('Untitled Canvas', 'New design workspace');
      await setActiveCanvas(newCanvas.id);
      setOpen(false);
      setCommandOpen(false);
    } catch (error) {
      console.error('[CanvasPicker] Failed to create canvas:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Render canvas item
  const renderCanvasItem = (canvas: Canvas, isActive: boolean) => (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <Check
          className={cn(
            'h-4 w-4',
            isActive ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div className="flex flex-col">
          <span className="text-sm font-medium">{canvas.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(canvas.created_at)}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Popover Trigger (Dropdown) */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn('w-[240px] justify-between', className)}
            disabled={canvasesLoading}
          >
            {canvasesLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading canvases...
              </>
            ) : activeCanvas ? (
              <span className="truncate">{activeCanvas.name}</span>
            ) : (
              'Select canvas...'
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search canvases..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>No canvas found.</CommandEmpty>
              <CommandGroup heading="Your Canvases">
                {canvases.map((canvas) => (
                  <CommandItem
                    key={canvas.id}
                    value={canvas.name}
                    onSelect={() => handleSelectCanvas(canvas.id)}
                  >
                    {renderCanvasItem(canvas, canvas.id === activeCanvasId)}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={handleCreateCanvas} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Canvas
                    </>
                  )}
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Command Dialog (⌘K / Ctrl+K) */}
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search canvases or type a command..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Canvases">
            {canvases.map((canvas) => (
              <CommandItem
                key={canvas.id}
                value={canvas.name}
                onSelect={() => handleSelectCanvas(canvas.id)}
              >
                {renderCanvasItem(canvas, canvas.id === activeCanvasId)}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={handleCreateCanvas} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating canvas...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Canvas
                </>
              )}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
