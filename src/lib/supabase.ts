/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    timeout: 30000, // 30 seconds timeout (increased from default 10s)
    heartbeatIntervalMs: 15000, // Send heartbeat every 15s (default is 30s)
  },
  global: {
    headers: {
      'X-Client-Info': 'collabcanvas-web',
    },
  },
});

// Log Supabase connection info (without exposing keys)
console.log('🔌 Supabase client initialized');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Anon key configured:', supabaseAnonKey ? '✅ Yes' : '❌ No');

