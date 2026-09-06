import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const DEFAULT_URL = 'https://nwxydilkbcxtoyfoomfb.supabase.co'
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eHlkaWxrYmN4dG95Zm9vbWZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjU2MTQsImV4cCI6MjEwNDEwMTYxNH0.QwnSfMicAfEOqsU7ChmWq6ARMBJCkPABun-xRDIfLUQ'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_URL
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired - required for Server Components
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/jury')

    if (!user && isProtected) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
      return NextResponse.redirect(loginUrl)
    }
  } catch (error) {
    // Prevent unhandled errors from crashing Vercel middleware
    console.error('Middleware updateSession error:', error)
  }

  return supabaseResponse
}

