/**
 * PagesPanel - Shows list of canvases (pages) in left sidebar
 * Figma-style canvas/page management
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaperboxStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CanvasManagementModal } from '../canvas/CanvasManagementModal';
import type { Canvas } from '@/types/canvas';

export function PagesPanel() {
  const navigate = useNavigate();
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const canvases = usePaperboxStore((state) => state.canvases);
  const [isExpanded, setIsExpanded] = useState(true);
  const [settingsCanvas, setSettingsCanvas] = useState<Canvas | null>(null);

  const handleCanvasClick = (canvasId: string) => {
    navigate(`/canvas/${canvasId}`);
  };

  const handleBrowseAll = () => {
    navigate('/canvases');
  };

  const handleSettingsClick = (e: React.MouseEvent, canvas: Canvas) => {
    e.stopPropagation();
    setSettingsCanvas(canvas);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-xs font-semibold text-sidebar-foreground uppercase tracking-wide hover:text-sidebar-primary transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>Pages</span>
          </button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleBrowseAll}
              title="Browse all canvases"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleBrowseAll}
              title="New canvas"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pages List */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-2">
          {canvases.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="h-8 w-8 text-sidebar-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-sidebar-foreground/60">No pages yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {canvases.map((canvas) => {
                const isActive = canvas.id === activeCanvasId;

                return (
                  <div
                    key={canvas.id}
                    onClick={() => handleCanvasClick(canvas.id)}
                    className={cn(
                      'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-foreground'
                        : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80'
                    )}
                  >
                    <FileText className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{canvas.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleSettingsClick(e, canvas)}
                      title="Canvas settings"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Canvas Management Modal */}
      <CanvasManagementModal
        canvas={settingsCanvas}
        open={!!settingsCanvas}
        onOpenChange={(open) => !open && setSettingsCanvas(null)}
      />
    </div>
  );
}

