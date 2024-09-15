import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { name } = await req.json()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    console.error('No authenticated user found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if a playlist with this name already exists
  const { data: existingPlaylists, error: fetchError } = await supabase
    .from('playlists')
    .select('name')
    .eq('name', name)

  if (fetchError) {
    console.error('Error checking for existing playlists:', fetchError)
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 })
  }

  if (existingPlaylists && existingPlaylists.length > 0) {
    return NextResponse.json({ error: 'A playlist with this name already exists' }, { status: 400 })
  }

  // If no existing playlist found, proceed with creation
  const sessionId = crypto.randomUUID()

  console.log('Attempting to create playlist for user:', user.id)

  try {
    // Check if the user already has a playlist
    const { data: existingPlaylist, error: existingError } = await supabase
      .from('playlists')
      .select('session_id, host_id')
      .eq('host_id', user.id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError
    }

    if (existingPlaylist) {
      console.log('User already has a playlist:', existingPlaylist)
      return NextResponse.json({ 
        message: 'User already has a playlist',
        sessionId: existingPlaylist.session_id,
        hostId: existingPlaylist.host_id
      }, { status: 200 })
    }

    // Create a new playlist
    const { data, error } = await supabase
      .from('playlists')
      .insert({ name, host_id: user.id })
      .select()
      .single()

    if (error) throw error

    console.log('New playlist created:', data)
    console.log('Playlist creation result:', data)
    return NextResponse.json({ 
      message: 'Playlist created successfully',
      sessionId: data.session_id,
      hostId: data.host_id
    })
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

  const { songs } = await req.json()

  try {
    const { data, error } = await supabase
      .from('playlists')
      .update({ songs: songs })
      .eq('session_id', sessionId)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating playlist:', error)
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 })
  }
}