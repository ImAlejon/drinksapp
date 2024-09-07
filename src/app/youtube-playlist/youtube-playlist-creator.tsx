'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, PlusCircle, Music, Trash2, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import YouTube from 'react-youtube'
import { Range, getTrackBackground } from 'react-range'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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

export default function YouTubePlaylistCreator() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Video[]>([])
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionInputId, setSessionInputId] = useState('')
  const playerRef = useRef<any>(null)
  const [showScanner, setShowScanner] = useState(false)
  const qrCodeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Remove the automatic session ID generation
    const storedSessionId = sessionStorage.getItem('playlistSessionId')
    if (storedSessionId) {
      setSessionId(storedSessionId)
      fetchPlaylist(storedSessionId)
      fetchCurrentSong(storedSessionId)
    }

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
      playlistChannel.unsubscribe()
      currentSongChannel.unsubscribe()
    }
  }, [sessionId])

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

  const fetchPlaylist = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('playlists')
      .select('songs')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      console.error('Error fetching playlist:', error)
    } else if (data) {
      setPlaylist(data.songs || [])
    }
  }

  const fetchCurrentSong = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('current_songs')
      .select('song')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      console.error('Error fetching current song:', error)
    } else if (data) {
      setCurrentSong(data.song)
      setIsPlaying(!!data.song)
    }
  }

  const addToPlaylist = async (video: Video) => {
    if (sessionId) {
      const newSong: Song = { ...video, playlistId: `playlist-${video.id}` }
      const updatedPlaylist = [...playlist, newSong]
      
      const { error } = await supabase
        .from('playlists')
        .upsert({ session_id: sessionId, songs: updatedPlaylist })

      if (error) {
        console.error('Error adding song to playlist:', error)
      } else {
        setPlaylist(updatedPlaylist)
      }
    } else {
      console.error('No session ID available')
    }
  }

  const removeFromPlaylist = async (playlistId: string) => {
    if (sessionId) {
      const updatedPlaylist = playlist.filter(song => song.playlistId !== playlistId)
      
      const { error } = await supabase
        .from('playlists')
        .upsert({ session_id: sessionId, songs: updatedPlaylist })

      if (error) {
        console.error('Error removing song from playlist:', error)
      }
    }
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !sessionId) return;

    const items = Array.from(playlist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const { error } = await supabase
      .from('playlists')
      .upsert({ session_id: sessionId, songs: items })

    if (error) {
      console.error('Error reordering playlist:', error)
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
    setDuration(event.target.getDuration())
  }

  const onPlayerStateChange = (event: any) => {
    if (event.data === YouTube.PlayerState.ENDED) {
      playNextSong()
    } else if (event.data === YouTube.PlayerState.PLAYING) {
      setIsPlaying(true)
      startTimeUpdate()
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      setIsPlaying(false)
      stopTimeUpdate()
    }
  }

  const startTimeUpdate = () => {
    const interval = setInterval(() => {
      if (playerRef.current && !isSeeking) {
        setCurrentTime(playerRef.current.getCurrentTime())
      }
    }, 1000)
    return () => clearInterval(interval)
  }

  const stopTimeUpdate = () => {
    // Clear any existing interval
  }

  const handleSeek = useCallback((values: number[]) => {
    setCurrentTime(values[0])
    if (playerRef.current) {
      playerRef.current.seekTo(values[0])
    }
  }, [])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
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

  const handleSetSession = (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionInputId) {
      sessionStorage.setItem('playlistSessionId', sessionInputId)
      setSessionId(sessionInputId)
      fetchPlaylist(sessionInputId)
      fetchCurrentSong(sessionInputId)
      setSessionInputId('') // Clear the input after setting
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4 text-center">YouTube Playlist Creator</h1>
      
      {/* Add this form near the top of your JSX */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {searchResults.map(video => (
            <Card key={video.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Image 
  src={video.thumbnail} 
  alt={video.title} 
  width={120} 
  height={90} 
  className="w-full h-auto" 
/>
                <div className="flex-grow">
                  <h3 className="font-medium line-clamp-2">{video.title}</h3>
                  <Button onClick={() => addToPlaylist(video)} size="sm" className="mt-2">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add to Playlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Now Playing</h2>
      {currentSong ? (
        <div className="mb-4">
          <YouTube
            videoId={currentSong.id}
            opts={{
              height: '390',
              width: '640',
              playerVars: {
                autoplay: 1,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
              },
            }}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
          />
          <div className="mt-4">
            <Range
              values={[currentTime]}
              step={1}
              min={0}
              max={duration}
              onChange={handleSeek}
              onFinalChange={() => setIsSeeking(false)}
              renderTrack={({ props, children }) => (
                <div
                  onMouseDown={props.onMouseDown}
                  onTouchStart={props.onTouchStart}
                  style={{
                    ...props.style,
                    height: '36px',
                    display: 'flex',
                    width: '100%'
                  }}
                >
                  <div
                    ref={props.ref}
                    style={{
                      height: '5px',
                      width: '100%',
                      borderRadius: '4px',
                      background: getTrackBackground({
                        values: [currentTime],
                        colors: ['#548BF4', '#ccc'],
                        min: 0,
                        max: duration
                      }),
                      alignSelf: 'center'
                    }}
                  >
                    {children}
                  </div>
                </div>
              )}
              renderThumb={({ props, isDragged }) => (
                <div
                  {...props}
                  style={{
                    ...props.style,
                    height: '12px',
                    width: '12px',
                    borderRadius: '1px',
                    backgroundColor: '#FFF',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0px 2px 6px #AAA'
                  }}
                >
                  <div
                    style={{
                      height: '5px',
                      width: '5px',
                      backgroundColor: isDragged ? '#548BF4' : '#CCC'
                    }}
                  />
                </div>
              )}
            />
            <div className="flex justify-between text-sm mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <h3 className="font-medium">{currentSong.title}</h3>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleSeek([Math.max(0, currentTime - 10)])}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button onClick={() => handleSeek([Math.min(duration, currentTime + 10)])}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 mb-4">No song is currently playing</p>
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
  alt={song.title} 
  width={48}  // This corresponds to w-12 (12 * 4px)
  height={36} // This corresponds to h-9 (9 * 4px)
  className="object-cover rounded" 
/>
                          <Music className="h-4 w-4 text-primary" />
                          <span className="font-medium line-clamp-1">{song.title}</span>
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