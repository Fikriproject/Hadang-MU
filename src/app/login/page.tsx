import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import styles from './login.module.css'
import { login } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'ADMIN') {
      redirect('/admin')
    } else {
      redirect('/jury')
    }
  }

  const resolvedParams = await searchParams
  const errorMessage = resolvedParams?.error

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={`${styles.title} heading`}>GROBAK SODOR</h1>
          <p className={styles.subtitle}>SCORING SYSTEM</p>
        </div>

        <form className={styles.form} action={login}>
          {errorMessage && (
            <div className={styles.errorBox}>{errorMessage}</div>
          )}

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@grobbak.local"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">
              Password
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
            MASUK
          </button>
        </form>
      </div>
    </main>
  )
}
