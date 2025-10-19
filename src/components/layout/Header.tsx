import { PresencePopover } from '../collaboration/PresencePopover';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import type { PresenceUser } from '@/hooks/usePresence';
import { ConnectionStatusDot } from './ConnectionStatusDot';

interface HeaderProps {
  onlineUsers: PresenceUser[];
  currentUserId: string;
  onSignOut: () => void;
  userName: string;
}

/**
 * Header component displays the top navigation bar
 * - Logo and app title
 * - Presence popover
 * - User info and sign out button on the right
 */
export function Header({ onlineUsers, currentUserId, onSignOut, userName }: HeaderProps) {
  return (
    <header className="h-14 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left side: Logo + Title */}
      <div className="flex items-center gap-2">
        <Logo size={32} />
        <h1 className="text-xl font-bold text-foreground hidden md:block leading-none">
          Paperbox
        </h1>
      </div>

      {/* Right side: User actions */}
      <div className="flex items-center gap-3">
        {/* Presence Popover */}
        <PresencePopover users={onlineUsers} currentUserId={currentUserId} />
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{userName}</span>
          {/* Connection Status Indicator */}
          <ConnectionStatusDot />
        </div>
        <ThemeToggle />
        <Button
          variant="outline"
          size="sm"
          onClick={onSignOut}
          className="cursor-pointer"
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
}

