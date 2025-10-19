import { PresencePopover } from '../collaboration/PresencePopover';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from '@/components/ui/Logo';
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
 * - Logo and app title
 * - Browse all canvases button
 * - Presence popover
 * - User info and sign out button on the right
 */
export function Header({ onlineUsers, currentUserId, onSignOut, userName }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left side: Logo + Browse Canvases */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <h1 className="text-xl font-bold text-foreground hidden md:block">
            Paperbox
          </h1>
        </div>

        <div className="h-6 w-px bg-border" /> {/* Separator */}

        {/* Browse all canvases button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer"
          onClick={() => navigate('/canvases')}
          title="Browse all canvases"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
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

