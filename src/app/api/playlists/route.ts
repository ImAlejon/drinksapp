import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      console.error('No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the user already has a playlist
    const { data: existingPlaylist, error: existingPlaylistError } = await supabase
      .from('playlists')
      .select('session_id')
      .eq('host_id', session.user.id)
      .single()

    if (existingPlaylistError && existingPlaylistError.code !== 'PGRST116') {
      console.error('Error checking existing playlist:', existingPlaylistError)
      return NextResponse.json({ error: existingPlaylistError.message }, { status: 400 })
    }

    if (existingPlaylist) {
      return NextResponse.json({ error: 'User already has a playlist', sessionId: existingPlaylist.session_id }, { status: 400 })
    }

    const { name } = await req.json()

    console.log('Creating playlist:', name)

    // Generate a unique session ID
    const sessionId = crypto.randomUUID()

    // Create the playlist with an empty songs array and the generated session_id
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert({ session_id: sessionId, name, host_id: session.user.id, songs: [] })
      .select()
      .single()

    if (playlistError) {
      console.error('Error creating playlist:', playlistError)
      return NextResponse.json({ error: playlistError.message }, { status: 400 })
    }

    if (!playlist || !playlist.session_id) {
      console.error('Playlist created but session_id is missing:', playlist)
      return NextResponse.json({ error: 'Playlist created but session_id is missing' }, { status: 500 })
    }

    console.log('Playlist created:', playlist)

    // Create a playlist session
    const { data: playlistSession, error: sessionError } = await supabase
      .from('playlist_sessions')
      .insert({ playlist_id: playlist.session_id, session_id: sessionId })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating playlist session:', sessionError)
      return NextResponse.json({ error: sessionError.message }, { status: 400 })
    }

    console.log('Playlist session created:', playlistSession)

    return NextResponse.json({ playlist, sessionId })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_sessions!playlist_sessions_playlist_id_fkey(*)
      `)
      .eq('session_id', sessionId)
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching playlist:', error)
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 400 })
    } else {
      return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
    }
  }
}

export async function PATCH(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
  }

  try {
    const { songs } = await req.json()

    const { data, error } = await supabase
      .from('playlists')
      .update({ songs })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!data) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating playlist:', error)
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return NextResponse.json({ error: (error as { message: string }).message }, { status: 400 })
    } else {
      return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
    }
  }
}