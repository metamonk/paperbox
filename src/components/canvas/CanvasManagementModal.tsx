/**
 * CanvasManagementModal - Canvas CRUD operations dialog
 * W5.D3: Multi-Canvas Architecture UI Components
 *
 * Features:
 * - Rename canvas
 * - Update canvas description
 * - Delete canvas (with confirmation)
 * - Form validation
 * - Optimistic updates
 */

import * as React from 'react';
import { Trash2, Loader2, Globe, Lock, Copy, Check, Users, Crown } from 'lucide-react';
import { usePaperboxStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import type { Canvas } from '@/types/canvas';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// import { CanvasShareSection } from './CanvasShareSection'; // TODO: Re-enable when sharing is implemented

interface CanvasManagementModalProps {
  canvasId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CanvasManagementModal({
  canvasId,
  open,
  onOpenChange,
}: CanvasManagementModalProps) {
  // Subscribe to canvases array
  const canvases = usePaperboxStore((state) => state.canvases);
  
  // Memoize canvas data extraction to prevent infinite loops
  // Only recomputes when canvasId or canvases array reference changes
  const canvasData = React.useMemo(() => {
    const canvas = canvases.find((c) => c.id === canvasId);
    if (!canvas) return null;
    return {
      id: canvas.id,
      name: canvas.name,
      description: canvas.description,
      is_public: canvas.is_public,
      owner_id: canvas.owner_id,
      created_at: canvas.created_at,
      updated_at: canvas.updated_at,
    };
  }, [canvasId, canvases]);
  
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);

  const updateCanvas = usePaperboxStore((state) => state.updateCanvas);
  const deleteCanvas = usePaperboxStore((state) => state.deleteCanvas);
  const toggleCanvasPublic = usePaperboxStore((state) => state.toggleCanvasPublic);
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const setActiveCanvas = usePaperboxStore((state) => state.setActiveCanvas);

  // Fetch user ID on mount
  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Initialize form when canvas changes
  React.useEffect(() => {
    if (canvasData) {
      setName(canvasData.name);
      setDescription(canvasData.description || '');
      setShowDeleteConfirm(false);
    }
  }, [canvasData?.id, canvasData?.name, canvasData?.description]);

  // Reset form on close
  React.useEffect(() => {
    if (!open) {
      setIsSaving(false);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [open]);

  // Handle save (update canvas)
  const handleSave = async () => {
    if (!canvasData || !name.trim()) return;

    setIsSaving(true);
    try {
      await updateCanvas(canvasData.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('[CanvasManagementModal] Failed to update canvas:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!canvasData) return;

    setIsDeleting(true);
    try {
      // If deleting active canvas, switch to another canvas first
      if (canvasData.id === activeCanvasId) {
        const otherCanvas = canvases.find((c: Canvas) => c.id !== canvasData.id);
        if (otherCanvas) {
          await setActiveCanvas(otherCanvas.id);
        }
      }

      await deleteCanvas(canvasData.id);
      onOpenChange(false);
    } catch (error) {
      console.error('[CanvasManagementModal] Failed to delete canvas:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
  };

  // Handle toggle public
  const handleTogglePublic = async (pressed: boolean) => {
    if (!canvasData) return;
    try {
      await toggleCanvasPublic(canvasData.id, pressed);
    } catch (error) {
      console.error('[CanvasManagementModal] Failed to toggle public:', error);
    }
  };

  // Handle copy link
  const handleCopyLink = () => {
    if (!canvasData) return;
    const url = `${window.location.origin}/canvas/${canvasData.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Check if current user is owner
  const isOwner = userId && canvasData?.owner_id === userId;
  const isPublic = canvasData?.is_public || false;

  if (!canvasData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Canvas Settings</DialogTitle>
            <DialogDescription>
              Update canvas name and description, or delete this canvas.
            </DialogDescription>
          </DialogHeader>

          {/* Ownership Indicator Badge */}
          <div className="flex items-center gap-2 mt-4 mb-2">
            {isOwner ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                <Crown className="h-3 w-3" />
                <span>Owner</span>
              </div>
            ) : canvasData.is_public ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                <Globe className="h-3 w-3" />
                <span>Public Canvas</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                <Users className="h-3 w-3" />
                <span>Shared with you</span>
              </div>
            )}
          </div>

          <div className="grid gap-4 py-4">
            {/* Canvas Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Canvas Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Design Canvas"
                required
                maxLength={255}
                disabled={isSaving || isDeleting}
              />
            </div>

            {/* Canvas Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your canvas workspace..."
                disabled={isSaving || isDeleting}
              />
            </div>

            {/* Canvas Metadata */}
            <div className="grid gap-1 text-sm text-muted-foreground">
              <p>
                Created: {new Date(canvasData.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p>
                Last updated: {new Date(canvasData.updated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Canvas Sharing Info - Show for non-owners */}
            {!isOwner && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sharing
                </h3>

                <div className="space-y-3">
                  {canvasData.is_public ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">Public Canvas</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Anyone with the link can view and edit this canvas.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Shared Canvas</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This canvas has been shared with you by the owner.
                      </p>
                    </>
                  )}
                  
                  <div className="pt-3 border-t text-xs text-muted-foreground">
                    <p>Only the canvas owner can manage sharing settings.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Canvas Sharing (Phase 1 + Phase 2) - Only show for owners */}
            {isOwner && (
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sharing
                </h3>

                {/* Phase 1: Public Toggle */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {isPublic ? (
                        <Globe className="h-4 w-4 text-green-600 dark:text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">
                        {isPublic ? 'Public Canvas' : 'Private Canvas'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isPublic
                        ? 'Anyone with the link can view and edit this canvas'
                        : 'Only you and invited collaborators can access this canvas'}
                    </p>
                  </div>

                  <Toggle
                    pressed={isPublic}
                    onPressedChange={handleTogglePublic}
                    aria-label="Toggle public access"
                    disabled={isSaving || isDeleting}
                  >
                    {isPublic ? 'Public' : 'Private'}
                  </Toggle>
                </div>

                {/* Copy Link (only if public) */}
                {isPublic && (
                  <div className="flex gap-2 pt-3">
                    <Input
                      readOnly
                      value={`${window.location.origin}/canvas/${canvasData.id}`}
                      className="flex-1 font-mono text-sm"
                    />
                    <Button variant="outline" onClick={handleCopyLink}>
                      {copiedLink ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Phase 2: Granular Permissions - TODO: Implement store functions */}
                {/* {!isPublic && (
                  <div className="border-t pt-4">
                    <CanvasShareSection
                      canvasId={canvasData.id}
                      isOwner={isOwner}
                      disabled={isSaving || isDeleting}
                    />
                  </div>
                )} */}
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex w-full items-center justify-between">
              {/* Delete Canvas Button */}
              <div className="flex items-center gap-2">
                {!showDeleteConfirm ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isSaving || isDeleting || (canvases?.length ?? 0) <= 1}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Canvas
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Confirm Delete'
                      )}
                    </Button>
                  </>
                )}
              </div>

              {/* Save Button */}
              {!showDeleteConfirm && (
                <Button type="submit" disabled={isSaving || isDeleting || !name.trim()}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>

        {/* Helpful message for last canvas */}
        {(canvases?.length ?? 0) === 1 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <p>You cannot delete your last canvas. Create another canvas first.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
