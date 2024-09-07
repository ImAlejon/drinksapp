/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  const API_KEY = process.env.YOUTUBE_API_KEY

  if (!API_KEY) {
    console.error('YouTube API key is not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&key=${API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`YouTube API responded with status ${response.status}`)
    }

    const data = await response.json()

    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url
    }))

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Error fetching YouTube data:', error)
    return NextResponse.json({ error: 'Failed to fetch videos from YouTube' }, { status: 500 })
  }
}