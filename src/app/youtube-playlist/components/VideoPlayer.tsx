import React, { useRef, useState, useCallback, useEffect } from 'react'
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube'
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { toast } from 'react-hot-toast'

interface Song {
  id: string
  title: string
  thumbnail: string
}

interface VideoPlayerProps {
  currentSong: Song
  isPlaying: boolean
  onPlayerReady: (event: YouTubeEvent<YouTubePlayer>) => void
  onPlayerStateChange: (event: YouTubeEvent<number>) => void
  onTogglePlayPause: () => void
  onSkip: (amount: number) => void
  onSkipSong: () => void
  duration: number
  currentTime: number
  onSeek: (value: number) => void
  onSeekEnd: (value: number) => void
}

const formatTime = (time: number) => {
  const minutes = Math.floor(Math.max(time, 0) / 60)
  const seconds = Math.floor(Math.max(time, 0) % 60)
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  currentSong,
  isPlaying,
  onPlayerReady,
  onPlayerStateChange,
  onTogglePlayPause,
  onSkip,
  onSkipSong,
  duration,
  currentTime,
  onSeek,
  onSeekEnd
}) => {
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(100)
  const [prevVolume, setPrevVolume] = useState(100)
  const playerRef = useRef<YouTubePlayer | null>(null)

  const showCustomToast = (message: string, icon: React.ReactNode) => {
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
      { duration: 2000 }
    )
  }

  const handleError = () => {
    setError('An error occurred while playing the video.')
    showCustomToast('Error playing video. Skipping to next song.', <SkipForward className="h-5 w-5 text-red-500" />)
    onSkipSong();
  };

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume)
    if (playerRef.current) {
      playerRef.current.setVolume(newVolume)
    }
  }, [])

  const toggleMute = useCallback(() => {
    if (volume > 0) {
      setPrevVolume(volume)
      handleVolumeChange(0)
      showCustomToast('Muted', <VolumeX className="h-5 w-5 text-blue-500" />)
    } else {
      handleVolumeChange(prevVolume)
      showCustomToast('Unmuted', <Volume2 className="h-5 w-5 text-blue-500" />)
    }
  }, [volume, prevVolume, handleVolumeChange])

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume)
    }
  }, [volume])

  const handlePlayerReady = (event: YouTubeEvent<YouTubePlayer>) => {
    playerRef.current = event.target
    onPlayerReady(event)
  }

  return (
    <div className="mb-6 max-w-3xl mx-auto">
      {error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <a 
            href={`https://www.youtube.com/watch?v=${currentSong.id}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline ml-2"
          >
            Watch on YouTube
          </a>
        </div>
      ) : (
        <div className="relative pt-[56.25%]"> {/* 16:9 Aspect Ratio */}
          <YouTube
            videoId={currentSong.id}
            opts={{
              height: '100%',
              width: '100%',
              playerVars: {
                autoplay: 1,
              },
            }}
            onReady={handlePlayerReady}
            onError={handleError}
            onStateChange={onPlayerStateChange}
            className="absolute top-0 left-0 w-full h-full"
          />
        </div>
      )}
      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={duration}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          onMouseUp={(e) => onSeekEnd(Number((e.target as HTMLInputElement).value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="flex flex-wrap justify-between items-center mt-2">
          <h3 className="font-medium text-sm mb-2 w-full">{currentSong.title}</h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => {
              onSkip(-10)
              showCustomToast('Skipped back 10 seconds', <SkipBack className="h-5 w-5 text-green-500" />)
            }} size="sm">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button onClick={() => {
              onTogglePlayPause()
              showCustomToast(isPlaying ? 'Paused' : 'Playing', isPlaying ? <Pause className="h-5 w-5 text-yellow-500" /> : <Play className="h-5 w-5 text-green-500" />)
            }} size="sm">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button onClick={() => {
              onSkip(10)
              showCustomToast('Skipped forward 10 seconds', <SkipForward className="h-5 w-5 text-green-500" />)
            }} size="sm">
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button onClick={() => {
              onSkipSong()
              showCustomToast('Skipped to next song', <SkipForward className="h-5 w-5 text-blue-500" />)
            }} size="sm">
              <SkipForward className="h-4 w-4" />
              Skip
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={toggleMute} variant="ghost" size="sm">
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <div className="w-20 sm:w-24">
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VideoPlayer
