import Link from 'next/link'
import { getBracket } from '@/app/admin/bracket/actions'
import BracketView from '@/app/admin/bracket/bracket-view'
import ThemeToggle from '@/components/theme-toggle'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Bagan Pertandingan Turnamen (Putra & Putri) - HadangMU',
  description: 'Pantau pohon bagan kejuaraan turnamen Hadang Putra dan Putri secara realtime.',
}

export default async function PublicBracketPage() {
  let bracket = null
  let categoryTeams: { id: string; name: string }[] = []

  try {
    const res = await getBracket('PUTRA')
    bracket = res.bracket
    categoryTeams = res.categoryTeams
  } catch (err) {
    console.error('Error fetching public bracket:', err)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-color)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  color: 'white',
                  boxShadow: '0 0 12px rgba(37, 99, 235, 0.4)',
                }}
              >
                H
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.04em' }}>HADANG-MU</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  BAGAN TURNAMEN
                </div>
              </div>
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Link
              href="/"
              style={{
                fontSize: '0.825rem',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-subtle)',
              }}
            >
              ← Beranda
            </Link>
            <ThemeToggle />
            <Link
              href="/login"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.825rem',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              }}
            >
              Login Petugas
            </Link>
          </div>
        </div>
      </header>

      {/* Main Bracket Content */}
      <main className="container" style={{ padding: '1.25rem 1rem 3rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <BracketView
          initialCategory="PUTRA"
          initialBracket={bracket}
          initialCategoryTeams={categoryTeams}
          isPublic={true}
        />
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '1.5rem 1rem',
          textAlign: 'center',
          backgroundColor: 'var(--surface-color)',
        }}
      >
        <div className="container">
          <p className="metadata-text" style={{ fontSize: '0.8rem', margin: 0 }}>
            &copy; {new Date().getFullYear()} HadangMU — Bagan Turnamen Sistem Gugur Digital.
          </p>
        </div>
      </footer>
    </div>
  )
}
