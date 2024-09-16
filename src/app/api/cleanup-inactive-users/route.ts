import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();

  const { error } = await supabase
    .from('connected_users')
    .delete()
    .lt('last_ping', thirtySecondsAgo);

  if (error) {
    console.error('Error cleaning up inactive users:', error);
    return NextResponse.json({ error: 'Failed to clean up inactive users' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Inactive users cleaned up successfully' });
}