import React from 'react'
import Image from 'next/image'
import { PlusCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface Video {
  id: string
  title: string
  thumbnail: string
}

interface SearchResultsProps {
  results: Video[]
  onAddToPlaylist: (video: Video) => Promise<void>
}

const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, onAddToPlaylist }) => {
  if (results.length === 0) {
    return <p className="text-center text-gray-500">No results found.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
      {results.map(video => (
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
            <Button onClick={() => onAddToPlaylist(video)} size="sm" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add to Playlist
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default SearchResults
