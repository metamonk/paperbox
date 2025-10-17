/**
 * Sidebar State Management Hook
 * W2.D9: Extracted from Canvas.tsx for better separation of concerns
 *
 * Encapsulates sidebar toggle logic and responsive behavior:
 * - Desktop: Default to tools, sidebar open
 * - Mobile: Default hidden, overlay mode when opened
 */

import { useState, useEffect, useCallback } from 'react';

export type SidebarContent = 'users' | 'tools';

export interface UseSidebarStateResult {
  sidebarOpen: boolean;
  sidebarContent: SidebarContent;
  handleToggleTools: () => void;
  handleToggleUsers: () => void;
}

/**
 * Custom hook for managing sidebar state and toggle logic
 *
 * Features:
 * - Responsive behavior (auto-hide on mobile, open on desktop)
 * - Content switching between tools and users panels
 * - Smart toggle (close if already showing same content, switch if different)
 *
 * @returns Sidebar state and toggle handlers
 */
export function useSidebarState(): UseSidebarStateResult {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarContent, setSidebarContent] = useState<SidebarContent>('tools');

  // Auto-hide sidebar on mobile, default to tools on desktop
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      setSidebarOpen(isDesktop);
      if (isDesktop) {
        setSidebarContent('tools');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * Toggle tools sidebar
   * - If already showing tools: close sidebar
   * - If showing users: switch to tools
   * - If closed: open and show tools
   */
  const handleToggleTools = useCallback(() => {
    if (sidebarOpen && sidebarContent === 'tools') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setSidebarContent('tools');
    }
  }, [sidebarOpen, sidebarContent]);

  /**
   * Toggle users sidebar
   * - If already showing users: close sidebar
   * - If showing tools: switch to users
   * - If closed: open and show users
   */
  const handleToggleUsers = useCallback(() => {
    if (sidebarOpen && sidebarContent === 'users') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setSidebarContent('users');
    }
  }, [sidebarOpen, sidebarContent]);

  return {
    sidebarOpen,
    sidebarContent,
    handleToggleTools,
    handleToggleUsers,
  };
}
