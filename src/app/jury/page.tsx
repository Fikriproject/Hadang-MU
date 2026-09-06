import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface MatchItem {
  id: string
  name: string
  round: string | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  team_attack_id: string
  team_defense_id: string
  jury_1_id: string
  jury_2_id: string
  team_attack: { name: string } | null
  team_defense: { name: string } | null
  jury_1: { name: string } | null
  jury_2: { name: string } | null
}

export default async function JuryDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  // Fetch matches: If jury, fetch assigned matches. If admin, fetch all matches.
  let query = supabase
    .from('matches')
    .select(`
      id,
      name,
      round,
      status,
      team_attack_id,
      team_defense_id,
      jury_1_id,
      jury_2_id,
      team_attack:team_attack_id(name),
      team_defense:team_defense_id(name),
      jury_1:jury_1_id(name),
      jury_2:jury_2_id(name)
    `)
    .order('created_at', { ascending: false })

  if (profile?.role !== 'ADMIN') {
    query = query.or(`jury_1_id.eq.${user.id},jury_2_id.eq.${user.id}`)
  }

  const { data: rawMatches } = await query
  const matches = (rawMatches || []) as unknown as MatchItem[]

  return (
    <div className="jury-matches-container">
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 className="heading" style={{ fontSize: '1.65rem', marginBottom: '0.25rem' }}>
            Meja Scoring Hadang
          </h1>
          <p className="metadata-text">
            Pilih pertandingan yang sedang ditugaskan kepada Anda untuk mulai mencatat skor.
          </p>
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          Total: <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{matches.length} Pertandingan</span>
        </div>
      </div>

      {matches.length === 0 ? (
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '3rem 1.5rem',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Belum Ada Penugasan
          </h3>
          <p className="metadata-text">
            Anda belum ditugaskan sebagai scoring pada pertandingan manapun saat ini. Silakan hubungi Admin pertandingan.
          </p>
        </div>
      ) : (
        <div className="jury-matches-grid">
          {matches.map((m) => {
            const isJury1 = m.jury_1_id === user.id
            const isJury2 = m.jury_2_id === user.id
            const juryPosText = isJury1
              ? 'Scoring 1 (Area Depan)'
              : isJury2
              ? 'Scoring 2 (Area Belakang)'
              : 'Petugas / Admin'

            const isLive = m.status === 'LIVE'
            const isPaused = m.status === 'PAUSED'

            return (
              <div
                key={m.id}
                className="jury-match-card"
                style={{
                  backgroundColor: 'var(--surface-color)',
                  border: isLive ? '2px solid var(--success)' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: 'var(--card-shadow)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        backgroundColor: isLive
                          ? 'var(--success-subtle)'
                          : isPaused
                          ? 'var(--warning-subtle)'
                          : 'var(--badge-neutral-bg)',
                        color: isLive ? 'var(--success)' : isPaused ? 'var(--warning)' : 'var(--badge-neutral-text)',
                        border: isLive
                          ? '1px solid var(--success)'
                          : isPaused
                          ? '1px solid var(--warning)'
                          : '1px solid var(--border-color)',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {isLive ? '● LIVE' : m.status}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{m.name}</span>
                  </div>
                  {m.round && (
                    <span style={{ backgroundColor: 'var(--badge-neutral-bg)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--badge-neutral-text)', fontWeight: 600 }}>
                      {m.round}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--card-inner-bg)',
                    border: '1px solid var(--border-color)',
                    padding: '0.875rem 1rem',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.9375rem',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.75rem', display: 'block' }}>
                      SERANG (ATTACK)
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{m.team_attack?.name || '-'}</strong>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 800 }}>VS</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '0.75rem', display: 'block' }}>
                      BERTAHAN (DEFENSE)
                    </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{m.team_defense?.name || '-'}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Tugas Anda: <strong style={{ color: 'var(--text-primary)' }}>{juryPosText}</strong>
                  </div>

                  <Link
                    href={`/jury/matches/${m.id}`}
                    className="touch-manipulation"
                    style={{
                      backgroundColor: isLive ? 'var(--success)' : 'var(--primary)',
                      color: 'white',
                      padding: '0.875rem 1.25rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none',
                      boxShadow: isLive ? '0 4px 14px rgba(22, 163, 74, 0.4)' : '0 4px 14px rgba(37, 99, 235, 0.35)',
                      transition: 'transform 0.1s ease',
                      textAlign: 'center',
                    }}
                  >
                    Buka Panel Skor Hadang →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
