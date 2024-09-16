import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.log('No user found')
      return NextResponse.json({ activeSession: null })
    }

    console.log('User ID:', user.id)

    const { data, error } = await supabase
      .from('playlists')
      .select('session_id, name, is_active, host_id, songs')
      .eq('host_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Error fetching playlist:', error)
      throw error
    }

    console.log('Active session data:', data)
    return NextResponse.json({ activeSession: data })
  } catch (error) {
    console.error('Error checking active session:', error)
    return NextResponse.json({ error: 'Failed to check active session' }, { status: 500 })
  }
}