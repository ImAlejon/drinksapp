'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Session } from '@supabase/supabase-js'

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { useSupabase } from "./SupabaseProvider"
import ProfileButton from "./ProfileButton"
import { useUserCredits } from '@/contexts/UserCreditsContext'

interface MainNavProps {
  credits: number;
}

export function MainNav() {
  const { credits } = useUserCredits();
  const pathname = usePathname()
  const { supabase } = useSupabase()
  const [session, setSession] = React.useState<Session | null>(null)

  React.useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
    }

    fetchSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  if (pathname === '/login' || !session) {
    return null
  }

  return (
    <div className="p-4 shadow-sm">
      <div className="flex justify-between items-center">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/youtube-playlist" legacyBehavior passHref>
                <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                   Playlist
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
        <ProfileButton credits={credits} />
      </div>
    </div>
  )
}
