import { PresencePopover } from '../collaboration/PresencePopover';
import { CanvasPicker } from '../canvas/CanvasPicker';
import { CanvasManagementModal } from '../canvas/CanvasManagementModal';
import { ThemeToggle } from './ThemeToggle';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePaperboxStore } from '@/stores';
import type { Canvas } from '@/types/canvas';
import type { OnlineUser } from '@/types/canvas';

interface HeaderProps {
  onlineUsers: OnlineUser[];
  currentUserId: string;
  onSignOut: () => void;
  userName: string;
}

/**
 * Header component displays the top navigation bar
 * - W5.D3: Canvas picker prominently placed like Figma (top-left)
 * - App title and presence popover
 * - User info and sign out button on the right
 */
export function Header({ onlineUsers, currentUserId, onSignOut, userName }: HeaderProps) {
  // W5.D3+W5.D5.3: Canvas management modal state + navigation
  const navigate = useNavigate();
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const canvases = usePaperboxStore((state) => state.canvases);
  const activeCanvas = canvases.find((c: Canvas) => c.id === activeCanvasId);

  return (
    <header className="h-14 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left side: Canvas Picker (Figma-style) + Tools + Presence */}
      <div className="flex items-center gap-3">
        {/* W5.D3+W5.D5.3: Canvas Picker + Browse + Settings */}
        <div className="flex items-center gap-2">
          <CanvasPicker />
          {/* W5.D5.3: Browse all canvases button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('/canvases')}
            title="Browse all canvases"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          {/* Settings icon to open canvas management modal */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setManagementModalOpen(true)}
            disabled={!activeCanvas}
            title="Canvas settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" /> {/* Separator */}

        <h1 className="text-xl font-bold text-foreground hidden md:block">
          CollabCanvas
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
        >
          Sign Out
        </Button>
      </div>

      {/* W5.D3: Canvas Management Modal */}
      <CanvasManagementModal
        canvas={activeCanvas || null}
        open={managementModalOpen}
        onOpenChange={setManagementModalOpen}
      />
    </header>
  );
}

