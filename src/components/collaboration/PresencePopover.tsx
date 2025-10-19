/**
 * PresencePopover - Shows online users in a popover/dropdown
 * Displays up to 5 users, with "See All" option for more
 */

import { useState } from 'react';
import { Users as UsersIcon } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PresenceUser } from '@/hooks/usePresence';

interface PresencePopoverProps {
  users: PresenceUser[];
  currentUserId: string;
}

export function PresencePopover({ users, currentUserId }: PresencePopoverProps) {
  const [showAllModal, setShowAllModal] = useState(false);
  const otherUsers = users.filter(u => u.id !== currentUserId);
  const totalCount = otherUsers.length;
  const displayUsers = otherUsers.slice(0, 5);
  const hasMore = totalCount > 5;

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
            <UsersIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{totalCount} online</span>
            <span className="sm:hidden">{totalCount}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="end">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm mb-3">Online Users ({totalCount})</h4>
            
            {displayUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No other users online
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  {displayUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                        style={{ backgroundColor: user.color }}
                      >
                        {user.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.displayName || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Active now</p>
                      </div>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 cursor-pointer"
                    onClick={() => setShowAllModal(true)}
                  >
                    See all {totalCount} users
                  </Button>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* See All Modal */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-md max-h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>All Online Users ({totalCount})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              {otherUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: user.color }}
                  >
                    {user.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.displayName || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">Active now</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

