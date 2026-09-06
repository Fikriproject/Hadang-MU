import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import styles from './login.module.css'
import { login } from './actions'
import ThemeToggle from '@/components/theme-toggle'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>
}) {
  const supabase = await createClient()
  const resolvedParams = await searchParams
  const redirectTarget = resolvedParams?.redirect && resolvedParams.redirect.startsWith('/') ? resolvedParams.redirect : null
  const errorMessage = resolvedParams?.error

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'ADMIN'
    if (redirectTarget) {
      if (redirectTarget.startsWith('/admin') && !isAdmin) {
        redirect('/jury')
      } else {
        redirect(redirectTarget)
      }
    } else {
      if (isAdmin) {
        redirect('/admin')
      } else {
        redirect('/jury')
      }
    }
  }

  return (
    <main className={styles.container} style={{ position: 'relative' }}>
      {/* Top right theme toggle and home link */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 10,
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            padding: '0.4rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-color)',
          }}
        >
          ← Beranda
        </Link>
        <ThemeToggle />
      </div>

      <div className={styles.card}>
        <div className={styles.header}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '1.5rem',
              margin: '0 auto 1rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
            }}
          >
            H
          </div>
          <h1 className={`${styles.title} heading`} style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            HADANG-MU
          </h1>
          <p className={styles.subtitle} style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>
            PORTAL MASUK PETUGAS & ADMIN
          </p>
        </div>

        <form className={styles.form} action={login}>
          {redirectTarget && (
            <input type="hidden" name="redirect" value={redirectTarget} />
          )}

          {errorMessage && (
            <div className={styles.errorBox}>{errorMessage}</div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">
              Email Petugas
            </label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="petugas@hadangmu.id"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">
              Kata Sandi (Password)
            </label>
            <input
              className={styles.input}
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          <button className={styles.submitBtn} type="submit">
            MASUK KE PANEL
          </button>
        </form>
      </div>
    </main>
  )
}
