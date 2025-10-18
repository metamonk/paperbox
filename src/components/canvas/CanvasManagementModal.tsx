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
import { Trash2, Loader2 } from 'lucide-react';
import { usePaperboxStore } from '@/stores';
import type { Canvas } from '@/types/canvas';
import { Button } from '@/components/ui/button';
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

  const updateCanvas = usePaperboxStore((state) => state.updateCanvas);
  const deleteCanvas = usePaperboxStore((state) => state.deleteCanvas);
  const canvases = usePaperboxStore((state) => state.canvases);
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const setActiveCanvas = usePaperboxStore((state) => state.setActiveCanvas);

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
                    disabled={isSaving || isDeleting || canvases.length === 1}
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
        {canvases.length === 1 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <p>You cannot delete your last canvas. Create another canvas first.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
