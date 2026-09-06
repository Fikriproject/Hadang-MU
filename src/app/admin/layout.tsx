import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import styles from './admin.module.css'
import { revalidatePath } from 'next/cache'
import ThemeToggle from '@/components/theme-toggle'

async function logout() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

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
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarTitle}>HADANG</div>
          <div className={styles.sidebarRole}>ADMIN PANEL</div>
        </div>
        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/admin/matches/create" className={styles.navLink}>
            Buat Pertandingan
          </Link>
          <Link href="/admin/teams" className={styles.navLink}>
            Kelola Tim
          </Link>
        </nav>
      </aside>
      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <div style={{ marginRight: 'auto', fontWeight: 'bold' }}>
            Halo, {profile.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ThemeToggle />
            <form action={logout}>
              <button type="submit" className={styles.logoutBtn}>
                Keluar
              </button>
            </form>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
