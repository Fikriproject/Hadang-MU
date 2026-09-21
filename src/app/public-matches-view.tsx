'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export interface MatchWithRelations {
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

interface PublicMatchesViewProps {
  initialMatches: MatchWithRelations[]
  children?: React.ReactNode
}

export default function PublicMatchesView({ initialMatches, children }: PublicMatchesViewProps) {
  const [matches, setMatches] = useState<MatchWithRelations[]>(initialMatches)
  const [isConnected, setIsConnected] = useState<boolean>(true)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch data terbaru dari database
  const fetchMatches = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
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

      if (!error && data) {
        setMatches(data as unknown as MatchWithRelations[])
      }
    } catch (err) {
      console.error('Error auto-syncing public matches:', err)
    }
  }, [])

  // Trigger sync dengan debounce 300ms
  const triggerDebouncedSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      fetchMatches()
    }, 300)
  }, [fetchMatches])

  useEffect(() => {
    const supabase = createClient()

    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel('public-matches-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          triggerDebouncedSync()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_events' },
        () => {
          triggerDebouncedSync()
        }
      )
      .subscribe((status: string) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // 2. Fallback Polling (12 detik)
    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      fetchMatches()
    }, 12000)

    // 3. Tab visibility change sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMatches()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [fetchMatches, triggerDebouncedSync])

  const liveMatches = matches.filter((m) => m.status === 'LIVE' || m.status === 'PAUSED')
  const upcomingMatches = matches.filter((m) => m.status === 'READY')
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')

  return (
    <>
      {/* LIVE MATCHES SECTION */}
      <section id="live-matches">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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

          {/* Realtime Live Sync Status Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontWeight: 700,
              boxShadow: 'var(--card-shadow)',
            }}
            title="Pembaruan skor dan jadwal diperbarui otomatis secara realtime"
          >
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isConnected ? '#22c55e' : '#eab308',
                boxShadow: isConnected ? '0 0 8px #22c55e' : 'none',
              }}
            />
            <span>{isConnected ? 'Realtime Live Aktif' : 'Auto-Sync Aktif'}</span>
          </div>
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
              const [teamLeft, teamRight] =
                m.round === tA.id || (m.round !== tB.id && tA.id < tB.id) ? [tA, tB] : [tB, tA]
              const isLeftAttacking = m.team_attack?.id === teamLeft.id
              const scoreLeft = activeEvents
                .filter((e) => e.team_id === teamLeft.id)
                .reduce((sum, e) => sum + e.points, 0)
              const scoreRight = activeEvents
                .filter((e) => e.team_id === teamRight.id)
                .reduce((sum, e) => sum + e.points, 0)

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
                        <span
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--success)',
                            fontWeight: 800,
                            backgroundColor: 'var(--success-subtle)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                          }}
                        >
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
                      <div
                        style={{
                          fontSize: '2rem',
                          fontWeight: 900,
                          color: isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
                        }}
                      >
                        {scoreLeft}
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, color: 'var(--text-muted)', fontSize: '1.25rem' }}>VS</div>

                    <div>
                      {!isLeftAttacking ? (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--success)',
                            fontWeight: 800,
                            backgroundColor: 'var(--success-subtle)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                          }}
                        >
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
                      <div
                        style={{
                          fontSize: '2rem',
                          fontWeight: 900,
                          color: !isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
                        }}
                      >
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

      {/* RENDER IN-BETWEEN CHILDREN (Misal Banner Promo Bagan Turnamen) */}
      {children}

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
                        📅{' '}
                        {new Intl.DateTimeFormat('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                          .format(new Date(m.scheduled_at))
                          .replace(/\./g, ':')}{' '}
                        WIB
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
    </>
  )
}
