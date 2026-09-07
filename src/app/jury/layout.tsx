import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNavHeader from '@/components/app-nav-header'

export default async function JuryLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name, jury_position')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* Synchronized Hamburger Navigation Header */}
      <AppNavHeader
        userName={profile?.name || 'Petugas Scoring'}
        userRole={profile?.role || 'JURY'}
        titleBadge="MEJA SCORING"
      />

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
