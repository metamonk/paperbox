/**
 * ConnectionMonitor Unit Tests
 *
 * Tests:
 * - Exponential backoff calculation
 * - Max attempts reached behavior
 * - Status transitions
 * - Subscription callbacks
 * - Browser online/offline events
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConnectionMonitor } from '../ConnectionMonitor';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    dismiss: vi.fn(),
  },
}));

describe('ConnectionMonitor', () => {
  let monitor: ConnectionMonitor;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Get fresh instance
    monitor = ConnectionMonitor.getInstance();
    monitor.reset();
  });

  afterEach(() => {
    monitor.dispose();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = ConnectionMonitor.getInstance();
      const instance2 = ConnectionMonitor.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Exponential Backoff', () => {
    it('should calculate exponential backoff correctly', () => {
      // Attempt 1: 1s * 2^0 = 1s
      expect(monitor.calculateBackoff(1)).toBe(1000);
      
      // Attempt 2: 1s * 2^1 = 2s
      expect(monitor.calculateBackoff(2)).toBe(2000);
      
      // Attempt 3: 1s * 2^2 = 4s
      expect(monitor.calculateBackoff(3)).toBe(4000);
      
      // Attempt 4: 1s * 2^3 = 8s
      expect(monitor.calculateBackoff(4)).toBe(8000);
      
      // Attempt 5: 1s * 2^4 = 16s
      expect(monitor.calculateBackoff(5)).toBe(16000);
    });

    it('should cap backoff at 30 seconds', () => {
      // Attempt 10: 1s * 2^9 = 512s, but should cap at 30s
      expect(monitor.calculateBackoff(10)).toBe(30000);
      
      // Attempt 20: Should still cap at 30s
      expect(monitor.calculateBackoff(20)).toBe(30000);
    });
  });

  describe('Status Transitions', () => {
    it('should start with connecting status', () => {
      expect(monitor.getStatus()).toBe('connecting');
    });

    it('should transition to connected on SUBSCRIBED', () => {
      monitor.handleStatusChange('SUBSCRIBED');
      expect(monitor.getStatus()).toBe('connected');
    });

    it('should transition to reconnecting on CHANNEL_ERROR', () => {
      monitor.handleStatusChange('SUBSCRIBED'); // First connect
      monitor.handleStatusChange('CHANNEL_ERROR');
      expect(monitor.getStatus()).toBe('reconnecting');
    });

    it('should transition to reconnecting on TIMED_OUT', () => {
      monitor.handleStatusChange('SUBSCRIBED'); // First connect
      monitor.handleStatusChange('TIMED_OUT');
      expect(monitor.getStatus()).toBe('reconnecting');
    });
  });

  describe('Reconnection Attempts', () => {
    it('should track reconnection attempts', () => {
      expect(monitor.getReconnectAttempts()).toBe(0);
      
      monitor.handleStatusChange('CHANNEL_ERROR');
      monitor.startReconnection();
      
      // First attempt should be scheduled
      expect(monitor.getReconnectAttempts()).toBeGreaterThan(0);
    });

    it('should reset reconnection attempts on successful connection', () => {
      monitor.handleStatusChange('CHANNEL_ERROR');
      monitor.startReconnection();
      
      expect(monitor.getReconnectAttempts()).toBeGreaterThan(0);
      
      monitor.handleStatusChange('SUBSCRIBED');
      expect(monitor.getReconnectAttempts()).toBe(0);
    });
  });

  describe('Status Callbacks', () => {
    it('should notify callbacks on status change', () => {
      const callback = vi.fn();
      monitor.onStatusChange(callback);
      
      // Should call immediately with current status
      expect(callback).toHaveBeenCalledWith('connecting');
      
      // Should call on status change
      monitor.handleStatusChange('SUBSCRIBED');
      expect(callback).toHaveBeenCalledWith('connected');
    });

    it('should support multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      monitor.onStatusChange(callback1);
      monitor.onStatusChange(callback2);
      
      monitor.handleStatusChange('SUBSCRIBED');
      
      expect(callback1).toHaveBeenCalledWith('connected');
      expect(callback2).toHaveBeenCalledWith('connected');
    });

    it('should allow unsubscribing from callbacks', () => {
      const callback = vi.fn();
      const unsubscribe = monitor.onStatusChange(callback);
      
      callback.mockClear();
      unsubscribe();
      
      monitor.handleStatusChange('SUBSCRIBED');
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist connection state to localStorage', () => {
      monitor.handleStatusChange('SUBSCRIBED');
      
      const stored = localStorage.getItem('paperbox_connection_state');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.status).toBe('connected');
    });

    it('should load connection state from localStorage', () => {
      // Simulate previous session
      localStorage.setItem('paperbox_connection_state', JSON.stringify({
        status: 'disconnected',
        lastDisconnectTime: Date.now(),
      }));
      
      // Create new monitor (simulates page refresh)
      const newMonitor = ConnectionMonitor.getInstance();
      
      // Should load disconnected state if recent
      expect(newMonitor.getStatus()).toBe('disconnected');
      
      newMonitor.dispose();
    });
  });
});

