import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import styles from './admin.module.css'

interface MatchWithRelations {
  id: string
  name: string
  round: string | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  created_at: string
  started_at: string | null
  finished_at: string | null
  team_attack: { id: string; name: string } | null
  team_defense: { id: string; name: string } | null
  jury_1: { id: string; name: string } | null
  jury_2: { id: string; name: string } | null
  score_events: { id: string; team_id: string; points: number; status: string }[]
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch matches with relations & score events
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      round,
      status,
      created_at,
      started_at,
      finished_at,
      team_attack:team_attack_id(id, name),
      team_defense:team_defense_id(id, name),
      jury_1:jury_1_id(id, name),
      jury_2:jury_2_id(id, name),
      score_events(id, team_id, points, status)
    `)
    .order('created_at', { ascending: false })

  const matches = (rawMatches || []) as unknown as MatchWithRelations[]

  // Fetch total teams
  const { count: totalTeams } = await supabase
    .from('teams')
    .select('*', { count: 'exact', head: true })

  // Compute stats
  const liveMatches = matches.filter((m) => m.status === 'LIVE' || m.status === 'PAUSED')
  const readyMatches = matches.filter((m) => m.status === 'READY')
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="heading" style={{ fontSize: '1.875rem' }}>Dashboard Pertandingan</h1>
          <p className="metadata-text">Sistem Penilaian Hadang (Gobak Sodor)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href="/admin/matches/create"
            prefetch={false}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            + Buat Pertandingan
          </Link>
          <Link
            href="/admin/teams"
            prefetch={false}
            style={{
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.75rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Kelola Tim
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div className="metadata-text" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tim</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            {totalTeams ?? 0}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--success)', boxShadow: 'var(--card-shadow)' }}>
          <div className="metadata-text" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success)', fontWeight: 700 }}>
            Pertandingan Berjalan
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--success)' }}>
            {liveMatches.length}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--primary)', boxShadow: 'var(--card-shadow)' }}>
          <div className="metadata-text" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)', fontWeight: 700 }}>
            Siap Dimulai
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--primary)' }}>
            {readyMatches.length}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--card-shadow)' }}>
          <div className="metadata-text" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selesai</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            {finishedMatches.length}
          </div>
        </div>
      </div>

      {/* Matches List */}
      <div style={{ backgroundColor: 'var(--surface-color)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: 'var(--card-shadow)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 700 }}>
          Daftar Pertandingan ({matches.length})
        </h2>

        {matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p className="metadata-text" style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>
              Belum ada data pertandingan.
            </p>
            <Link
              href="/admin/matches/create"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              Mulai Buat Pertandingan
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {matches.map((m) => {
              // Calculate current score
              const activeEvents = m.score_events?.filter((e) => e.status === 'ACTIVE') || []
              const attackScore = activeEvents
                .filter((e) => e.team_id === m.team_attack?.id)
                .reduce((sum, e) => sum + e.points, 0)
              const defenseScore = activeEvents
                .filter((e) => e.team_id === m.team_defense?.id)
                .reduce((sum, e) => sum + e.points, 0)

              // Status badge styling using semantic variables
              let statusBg = 'var(--badge-neutral-bg)'
              let statusColor = 'var(--badge-neutral-text)'
              let statusBorder = '1px solid var(--border-color)'
              let statusLabel: string = m.status

              if (m.status === 'LIVE') {
                statusBg = 'var(--success-subtle)'
                statusColor = 'var(--success)'
                statusBorder = '1px solid var(--success)'
                statusLabel = '● LIVE'
              } else if (m.status === 'PAUSED') {
                statusBg = 'var(--warning-subtle)'
                statusColor = 'var(--warning)'
                statusBorder = '1px solid var(--warning)'
                statusLabel = 'PAUSED'
              } else if (m.status === 'READY') {
                statusBg = 'var(--primary-subtle)'
                statusColor = 'var(--primary)'
                statusBorder = '1px solid var(--primary)'
                statusLabel = 'READY'
              } else if (m.status === 'FINISHED') {
                statusBg = 'var(--badge-neutral-bg)'
                statusColor = 'var(--badge-neutral-text)'
                statusBorder = '1px solid var(--border-color)'
                statusLabel = 'SELESAI'
              }

              return (
                <div
                  key={m.id}
                  style={{
                    backgroundColor: 'var(--surface-color)',
                    border: m.status === 'LIVE' ? '2px solid var(--success)' : '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span
                        style={{
                          backgroundColor: statusBg,
                          color: statusColor,
                          border: statusBorder,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {statusLabel}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{m.name}</span>
                      {m.round && (
                        <span
                          style={{
                            backgroundColor: 'var(--badge-neutral-bg)',
                            color: 'var(--badge-neutral-text)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                          }}
                        >
                          {m.round}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        href={`/admin/matches/${m.id}`}
                        style={{
                          backgroundColor: 'var(--primary)',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                        }}
                      >
                        Ruang Kontrol
                      </Link>
                      <Link
                        href={`/tv/${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: 'var(--btn-secondary-bg)',
                          color: 'var(--btn-secondary-text)',
                          border: '1px solid var(--border-color)',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        📺 TV Score
                      </Link>
                    </div>
                  </div>

                  {/* Match Teams & Score Bar */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto 1fr',
                      alignItems: 'center',
                      backgroundColor: 'var(--card-inner-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '1.1rem 1.25rem',
                      gap: '1rem',
                    }}
                  >
                    {/* Team Attack */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ATTACK (Penyerang)
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        {m.team_attack?.name || 'Belum dipilih'}
                      </span>
                    </div>

                    {/* Score display */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '2.25rem', fontWeight: 900, color: 'var(--success)', minWidth: '2ch', textAlign: 'center' }}>
                        {attackScore}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '1.5rem' }}>:</span>
                      <span
                        style={{
                          fontSize: '2.25rem',
                          fontWeight: 900,
                          color: defenseScore > 0 ? 'var(--danger)' : 'var(--score-inactive-text)',
                          minWidth: '2ch',
                          textAlign: 'center',
                        }}
                      >
                        {defenseScore}
                      </span>
                    </div>

                    {/* Team Defense */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        DEFENSE (Bertahan)
                      </span>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                        {m.team_defense?.name || 'Belum dipilih'}
                      </span>
                    </div>
                  </div>

                  {/* Juries Assigned info */}
                  <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Juri 1 (Depan): </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{m.jury_1?.name || '-'}</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Juri 2 (Belakang): </span>
                      <strong style={{ color: 'var(--text-primary)' }}>{m.jury_2?.name || '-'}</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
