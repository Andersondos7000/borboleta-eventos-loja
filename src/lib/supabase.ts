
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pxcvoiffnandpdyotped.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4Y3ZvaWZmbmFuZHBkeW90cGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4ODE3MTIsImV4cCI6MjA2MTQ1NzcxMn0.nP5x007Tb89eGe4wpZFdayQ_gQ_mQzDeW_NKf4ugHM8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage
  }
});
