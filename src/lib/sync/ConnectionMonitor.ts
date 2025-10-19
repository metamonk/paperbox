/**
 * ConnectionMonitor - Network Connection State Management
 *
 * Singleton class that tracks Supabase realtime connection state and manages
 * automatic reconnection with exponential backoff.
 *
 * Features:
 * - Monitor Supabase realtime channel status
 * - Exponential backoff reconnection (max 25 attempts ~5 minutes)
 * - localStorage persistence for connection state
 * - Toast notifications for connection events
 * - Integration with Zustand store for UI updates
 */

import { toast } from 'sonner';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'failed';

interface ConnectionState {
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastDisconnectTime: number | null;
  lastError: string | null;
}

type ConnectionStatusCallback = (status: ConnectionStatus) => void;

const STORAGE_KEY = 'paperbox_connection_state';
const MAX_RECONNECT_ATTEMPTS = 25;
const BASE_DELAY = 1000; // 1 second
const MAX_DELAY = 30000; // 30 seconds
const DISCONNECT_TOAST_DELAY = 5000; // Show toast after 5s of disconnect

export class ConnectionMonitor {
  private static instance: ConnectionMonitor | null = null;

  private state: ConnectionState = {
    status: 'connecting',
    reconnectAttempts: 0,
    lastDisconnectTime: null,
    lastError: null,
  };

