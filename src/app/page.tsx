import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ThemeToggle from '@/components/theme-toggle'

interface MatchWithRelations {
  id: string
  name: string
  round: string | null
  scheduled_at: string | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  created_at: string
  team_attack: { id: string; name: string } | null
  team_defense: { id: string; name: string } | null
  score_events: { id: string; team_id: string; points: number; status: string }[]
}

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
                Pertandingan yang dimulai akan otomatis tampil di sini dengan pembaruan skor langsung.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
              {liveMatches.map((m) => {
                const activeEvents = m.score_events?.filter((e) => e.status === 'ACTIVE') || []
                const tA = m.team_attack || { id: 'team-a', name: 'Tim 1' }
                const tB = m.team_defense || { id: 'team-b', name: 'Tim 2' }
                const [teamLeft, teamRight] = (m.round === tA.id || (m.round !== tB.id && tA.id < tB.id)) ? [tA, tB] : [tB, tA]
                const isLeftAttacking = m.team_attack?.id === teamLeft.id
                const scoreLeft = activeEvents.filter((e) => e.team_id === teamLeft.id).reduce((sum, e) => sum + e.points, 0)
                const scoreRight = activeEvents.filter((e) => e.team_id === teamRight.id).reduce((sum, e) => sum + e.points, 0)

                return (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: 'var(--surface-color)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
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
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>{m.name}</h3>

                    {/* Score preview with static Left & Right */}
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
                        {isLeftAttacking ? (
                          <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 800, backgroundColor: 'var(--success-subtle)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            ⚡ SERANG
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            BERTAHAN
                          </span>
                        )}
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.3rem', color: 'var(--text-primary)' }}>
                          {teamLeft.name}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: isLeftAttacking ? 'var(--success)' : 'var(--text-primary)' }}>
                          {scoreLeft}
                        </div>
                      </div>

                      <div style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '1.25rem' }}>VS</div>

                      <div>
                        {!isLeftAttacking ? (
                          <span style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 800, backgroundColor: 'var(--success-subtle)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            ⚡ SERANG
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            BERTAHAN
                          </span>
                        )}
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginTop: '0.3rem', color: 'var(--text-primary)' }}>
                          {teamRight.name}
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: !isLeftAttacking ? 'var(--success)' : 'var(--text-primary)' }}>
                          {scoreRight}
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

        {/* UPCOMING & PAST MATCHES */}
        <section id="jadwal-hasil" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
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
                      {m.scheduled_at && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.2rem' }}>
                          📅 {new Intl.DateTimeFormat('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(m.scheduled_at)).replace(/\./g, ':')} WIB
                        </div>
                      )}
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
          id="aturan-permainan"
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '2rem',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Ketentuan Skor & Permainan Hadang
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                1. Pergantian Posisi Instan (Foul Turnover)
              </strong>
              Permainan tidak terikat sistem babak kaku. Setiap kali terjadi pelanggaran (foul), tersentuh penjaga, atau pemain keluar garis, giliran serang langsung berpindah ke tim lawan secara seketika.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                2. Tim Bertahan & Garis Sodor
              </strong>
              Pemain bertahan menjaga di sepanjang garis lintang dan garis sodor (tengah) untuk menyentuh pemain penyerang agar terjadi pergantian posisi serang/bertahan.
            </div>
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem' }}>
                3. Sistem Penilaian Scoring
              </strong>
              Poin otomatis masuk ke tim yang sedang memegang hak serang. Scoring 1 dan Scoring 2 mencatat poin langsung dari ponsel/tablet saat pemain berhasil menembus petak garis.
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
