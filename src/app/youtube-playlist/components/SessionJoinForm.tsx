import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from 'react-hot-toast'  // Add this import

interface SessionJoinFormProps {
  onJoinSession: (sessionId: string) => Promise<void>
}

const SessionJoinForm: React.FC<SessionJoinFormProps> = ({ onJoinSession }) => {
  const [sessionInputId, setSessionInputId] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sessionInputId) {
      try {
        await onJoinSession(sessionInputId)
        toast.success('Successfully joined session')  // Add this line
        setSessionInputId('') // Clear the input after joining
      } catch (error) {
        console.error('Error joining session:', error)
        toast.error('Failed to join session. Please try again.')  // Add this line
      }
    } else {
      toast.error('Please enter a Session ID')  // Add this line
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
