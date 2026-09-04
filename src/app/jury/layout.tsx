import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import ThemeToggle from '@/components/theme-toggle'

async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
      {/* Mobile-Friendly Top Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.875rem 1.25rem',
          backgroundColor: 'var(--surface-color)',
          borderBottom: '1px solid var(--border-color)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/jury" style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.125rem', letterSpacing: '0.05em' }}>
            HADANG JURY
          </Link>
          <span
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              color: '#60a5fa',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
              borderRadius: '9999px',
            }}
          >
            {profile?.role === 'ADMIN' ? 'ADMIN (JURY MODE)' : 'JURI RESMI'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {profile?.name || 'Juri'}
          </span>
          {profile?.role === 'ADMIN' && (
            <Link
              href="/admin"
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                textDecoration: 'underline',
              }}
            >
              Admin
            </Link>
          )}
          <ThemeToggle />
          <form action={logout}>
            <button
              type="submit"
              style={{
                color: 'var(--danger)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                padding: '0.35rem 0.65rem',
                borderRadius: '4px',
                border: '1px solid rgba(220, 38, 38, 0.3)',
              }}
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
