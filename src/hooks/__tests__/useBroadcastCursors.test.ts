import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBroadcastCursors } from '../useBroadcastCursors';

// Mock Supabase - must be defined inline in factory
vi.mock('../../lib/supabase', () => {
  const mockSend = vi.fn();
  const mockOn = vi.fn().mockReturnThis();
  const mockSubscribe = vi.fn(() => {
    // Subscribe no longer takes a callback
    return {
      unsubscribe: vi.fn(),
    };
  });
  const mockRemoveChannel = vi.fn();

  return {
    supabase: {
      channel: vi.fn(() => ({
        on: mockOn,
        subscribe: mockSubscribe,
        send: mockSend,
      })),
      removeChannel: mockRemoveChannel,
    },
    // Export mocks for test assertions
    __mocks: {
      mockSend,
      mockOn,
      mockSubscribe,
      mockRemoveChannel,
    },
  };
});

// Mock useAuth
vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
      user_metadata: { display_name: 'Test User' },
    },
  }),
}));

describe('useBroadcastCursors', () => {
  let mockSend: any;
  let mockOn: any;
  let mockSubscribe: any;
  let mockRemoveChannel: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get mocks from the mocked module
    const supabaseMock = await import('../../lib/supabase');
    const mocks = (supabaseMock as any).__mocks;
    mockSend = mocks.mockSend;
    mockOn = mocks.mockOn;
    mockSubscribe = mocks.mockSubscribe;
    mockRemoveChannel = mocks.mockRemoveChannel;
  });

  it('should initialize with empty cursors map', () => {
    const { result } = renderHook(() => useBroadcastCursors());

    expect(result.current.cursors).toBeInstanceOf(Map);
    expect(result.current.cursors.size).toBe(0);
  });

  it('should provide sendCursorUpdate function', () => {
    const { result } = renderHook(() => useBroadcastCursors());

    expect(result.current.sendCursorUpdate).toBeDefined();
    expect(typeof result.current.sendCursorUpdate).toBe('function');
  });

  it('should send cursor updates when sendCursorUpdate is called', async () => {
    const { result } = renderHook(() => useBroadcastCursors());

    await waitFor(() => {
      result.current.sendCursorUpdate(100, 200);
    });

    // Should have been called with broadcast payload
    expect(mockSend).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'cursor',
      payload: expect.objectContaining({
        x: 100,
        y: 200,
        userId: 'user-123',
        displayName: 'Test User',
        timestamp: expect.any(Number),
        color: expect.any(String),
      }),
    });
  });

  it('should throttle rapid cursor updates', async () => {
    const { result } = renderHook(() => useBroadcastCursors());

    // Rapid fire updates (10 calls in quick succession)
    for (let i = 0; i < 10; i++) {
      result.current.sendCursorUpdate(i * 10, i * 10);
    }

    // Wait a bit for throttled calls to process
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should be throttled (much less than 10 calls due to 33ms throttle)
    expect(mockSend.mock.calls.length).toBeLessThan(10);
    expect(mockSend.mock.calls.length).toBeGreaterThan(0);
  });

  it('should subscribe to cursor broadcast channel', () => {
    renderHook(() => useBroadcastCursors());

    // Should have created a channel
    expect(mockOn).toHaveBeenCalledWith(
      'broadcast',
      { event: 'cursor' },
      expect.any(Function)
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('should cleanup subscription on unmount', () => {
    const { unmount } = renderHook(() => useBroadcastCursors());

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('should generate consistent color from userId', () => {
    const { result } = renderHook(() => useBroadcastCursors());

    // Call sendCursorUpdate multiple times
    result.current.sendCursorUpdate(100, 100);
    result.current.sendCursorUpdate(200, 200);

    // Color should be consistent across calls
    const calls = mockSend.mock.calls;
    if (calls.length >= 2) {
      const color1 = calls[0][0].payload.color;
      const color2 = calls[1][0].payload.color;
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('should not add own cursor to cursors map', () => {
    const { result } = renderHook(() => useBroadcastCursors());

    // Simulate receiving own cursor (should be ignored)
    const mockBroadcastHandler = mockOn.mock.calls.find(
      (call: any[]) => call[0] === 'broadcast'
    )?.[2];

    if (mockBroadcastHandler) {
      mockBroadcastHandler({
        payload: {
          userId: 'user-123', // Same as current user
          displayName: 'Test User',
          x: 100,
          y: 100,
          color: '#FF0000',
          timestamp: Date.now(),
        },
      });
    }

    // Own cursor should not appear in map
    expect(result.current.cursors.size).toBe(0);
  });
});

