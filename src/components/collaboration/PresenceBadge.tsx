interface PresenceBadgeProps {
  count: number;
  onClick?: () => void;
  isActive?: boolean;
}

/**
 * PresenceBadge shows the count of online users
 * Displayed in the header for quick visibility
 * Clickable to toggle sidebar visibility
 */
export function PresenceBadge({ count, onClick, isActive }: PresenceBadgeProps) {
  const isClickable = !!onClick;
  
  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`
        flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full
        transition-all
        ${isClickable ? 'cursor-pointer hover:bg-green-100 hover:border-green-300 active:scale-95' : 'cursor-default'}
        ${isActive ? 'ring-2 ring-green-300 ring-offset-1' : ''}
      `}
      aria-label={`${count} online. ${isClickable ? 'Click to toggle user list.' : ''}`}
      type="button"
    >
      {/* Green indicator dot */}
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      
      {/* User count text */}
      <span className="text-sm font-medium text-green-700">
        {count} online
      </span>
    </button>
  );
}

