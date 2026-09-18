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
  created_at?: string
  team_attack: { name: string } | null
  team_defense: { name: string } | null
  jury_1: { name: string } | null
  jury_2: { name: string } | null
}

function formatRoundLabel(round: string | null | undefined): string | null {
  if (!round) return null
  const r = round.trim()
  if (r.includes('BABAK_2_START')) return '⏱️ Babak 2'
  if (r.includes('BABAK_2_PENDING')) return '⏸️ Jeda Babak'
  if (r.includes('::') || /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(r)) {
    return null
  }
  return r
}

function detectMatchCategory(match: { name?: string | null }): 'PUTRA' | 'PUTRI' {
  const lower = (match.name || '').toLowerCase()
  if (lower.includes('(putri)') || lower.includes('[putri]') || lower.includes('putri')) {
    return 'PUTRI'
  }
  return 'PUTRA'
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

  // Prioritize active matches: LIVE > PAUSED > READY > DRAFT > FINISHED
  const statusRank: Record<string, number> = {
    LIVE: 1,
    PAUSED: 2,
    READY: 3,
    DRAFT: 4,
    FINISHED: 5,
  }

  const sortedMatches = [...matches].sort((a, b) => {
    const rankA = statusRank[a.status] || 99
    const rankB = statusRank[b.status] || 99
    if (rankA !== rankB) return rankA - rankB
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  })

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
          {sortedMatches.map((m) => {
            const isMatchPutra = detectMatchCategory(m) === 'PUTRA'
            const isJury1 = m.jury_1_id === user.id
            const isJury2 = m.jury_2_id === user.id
            const juryPosText = isJury1
              ? 'Scoring 1 (Area Depan)'
              : isJury2
              ? 'Scoring 2 (Area Belakang)'
              : 'Petugas / Admin'

            const isLive = m.status === 'LIVE'
            const isPaused = m.status === 'PAUSED'
            const isFinished = m.status === 'FINISHED'
            const roundLabel = formatRoundLabel(m.round)

            return (
              <div
                key={m.id}
                className="jury-match-card"
                style={{
                  backgroundColor: 'var(--surface-color)',
                  border: isLive
                    ? '2px solid var(--success)'
                    : isPaused
                    ? '2px solid var(--warning)'
                    : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: isLive ? '0 0 16px rgba(34, 197, 94, 0.25)' : 'var(--card-shadow)',
                  opacity: isFinished ? 0.75 : 1,
                }}
              >
                {/* Header: Badges row (Category, Status, Round) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {/* Category Badge */}
                    <span
                      style={{
                        backgroundColor: isMatchPutra ? 'rgba(37, 99, 235, 0.12)' : 'rgba(225, 29, 72, 0.12)',
                        color: isMatchPutra ? '#2563EB' : '#E11D48',
                        border: isMatchPutra ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid rgba(225, 29, 72, 0.3)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        flexShrink: 0,
                      }}
                    >
                      {isMatchPutra ? '🚹 PUTRA' : '🚺 PUTRI'}
                    </span>

                    {/* Status Badge */}
                    <span
                      style={{
                        backgroundColor: isLive
                          ? 'var(--success-subtle)'
                          : isPaused
                          ? 'var(--warning-subtle)'
                          : isFinished
                          ? 'var(--badge-neutral-bg)'
                          : 'var(--primary-subtle)',
                        color: isLive ? 'var(--success)' : isPaused ? 'var(--warning)' : isFinished ? 'var(--badge-neutral-text)' : 'var(--primary)',
                        border: isLive
                          ? '1px solid var(--success)'
                          : isPaused
                          ? '1px solid var(--warning)'
                          : '1px solid var(--border-color)',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                      }}
                    >
                      {isLive ? '● LIVE' : m.status}
                    </span>

                    {/* Sanitized Round Label (if any) */}
                    {roundLabel && (
                      <span
                        style={{
                          backgroundColor: 'var(--badge-neutral-bg)',
                          border: '1px solid var(--border-color)',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          color: 'var(--badge-neutral-text)',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {roundLabel}
                      </span>
                    )}
                  </div>

                  {/* Match Name: Full width, wraps cleanly, never squeezed into vertical lines */}
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: 'var(--text-primary)',
                      margin: 0,
                      lineHeight: 1.35,
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.name}
                  </h3>
                </div>

                {/* Team VS Box */}
                <div
                  style={{
                    backgroundColor: 'var(--card-inner-bg)',
                    border: '1px solid var(--border-color)',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.7rem', display: 'block', letterSpacing: '0.04em' }}>
                      SERANG (ATTACK)
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem', display: 'block', wordBreak: 'break-word', lineHeight: 1.25 }}>
                      {m.team_attack?.name || '-'}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: '0.2rem 0.55rem',
                      backgroundColor: 'var(--surface-subtle)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontWeight: 900, fontSize: '0.75rem' }}>VS</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                    <span style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '0.7rem', display: 'block', letterSpacing: '0.04em' }}>
                      BERTAHAN (DEFENSE)
                    </span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem', display: 'block', wordBreak: 'break-word', lineHeight: 1.25 }}>
                      {m.team_defense?.name || '-'}
                    </strong>
                  </div>
                </div>

                {/* Footer: Role & Action Button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Tugas Anda: <strong style={{ color: 'var(--text-primary)' }}>{juryPosText}</strong>
                  </div>

                  <Link
                    href={`/jury/matches/${m.id}`}
                    className="touch-manipulation"
                    style={{
                      backgroundColor: isLive
                        ? 'var(--success)'
                        : isFinished
                        ? 'var(--surface-subtle)'
                        : 'var(--primary)',
                      color: isFinished ? 'var(--text-secondary)' : 'white',
                      border: isFinished ? '1px solid var(--border-color)' : 'none',
                      padding: '0.85rem 1rem',
                      borderRadius: '8px',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      textDecoration: 'none',
                      boxShadow: isLive ? '0 4px 14px rgba(22, 163, 74, 0.4)' : isFinished ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.35)',
                      transition: 'transform 0.1s ease',
                      textAlign: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span>{isFinished ? 'Lihat Rekap Hasil Pertandingan ➔' : 'Buka Meja Scoring Lapangan ➔'}</span>
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
