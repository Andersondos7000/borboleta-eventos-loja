
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fdswhhckvweghcavgdvb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkc3doaGNrdndlZ2hjYXZnZHZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NTU0NjIsImV4cCI6MjA3MTEzMTQ2Mn0.8ei1-GdvgWdr_X6BC0Wh2Rr8USJfIDStM0vNY9MGk1U';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage
  }
});
