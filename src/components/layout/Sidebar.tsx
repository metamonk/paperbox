import type { ReactNode } from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Sidebar component - generic container for sidebar content
 * - Desktop: Fixed inline position on the right side
 * - Mobile: Overlay with backdrop (higher z-index)
 * - Animated slide-in/out transition
 * - Content determined by parent (UserList or ToolsSidebar)
 */
export function Sidebar({ isOpen, onClose, children }: SidebarProps) {
  return (
    <aside 
      className={`
        w-80 bg-white border-l border-gray-200 flex flex-col
        transition-transform duration-200 ease-in-out
        fixed right-0 top-16 bottom-0 z-50
        md:relative md:top-0 md:z-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${isOpen ? 'md:flex' : 'md:hidden'}
      `}
    >
      {/* Close button - visible on mobile only */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-3 right-3 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
        aria-label="Close sidebar"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Dynamic content (UserList or ToolsSidebar) */}
      {children}
    </aside>
  );
}

