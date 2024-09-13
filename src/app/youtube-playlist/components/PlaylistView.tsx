import React from 'react'
import Image from 'next/image'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Music, Trash2 } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface Song {
  id: string
  title: string
  thumbnail: string
  playlistId: string
}

interface PlaylistViewProps {
  playlist: Song[]
  isOwner: boolean
  onRemoveFromPlaylist: (playlistId: string) => void
  onDragEnd: (result: DropResult) => void
}

const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

const PlaylistView: React.FC<PlaylistViewProps> = ({ playlist, isOwner, onRemoveFromPlaylist, onDragEnd }) => {
  if (!isOwner && playlist.length === 0) {
    return <p className="text-center text-gray-500">Connect to a session to start</p>
  }
  if (playlist.length === 0) {
    return <p className="text-center text-gray-500">Your playlist is empty. Add some songs!</p>
  }

  return (
    <div className="py-4">
      <h2 className="text-xl font-semibold mb-4">Your Playlist</h2>
      {isOwner ? (
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
                        <Button variant="ghost" size="sm" onClick={() => onRemoveFromPlaylist(song.playlistId)}>
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
      ) : (
        <div className="space-y-2">
          {playlist.map((song) => (
            <div key={song.playlistId} className="flex items-center justify-between bg-gray-100 p-2 rounded">
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlaylistView
