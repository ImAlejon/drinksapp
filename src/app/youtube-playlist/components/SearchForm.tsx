import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SearchFormProps {
  onSearch: (query: string) => Promise<void>
  isLoading: boolean
}

const SearchForm: React.FC<SearchFormProps> = ({ onSearch, isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      await onSearch(searchQuery)
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
      <Button type="submit" disabled={isLoading}>
        <Search className="mr-2 h-4 w-4" />
        {isLoading ? 'Searching...' : 'Search'}
      </Button>
    </form>
  )
}

export default SearchForm
