/**
 * CanvasShareSection - Phase 2 Canvas Sharing Component
 *
 * Features:
 * - Display collaborators with permissions
 * - Invite users with permission level selection
 * - Remove collaborators (owner only)
 * - Real-time permission updates
 */

import * as React from 'react';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { usePaperboxStore } from '@/stores';
import type { CanvasPermissionRecord } from '@/types/canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CanvasShareSectionProps {
  canvasId: string;
  isOwner: boolean;
  disabled?: boolean;
}

export function CanvasShareSection({
  canvasId,
  isOwner,
  disabled = false,
}: CanvasShareSectionProps) {
  const [email, setEmail] = React.useState('');
  const [permission, setPermission] = React.useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // const shareCanvas = usePaperboxStore((state) => state.shareCanvas); // TODO: Will be used when user lookup is implemented
  // TODO: Re-implement these when canvas sharing is complete
  const revokeAccess = usePaperboxStore((state) => (state as any).revokeAccess) || (() => Promise.resolve());
  const loadCanvasPermissions = usePaperboxStore((state) => (state as any).loadCanvasPermissions) || (() => Promise.resolve());
  const activeCanvasSharedWith = usePaperboxStore((state) => (state as any).activeCanvasSharedWith) || [];

  // Load permissions when component mounts or canvasId changes
  React.useEffect(() => {
    if (canvasId) {
      loadCanvasPermissions(canvasId);
    }
  }, [canvasId, loadCanvasPermissions]);

  // Handle invite user
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !isOwner || disabled) return;

    setIsInviting(true);
    setError(null);

    try {
      // TODO: For MVP, we need to look up user by email
      // For now, this requires a user lookup by email (not implemented yet)
      // Placeholder: Assume we can get userId from email via Supabase function

      // This is a simplified version - in production, you'd:
      // 1. Look up user by email in auth.users table
      // 2. Get their user_id
      // 3. Call shareCanvas with that user_id

      console.log('[CanvasShareSection] TODO: Implement user lookup by email');
      console.log('[CanvasShareSection] Email:', email, 'Permission:', permission);

      setError('User lookup not yet implemented. Coming soon!');

      // When implemented:
      // const userId = await getUserIdByEmail(email);
      // await shareCanvas(canvasId, userId, permission);
      // setEmail('');
      // await loadCanvasPermissions(canvasId);
    } catch (err) {
      console.error('[CanvasShareSection] Failed to share canvas:', err);
      setError('Failed to invite user. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  // Handle remove collaborator
  const handleRemove = async (userId: string) => {
    if (!isOwner || disabled) return;

    try {
      await revokeAccess(canvasId, userId);
      await loadCanvasPermissions(canvasId);
    } catch (err) {
      console.error('[CanvasShareSection] Failed to revoke access:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Collaborators List */}
      {(activeCanvasSharedWith?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Collaborators</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeCanvasSharedWith?.map((collab: CanvasPermissionRecord) => (
              <div
                key={collab.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {collab.user_id}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {collab.permission}
                  </p>
                </div>

                {isOwner && !disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(collab.user_id)}
                    className="ml-2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove collaborator</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Form (Owner Only) */}
      {isOwner && (
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-sm font-medium">
              Invite by Email
            </Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  disabled={isInviting || disabled}
                  className="h-9"
                />
              </div>
              <Select
                value={permission}
                onValueChange={(value) => setPermission(value as 'editor' | 'viewer')}
                disabled={isInviting || disabled}
              >
                <SelectTrigger className="w-32 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="submit"
                size="sm"
                disabled={isInviting || disabled || !email.trim()}
                className="h-9"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Inviting...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Editor:</strong> Can create, update, and delete objects</p>
            <p><strong>Viewer:</strong> Can only view objects (read-only)</p>
          </div>
        </form>
      )}

      {/* Non-owner message */}
      {!isOwner && (activeCanvasSharedWith?.length ?? 0) === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Only the canvas owner can manage permissions.
        </p>
      )}
    </div>
  );
}
