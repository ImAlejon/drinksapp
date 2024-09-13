import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface SessionJoinFormProps {
  onJoinSession: (sessionId: string) => Promise<void>
}

const SessionJoinForm: React.FC<SessionJoinFormProps> = ({ onJoinSession }) => {
  const [sessionInputId, setSessionInputId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionInputId) {
      await onJoinSession(sessionInputId)
      setSessionInputId('') // Clear the input after joining
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
      <Input
        type="text"
        placeholder="Enter Session ID"
        value={sessionInputId}
        onChange={(e) => setSessionInputId(e.target.value)}
        className="flex-grow"
        required
      />
      <Button type="submit">
        Join Session
      </Button>
    </form>
  )
}

export default SessionJoinForm
