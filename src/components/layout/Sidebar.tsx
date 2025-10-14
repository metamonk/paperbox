import { UserList } from '../collaboration/UserList';
import type { PresenceUser } from '../../hooks/usePresence';

interface SidebarProps {
  users: PresenceUser[];
  currentUserId: string;
}

/**
 * Sidebar component displays the online users panel
 * Fixed position on the right side of the canvas
 */
export function Sidebar({ users, currentUserId }: SidebarProps) {
  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Sidebar header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          Online Users
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {users.length} {users.length === 1 ? 'person' : 'people'} collaborating
        </p>
      </div>

      {/* User list (scrollable) */}
      <div className="flex-1 overflow-y-auto p-4">
        <UserList users={users} currentUserId={currentUserId} />
      </div>
    </aside>
  );
}

