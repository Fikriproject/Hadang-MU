import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/components/theme-toggle'

interface MatchWithRelations {
  id: string
  name: string
  round: string | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  created_at: string
  team_attack: { id: string; name: string } | null
  team_defense: { id: string; name: string } | null
  score_events: { id: string; team_id: string; points: number; status: string }[]
}

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch matches
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      round,
      status,
      created_at,
      team_attack:team_attack_id(id, name),
      team_defense:team_defense_id(id, name),
      score_events(id, team_id, points, status)
    `)
    .order('created_at', { ascending: false })

  const matches = (rawMatches || []) as unknown as MatchWithRelations[]

  const liveMatches = matches.filter((m) => m.status === 'LIVE' || m.status === 'PAUSED')
  const upcomingMatches = matches.filter((m) => m.status === 'READY')
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')

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
            padding: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              <div style={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '0.05em' }}>HADANGMU</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                GROBAK SODOR SCORING
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ThemeToggle />
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
              }}
            >
              Login Petugas (Admin / Juri) →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '4rem 1rem',
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
            Turnamen Hadang & Gobak Sodor
          </h1>
          <p
            className="body-text"
            style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', maxWidth: '650px', margin: '0 auto 2rem' }}
          >
            Pencatatan skor terpadu dengan integrasi meja juri mobile, ruang kontrol admin, dan papan skor TV layar penuh secara realtime.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <a
              href="#live-matches"
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                padding: '0.875rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '1rem',
                boxShadow: '0 4px 16px rgba(22, 163, 74, 0.4)',
              }}
            >
              ● Pantau Pertandingan Live
            </a>
            <Link
              href="/login"
              style={{
                backgroundColor: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '0.875rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                boxShadow: 'var(--card-shadow)',
              }}
            >
              Masuk ke Panel Petugas
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="container" style={{ padding: '3rem 1rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* LIVE MATCHES SECTION */}
        <section id="live-matches">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                boxShadow: '0 0 10px #22c55e',
              }}
            />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Pertandingan Berjalan (Live)</h2>
          </div>

          {liveMatches.length === 0 ? (
            <div
              style={{
                backgroundColor: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '2.5rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏳</div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                Belum Ada Pertandingan yang Sedang Berlangsung
              </h3>
              <p className="metadata-text">
                Pertandingan yang dimulai oleh admin akan otomatis tampil di sini dengan pembaruan skor langsung.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {liveMatches.map((m) => {
                const activeEvents = m.score_events?.filter((e) => e.status === 'ACTIVE') || []
                const attackScore = activeEvents
                  .filter((e) => e.team_id === m.team_attack?.id)
                  .reduce((sum, e) => sum + e.points, 0)
                const defenseScore = activeEvents
                  .filter((e) => e.team_id === m.team_defense?.id)
                  .reduce((sum, e) => sum + e.points, 0)

                return (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: 'var(--surface-color)',
                      border: '2px solid var(--success)',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem',
                      boxShadow: 'var(--card-shadow)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          backgroundColor: 'var(--success-subtle)',
                          color: 'var(--success)',
                          border: '1px solid var(--success)',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {m.status === 'LIVE' ? '● LIVE' : 'PAUSED'}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {m.round || 'Babak 1'}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{m.name}</h3>

                    {/* Score preview */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr auto 1fr',
                        alignItems: 'center',
                        backgroundColor: 'var(--card-inner-bg)',
                        border: '1px solid var(--border-color)',
                        padding: '1rem',
                        borderRadius: '8px',
                        gap: '0.5rem',
                        textAlign: 'center',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 800 }}>ATTACK</span>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                          {m.team_attack?.name}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--success)' }}>
                          {attackScore}
                        </div>
                      </div>

                      <div style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '1.25rem' }}>VS</div>

                      <div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 800 }}>DEFENSE</span>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                          {m.team_defense?.name}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--danger)' }}>
                          {defenseScore}
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/tv/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                      }}
                    >
                      📺 Buka Papan Skor TV (Fullscreen) →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* UPCOMING & PAST MATCHES */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Upcoming */}
          <div
            style={{
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem' }}>
              Jadwal Siap Tanding ({upcomingMatches.length})
            </h3>
            {upcomingMatches.length === 0 ? (
              <p className="metadata-text">Tidak ada jadwal tanding yang menunggu.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingMatches.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: 'var(--surface-subtle)',
                      border: '1px solid var(--border-color)',
                      padding: '0.875rem',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{m.name}</div>
                      <div className="metadata-text" style={{ fontSize: '0.8125rem' }}>
                        {m.team_attack?.name} vs {m.team_defense?.name}
                      </div>
                    </div>
                    <span
                      style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.15)',
                        color: '#60a5fa',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      READY
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Finished Results */}
          <div
            style={{
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '1.5rem',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              Hasil Pertandingan Selesai ({finishedMatches.length})
            </h3>
            {finishedMatches.length === 0 ? (
              <p className="metadata-text">Belum ada pertandingan yang selesai.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {finishedMatches.map((m) => {
                  const activeEvents = m.score_events?.filter((e) => e.status === 'ACTIVE') || []
                  const attackScore = activeEvents
                    .filter((e) => e.team_id === m.team_attack?.id)
                    .reduce((sum, e) => sum + e.points, 0)
                  const defenseScore = activeEvents
                    .filter((e) => e.team_id === m.team_defense?.id)
                    .reduce((sum, e) => sum + e.points, 0)

                  return (
                    <div
                      key={m.id}
                      style={{
                        backgroundColor: 'var(--card-inner-bg)',
                        border: '1px solid var(--border-color)',
                        padding: '0.875rem',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{m.name}</div>
                        <div className="metadata-text" style={{ fontSize: '0.8125rem' }}>
                          {m.team_attack?.name} vs {m.team_defense?.name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)' }}>
                          {attackScore} - {defenseScore}
                        </span>
                        <span
                          style={{
                            backgroundColor: 'var(--badge-neutral-bg)',
                            color: 'var(--badge-neutral-text)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          FINAL
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Rules & Guide Section */}
        <section
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '2rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Ketentuan Skor & Permainan Hadang (Gobak Sodor)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                1. Tim Penyerang (Attack)
              </strong>
              Pemain tim penyerang berusaha meloloskan diri melewati garis-garis petak penjagaan dari garis awal hingga garis belakang, lalu kembali ke garis awal.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                2. Tim Bertahan (Defense)
              </strong>
              Pemain bertahan menjaga di sepanjang garis lintang dan garis sodor (tengah) untuk menyentuh pemain penyerang agar terjadi pergantian posisi serang/bertahan.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                3. Sistem Penilaian Juri
              </strong>
              Juri 1 (Area Depan) dan Juri 2 (Area Belakang) mencatat poin langsung dari ponsel/tablet saat pemain berhasil menembus garis. Skor otomatis tersinkronisasi ke layar TV.
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
