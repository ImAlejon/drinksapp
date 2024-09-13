'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { User } from '@supabase/auth-helpers-react'
import { DropResult } from '@hello-pangea/dnd'
import SearchResults from './components/SearchResults'
import VideoPlayer from './components/VideoPlayer'
import PlaylistView from './components/PlaylistView'
import { Button } from "@/components/ui/button"
import FloatingMenu from '@/components/FloatingMenu'
import FullScreenQRCode from '@/components/FullScreenQRCode'
import { YouTubePlayer } from 'youtube-player/dist/types'
import YouTube from 'react-youtube'

interface Video {
  id: string
  title: string
  thumbnail: string
}

interface Song extends Video {
  playlistId: string
}

const YouTubePlaylistCreator: React.FC = () => {
  const { supabase } = useSupabase()

  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchResults] = useState<Video[]>([])
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(100)
  const [currentTime, setCurrentTime] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const lastUpdateTime = useRef(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [showFullScreenQR] = useState(false)

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setIsLoading(true)
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error
        setUser(user)
        // Perform other necessary initializations here
      } catch (error) {
        console.error('Initialization error:', error)
        setError('Failed to initialize. Please try reloading the page.')
      } finally {
        setIsLoading(false)
      }
    }

    initializeComponent()
  }, [supabase])

  useEffect(() => {
    if (!sessionId) return;

    const initializeSession = async () => {
        await fetchPlaylist(sessionId)
        const { data: playbackState, error: playbackError } = await supabase
          .from('playback_states')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle()

        if (playbackError && playbackError.code !== 'PGRST116') {
          console.error('Error fetching playback state:', playbackError)
        } else if (playbackState) {
          setIsPlaying(playbackState.is_playing)
          setCurrentTime(playbackState.current_time)
        } else {
          setIsPlaying(false)
          setCurrentTime(0)
        }

        const { data: currentSongData, error: currentSongError } = await supabase
          .from('current_songs')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle()

        if (currentSongError && currentSongError.code !== 'PGRST116') {
          console.error('Error fetching current song:', currentSongError)
        } else if (currentSongData) {
          setCurrentSong(currentSongData.song)
        } else {
          setCurrentSong(null)
        }

        setIsInitialized(true)
      
    }

    initializeSession()

    const playbackStateChannel = supabase.channel(`playback_state:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playback_states' }, async payload => {
        if (payload.new && 'is_playing' in payload.new && 'current_time' in payload.new) {
          setIsPlaying(payload.new.is_playing)
          if (!isSeeking && playerRef.current) {
            const currentPlayerTime = await playerRef.current.getCurrentTime()
            const newTime = payload.new.current_time
            if (Math.abs(currentPlayerTime - newTime) > 3) {
              playerRef.current.seekTo(newTime, true)
              setCurrentTime(newTime)
            }
          }
          payload.new.is_playing ? playerRef.current?.playVideo() : playerRef.current?.pauseVideo()
        }
      })
      .subscribe()

    const playlistChannel = supabase.channel(`playlist:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, (payload) => {
        if (payload.new && 'songs' in payload.new) {
          setPlaylist(payload.new.songs)
        }
      })
      .subscribe()

    const currentSongChannel = supabase.channel(`current_song:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'current_songs' }, payload => {
        if (payload.new && 'song' in payload.new) {
          setCurrentSong(payload.new.song)
          setIsPlaying(true)
        } else {
          setCurrentSong(null)
          setIsPlaying(false)
        }
      })
      .subscribe()

    return () => {
      playbackStateChannel.unsubscribe()
      playlistChannel.unsubscribe()
      currentSongChannel.unsubscribe()
    }
  }, [sessionId, supabase, isSeeking])

  const updatePlaybackState = useCallback((newPlayingState: boolean, newTime: number) => {
    const now = Date.now()
    if (sessionId && (now - lastUpdateTime.current > 3000 || newPlayingState !== isPlaying)) {
      supabase
        .from('playback_states')
        .upsert({ session_id: sessionId, is_playing: newPlayingState, current_time: newTime })
      lastUpdateTime.current = now
    }
  }, [sessionId, isPlaying, supabase])

  const handleSeek = useCallback((value: number) => {
    setIsSeeking(true)
    const newTime = (value / 100) * duration
    setCurrentTime(newTime)
  }, [duration])

  const handleSeekEnd = useCallback(async (value: number) => {
    setIsSeeking(false)
    if (playerRef.current) {
      const newTime = (value / 100) * duration
      playerRef.current.seekTo(newTime, true)
      setCurrentTime(newTime)
      await updatePlaybackState(isPlaying, newTime)
    }
  }, [isPlaying, updatePlaybackState, duration])

  const handleSkip = useCallback(async (skipAmount: number) => {
    if (playerRef.current) {
      const currentTime = await playerRef.current.getCurrentTime()
      const duration = await playerRef.current.getDuration()
      const newTime = Math.max(0, Math.min(duration, currentTime + skipAmount))
      playerRef.current.seekTo(newTime, true)
      setCurrentTime(newTime)
      await updatePlaybackState(isPlaying, newTime)
    }
  }, [isPlaying, updatePlaybackState])

  if (isLoading) {
    return <div>Loading... Please wait.</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  const createPlaylist = async (playlistName: string) => {
    if (!user) return

    try {
      const response = await fetch('/api/playlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: playlistName }),
      })

      const data = await response.json()
      console.log('Playlist response:', data)

      if (response.ok) {
        setSessionId(data.sessionId)
        setIsOwner(true)
        await fetchPlaylist(data.sessionId)
      } else {
        throw new Error(data.error || 'Failed to create playlist')
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
      setError('Failed to create playlist. Please try again.')
    }
  }

  const fetchPlaylist = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/playlists?sessionId=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched playlist data:', data)
        setPlaylist(data.songs || [])
        
        const isOwner = user?.id === data.host_id
        console.log('Fetch playlist - Is owner:', isOwner)
        setIsOwner(isOwner)
      } else {
        console.error('Error fetching playlist:', await response.text())
      }
    } catch (error) {
      console.error('Error fetching playlist:', error)
    }
  }

  const handleJoinSession = async (inputSessionId: string) => {
    if (!inputSessionId.trim()) return;

    try {
      const {error} = await supabase
        .from('playlists')
        .select('*')
        .eq('session_id', inputSessionId)
        .single();

      if (error) throw error;

      setSessionId(inputSessionId);
      setIsOwner(false);
      await fetchPlaylist(inputSessionId);
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session. Please check the session ID and try again.');
    }
  };

  const addToPlaylist = async (video: Video) => {
    console.log('Adding to playlist. Is owner:', isOwner)
    if (sessionId && isOwner) {
      const newSong: Song = {
        ...video,
        playlistId: `playlist-${video.id}`,
        thumbnail: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`
      }
      const updatedPlaylist = [...playlist, newSong]
      
      try {
        const response = await fetch(`/api/playlists?sessionId=${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ songs: updatedPlaylist }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`)
        }

        const data = await response.json()
        setPlaylist(data.songs)
      } catch (error) {
        console.error('Error adding song to playlist:', error)
        setError('Failed to add song to playlist. Please try again.')
      }
    } else if (!isOwner) {
      console.log('Not owner, cannot add to playlist')
      setError('Only the playlist owner can add songs')
    } else {
      console.error('No session ID available')
      setError('No active playlist session. Please create or join a playlist.')
    }
  }

  const removeFromPlaylist = async (playlistId: string) => {
    if (sessionId && isOwner) {
      const updatedPlaylist = playlist.filter(song => song.playlistId !== playlistId)
      
      const response = await fetch(`/api/playlists?sessionId=${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ songs: updatedPlaylist }),
      })

      if (response.ok) {
        setPlaylist(updatedPlaylist)
      } else {
        console.error('Error removing song from playlist:', await response.text())
      }
    } else if (!isOwner) {
      setError('Only the playlist owner can remove songs')
    }
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !sessionId || !isOwner) return;

    const items = Array.from(playlist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const response = await fetch(`/api/playlists?sessionId=${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ songs: items }),
    })

    if (response.ok) {
      setPlaylist(items)
    } else {
      console.error('Error reordering playlist:', await response.text())
    }
  }

  const playNextSong = async () => {
    if (sessionId && playlist.length > 0) {
      const nextSong = playlist[0]
      const updatedPlaylist = playlist.slice(1)

      const { error: playlistError } = await supabase
        .from('playlists')
        .upsert({ session_id: sessionId, songs: updatedPlaylist })

      const { error: currentSongError } = await supabase
        .from('current_songs')
        .upsert({ session_id: sessionId, song: nextSong })

      if (playlistError || currentSongError) {
        console.error('Error playing next song:', playlistError || currentSongError)
      }
    } else if (sessionId) {
      const { error } = await supabase
        .from('current_songs')
        .delete()
        .eq('session_id', sessionId)

      if (error) {
        console.error('Error clearing current song:', error)
      }
    }
  }

