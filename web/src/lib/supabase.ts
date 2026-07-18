import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Browser-safe client — uses anon key, subject to RLS.
 * Call supabaseBrowser() in Client Components.
 */
export const supabaseBrowser = () =>
  createClient(supabaseUrl(), supabaseAnonKey());

/**
 * Server-side admin client — uses service role key, bypasses RLS.
 * Use ONLY in API Route Handlers. Never expose to the browser.
 */
export const supabaseService = () =>
  createClient(supabaseUrl(), supabaseServiceKey(), {
    auth: { persistSession: false },
  });
