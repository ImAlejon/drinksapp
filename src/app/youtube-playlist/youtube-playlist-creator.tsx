'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSupabase } from '@/components/SupabaseProvider'
import { User } from '@supabase/auth-helpers-react'
import { DropResult } from '@hello-pangea/dnd'
import SearchForm from './components/SearchForm'
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
  const [searchResults, setSearchResults] = useState<Video[]>([])
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(100)
  const [currentTime, setCurrentTime] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const playerRef = useRef<YouTubePlayer | null>(null)
  const [isInitialized] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [showFullScreenQR] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [sessionName, setSessionName] = useState<string | null>(null)
  const [, setIsSeeking] = useState(false)
  const lastUpdateTime = useRef(0)

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

  const joinSession = async (inputSessionId: string) => {
    try {
      const response = await fetch(`/api/playlists?sessionId=${inputSessionId}`)
      if (!response.ok) {
        throw new Error('Invalid session ID')
      }
      
      const data = await response.json()
      setSessionId(inputSessionId)
      setSessionName(data.name)
      setPlaylist(data.songs || [])
      setIsOwner(user?.id === data.host_id)
    } catch (error) {
      console.error('Error joining session:', error)
      setError('Failed to join session. Please check the session ID and try again.')
    }
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

      if (response.ok) {
        setSessionId(data.sessionId)
        setSessionName(playlistName)
        setIsOwner(true)
        setPlaylist([])
      } else {
        throw new Error(data.error || 'Failed to create playlist')
      }
    } catch (error) {
      console.error('Error creating playlist:', error)
      setError('Failed to create playlist. Please try again.')
    }
  }

  const handleSearch = async (query: string) => {
    setIsSearching(true)
    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      setSearchResults(data.videos)
    } catch (error) {
      console.error('Error searching for videos:', error)
      setError('Failed to search for videos. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const addToPlaylist = async (video: Video) => {
    if (sessionId) {
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
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setPlaylist(data.songs)
      } catch (error) {
        console.error('Error adding song to playlist:', error)
        setError('Failed to add song to playlist. Please try again.')
      }
    } else {
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

      try {
        const response = await fetch(`/api/playlists?sessionId=${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ songs: updatedPlaylist, currentSong: nextSong }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        setPlaylist(data.songs)
        setCurrentSong(nextSong)
      } catch (error) {
        console.error('Error playing next song:', error)
        setError('Failed to play next song. Please try again.')
      }
    } else if (sessionId) {
      setCurrentSong(null)
      try {
        await fetch(`/api/playlists?sessionId=${sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ currentSong: null }),
        })
      } catch (error) {
        console.error('Error clearing current song:', error)
      }
    }
  }

  const onPlayerReady = async (event: { target: YouTubePlayer }) => {
  playerRef.current = event.target
  const duration = event.target.getDuration()
  setDuration(Math.max(1, await duration))
  
  if (isInitialized && currentTime > 0) {
    event.target.seekTo(currentTime, true)
    if (isPlaying) {
      event.target.playVideo()
    }
  }
}

 const onPlayerStateChange = async (event: { data: number; target: YouTubePlayer }) => {
  if (typeof event.target.getCurrentTime !== 'function') {
    console.error('YouTube player not properly initialized');
    return;
  }

  const currentTime = await event.target.getCurrentTime();

  if (event.data === YouTube.PlayerState.PLAYING) {
    setIsPlaying(true);
    setCurrentTime(currentTime);
    updatePlaybackState(true, currentTime);
  } else if (event.data === YouTube.PlayerState.PAUSED) {
    setIsPlaying(false);
    setCurrentTime(currentTime);
    updatePlaybackState(false, currentTime);
  } else if (event.data === YouTube.PlayerState.ENDED) {
    setIsPlaying(false);
    setCurrentTime(0);
    updatePlaybackState(false, 0);
    playNextSong();
  }
};

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
  setIsSeeking(true);
  setCurrentTime(value);
}, []);

const handleSeekEnd = useCallback(async (value: number) => {
  setIsSeeking(false);
  if (playerRef.current) {
    await playerRef.current.seekTo(value, true);
    setCurrentTime(value);
    await updatePlaybackState(isPlaying, value);
  }
}, [isPlaying, updatePlaybackState]);

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

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && playerRef.current) {
      interval = setInterval(async () => {
        const currentTime = await playerRef.current?.getCurrentTime() || 0;
        setCurrentTime(currentTime);
      }, 1000); // Update every second
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg relative">
      {!sessionId && (<h1 className="text-2xl font-bold mb-4 text-center">Hi {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'}!</h1>)}
      {sessionId && (<h1 className="text-2xl font-bold mb-4 text-center">Now Playing: {currentSong?.title}</h1>)}
      {error && <p className="text-red-500">{error}</p>}
      {isLoading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <>
          {!sessionId && (
      (<text className="mb-2 text-sm text-gray-600">Click on the menu to create or join a session</text>)
          )}
          {sessionId && (
            <>
              <p>Current Session: {sessionName || sessionId}</p>
              <SearchForm onSearch={handleSearch} isLoading={isSearching} />
              <SearchResults results={searchResults} onAddToPlaylist={addToPlaylist} />
              <PlaylistView playlist={playlist} isOwner={isOwner} onRemoveFromPlaylist={removeFromPlaylist} onDragEnd={onDragEnd} />
            </>
          )}
          {currentSong && (
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

          { isOwner && playlist.length > 0 && !currentSong && (
            <Button onClick={playNextSong} className="mt-4">
              Start Playing
            </Button>
          )}

          <FloatingMenu
            onCreatePlaylist={createPlaylist}
            onJoinSession={joinSession}
            sessionId={sessionId}
            hasActiveSession={!!sessionId}
          />

          {showFullScreenQR && sessionId && (
            <FullScreenQRCode 
              value={sessionId} 
              onClose={handleCloseQRCode}
            />
          )}
        </>
      )}
    </div>
  )
}

export default YouTubePlaylistCreator
