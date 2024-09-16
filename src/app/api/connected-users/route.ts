import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('connected_users')
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;

    return NextResponse.json({ connectedUsers: data });
  } catch (error) {
    console.error('Error fetching connected users:', error);
    return NextResponse.json({ error: 'Failed to fetch connected users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, userName } = await req.json();

    if (!sessionId || !userName) {
      return NextResponse.json({ error: 'Session ID and user name are required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('connected_users')
      .upsert({ 
        user_id: session.user.id, 
        session_id: sessionId,
        name: userName,
        last_ping: new Date().toISOString()
      });

    if (error) {
      console.error('Error connecting user to session:', error);
      return NextResponse.json({ error: 'Failed to connect user to session' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User connected to session successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('connected_users')
      .delete()
      .match({ user_id: user.id, session_id: sessionId });

    if (error) {
      console.error('Error leaving session:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Successfully left session' }, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}