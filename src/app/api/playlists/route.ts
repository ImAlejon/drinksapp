import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { name } = await req.json()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Deactivate any existing active playlists for this user
    await supabase
      .from('playlists')
      .update({ is_active: false })
      .eq('host_id', user.id)
      .eq('is_active', true)

    // Create the new playlist
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name,
        host_id: user.id,
        is_active: true,  // Set the new playlist as active
        songs: []
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating playlist:', error)
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
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

    console.log('API - Returning playlist data:', data)
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

  const { songs, is_playing, current_song_index } = await req.json()

  try {
    // Define a type for the song structure
    type Song = {
      id: string;
      title: string;
      // Add other properties that your songs have
    };

    const updateData: {
      songs?: Song[];
      is_playing?: boolean;
      current_song_index?: number;
    } = {}

    if (songs !== undefined) updateData.songs = songs as Song[]
    if (is_playing !== undefined) updateData.is_playing = is_playing
    if (current_song_index !== undefined) updateData.current_song_index = current_song_index

    const { data, error } = await supabase
      .from('playlists')
      .update(updateData)
      .eq('session_id', sessionId)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating playlist:', error)
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 })
  }
}