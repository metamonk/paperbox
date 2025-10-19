import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { throttle } from '../utils/throttle';
import { generateColorFromId } from '../lib/constants';
import type { CursorPosition } from '../types/user';

interface UseBroadcastCursorsReturn {
  cursors: Map<string, CursorPosition>;
  sendCursorUpdate: (x: number, y: number) => void;
}

/**
 * Custom hook for broadcasting and receiving cursor positions
 * Uses Supabase Broadcast for ephemeral, low-latency updates
 * - Throttles cursor updates to 30 FPS (33ms)
 * - Assigns random color per user (deterministic)
 * - Tracks all remote user cursors
 * - Cleans up on disconnect
 *
 * W5.D5.1: Canvas-scoped cursor broadcasts to prevent cross-canvas cursor visibility
 * @param canvasId - Current canvas ID for channel scoping
 */
export function useBroadcastCursors(canvasId: string | null): UseBroadcastCursorsReturn {
  const { user } = useAuth();
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const cursorTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Get display name from user metadata
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Anonymous';
  const userId = user?.id || '';
  const userColor = userId ? generateColorFromId(userId) : '#000000';

  /**
   * Send cursor position update (throttled to 30 FPS)
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sendCursorUpdate = useCallback(
    throttle((x: number, y: number) => {
      if (!channelRef.current || !userId) {
        return;
      }

      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          userId,
          displayName,
          x,
          y,
          color: userColor,
          timestamp: Date.now(),
        },
      });
    }, 33), // 30 FPS = ~33ms
    [userId, displayName, userColor]
  );

  useEffect(() => {
    if (!userId || !canvasId) return;

    // W5.D5.1: Canvas-scoped cursor channel to prevent cross-canvas cursor visibility
    // Pattern matches canvas_objects channel scoping (canvasSlice.ts:802)
    const channelName = `canvas-cursors-${canvasId}`;
    
    // Configure channel for broadcast
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false, // Don't receive own broadcasts
        },
      },
    });

    // Subscribe to cursor broadcast events
    channel.on(
      'broadcast',
      { event: 'cursor' },
      (payload: { payload: CursorPosition }) => {
        const cursorData = payload.payload;

        // Ignore own cursor
        if (cursorData.userId === userId) {
          return;
        }

        // Update cursor position
        setCursors((prev) => {
          const next = new Map(prev);
          next.set(cursorData.userId, cursorData);
          return next;
        });

        // Clear existing timeout for this user
        const existingTimeout = cursorTimeoutRef.current.get(cursorData.userId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Remove cursor if no updates for 3 seconds (user stopped moving or disconnected)
        const timeout = setTimeout(() => {
          setCursors((prev) => {
            const next = new Map(prev);
            next.delete(cursorData.userId);
            return next;
          });
          cursorTimeoutRef.current.delete(cursorData.userId);
        }, 3000);

        cursorTimeoutRef.current.set(cursorData.userId, timeout);
      }
    );

    // Subscribe to channel
    channel.subscribe();

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      // Clear all cursor timeouts (capture ref value for cleanup)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const timeouts = cursorTimeoutRef.current;
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();

      // Unsubscribe from channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, displayName, userColor, canvasId]);

  return {
    cursors,
    sendCursorUpdate,
  };
}

