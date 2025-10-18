/**
 * Sidebar component - generic container for sidebar content
 * W4.D1: Migrated to shadcn/ui styling patterns
 * - Desktop: Fixed inline position on the right side
 * - Mobile: Overlay with backdrop (higher z-index)
 * - Animated slide-in/out transition
 * - Content determined by parent (UserList or ToolsSidebar)
 */

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Sidebar({ isOpen, onClose, children }: SidebarProps) {
  return (
    <aside
      className={cn(
        'w-80 bg-background border-l border-border flex flex-col',
        'transition-transform duration-200 ease-in-out',
        'fixed right-0 top-16 bottom-0 z-50',
        'md:relative md:top-0 md:z-auto',
        isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        isOpen ? 'md:flex' : 'md:hidden'
      )}
    >
      {/* Close button - visible on mobile only */}
      <Button
        onClick={onClose}
        variant="ghost"
        size="icon"
        className="md:hidden absolute top-3 right-3 z-10"
        aria-label="Close sidebar"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </Button>

      {/* Dynamic content (UserList or ToolsSidebar) */}
      {children}
    </aside>
  );
}

