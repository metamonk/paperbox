import { PresenceBadge } from '../collaboration/PresenceBadge';

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
 * - App title, tools button, and presence badge on the left
 * - User info and sign out button on the right
 */
export function Header({ userCount, onSignOut, userName, sidebarOpen, sidebarContent, onToggleTools, onToggleUsers, onToggleProperties, onToggleLayers }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between gap-4">
      {/* Left side: Title + Tools Button + Properties Button + Presence Badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">
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
    </header>
  );
}

