import React from 'react'
import Image from 'next/image'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Music, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { toast } from 'react-hot-toast'  // Add this import
import { Input } from "@/components/ui/input"
import { useState } from 'react'

interface Song {
  id: string
  title: string
  thumbnail: string
  playlistId: string
  added_by: {
    id: string
    name: string
  }
  credits: number
}

interface PlaylistViewProps {
  playlist: Song[]
  isOwner: boolean
  onRemoveFromPlaylist: (playlistId: string, addedById: string) => void
  onDragEnd: (result: DropResult) => void
  currentUserId: string | undefined
  onUpdateCredits: (playlistId: string, newCredits: number) => void;
  currentUserCredits: number;
  hasCreditedSongs: boolean;
}

const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

const PlaylistView: React.FC<PlaylistViewProps> = ({ 
  playlist, 
  isOwner, 
  onRemoveFromPlaylist, 
  onDragEnd, 
  currentUserId,
  onUpdateCredits,
  currentUserCredits,
  hasCreditedSongs  // Add this line
}) => {
  const [editingCredits, setEditingCredits] = useState<string | null>(null);
  const [newCredits, setNewCredits] = useState<number>(0);

  const handleEditCredits = (song: Song) => {
    setEditingCredits(song.playlistId);
    setNewCredits(song.credits);
  };

  const handleUpdateCredits = (playlistId: string) => {
    onUpdateCredits(playlistId, newCredits);
    setEditingCredits(null);
  };

  const handleRemoveFromPlaylist = (playlistId: string, addedById: string) => {
    console.log('Attempting to remove song:', playlistId, 'Added by:', addedById, 'Current user:', currentUserId);
    onRemoveFromPlaylist(playlistId, addedById);
  }

  const renderSong = (song: Song, index?: number) => (
    <div className="flex items-center justify-between bg-gray-100 p-2 rounded mb-2">
      <div className="flex items-center gap-2">
        <Image 
          src={song.thumbnail} 
          alt={decodeHtmlEntities(song.title)} 
          width={48}
          height={36}
          className="object-cover rounded" 
        />
        <div className="flex flex-col">
          <span className="font-medium line-clamp-1">{decodeHtmlEntities(song.title)}</span>
          <span className="text-xs text-gray-500">Added by: {song.added_by.name}</span>
          {editingCredits === song.playlistId ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newCredits}
                onChange={(e) => setNewCredits(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20"
              />
              <Button size="sm" onClick={() => handleUpdateCredits(song.playlistId)}>Update</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingCredits(null)}>Cancel</Button>
            </div>
          ) : (
            <span className="text-xs text-gray-500">
              Credits: {song.credits}
              {(isOwner || currentUserId === song.added_by.id) && (
                <Button size="sm" variant="link" onClick={() => handleEditCredits(song)}>Edit</Button>
              )}
            </span>
          )}
        </div>
      </div>
      {(isOwner || currentUserId === song.added_by.id) && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => handleRemoveFromPlaylist(song.playlistId, song.added_by.id)}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  )

  return (
    <div className="py-4">
      <h2 className="text-xl font-semibold mb-4">Your Playlist</h2>
      {isOwner && !hasCreditedSongs ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="playlist">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                {playlist.map((song, index) => (
                  <Draggable key={`${song.id}-${index}`} draggableId={song.playlistId} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        {renderSong(song)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="space-y-2">
          {playlist.map((song) => renderSong(song))}
        </div>
      )}
    </div>
  )
}

export default PlaylistView
