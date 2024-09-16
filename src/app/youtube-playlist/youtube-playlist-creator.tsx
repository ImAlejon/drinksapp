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
import { toast } from 'react-hot-toast'
import { CheckCircle, XCircle } from 'lucide-react'
import CreditPopup from '@/components/CreditPopup'
import { useUserCredits } from '@/contexts/UserCreditsContext'
import router from 'next/router'



interface Video {
  id: string
  title: string
  thumbnail: string
}

interface Song extends Video {
  playlistId: string
  added_by: {
    id: string
    name: string
  }
  credits: number
}

const YouTubePlaylistCreator: React.FC = () => {
  const { supabase } = useSupabase()
  const { credits: userCredits, updateCredits: updateUserCredits } = useUserCredits()

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
  const [isCreditPopupOpen, setIsCreditPopupOpen] = useState(false)
  const [pendingSong, setPendingSong] = useState<Video | null>(null)

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
    if (sessionId) {
      const channel = supabase
        .channel(`playlist_${sessionId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'playlists',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          console.log('Change received!', payload)
          if (payload.new && 'songs' in payload.new) {
            setPlaylist(payload.new.songs)
          }
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [sessionId, supabase])

  useEffect(() => {
    if (sessionId) {
      fetchPlaylistData(sessionId);
    }
  }, );

  const fetchPlaylistData = async (sid: string) => {
    try {
      const response = await fetch(`/api/playlists?sessionId=${sid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch playlist data');
      }
      const data = await response.json();
      setPlaylist(data.songs || []);
      setSessionName(data.name);
      setIsOwner(user?.id === data.host_id);
    } catch (error) {
      console.error('Error fetching playlist data:', error);
      setError('Failed to load playlist. Please try again.');
    }
  };

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

  const showCustomToast = (message: string, icon: React.ReactNode, duration?: number) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 transition-all duration-300 ease-in-out ${
            t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="flex-1 w-0 p-3">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                {icon}
              </div>
              <div className="ml-2 flex-1">
                <p className="text-sm font-medium text-gray-900">{message}</p>
              </div>
            </div>
          </div>
          
        </div>
      ),
      { duration: duration || 300 }
    )
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
      showCustomToast('Playlist created successfully', <CheckCircle className="h-5 w-5 text-green-500" />)
      setSessionId(data.session_id)
      setSessionName(playlistName)
      setIsOwner(true)
      setPlaylist([])
      router.push(`/youtube-playlist?sessionId=${data.session_id}`)
    } else {
      throw new Error(data.error || 'Failed to create playlist')
    }
  } catch (error) {
    console.error('Error creating playlist:', error)
    showCustomToast(
      error instanceof Error ? error.message : 'An unknown error occurred',
      <XCircle className="h-5 w-5 text-red-500" />
    )
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

  const sortPlaylistByCredits = (playlist: Song[]): Song[] => {
    return [...playlist].sort((a, b) => b.credits - a.credits);
  };

  const addToPlaylist = async (video: Video) => {
    setPendingSong(video)
    setIsCreditPopupOpen(true)
  }

  const handleConfirmCredits = async (credits: number) => {
    if (pendingSong && sessionId && user) {
      const newSong: Song = {
        ...pendingSong,
        playlistId: `playlist-${pendingSong.id}-${Date.now()}`,
        thumbnail: `https://img.youtube.com/vi/${pendingSong.id}/mqdefault.jpg`,
        added_by: {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown User'
        },
        credits: credits
      };

      const updatedPlaylist = sortPlaylistByCredits([...playlist, newSong]);
      const newUserCredits = userCredits - credits;

      const { error } = await supabase
        .from('playlists')
        .update({ songs: updatedPlaylist })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error updating playlist:', error);
        toast.error('Failed to add song to playlist');
      } else {
        setPlaylist(updatedPlaylist);
        updateUserCredits(newUserCredits);
        toast.success('Song added to playlist');
      }
    }
    setPendingSong(null);
  };

  const updateSongCredits = async (playlistId: string, newCredits: number) => {
    if (sessionId && user) {
      const songIndex = playlist.findIndex(song => song.playlistId === playlistId);
      if (songIndex === -1) return;

      const song = playlist[songIndex];
      if (user.id !== song.added_by.id && !isOwner) {
        toast.error('You do not have permission to update credits for this song');
        return;
      }

      const creditDifference = newCredits - song.credits;
      if (creditDifference > userCredits) {
        toast.error('Not enough credits');
        return;
      }

      const updatedSong = { ...song, credits: newCredits };
      const updatedPlaylist = sortPlaylistByCredits([
        ...playlist.slice(0, songIndex),
        updatedSong,
        ...playlist.slice(songIndex + 1)
      ]);

      const { error } = await supabase
        .from('playlists')
        .update({ songs: updatedPlaylist })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error updating playlist:', error);
        toast.error('Failed to update song credits');
      } else {
        setPlaylist(updatedPlaylist);
        updateUserCredits(userCredits - creditDifference);
        toast.success('Song credits updated');
      }
    }
  };

  const onRemoveFromPlaylist = async (playlistId: string, addedById: string) => {
    if (sessionId && (isOwner || user?.id === addedById)) {
      const removedSong = playlist.find(song => song.playlistId === playlistId);
      const updatedPlaylist = playlist.filter(song => song.playlistId !== playlistId);
      
      const { error } = await supabase
        .from('playlists')
        .update({ songs: updatedPlaylist })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error removing song from playlist:', error);
        toast.error('Failed to remove song from playlist');
      } else {
        setPlaylist(updatedPlaylist);
        if (removedSong && removedSong.credits && removedSong.credits > 0) {
          // Refund credits to the user who added the song
          if (removedSong.added_by.id === user?.id) {
            // If the current user is the one who added the song
            const newUserCredits = userCredits + removedSong.credits;
            await updateUserCredits(newUserCredits);
            toast.success(`Song removed and ${removedSong.credits} credits refunded`);
          } else {
            // If the owner is removing someone else's song
            const { data, error } = await supabase
              .from('user_credits')
              .select('credits')
              .eq('user_id', removedSong.added_by.id)
              .single();

            if (data && !error) {
              const newCredits = data.credits + removedSong.credits;
              await supabase
                .from('user_credits')
                .update({ credits: newCredits })
                .eq('user_id', removedSong.added_by.id);

              toast.success(`Song removed and ${removedSong.credits} credits refunded to ${removedSong.added_by.name}`);
            } else {
              console.error('Error refunding credits:', error);
              toast.error('Failed to refund credits');
            }
          }
        } else {
          toast.success('Song removed from playlist');
        }
      }
    } else {
      toast.error('You do not have permission to remove this song');
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !sessionId || !isOwner) return;

    const items = Array.from(playlist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const { error } = await supabase
      .from('playlists')
      .update({ songs: items })
      .eq('session_id', sessionId)

    if (error) {
      console.error('Error updating playlist order:', error)
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

const checkActiveSession = async () => {
  console.log('Checking active session, user:', user)
  if (user) {
    try {
      const response = await fetch('/api/check-active-session')
      const data = await response.json()
      console.log('Check active session response:', data)
      if (data.activeSession) {
        console.log('Active session found, redirecting...')
        setSessionId(data.activeSession.session_id)
        setSessionName(data.activeSession.name)
        setIsOwner(true)
        setPlaylist(data.activeSession.songs || [])
        router.push(`/youtube-playlist?sessionId=${data.activeSession.session_id}`)
      } else {
        console.log('No active session found')
      }
    } catch (error) {
      console.error('Error checking active session:', error)
    }
  } else {
    console.log('No user found')
  }
}

useEffect(() => {
  checkActiveSession()
}, )

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-lg relative">
      {!sessionId && (<h1 className="text-2xl font-bold mb-4 text-center">Hi {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'}!</h1>)}
      {sessionId && isOwner && (<h1 className="text-2xl font-bold mb-4 text-center"> 
        <span className="text-black-300">{sessionName} <br /> </span>
        <span className="text-gray-500"> Now Playing: {currentSong?.title || '-'}</span>
        </h1>)}
      {sessionId && !isOwner && (<h1 className="text-2xl font-bold mb-4 text-center">{sessionName}</h1>)}
      {error && <p className="text-red-500">{error}</p>}
      {isLoading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <>
          {!sessionId && (
      (<div className="mb-2 text-sm text-gray-600">Click on the menu to create or join a session</div>)
          )}
          {sessionId && (
            <>
              <SearchForm onSearch={handleSearch} isLoading={isSearching} />
              <SearchResults results={searchResults} onAddToPlaylist={addToPlaylist} />
              <PlaylistView 
                  playlist={playlist}
                  isOwner={isOwner}
                  onRemoveFromPlaylist={onRemoveFromPlaylist}
                  onDragEnd={onDragEnd}
                  currentUserId={user?.id || ''}
                  onUpdateCredits={updateSongCredits}
                  currentUserCredits={userCredits}
                  hasCreditedSongs={true}
              />
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
    creditsUsed={currentSong.credits}
    onRefundCredits={(amount) => {
      updateUserCredits(userCredits + amount);
      // You might want to update the playlist or current song state here as well
    }}
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

          <CreditPopup
            isOpen={isCreditPopupOpen}
            onClose={() => setIsCreditPopupOpen(false)}
            onConfirm={handleConfirmCredits}
            maxCredits={userCredits}
          />
        </>
      )}
    </div>
  )
}

export default YouTubePlaylistCreator
