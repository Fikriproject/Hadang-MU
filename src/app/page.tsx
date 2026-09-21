import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/components/theme-toggle'
import PublicMatchesView, { type MatchWithRelations } from './public-matches-view'

export default async function HomePage() {
  const supabase = await createClient()

  // Check auth session for adaptive navigation
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role, name').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'ADMIN'
  const userDashboardUrl = isAdmin ? '/admin' : '/jury'
  const userDashboardLabel = isAdmin ? 'Dashboard Admin' : 'Meja Scoring'

  // Fetch matches
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      round,
      scheduled_at,
      status,
      created_at,
      team_attack:team_attack_id(id, name),
      team_defense:team_defense_id(id, name),
      score_events(id, team_id, points, status)
    `)
    .order('created_at', { ascending: false })

  const matches = (rawMatches || []) as unknown as MatchWithRelations[]

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '1.2rem',
                  color: 'white',
                  boxShadow: '0 0 15px rgba(37, 99, 235, 0.4)',
                }}
              >
                H
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '0.04em' }}>HADANG-MU</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                  Sistem Skor Digital Olahraga Tradisional
                </div>
              </div>
            </Link>

            {/* Navigation links for larger screens */}
            <nav className="hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
              <a
                href="#live-matches"
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                }}
              >
                ● Pertandingan Live
              </a>
              <Link
                href="/bracket"
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>🏆</span>
                <span>Bagan Turnamen</span>
              </Link>
              <a
                href="#jadwal-hasil"
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                }}
              >
                Jadwal & Hasil
              </a>
              <a
                href="#aturan-permainan"
                style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                }}
              >
                Aturan Main
              </a>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ThemeToggle />
            {user ? (
              <Link
                href={userDashboardUrl}
                style={{
                  backgroundColor: isAdmin ? 'var(--primary)' : 'var(--success)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  boxShadow: isAdmin ? '0 4px 12px rgba(37, 99, 235, 0.3)' : '0 4px 12px rgba(22, 163, 74, 0.3)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <span>{isAdmin ? '⚙️' : '📋'}</span>
                <span>{userDashboardLabel}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                  transition: 'background-color 0.2s',
                  textDecoration: 'none',
                }}
              >
                Login Petugas
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '3.5rem 1rem 3rem',
          textAlign: 'center',
          background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.15) 0%, rgba(11, 18, 32, 0) 70%)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div className="container" style={{ maxWidth: '800px' }}>
          <span
            style={{
              backgroundColor: 'rgba(37, 99, 235, 0.2)',
              border: '1px solid rgba(37, 99, 235, 0.4)',
              color: '#60a5fa',
              fontSize: '0.8125rem',
              fontWeight: 700,
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              letterSpacing: '0.08em',
              display: 'inline-block',
              marginBottom: '1rem',
            }}
          >
            SISTEM SKOR DIGITAL OLAHRAGA TRADISIONAL
          </span>
          <h1 className="heading" style={{ marginBottom: '1rem', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)' }}>
            Turnamen Hadang
          </h1>
          <p
            className="body-text"
            style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '650px', margin: '0 auto 2rem' }}
          >
            Pencatatan skor terpadu dengan integrasi meja scoring mobile, ruang kontrol admin, bagan kejuaraan otomatis, dan papan skor TV layar penuh realtime.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
            <a
              href="#live-matches"
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                padding: '0.875rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.4)',
                textDecoration: 'none',
              }}
            >
              ● Pantau Pertandingan Live
            </a>

            <Link
              href="/bracket"
              style={{
                backgroundColor: '#EAB308',
                color: '#000',
                padding: '0.875rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                boxShadow: '0 4px 16px rgba(234, 179, 8, 0.35)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <span>🏆</span>
              <span>Bagan Turnamen (Putra & Putri)</span>
            </Link>

            {user ? (
              <Link
                href={userDashboardUrl}
                style={{
                  backgroundColor: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: 'var(--card-shadow)',
                  textDecoration: 'none',
                }}
              >
                Buka {userDashboardLabel} →
              </Link>
            ) : (
              <Link
                href="/login"
                style={{
                  backgroundColor: 'var(--surface-color)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '0.875rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  boxShadow: 'var(--card-shadow)',
                  textDecoration: 'none',
                }}
              >
                Masuk ke Panel Petugas
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container" style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* LIVE & SCHEDULED & FINISHED MATCHES (Realtime Client Component) */}
        <PublicMatchesView initialMatches={matches}>
          {/* TOURNAMENT BRACKET PROMO BANNER */}
          <section
            style={{
              backgroundColor: 'var(--surface-color)',
              border: '1.5px solid rgba(234, 179, 8, 0.4)',
              borderRadius: '12px',
              padding: '1.75rem',
              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(37, 99, 235, 0.05) 100%)',
              boxShadow: 'var(--card-shadow)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
            }}
          >
            <div style={{ maxWidth: '600px' }}>
              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 800,
                  color: '#CA8A04',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '9999px',
                  display: 'inline-block',
                  marginBottom: '0.5rem',
                }}
              >
                🏆 SISTEM GUGUR TURNAMEN
              </span>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 900, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
                Bagan Pertandingan Kategori Putra & Putri
              </h3>
              <p className="metadata-text" style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
                Pantau seluruh bagan turnamen secara transparan: susunan tim, babak penyisihan, semifinal, perebutan juara 3, hingga partai final penentuan juara!
              </p>
            </div>

            <Link
              href="/bracket"
              style={{
                backgroundColor: '#EAB308',
                color: '#000',
                padding: '0.85rem 1.35rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(234, 179, 8, 0.35)',
                flexShrink: 0,
              }}
            >
              <span>Buka Bagan Turnamen</span>
              <span>→</span>
            </Link>
          </section>
        </PublicMatchesView>

        {/* Rules & Guide Section */}
        <section
          id="aturan-permainan"
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: 'var(--card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--primary)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                backgroundColor: 'var(--primary-subtle, rgba(37, 99, 235, 0.1))',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                display: 'inline-block',
                marginBottom: '0.5rem',
              }}
            >
              Pedoman Resmi Olahraga Tradisional
            </span>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Ketentuan Skor & Penentuan Pemenang Hadang
            </h3>
            <p className="metadata-text" style={{ marginTop: '0.35rem', fontSize: '0.875rem' }}>
              Rangkuman aturan resmi pertandingan Hadang sesuai standar modul olahraga tradisional nasional.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* 1. KETENTUAN SKOR */}
            <div
              style={{
                backgroundColor: 'var(--card-inner-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.35rem' }}>🎯</span>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>1. Ketentuan Skor (Nilai)</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>+1 Nilai (Depan ke Belakang):</strong> Diberikan jika pemain penyerang berhasil melewati seluruh petak dari garis depan sampai garis belakang.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>+1 Nilai (Belakang ke Depan):</strong> Diberikan jika pemain berhasil kembali melewati rintangan dari garis belakang sampai garis depan.
                </li>
                <li>
                  <strong style={{ color: 'var(--danger)' }}>-1 Nilai (Penalti Kartu Merah):</strong> Nilai regu dikurangi 1 poin apabila pemain melakukan pelanggaran keras atau kartu merah.
                </li>
              </ul>
            </div>

            {/* 2. PENENTUAN PEMENANG */}
            <div
              style={{
                backgroundColor: 'var(--card-inner-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.35rem' }}>🏆</span>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>2. Penentuan Pemenang</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Skor Terbanyak:</strong> Pemenang ditentukan dari regu yang memperoleh akumulasi nilai tertinggi setelah waktu pertandingan (2 x 15 menit bersih) berakhir.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Kondisi Nilai Sama (Seri):</strong> Apabila kedua regu memperoleh total nilai yang sama, pemenang ditentukan dari regu yang memperoleh <strong style={{ color: 'var(--primary)' }}>jumlah nilai tertinggi di garis depan</strong>.
                </li>
              </ul>
            </div>

            {/* 3. DURASI & ALIH GILIRAN */}
            <div
              style={{
                backgroundColor: 'var(--card-inner-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.35rem' }}>⏱️</span>
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>3. Durasi & Alih Giliran</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Waktu Laga:</strong> 2 x 15 menit bersih, istirahat 5 menit antar babak, dan hak 1x time-out (1 menit) per regu.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)' }}>Pergantian Regu (Turnover):</strong> Penyerang bertukar menjadi penjaga jika tersentuh penjaga yang sah, kaki keluar garis samping, menarik/mundur kaki, atau regu penyerang terkunci selama 2 menit.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '2rem 1rem',
          textAlign: 'center',
          backgroundColor: 'var(--surface-color)',
        }}
      >
        <div className="container">
          <p className="metadata-text">
            &copy; {new Date().getFullYear()} HadangMU — Sistem Digital Penilaian Olahraga Tradisional Indonesia.
          </p>
        </div>
      </footer>
    </div>
  )
}
