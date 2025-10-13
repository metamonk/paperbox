import { describe, it, expect } from 'vitest';
import { supabase } from '../supabase';

describe('Supabase Connection', () => {
  it('should have valid environment variables', () => {
    expect(import.meta.env.VITE_PUBLIC_SUPABASE_URL).toBeDefined();
    expect(import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY).toBeDefined();
    // Accept both localhost (test) and supabase.co (production)
    const url = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
    expect(url).toMatch(/supabase\.co|localhost/);
  });

  it('should create supabase client successfully', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(supabase.from).toBeDefined();
  });

  it('should connect to Supabase', async () => {
    // Test a simple query to verify connection
    const { data, error } = await supabase.auth.getSession();
    
    // We expect no error (even if no session exists, connection works)
    expect(error).toBeNull();
    // Data should be defined (even if session is null)
    expect(data).toBeDefined();
  });
});

