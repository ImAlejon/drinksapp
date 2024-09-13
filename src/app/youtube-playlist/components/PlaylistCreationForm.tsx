import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PlaylistCreationFormProps {
  onCreatePlaylist: (playlistName: string) => Promise<void>
}

const PlaylistCreationForm: React.FC<PlaylistCreationFormProps> = ({ onCreatePlaylist }) => {
  const [playlistName, setPlaylistName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (playlistName) {
      await onCreatePlaylist(playlistName)
      setPlaylistName('') // Clear the input after submission
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
      <Input
        type="text"
        placeholder="Enter playlist name"
        value={playlistName}
        onChange={(e) => setPlaylistName(e.target.value)}
        className="flex-grow"
        required
      />
      <Button type="submit">
        Create Playlist
      </Button>
    </form>
  )
}

export default PlaylistCreationForm
