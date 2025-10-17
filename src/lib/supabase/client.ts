/**
 * Supabase Client Configuration
 *
 * Initializes the Supabase client for database, auth, and real-time features
 * Part of W1.D4 integration layer
 *
 * Features:
 * - PostgreSQL database operations
 * - Real-time subscriptions
 * - User authentication
 * - Row-level security
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
  );
}

/**
 * Supabase client instance
 *
 * Configured with:
 * - TypeScript database types for type safety
 * - Real-time enabled for live collaboration
 * - Auto-refresh for session management
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Rate limit for real-time events
    },
  },
});

/**
 * Get current user session
 */
export async function getSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Error getting session:', error);
    return null;
  }

  return session;
}

/**
 * Get current authenticated user
 */
export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting user:', error);
    return null;
  }

  return user;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}
