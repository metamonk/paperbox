import { PresenceBadge } from '../collaboration/PresenceBadge';

interface HeaderProps {
  userCount: number;
  onSignOut: () => void;
  userName: string;
}

/**
 * Header component displays the top navigation bar
 * - App title on the left
 * - Presence badge in the center
 * - User info and sign out button on the right
 */
export function Header({ userCount, onSignOut, userName }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      {/* App title */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">
          CollabCanvas
        </h1>
        <span className="text-sm text-gray-500 hidden sm:inline">
          Real-time Collaborative Canvas
        </span>
      </div>

      {/* Presence badge (center) */}
      <div className="flex-1 flex justify-center">
        <PresenceBadge count={userCount} />
      </div>

      {/* User actions (right) */}
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