const onPlayerReady = (event: { target: YouTubePlayer }) => {
  playerRef.current = event.target
  event.target.getDuration().then(duration => {
    setDuration(Math.max(1, duration))
  })
  if (isInitialized && currentTime > 0) {
    event.target.seekTo(currentTime, true)
    if (isPlaying) {
      event.target.playVideo()
    }
  }
}

const onPlayerStateChange = (event: { data: number; target: YouTubePlayer }) => {
  if (event.data === YouTube.PlayerState.PLAYING) {
    setIsPlaying(true)
    event.target.getCurrentTime().then(time => {
      updatePlaybackState(true, time)
    })
  } else if (event.data === YouTube.PlayerState.PAUSED) {
    setIsPlaying(false)
    event.target.getCurrentTime().then(time => {
      updatePlaybackState(false, time)
    })
  } else if (event.data === YouTube.PlayerState.ENDED) {
    setIsPlaying(false)
    setCurrentTime(0)
    updatePlaybackState(false, 0)
    playNextSong()
  }
}


  

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
      setIsPlaying(!isPlaying)
    }
  }

  function handleCloseQRCode(): void {
    throw new Error('Function not implemented.')
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg relative">
      <h1 className="text-2xl font-bold">        Hi {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'}!
      </h1>
      {error && <p className="text-red-500">{error}</p>}
      {isLoading ? (
        <p className="text-center">Loading...</p>
      ) : (
        isOwner && <SearchResults results={searchResults} onAddToPlaylist={addToPlaylist} />
      )}

      {currentSong && isOwner && (
        <VideoPlayer
          currentSong={currentSong}
          isPlaying={isPlaying}
          onPlayerReady={onPlayerReady}
          onPlayerStateChange={onPlayerStateChange}
          onTogglePlayPause={togglePlayPause}
          onSkip={handleSkip}
          onSkipSong={playNextSong}
          duration={duration}
          currentTime={currentTime}
          onSeek={handleSeek}
          onSeekEnd={handleSeekEnd}
        />
      )}

      <PlaylistView
        playlist={playlist}
        isOwner={isOwner}
        onRemoveFromPlaylist={removeFromPlaylist}
        onDragEnd={onDragEnd}
      />

      {playlist.length > 0 && !currentSong && (
        <Button onClick={playNextSong} className="mt-4">
          Start Playing
        </Button>
      )}

      <FloatingMenu
        onCreatePlaylist={createPlaylist}
        onJoinSession={handleJoinSession}
        sessionId={sessionId}
        hasActiveSession={!!sessionId}
      />

      {showFullScreenQR && sessionId && (
        <FullScreenQRCode 
          value={sessionId} 
          onClose={handleCloseQRCode}
        />
      )}
    </div>
  )
}


export default YouTubePlaylistCreator