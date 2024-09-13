import React, { useRef, useState, useCallback, useEffect } from 'react'
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube'
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import { Button } from "@/components/ui/button"

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
  const [volume, setVolume] = useState(100)
  const [prevVolume, setPrevVolume] = useState(100)
  const playerRef = useRef<YouTubePlayer | null>(null)

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
    } else {
      handleVolumeChange(prevVolume)
    }
  }, [volume, prevVolume, handleVolumeChange])

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVolume(volume)
    }
  }, [volume])

  return (
    <div className="mb-6 w-full max-w-full overflow-hidden">
      <div className="relative pt-[56.25%]">
        <YouTube
          videoId={currentSong.id}
          opts={{
            height: '100%',
            width: '100%',
            playerVars: {
              autoplay: 1,
            },
          }}
          onReady={(event: YouTubeEvent<YouTubePlayer>) => {
            playerRef.current = event.target
            onPlayerReady(event)
          }}
          onStateChange={onPlayerStateChange}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>
      <div className="mt-4">
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={(currentTime / duration) * 100}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          onMouseUp={(e) => onSeekEnd(parseFloat((e.target as HTMLInputElement).value))}
          className="w-full"
        />
        <div className="flex justify-between text-sm mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="flex flex-wrap justify-between items-center mt-2">
          <h3 className="font-medium text-sm mb-2 w-full">{currentSong.title}</h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button onClick={() => onSkip(-10)} size="sm">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button onClick={onTogglePlayPause} size="sm">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button onClick={() => onSkip(10)} size="sm">
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button onClick={onSkipSong} size="sm">
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
