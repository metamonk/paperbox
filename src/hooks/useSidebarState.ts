/**
 * Sidebar State Management Hook
 * W2.D9: Extracted from Canvas.tsx for better separation of concerns
 *
 * Encapsulates sidebar toggle logic and responsive behavior:
 * - Desktop: Default to tools, sidebar open
 * - Mobile: Default hidden, overlay mode when opened
 */

import { useState, useEffect, useCallback } from 'react';

export type SidebarContent = 'users' | 'tools' | 'properties' | 'layers';

export interface UseSidebarStateResult {
  sidebarOpen: boolean;
  sidebarContent: SidebarContent;
  handleToggleTools: () => void;
  handleToggleUsers: () => void;
  handleToggleProperties: () => void;
  handleToggleLayers: () => void;
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

  // Auto-hide sidebar on mobile, show on desktop (preserve content selection)
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 768;
      setSidebarOpen(isDesktop);
      // Don't reset content on resize - preserve user's panel selection
    };

    // Initialize on mount: set default to tools on desktop, closed on mobile
    const isDesktop = window.innerWidth >= 768;
    setSidebarOpen(isDesktop);
    if (isDesktop) {
      setSidebarContent('tools');
    }

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

  /**
   * Toggle properties sidebar
   * - If already showing properties: close sidebar
   * - If showing other content: switch to properties
   * - If closed: open and show properties
   */
  const handleToggleProperties = useCallback(() => {
    if (sidebarOpen && sidebarContent === 'properties') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setSidebarContent('properties');
    }
  }, [sidebarOpen, sidebarContent]);

  /**
   * Toggle layers sidebar
   * - If already showing layers: close sidebar
   * - If showing other content: switch to layers
   * - If closed: open and show layers
   */
  const handleToggleLayers = useCallback(() => {
    if (sidebarOpen && sidebarContent === 'layers') {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
      setSidebarContent('layers');
    }
  }, [sidebarOpen, sidebarContent]);

  return {
    sidebarOpen,
    sidebarContent,
    handleToggleTools,
    handleToggleUsers,
    handleToggleProperties,
    handleToggleLayers,
  };
}
