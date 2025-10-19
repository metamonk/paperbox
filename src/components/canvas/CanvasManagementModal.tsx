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
import { Trash2, Loader2, Globe, Lock, Copy, Check, Users } from 'lucide-react';
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
  canvas: Canvas | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CanvasManagementModal({
  canvas,
  open,
  onOpenChange,
}: CanvasManagementModalProps) {
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
  const canvases = usePaperboxStore((state) => state.canvases);
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
    if (canvas) {
      setName(canvas.name);
      setDescription(canvas.description || '');
      setShowDeleteConfirm(false);
    }
  }, [canvas]);

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
    if (!canvas || !name.trim()) return;

    setIsSaving(true);
    try {
      await updateCanvas(canvas.id, {
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
    if (!canvas) return;

    setIsDeleting(true);
    try {
      // If deleting active canvas, switch to another canvas first
      if (canvas.id === activeCanvasId) {
        const otherCanvas = canvases.find((c: Canvas) => c.id !== canvas.id);
        if (otherCanvas) {
          await setActiveCanvas(otherCanvas.id);
        }
      }

      await deleteCanvas(canvas.id);
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
    if (!canvas) return;
    try {
      await toggleCanvasPublic(canvas.id, pressed);
    } catch (error) {
      console.error('[CanvasManagementModal] Failed to toggle public:', error);
    }
  };

  // Handle copy link
  const handleCopyLink = () => {
    if (!canvas) return;
    const url = `${window.location.origin}/canvas/${canvas.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Check if current user is owner
  const isOwner = userId && canvas?.owner_id === userId;
  const isPublic = canvas?.is_public || false;

  if (!canvas) return null;

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
                Created: {new Date(canvas.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <p>
                Last updated: {new Date(canvas.updated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Canvas Sharing (Phase 1 + Phase 2) - Only show for owners */}
            {isOwner && (
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Sharing
                </h3>

                {/* Phase 1: Public Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isPublic ? (
                        <Globe className="h-4 w-4 text-green-600" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-400" />
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
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/canvas/${canvas.id}`}
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
                      canvasId={canvas.id}
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
