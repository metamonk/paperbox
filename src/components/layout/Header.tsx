import { PresenceBadge } from '../collaboration/PresenceBadge';
import { CanvasPicker } from '../canvas/CanvasPicker';
import { CanvasManagementModal } from '../canvas/CanvasManagementModal';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePaperboxStore } from '@/stores';
import type { Canvas } from '@/types/canvas';

interface HeaderProps {
  userCount: number;
  onSignOut: () => void;
  userName: string;
  sidebarOpen: boolean;
  sidebarContent: 'users' | 'tools' | 'properties' | 'layers';
  onToggleTools: () => void;
  onToggleUsers: () => void;
  onToggleProperties: () => void;
  onToggleLayers: () => void;
}

/**
 * Header component displays the top navigation bar
 * - W5.D3: Canvas picker prominently placed like Figma (top-left)
 * - App title, tools button, and presence badge
 * - User info and sign out button on the right
 */
export function Header({ userCount, onSignOut, userName, sidebarOpen, sidebarContent, onToggleTools, onToggleUsers, onToggleProperties, onToggleLayers }: HeaderProps) {
  // W5.D3+W5.D5.3: Canvas management modal state + navigation
  const navigate = useNavigate();
  const [managementModalOpen, setManagementModalOpen] = useState(false);
  const activeCanvasId = usePaperboxStore((state) => state.activeCanvasId);
  const canvases = usePaperboxStore((state) => state.canvases);
  const activeCanvas = canvases.find((c: Canvas) => c.id === activeCanvasId);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between gap-4">
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

        <div className="h-6 w-px bg-gray-300" /> {/* Separator */}

        <h1 className="text-xl font-bold text-gray-900 hidden md:block">
          CollabCanvas
        </h1>

        {/* Tools button */}
        <button
          onClick={onToggleTools}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-lg transition-all
            ${sidebarOpen && sidebarContent === 'tools'
              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300 ring-offset-1'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }
          `}
          aria-label="Toggle tools sidebar"
        >
          🎨 <span className="hidden sm:inline">Tools</span>
        </button>

        {/* Properties button */}
        <button
          onClick={onToggleProperties}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-lg transition-all
            ${sidebarOpen && sidebarContent === 'properties'
              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300 ring-offset-1'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }
          `}
          aria-label="Toggle properties sidebar"
        >
          ⚙️ <span className="hidden sm:inline">Properties</span>
        </button>

        {/* Layers button */}
        <button
          onClick={onToggleLayers}
          className={`
            px-3 py-1.5 text-sm font-medium rounded-lg transition-all
            ${sidebarOpen && sidebarContent === 'layers'
              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300 ring-offset-1'
              : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }
          `}
          aria-label="Toggle layers sidebar"
        >
          📊 <span className="hidden sm:inline">Layers</span>
        </button>

        {/* Clickable presence badge for users sidebar */}
        <PresenceBadge
          count={userCount}
          onClick={onToggleUsers}
          isActive={sidebarOpen && sidebarContent === 'users'}
        />
      </div>

      {/* Right side: User actions */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-gray-700 hidden sm:block">
          <span className="font-medium">{userName}</span>
        </div>
        <button
          onClick={onSignOut}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Sign Out
        </button>
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

