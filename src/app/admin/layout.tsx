import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppNavHeader from '@/components/app-nav-header'

export default async function AdminLayout({
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
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN' && profile?.role !== 'JURY') {
    redirect('/login')
  }

  const isAdmin = profile?.role === 'ADMIN'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* Synchronized Hamburger Navigation Header */}
      <AppNavHeader
        userName={profile?.name || (isAdmin ? 'Admin' : 'Scoring')}
        userRole={profile?.role}
        titleBadge={isAdmin ? 'ADMIN PANEL' : 'RUANG KONTROL'}
      />

      {/* Main Admin Content Container */}
      <main className="admin-main-container">
        {children}
      </main>
    </div>
  )
}
