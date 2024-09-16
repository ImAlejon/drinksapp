import { createClient } from '@supabase/supabase-js';

export function startCleanupScheduler() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials are not set in environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  setInterval(async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('connected_users')
      .delete()
      .lt('last_ping', fiveMinutesAgo);

    if (error) {
      console.error('Error cleaning up inactive users:', error);
    } 
  }, 5 * 60 * 1000); // Run every 5 minutes
}
