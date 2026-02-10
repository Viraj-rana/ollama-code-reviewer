import { createClient } from '@supabase/supabase-js';

// NOTE: These should ideally be in .env files (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)
// For this MVP, we will try to read them from env, or allow manual entry in settings if needed.
// Users must add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to their .env file.

const getEnv = () => {
  try {
    // @ts-ignore
    return import.meta.env || {};
  } catch (e) {
    return {};
  }
};

const env = getEnv();

// We use the provided credentials as default if environment variables are not set
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://innhtkqrvjqiuuetzxqh.supabase.co';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlubmh0a3FydmpxaXV1ZXR6eHFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDk5NzgsImV4cCI6MjA4NTI4NTk3OH0.Q_QHP2LYQjAk0c2u3fijuiYNKlw4kqrW1UqGBxUMfnA';

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export const isSupabaseConfigured = () => !!supabase;