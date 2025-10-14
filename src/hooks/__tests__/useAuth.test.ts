import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { User, AuthResponse, Session } from '@supabase/supabase-js';
import { useAuth } from '../useAuth';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for getSession
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
  });

  it('should sign up a new user with auto-generated display name', async () => {
    const mockUser = { id: '123', email: 'test@example.com' } as User;
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    } as AuthResponse);

    const { result } = renderHook(() => useAuth());

    // Wait for initial loading to finish
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await waitFor(async () => {
      await result.current.signUp('test@example.com', 'password');
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
      options: {
        data: { display_name: 'test' },
      },
    });
  });

  it('should sign in an existing user', async () => {
    const mockUser = { id: '123', email: 'test@example.com' } as User;
    const mockSession = {} as Session;
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    } as any);

    const { result } = renderHook(() => useAuth());

    // Wait for initial loading to finish
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await waitFor(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('should sign out user', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth());

    // Wait for initial loading to finish
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await waitFor(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('should extract correct display name from various email formats', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    // Wait for initial loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test with dots in email
    await result.current.signUp('john.doe@example.com', 'password');
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { data: { display_name: 'john.doe' } },
      })
    );

    // Test with underscores
    vi.mocked(supabase.auth.signUp).mockClear();
    await result.current.signUp('jane_smith@company.com', 'password');
    expect(supabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { data: { display_name: 'jane_smith' } },
      })
    );
  });

  it('should handle sign up errors', async () => {
    const mockError = new Error('Email already registered');
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    } as AuthResponse);

    const { result } = renderHook(() => useAuth());

    // Wait for initial loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      result.current.signUp('test@example.com', 'password')
    ).rejects.toThrow('Email already registered');
  });

  it('should handle sign in errors', async () => {
    const mockError = new Error('Invalid credentials');
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    } as any);

    const { result } = renderHook(() => useAuth());

    // Wait for initial loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(
      result.current.signIn('test@example.com', 'wrongpassword')
    ).rejects.toThrow('Invalid credentials');
  });
});

