import React from 'react'
import Image from 'next/image'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"

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

const PlaylistView: React.FC<PlaylistViewProps> = ({ 
  playlist, 
  isOwner, 
  onRemoveFromPlaylist, 
  onDragEnd, 
  currentUserId,
  onUpdateCredits,
  hasCreditedSongs
}) => {
  const renderSong = (song: Song) => (
    <div key={song.playlistId} className="flex items-center justify-between p-2 bg-white rounded-lg shadow">
      <div className="flex items-center space-x-2">
        <Image 
          src={song.thumbnail} 
          alt={song.title} 
          width={40} 
          height={40} 
          className="rounded"
        />
        <div>
          <p className="font-semibold">{song.title}</p>
          <p className="text-sm text-gray-500">Added by: {song.added_by.name}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onRemoveFromPlaylist(song.playlistId, song.added_by.id)}
          disabled={!isOwner && currentUserId !== song.added_by.id}
        >
          <Trash2 className={`h-4 w-4 ${isOwner || currentUserId === song.added_by.id ? 'text-destructive' : 'text-gray-300'}`} />
        </Button>
        {currentUserId === song.added_by.id ? (
          <input
            type="number"
            value={song.credits}
            onChange={(e) => onUpdateCredits(song.playlistId, parseInt(e.target.value))}
            className="w-16 text-center border rounded"
          />
        ) : (
          <span className="w-16 text-center">{song.credits} credits</span>
        )}
      </div>
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
                  <Draggable key={song.playlistId} draggableId={song.playlistId} index={index}>
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
