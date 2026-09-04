import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | undefined

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''

  if (typeof window === 'undefined') {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  if (!client) {
    client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return client
}

