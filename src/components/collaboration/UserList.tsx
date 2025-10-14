import type { PresenceUser } from '../../hooks/usePresence';

interface UserListProps {
  users: PresenceUser[];
  currentUserId: string;
}

/**
 * UserList component displays all online users with their status
 * - Shows avatar with initials (first 2 letters)
 * - Color-coded avatars matching cursor colors
 * - Active/idle status indicators
 * - Highlights current user
 */
export function UserList({ users, currentUserId }: UserListProps) {
  /**
   * Get initials from display name (first 2 letters)
   */
  const getInitials = (name: string): string => {
    return name.slice(0, 2).toUpperCase();
  };

  /**
   * Sort users: current user first, then by join time
   */
  const sortedUsers = [...users].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <div className="flex flex-col gap-2">
      {sortedUsers.map((user) => {
        const isCurrentUser = user.id === currentUserId;

        return (
          <div
            key={user.id}
            className={`
              flex items-center gap-3 p-2 rounded-lg transition-colors
              ${isCurrentUser ? 'bg-gray-100 ring-2 ring-blue-500' : 'hover:bg-gray-50'}
            `}
          >
            {/* Avatar with initials */}
            <div
              className="relative flex items-center justify-center w-10 h-10 rounded-full text-white font-semibold text-sm"
              style={{ backgroundColor: user.color }}
            >
              {getInitials(user.displayName)}
              
              {/* Status indicator dot */}
              <div
                className={`
                  absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white
                  ${user.isIdle ? 'bg-yellow-400' : 'bg-green-500'}
                `}
                title={user.isIdle ? 'Idle' : 'Active'}
              />
            </div>

            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {user.displayName}
                </span>
                {isCurrentUser && (
                  <span className="text-xs text-blue-600 font-medium">
                    (You)
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {user.isIdle ? 'Idle' : 'Active'}
              </span>
            </div>
          </div>
        );
      })}

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No users online
        </div>
      )}
    </div>
  );
}

