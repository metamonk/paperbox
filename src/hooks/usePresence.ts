/**
 * Presence tracking hook
 * Note: Supabase presence state types require any casts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { throttle } from '../utils/throttle';
import { generateColorFromId } from '../lib/constants';

export interface PresenceUser {
  id: string;
  displayName: string;
  color: string;
  joinedAt: number;
  lastActivity: number;
  isIdle: boolean;
}

interface UsePresenceReturn {
  onlineUsers: PresenceUser[];
  updateActivity: () => void;
  currentUserId: string;
}

const IDLE_THRESHOLD = 2 * 60 * 1000; // 2 minutes in milliseconds
const IDLE_CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

/**
 * Custom hook for presence tracking and idle detection
 * - Uses Supabase Broadcast presence feature on canvas-scoped channel
 * - Tracks online users with activity status
 * - Detects idle users (2 minutes of inactivity)
 * - Throttles activity updates to once per 5 seconds
 *
 * W5.D5.1: Canvas-scoped presence to prevent cross-canvas cursor visibility
 * @param canvasId - Current canvas ID for channel scoping
 */
export function usePresence(canvasId: string | null): UsePresenceReturn {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const userId = user?.id || '';
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Anonymous';
  const userColor = userId ? generateColorFromId(userId) : '#000000';

  /**
   * Update user's last activity timestamp
   * Throttled to once per 5 seconds to avoid excessive broadcasts
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const updateActivity = useCallback(
    throttle(() => {
      lastActivityRef.current = Date.now();

      // Update presence with new activity timestamp
      if (channelRef.current && userId) {
        channelRef.current.track({
          userId,
          displayName,
          color: userColor,
          lastActivity: lastActivityRef.current,
        });
      }
    }, 5000), // Throttle to 5 seconds
    [userId, displayName, userColor]
  );

  /**
   * Check if users should be marked as idle
   */
  const checkIdleStatus = useCallback(() => {
    const now = Date.now();
    
    setOnlineUsers((prev) =>
      prev.map((user) => {
        const timeSinceActivity = now - user.lastActivity;
        const shouldBeIdle = timeSinceActivity > IDLE_THRESHOLD;
        
        // Only update if idle status changed
        if (shouldBeIdle !== user.isIdle) {
          return { ...user, isIdle: shouldBeIdle };
        }
        return user;
      })
    );
  }, []);

  useEffect(() => {
    if (!userId || !canvasId) return;

    // W5.D5.1: Canvas-scoped presence channel to prevent cross-canvas cursor visibility
    // Pattern matches canvas_objects channel scoping (canvasSlice.ts:802)
    const channelName = `canvas-presence-${canvasId}`;

    // Create channel with presence configuration
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId, // Use userId as the presence key
        },
      },
    });

    // Track initial presence state
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState = channel.presenceState();
      const users: PresenceUser[] = [];

      // Convert presence state to user array
      Object.keys(presenceState).forEach((key) => {
        const presences = presenceState[key];
        if (presences && presences.length > 0) {
          const presence = presences[0] as any; // Supabase presence includes metadata

          // Only process if it has our expected structure
          if (presence.userId && presence.displayName) {
            const now = Date.now();
            const timeSinceActivity = now - (presence.lastActivity || now);
            const isIdle = timeSinceActivity > IDLE_THRESHOLD;

            users.push({
              id: presence.userId,
              displayName: presence.displayName,
              color: presence.color,
              joinedAt: now, // Approximate join time
              lastActivity: presence.lastActivity || now,
              isIdle,
            });
          }
        }
      });

      setOnlineUsers(users);
    });

    // Handle user joining
    channel.on('presence', { event: 'join' }, ({ newPresences }) => {
      const now = Date.now();
      
      newPresences.forEach((presence: any) => {
        setOnlineUsers((prev) => {
          // Check if user already exists
          if (prev.some((u) => u.id === presence.userId)) {
            return prev;
          }

          return [
            ...prev,
            {
              id: presence.userId,
              displayName: presence.displayName,
              color: presence.color,
              joinedAt: now,
              lastActivity: presence.lastActivity || now,
              isIdle: false,
            },
          ];
        });
      });
    });

    // Handle user leaving
    channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
      leftPresences.forEach((presence: any) => {
        setOnlineUsers((prev) => prev.filter((u) => u.id !== presence.userId));
      });
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Track our presence after successful subscription
        await channel.track({
          userId,
          displayName,
          color: userColor,
          lastActivity: lastActivityRef.current,
        });
      }
    });

    channelRef.current = channel;

    // Start idle checking interval
    idleCheckIntervalRef.current = setInterval(checkIdleStatus, IDLE_CHECK_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (idleCheckIntervalRef.current) {
        clearInterval(idleCheckIntervalRef.current);
        idleCheckIntervalRef.current = null;
      }

      // Untrack and unsubscribe
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, displayName, userColor, checkIdleStatus, canvasId]);

  return {
    onlineUsers,
    updateActivity,
    currentUserId: userId,
  };
}

