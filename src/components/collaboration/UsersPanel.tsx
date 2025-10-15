/**
 * UsersPanel - Sidebar content for online users
 * Wraps UserList with header
 */

import { UserList } from './UserList';
import type { PresenceUser } from '../../hooks/usePresence';

interface UsersPanelProps {
  users: PresenceUser[];
  currentUserId: string;
}

export function UsersPanel({ users, currentUserId }: UsersPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
    </div>
  );
}

