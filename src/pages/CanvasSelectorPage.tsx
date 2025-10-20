/**
 * Canvas Selector Page
 * Dashboard view for browsing and managing all canvases
 * W5.D5.3: Multi-Canvas UI - Canvas Selector Dashboard
 *
 * Features:
 * - Grid view of all accessible canvases
 * - Create new canvas button
 * - Canvas thumbnails (placeholder for future)
 * - Canvas metadata (name, last updated, owner)
 * - Click to navigate to canvas
 * - Canvas management (rename, delete via settings icon)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Settings, Loader2, Crown, Globe, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePaperboxStore } from '@/stores';
import type { Canvas } from '@/types/canvas';
import { Button } from '@/components/ui/button';
import { CanvasManagementModal } from '@/components/canvas/CanvasManagementModal';
import { Logo } from '@/components/ui/Logo';
import { IsometricBox } from '@/components/ui/IsometricBox';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

export function CanvasSelectorPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const canvases = usePaperboxStore((state) => state.canvases);
  const canvasesLoading = usePaperboxStore((state) => state.canvasesLoading);
  const createCanvas = usePaperboxStore((state) => state.createCanvas);

  // Handle create new canvas
  const handleCreateCanvas = async () => {
    if (!user) return;

    setIsCreating(true);
    try {
      const newCanvas = await createCanvas('Untitled Canvas', 'New design workspace');
      // Navigate to new canvas
      navigate(`/canvas/${newCanvas.id}`);
    } catch (error) {
      console.error('[CanvasSelectorPage] Failed to create canvas:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle canvas click (navigate to canvas)
  const handleCanvasClick = (canvasId: string) => {
    navigate(`/canvas/${canvasId}`);
  };

  // Handle canvas settings click
  const handleSettingsClick = (e: React.MouseEvent, canvas: Canvas) => {
    e.stopPropagation(); // Prevent canvas click navigation
    setSelectedCanvasId(canvas.id);
    setSettingsOpen(true);
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

  // Get canvas status badge
  const getCanvasBadge = (canvas: Canvas) => {
    const isOwner = user?.id === canvas.owner_id;
    
    if (isOwner) {
      return (
        <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/90 text-primary-foreground rounded-full text-xs font-medium shadow-sm">
          <Crown className="h-3 w-3" />
          <span>Owner</span>
        </div>
      );
    }
    
    if (canvas.is_public) {
      return (
        <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/90 text-white rounded-full text-xs font-medium shadow-sm">
          <Globe className="h-3 w-3" />
          <span>Public</span>
        </div>
      );
    }
    
    return (
      <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/90 text-muted-foreground rounded-full text-xs font-medium shadow-sm">
        <Users className="h-3 w-3" />
        <span>Shared</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo size={40} />
            <div>
              <h1 className="text-2xl font-semibold text-foreground leading-none">Workspace</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {canvases.length} {canvases.length === 1 ? 'canvas' : 'canvases'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleCreateCanvas} disabled={isCreating} className="gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  New Canvas
                </>
              )}
            </Button>
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Canvas Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {canvasesLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : canvases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <IsometricBox size={64} className="mb-4 opacity-40" />
            <h2 className="text-xl font-medium text-foreground mb-2">No canvases yet</h2>
            <p className="text-muted-foreground mb-6">Create your first canvas to get started</p>
            <Button onClick={handleCreateCanvas} disabled={isCreating} className="gap-2">
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Your First Canvas
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                onClick={() => handleCanvasClick(canvas.id)}
                className="group bg-card rounded-lg border border-border overflow-hidden hover:border-primary hover:shadow-lg transition-all cursor-pointer"
              >
                {/* Canvas Thumbnail Placeholder */}
                <div className="aspect-video bg-muted flex items-center justify-center relative">
                  <IsometricBox size={48} className="opacity-40 group-hover:opacity-100 transition-opacity" />

                  {/* Canvas Status Badge */}
                  {getCanvasBadge(canvas)}

                  {/* Settings Button */}
                  <button
                    onClick={(e) => handleSettingsClick(e, canvas)}
                    className="absolute top-2 right-2 p-2 bg-card/80 hover:bg-card rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-border cursor-pointer"
                    title="Canvas settings"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Canvas Metadata */}
                <div className="p-4">
                  <h3 className="font-medium text-foreground truncate mb-1">
                    {canvas.name}
                  </h3>
                  {canvas.description && (
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {canvas.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground/70">
                    Updated {formatDate(canvas.updated_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Canvas Management Modal */}
      <CanvasManagementModal
        canvasId={selectedCanvasId}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