  private statusCallbacks: ConnectionStatusCallback[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private disconnectToastTimer: NodeJS.Timeout | null = null;
  private currentToastId: string | number | undefined;

  private constructor() {
    // Load persisted state from localStorage
    this.loadFromStorage();
    
    // Listen to browser online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleBrowserOnline.bind(this));
      window.addEventListener('offline', this.handleBrowserOffline.bind(this));
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return this.state.status;
  }

  /**
   * Get reconnection attempt count
   */
  getReconnectAttempts(): number {
    return this.state.reconnectAttempts;
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.push(callback);
    
    // Immediately notify with current status
    callback(this.state.status);
    
    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Handle Supabase realtime status change
   */
  handleStatusChange(status: `${REALTIME_SUBSCRIBE_STATES}`): void {
    // console.log('[ConnectionMonitor] Realtime status:', status);

    switch (status) {
      case 'SUBSCRIBED':
        this.handleConnected();
        break;
      
      case 'CHANNEL_ERROR':
        this.handleError('Channel error occurred');
        break;
      
      case 'TIMED_OUT':
        this.handleError('Connection timed out');
        break;
      
      case 'CLOSED':
        this.handleDisconnected();
        break;
    }
  }

  /**
   * Handle successful connection
   */
  private handleConnected(): void {
    const wasReconnecting = this.state.status === 'reconnecting';
    const previousAttempts = this.state.reconnectAttempts;
    
    this.updateStatus('connected');
    this.state.reconnectAttempts = 0;
    this.state.lastDisconnectTime = null;
    this.state.lastError = null;
    
    this.clearTimers();
    this.saveToStorage();

    // Show reconnection success toast only if we were reconnecting
    if (wasReconnecting && previousAttempts > 0) {
      // Dismiss any existing toasts
      if (this.currentToastId) {
        toast.dismiss(this.currentToastId);
      }
      
      this.currentToastId = toast.success('Back Online', {
        description: 'Connection restored successfully',
        duration: 3000,
      });
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnected(): void {
    if (this.state.status === 'connected' || this.state.status === 'connecting') {
      this.updateStatus('disconnected');
      this.state.lastDisconnectTime = Date.now();
      this.saveToStorage();

      // Schedule disconnect toast (only show if still disconnected after delay)
      this.disconnectToastTimer = setTimeout(() => {
        if (this.state.status === 'disconnected' || this.state.status === 'reconnecting') {
          this.currentToastId = toast.error('Connection Lost', {
            description: 'Working offline - changes will sync when reconnected',
            duration: 5000,
          });
        }
      }, DISCONNECT_TOAST_DELAY);
    }
  }

  /**
   * Handle connection error
   */
  private handleError(error: string): void {
    console.error('[ConnectionMonitor] Error:', error);
    this.state.lastError = error;
    
    if (this.state.status === 'connected' || this.state.status === 'connecting') {
      this.handleDisconnected();
    }
    
    // Start reconnection if not already reconnecting or failed
    if (this.state.status !== 'reconnecting' && this.state.status !== 'failed') {
      this.startReconnection();
    }
  }

  /**
   * Start reconnection process
   */
  startReconnection(): void {
    // Don't start if already reconnecting or if max attempts reached
    if (this.state.status === 'reconnecting' || this.state.status === 'failed') {
      return;
    }

    // Don't start if we're actually connected
    if (this.state.status === 'connected') {
      return;
    }

    this.updateStatus('reconnecting');
    this.scheduleReconnect();
  }

  /**
   * Schedule next reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.handleMaxAttemptsReached();
      return;
    }

    this.state.reconnectAttempts++;
    const delay = this.calculateBackoff(this.state.reconnectAttempts);
    
    console.log(
      `[ConnectionMonitor] Scheduling reconnect attempt ${this.state.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, delay);
  }

  /**
   * Calculate exponential backoff delay
   * 1s, 2s, 4s, 8s, 16s, 30s (max)
   */
  calculateBackoff(attempt: number): number {
    const exponentialDelay = BASE_DELAY * Math.pow(2, attempt - 1);
    return Math.min(exponentialDelay, MAX_DELAY);
  }

  /**
   * Attempt reconnection
   */
  private async attemptReconnect(): Promise<void> {
    // console.log(`[ConnectionMonitor] Attempting reconnect (${this.state.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
    
    // The actual reconnection is handled by SyncManager
    // This just tracks the state and schedules retries
    // SyncManager will call handleStatusChange when subscription status changes
    
    // Schedule next attempt if still not connected
    if (this.state.status === 'reconnecting') {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle max reconnection attempts reached
   */
  private handleMaxAttemptsReached(): void {
    console.error('[ConnectionMonitor] Max reconnection attempts reached');
    this.updateStatus('failed');
    this.clearTimers();
    this.saveToStorage();

    // Dismiss any existing toasts
    if (this.currentToastId) {
      toast.dismiss(this.currentToastId);
    }

    // Show manual refresh required toast
    this.currentToastId = toast.error('Connection Failed', {
      description: 'Please refresh the page to reconnect',
      duration: Infinity,
      action: {
        label: 'Refresh',
        onClick: () => window.location.reload(),
      },
    });
  }

  /**
   * Handle browser online event
   */
  private handleBrowserOnline(): void {
    // console.log('[ConnectionMonitor] Browser online event');
    
    // If we were disconnected, start reconnection
    if (this.state.status === 'disconnected' || this.state.status === 'failed') {
      this.state.reconnectAttempts = 0; // Reset attempts on browser online
      this.startReconnection();
    }
  }

  /**
   * Handle browser offline event
   */
  private handleBrowserOffline(): void {
    // console.log('[ConnectionMonitor] Browser offline event');
    this.handleDisconnected();
  }

  /**
   * Handle sync failure (when database operations fail)
   */
  handleSyncFailure(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Sync failed';
    console.error('[ConnectionMonitor] Sync failure:', errorMessage);
    
    // If we thought we were connected but sync failed, we're actually disconnected
    if (this.state.status === 'connected') {
      this.handleError(errorMessage);
    }
  }

  /**
   * Update status and notify callbacks
   */
  private updateStatus(newStatus: ConnectionStatus): void {
    if (this.state.status !== newStatus) {
      // console.log(`[ConnectionMonitor] Status changed: ${this.state.status} → ${newStatus}`);
      this.state.status = newStatus;
      
      // Notify all callbacks
      this.statusCallbacks.forEach((callback) => {
        try {
          callback(newStatus);
        } catch (error) {
          console.error('[ConnectionMonitor] Error in status callback:', error);
        }
      });
    }
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.disconnectToastTimer) {
      clearTimeout(this.disconnectToastTimer);
      this.disconnectToastTimer = null;
    }
  }

  /**
   * Load state from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ConnectionState>;
        
        // Only restore certain fields (not reconnect state)
        if (parsed.lastDisconnectTime) {
          this.state.lastDisconnectTime = parsed.lastDisconnectTime;
        }
        
        // If we were disconnected less than 5 minutes ago, assume still disconnected
        if (parsed.lastDisconnectTime && Date.now() - parsed.lastDisconnectTime < 5 * 60 * 1000) {
          this.state.status = 'disconnected';
        }
      }
    } catch (error) {
      console.error('[ConnectionMonitor] Error loading from storage:', error);
    }
  }

  /**
   * Save state to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        status: this.state.status,
        lastDisconnectTime: this.state.lastDisconnectTime,
      }));
    } catch (error) {
      console.error('[ConnectionMonitor] Error saving to storage:', error);
    }
  }

  /**
   * Reset connection monitor (for testing)
   */
  reset(): void {
    this.clearTimers();
    this.state = {
      status: 'connecting',
      reconnectAttempts: 0,
      lastDisconnectTime: null,
      lastError: null,
    };
    this.saveToStorage();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.clearTimers();
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleBrowserOnline.bind(this));
      window.removeEventListener('offline', this.handleBrowserOffline.bind(this));
    }
    
    this.statusCallbacks = [];
  }
}

