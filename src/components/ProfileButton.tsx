'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useSupabase } from './SupabaseProvider'

export default function ProfileButton() {
  const router = useRouter()
  const { supabase } = useSupabase()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleAction = async () => {
    setIsLoading(true)
    try {
      if (isLoggedIn) {
        await supabase.auth.signOut()
        router.push('/login')
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleAction} disabled={isLoading}>
      {isLoading ? 'Loading...' : isLoggedIn ? 'Logout' : 'Login'}
    </Button>
  )
}
