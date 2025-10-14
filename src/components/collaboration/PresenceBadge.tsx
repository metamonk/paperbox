interface PresenceBadgeProps {
  count: number;
}

/**
 * PresenceBadge shows the count of online users
 * Displayed in the header for quick visibility
 */
export function PresenceBadge({ count }: PresenceBadgeProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
      {/* Green indicator dot */}
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      
      {/* User count text */}
      <span className="text-sm font-medium text-green-700">
        {count} {count === 1 ? 'user' : 'users'} online
      </span>
    </div>
  );
}

