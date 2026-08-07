import { createClient } from '@supabase/supabase-js';

// for this MVP's, we will try to read them from env, or allow manual entry in settings.
// users must add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to their .env file. if they are using supabase db


const getEnv = (): Record<string, string> => {
  try {
    // @ts-ignore - import.meta.env is Vite-specific
    return import.meta.env || {};
  } catch (e) {
   return {};
  }
};

const env = getEnv();

// Require environment variables to be set - no fallback credentials for security
const supabaseUrl = (env as any).VITE_SUPABASE_URL;
const supabaseKey = (env as any).VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Configuration incomplete. Cloud features disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.');
}

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;
