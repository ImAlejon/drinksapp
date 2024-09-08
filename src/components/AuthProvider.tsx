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
        if (error) throw error;
        
        if (!session?.user && pathname !== '/login') {
          console.log("No session found, redirecting to login")
          router.push('/login')
        } else if (session?.user && pathname === '/login') {
          console.log("Session found, redirecting to home")
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
      if (event === 'SIGNED_IN' && pathname === '/login') {
        router.push('/')
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router, pathname, error]) // Add 'error' to the dependency array

  if (isLoading && pathname !== '/login') {
    return <div>Loading... Please wait.</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  return <>{children}</>
}