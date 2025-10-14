import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { throttle } from '../utils/throttle';

// Reuse same color palette as cursors for consistency
const USER_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
  '#F43F5E', // rose
];

/**
 * Generate a consistent color from userId (same logic as cursors)
 */
function generateColorFromId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index];
}

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
 * - Uses Supabase Broadcast presence feature on dedicated channel
 * - Tracks online users with activity status
 * - Detects idle users (2 minutes of inactivity)
 * - Throttles activity updates to once per 5 seconds
 */
export function usePresence(): UsePresenceReturn {
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
    if (!userId) return;

    // Use a dedicated channel for presence (separate from cursors)
    const channelName = 'canvas-presence';

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
  }, [userId, displayName, userColor, checkIdleStatus]);

  return {
    onlineUsers,
    updateActivity,
    currentUserId: userId,
  };
}

