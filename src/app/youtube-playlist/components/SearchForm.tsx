import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from 'react-hot-toast'  // Add this import

interface SearchFormProps {
  onSearch: (query: string) => Promise<void>
  isLoading: boolean
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      try {
        await onSearch(searchQuery)
        toast.success('Search completed')  // Add this line
      } catch (error) {
        console.error('Search error:', error)
        toast.error('Search failed. Please try again.')  // Add this line
      }
    } else {
      toast.error('Please enter a search query')  // Add this line
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
      <Input
        type="text"
        placeholder="Search for a song on YouTube"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        required
        className="flex-grow"
      />
      <Button type="submit" disabled={isLoading} onClick={() => {
        if (isLoading) {
          toast.success('Search in progress...')  // Add this line
        }
      }}>
        <Search className="mr-2 h-4 w-4" />
        {isLoading ? 'Searching...' : 'Search'}
      </Button>
    </form>
  )
}

export default SearchForm
