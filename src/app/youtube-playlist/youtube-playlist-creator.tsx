'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, PlusCircle, Music, Trash2, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import YouTube from 'react-youtube'
import { Range} from 'react-range'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from '@supabase/supabase-js'
import QRCode from 'react-qr-code'
import { Html5QrcodeScanner } from 'html5-qrcode'
import Image from 'next/image'

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Video {
  id: string
  title: string
  thumbnail: string
}

interface Song extends Video {
  playlistId: string
}

const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

const YouTubePlaylistCreator: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Video[]>([])
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(100) // Set a default value > 0
  const [currentTime, setCurrentTime] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionInputId, setSessionInputId] = useState('')
  const playerRef = useRef<any>(null)
  const [showScanner, setShowScanner] = useState(false)
  const qrCodeRef = useRef<HTMLDivElement>(null)
  const lastUpdateTime = useRef(0)
  const [isInitialized, setIsInitialized] = useState(false)
  const [volume, setVolume] = useState(100)
  const [prevVolume, setPrevVolume] = useState(100)
  const [playlistName, setPlaylistName] = useState('')
  const [progress, setProgress] = useState(0)
  const currentTimeRef = useRef(0)

  useEffect(() => {
    const initializeSession = async () => {
      if (sessionId) {
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
          // No playback state found, initialize with default values
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
          // No current song found, set to null
          setCurrentSong(null)
        }

        setIsInitialized(true)
      }
    }

    initializeSession()

    const playbackStateChannel = supabase.channel(`playback_state:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playback_states' }, payload => {
        if (payload.new && 'is_playing' in payload.new && 'current_time' in payload.new) {
          setIsPlaying(payload.new.is_playing)
          if (!isSeeking && playerRef.current) {
            const currentPlayerTime = playerRef.current.getCurrentTime()
            const newTime = payload.new.current_time
            // Only seek if the difference is more than 3 seconds
            if (Math.abs(currentPlayerTime - newTime) > 3) {
              playerRef.current.seekTo(newTime)
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
  }, [sessionId, isSeeking])

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (showScanner && qrCodeRef.current) {
      scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 }, false);
      scanner.render(onScanSuccess, onScanError);
    }
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [showScanner]);

  const onScanSuccess = (decodedText: string) => {
    setSessionInputId(decodedText);
    setShowScanner(false);
    // Optionally, you can automatically set the session here
    // handleSetSession(new Event('submit') as React.FormEvent)
  };

  const onScanError = (error: any) => {
    console.error(error);
  };

const createPlaylist = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!playlistName) return

  try {
    const response = await fetch('/api/playlists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: playlistName }),
    })

    const data = await response.json()

    if (!response.ok) {
      if (data.error === 'User already has a playlist' && data.sessionId) {
        setSessionId(data.sessionId)
        await fetchPlaylist(data.sessionId)
        setPlaylistName('')
        setError('You already have a playlist. Loaded existing playlist.')
      } else {
        throw new Error(`Failed to create playlist: ${data.error || response.statusText}`)
      }
    } else {
      console.log('Playlist created:', data)
      
      if (!data.sessionId || !data.playlist) {
        throw new Error('Invalid response from server')
      }
      
      setSessionId(data.sessionId)
      setPlaylistName('')
      fetchPlaylist(data.sessionId)
    }
  } catch (error) {
    console.error('Error creating playlist:', error)
    setError('Failed to create playlist. Please try again.')
  }
}
 
  const fetchPlaylist = async (sessionId: string) => {
    const response = await fetch(`/api/playlists?sessionId=${sessionId}`)
    if (response.ok) {
      const data = await response.json()
      setPlaylist(data.songs || [])
    } else {
      console.error('Error fetching playlist:', await response.text())
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
    console.error('No session ID available')
    setError('No active playlist session. Please create or join a playlist.')
  }
}

   const removeFromPlaylist = async (playlistId: string) => {
    if (sessionId) {
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
    }
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !sessionId) return;

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

  const searchYouTube = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(searchQuery)}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch videos')
      }

      const data = await response.json()
      console.log('Search results:', data.videos)
      setSearchResults(data.videos || [])
    } catch (err) {
      setError('Failed to fetch videos. Please try again.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const onPlayerReady = (event: any) => {
    playerRef.current = event.target
    setDuration(Math.max(1, event.target.getDuration())) // Ensure duration is at least 1 second
    event.target.setVolume(volume) // Set initial volume
    if (isInitialized && currentTime > 0) {
      event.target.seekTo(currentTime)
      if (isPlaying) {
        event.target.playVideo()
      }
    }
  }

  const onPlayerStateChange = (event: any) => {
    if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true)
      updatePlaybackState(true, event.target.getCurrentTime())
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      setIsPlaying(false)
      updatePlaybackState(false, event.target.getCurrentTime())
    } else if (event.data === YouTube.PlayerState.ENDED) {
      setIsPlaying(false)
      setCurrentTime(0)
      setProgress(0)
      updatePlaybackState(false, 0)
      skipCurrentSong() // Automatically play the next song
    }
  }

  const updatePlaybackState = useCallback((newPlayingState: boolean, newTime: number) => {
    const now = Date.now()
    if (sessionId && (now - lastUpdateTime.current > 3000 || newPlayingState !== isPlaying)) {
      supabase
        .from('playback_states')
        .upsert({ session_id: sessionId, is_playing: newPlayingState, current_time: newTime })
      lastUpdateTime.current = now
    }
  }, [sessionId, isPlaying]);

  const handleSeek = useCallback((value: number) => {
    setIsSeeking(true);
    const newTime = (value / 100) * duration;
    currentTimeRef.current = newTime;
    setProgress(value);
  }, [duration]);

  const handleSeekEnd = useCallback(async (value: number) => {
    setIsSeeking(false);
    if (playerRef.current) {
      const newTime = (value / 100) * duration;
      playerRef.current.seekTo(newTime);
      currentTimeRef.current = newTime;
      setProgress(value);
      await updatePlaybackState(isPlaying, newTime);
    }
  }, [isPlaying, updatePlaybackState, duration]);

  const handleSkip = useCallback(async (skipAmount: number) => {
    if (playerRef.current) {
      const newTime = Math.max(0, Math.min(playerRef.current.getDuration(), currentTime + skipAmount))
      playerRef.current.seekTo(newTime)
      setCurrentTime(newTime)
      await updatePlaybackState(isPlaying, newTime)
    }
  }, [currentTime, isPlaying, updatePlaybackState])

  useEffect(() => {
    let animationFrameId: number;

    const updateProgress = () => {
      if (playerRef.current && !isSeeking && isPlaying) {
        const currentTime = playerRef.current.getCurrentTime();
        const duration = playerRef.current.getDuration();
        currentTimeRef.current = currentTime;
        setProgress((currentTime / duration) * 100);
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, isSeeking]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(Math.max(time, 0) / 60)
    const seconds = Math.floor(Math.max(time, 0) % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  const togglePlayPause = () => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.pause
              playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleSetSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionInputId) {
      sessionStorage.setItem('playlistSessionId', sessionInputId)
      setSessionId(sessionInputId)
      fetchPlaylist(sessionInputId)
      setSessionInputId('') // Clear the input after setting
    }
  }

  const skipCurrentSong = async () => {
    await playNextSong()
  }

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume)
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume)
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      setPrevVolume(volume)
      setVolume(0)
      if (playerRef.current) {
        playerRef.current.setVolume(0)
      }
    } else {
      setVolume(prevVolume)
      if (playerRef.current) {
        playerRef.current.setVolume(prevVolume)
      }
    }
  }, [volume, prevVolume])

  const VolumeControl: React.FC<{
    volume: number;
    onVolumeChange: (volume: number) => void;
    onToggleMute: () => void;
  }> = ({ volume, onVolumeChange, onToggleMute }) => {
    return (
      <div className="flex items-center gap-2 ml-4">
        <Button onClick={onToggleMute} variant="ghost" size="sm">
          {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
        <div className="w-24 relative">
          {typeof window !== 'undefined' && (
            <Range
              values={[volume]}
              step={1}
              min={0}
              max={100}
              onChange={(values) => onVolumeChange(values[0])}
              renderTrack={({ props, children }) => (
                <div
                  {...props}
                  className="h-1 w-full bg-gray-200 rounded-full absolute top-1/2 transform -translate-y-1/2"
                >
                  <div
                    className="h-full bg-blue-500 rounded-full absolute left-0 top-0"
                    style={{ width: `${volume}%` }}
                  />
                  {children}
                </div>
              )}
              renderThumb={({ props }) => (
                <div
                  {...props}
                  className="h-3 w-3 bg-blue-500 rounded-full"
                />
              )}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">YouTube Playlist Creator</h1>
      
      <form onSubmit={createPlaylist} className="mb-6 flex gap-2">
        <Input
          type="text"
          placeholder="Enter playlist name"
          value={playlistName}
          onChange={(e) => setPlaylistName(e.target.value)}
          className="flex-grow"
        />
        <Button type="submit">
          Create Playlist
        </Button>
      </form>

      <form onSubmit={handleSetSession} className="mb-6 flex gap-2">
        <Input
          type="text"
          placeholder="Enter Session ID"
          value={sessionInputId}
          onChange={(e) => setSessionInputId(e.target.value)}
          className="flex-grow"
        />
        <Button type="submit">
          Set Session
        </Button>
      </form>

      <div className="mb-4 flex justify-center">
        <Button onClick={() => setShowScanner(!showScanner)}>
          {showScanner ? 'Hide QR Scanner' : 'Scan QR Code'}
        </Button>
      </div>

      {showScanner && (
        <div id="qr-reader" ref={qrCodeRef} className="mb-6"></div>
      )}

      {sessionId && (
        <div className="mb-6 text-center">
          <p className="mb-2 text-sm text-gray-600">
            Current Session ID: {sessionId}
          </p>
          <QRCode value={sessionId} size={128} />
        </div>
      )}

      <form onSubmit={searchYouTube} className="mb-6 flex gap-2">
        <Input
          type="text"
          placeholder="Search for a song on YouTube"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          required
          className="flex-grow"
        />
        <Button type="submit" disabled={isLoading}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </form>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {isLoading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {searchResults.map(video => (
            <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative h-0 pb-[56.25%]">
                <Image
                  src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                  alt={decodeHtmlEntities(video.title)}
                  width={320}
                  height={180}
                  className="absolute top-0 left-0 w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-medium text-sm mb-2 line-clamp-2">{decodeHtmlEntities(video.title)}</h3>
                <Button onClick={() => addToPlaylist(video)} size="sm" className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add to Playlist
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentSong && (
        <div className="mb-6 w-full max-w-full overflow-hidden">
          <div className="relative pt-[56.25%]"> {/* 16:9 aspect ratio */}
            <YouTube
              videoId={currentSong.id}
              opts={{
                height: '100%',
                width: '100%',
                playerVars: {
                  autoplay: 1,
                },
              }}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
              className="absolute top-0 left-0 w-full h-full"
            />
          </div>
          <div className="mt-4">
            <Range
              values={[progress]}
              step={0.1}
              min={0}
              max={100}
              onChange={(values) => handleSeek(values[0])}
              onFinalChange={(values) => handleSeekEnd(values[0])}
              renderTrack={({ props, children }) => (
                <div
                  {...props}
                  className="h-2 w-full bg-gray-200 rounded-full"
                >
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                  {children}
                </div>
              )}
              renderThumb={({ props }) => (
                <div
                  {...props}
                  className="h-4 w-4 bg-blue-500 rounded-full shadow"
                />
              )}
            />
            <div className="flex justify-between text-sm mt-1">
              <span>{formatTime(currentTimeRef.current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-between items-center mt-2">
            <h3 className="font-medium text-sm mb-2 w-full">{decodeHtmlEntities(currentSong.title)}</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button onClick={() => handleSkip(-10)} size="sm">
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button onClick={togglePlayPause} size="sm">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button onClick={() => handleSkip(10)} size="sm">
                <SkipForward className="h-4 w-4" />
              </Button>
              <Button onClick={skipCurrentSong} size="sm">
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
            </div>
            <VolumeControl
              volume={volume}
              onVolumeChange={handleVolumeChange}
              onToggleMute={toggleMute}
            />
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Your Playlist</h2>
      {playlist.length === 0 ? (
        <p className="text-center text-gray-500">Your playlist is empty. Add some songs!</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="playlist">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {playlist.map((song, index) => (
                  <Draggable key={song.playlistId} draggableId={song.playlistId} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="flex items-center justify-between bg-gray-100 p-2 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <Image 
                            src={song.thumbnail} 
                            alt={decodeHtmlEntities(song.title)} 
                            width={48}
                            height={36}
                            className="object-cover rounded" 
                          />
                          <Music className="h-4 w-4 text-primary" />
                          <span className="font-medium line-clamp-1">{decodeHtmlEntities(song.title)}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeFromPlaylist(song.playlistId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {playlist.length > 0 && !currentSong && (
        <Button onClick={playNextSong} className="mt-4">
          Start Playing
        </Button>
      )}
    </div>
  )
}

export default YouTubePlaylistCreator