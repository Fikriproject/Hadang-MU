import Link from 'next/link'
import ThemeToggle from '@/components/theme-toggle'

export const metadata = {
  title: '404 - Halaman Tidak Ditemukan | HadangMU',
  description: 'Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.',
}

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--surface-color)',
          padding: '0.85rem 1rem',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
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
              }}
            >
              H
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.04em' }}>HADANG-MU</span>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* Main 404 Card */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem',
          }}
        >
          <div
            style={{
              fontSize: '4.5rem',
              fontWeight: 900,
              color: 'var(--primary)',
              lineHeight: 1,
              letterSpacing: '0.05em',
            }}
          >
            404
          </div>

          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 0.4rem', color: 'var(--text-primary)' }}>
              Halaman Tidak Ditemukan
            </h1>
            <p className="metadata-text" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
              Tautan yang Anda tuju mungkin salah ketik, pertandingan telah dihapus, atau halaman telah dipindahkan.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', marginTop: '0.5rem' }}>
            <Link
              href="/"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
              }}
            >
              ← Kembali ke Beranda
            </Link>

            <Link
              href="/bracket"
              style={{
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.7rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
              }}
            >
              <span>🏆</span>
              <span>Bagan Turnamen</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
