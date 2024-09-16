import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)

    // Fetch user credits and check for active session
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const [{ data: creditsData, error: creditsError }, { data: sessionData, error: sessionError }] = await Promise.all([
        supabase
          .from('user_credits')
          .select('credits')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('playlists')
          .select('session_id, name')
          .eq('host_id', user.id)
          .eq('is_active', true)
          .single()
      ])

      if (creditsError) {
        console.error('Error fetching user credits:', creditsError)
      } else {
        cookies().set('user_credits', creditsData.credits.toString(), { 
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 3600 // 1 hour
        })
      }

      if (sessionError && sessionError.code !== 'PGRST116') {
        console.error('Error checking active session:', sessionError)
      } else if (sessionData) {
        return NextResponse.redirect(`${requestUrl.origin}/youtube-playlist?sessionId=${sessionData.session_id}`)
      }
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/youtube-playlist`)
}
