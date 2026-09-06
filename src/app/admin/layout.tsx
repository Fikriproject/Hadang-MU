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

  if (profile?.role !== 'ADMIN') {
    redirect('/jury')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* Synchronized Hamburger Navigation Header */}
      <AppNavHeader
        userName={profile?.name || 'Admin'}
        userRole="ADMIN"
        titleBadge="ADMIN PANEL"
      />

      {/* Main Admin Content Container */}
      <main
        style={{
          flex: 1,
          padding: '1.5rem',
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </main>
    </div>
  )
}
