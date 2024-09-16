'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSupabase } from './SupabaseProvider'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase()
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
      
        if (session?.user) {
          const response = await fetch('/api/check-active-session')
          const data = await response.json()
          
          if (data.activeSession && pathname !== '/youtube-playlist') {
            router.push(`/youtube-playlist?sessionId=${data.activeSession.session_id}`)
          } else if (pathname === '/' || pathname === '/login') {
            router.push('/youtube-playlist')
          }
        } else if (pathname !== '/' && pathname !== '/login' && !pathname.startsWith('/auth')) {
          router.push('/')
        }
      } catch (e) {
        console.error("Error checking auth status:", e)
        setError(e instanceof Error ? e.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setIsLoading(false)
        router.push('/youtube-playlist')
      } else if (event === 'SIGNED_OUT') {
        router.push('/')
        setIsLoading(false)
      }
    });

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, pathname])

  if (isLoading) {
    return <div>Loading... Please wait.</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return <>{children}</>
}