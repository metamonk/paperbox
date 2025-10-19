import { PresencePopover } from '../collaboration/PresencePopover';
import { ThemeToggle } from './ThemeToggle';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PresenceUser } from '@/hooks/usePresence';

interface HeaderProps {
  onlineUsers: PresenceUser[];
  currentUserId: string;
  onSignOut: () => void;
  userName: string;
}

/**
 * Header component displays the top navigation bar
 * - Clickable grid icon to browse canvases
 * - App title
 * - Presence popover
 * - User info and sign out button on the right
 */
export function Header({ onlineUsers, currentUserId, onSignOut, userName }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left side: Grid icon + Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 cursor-pointer"
          onClick={() => navigate('/canvases')}
          title="Browse all canvases"
        >
          <LayoutGrid className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">
          Paperbox
        </h1>
      </div>

      {/* Right side: User actions */}
      <div className="flex items-center gap-3">
        {/* Presence Popover */}
        <PresencePopover users={onlineUsers} currentUserId={currentUserId} />
        <div className="text-sm text-muted-foreground hidden sm:block">
          <span className="font-medium text-foreground">{userName}</span>
        </div>
        <ThemeToggle />
        <Button
          variant="ghost"
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

