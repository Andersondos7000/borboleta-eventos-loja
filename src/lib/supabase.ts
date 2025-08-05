
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pxcvoiffnandpdyotped.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3ZvaWZmbmFuZHBkeW90cGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4ODE3MTIsImV4cCI6MjA2MTQ1NzcxMn0.nP5x007Tb89eGe4wpZFdayQ_gQ_mQzDeW_NKf4ugHM8';

// Prevent multiple instances with a more robust singleton pattern
const SUPABASE_STORAGE_KEY = 'borboleta-eventos-auth-v2';

// Check if instance already exists in global scope
declare global {
  interface Window {
    __supabase_instance?: any;
  }
}

const getSupabaseClient = () => {
  // Check if already exists in window
  if (typeof window !== 'undefined' && window.__supabase_instance) {
    return window.__supabase_instance;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: localStorage,
      storageKey: SUPABASE_STORAGE_KEY,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: {
      headers: {
        'X-Client-Info': 'borboleta-eventos-loja-v2'
      }
    }
  });

  // Store in window to prevent multiple instances
  if (typeof window !== 'undefined') {
    window.__supabase_instance = client;
  }

  return client;
};

export const supabase = getSupabaseClient();
