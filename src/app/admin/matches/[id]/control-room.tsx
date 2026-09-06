'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  updateMatchStatus,
  swapTeams,
  cancelScoreEvent,
  manualAddScore,
} from './actions'
import { promptUndoScoreReason } from '@/lib/sweetalert'

interface Team {
  id: string
  name: string
}

interface Profile {
  id: string
  name: string
}

interface ScoreEvent {
  id: string
  match_id: string
  team_id: string
  jury_id: string | null
  event_type: string
  points: number
  status: 'ACTIVE' | 'CANCELLED'
  created_at: string
  cancelled_at?: string | null
  cancel_reason?: string | null
  jury?: { name: string } | null
}

interface MatchData {
  id: string
  name: string
  round: string | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  started_at: string | null
  finished_at: string | null
  team_attack_id: string
  team_defense_id: string
  jury_1_id: string
  jury_2_id: string
  team_attack: Team | null
  team_defense: Team | null
  jury_1: Profile | null
  jury_2: Profile | null
}

interface ControlRoomProps {
  initialMatch: MatchData
  initialScoreEvents: ScoreEvent[]
}

export default function ControlRoom({ initialMatch, initialScoreEvents }: ControlRoomProps) {
  const [match, setMatch] = useState<MatchData>(initialMatch)
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>(initialScoreEvents)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [showSwapModal, setShowSwapModal] = useState(false)
  const [newRoundName, setNewRoundName] = useState(initialMatch.round === 'Babak 1' ? 'Babak 2' : 'Babak 2')

  // Realtime Supabase Subscription + Background Fallback
  useEffect(() => {
    const supabase = createClient()
    const matchId = initialMatch.id

    const channel = supabase
      .channel(`admin-room-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload: any) => {
          const updated = payload.new as any
          setMatch((prev) => {
            const wasSwapped =
              prev.team_attack_id !== updated.team_attack_id ||
              prev.team_defense_id !== updated.team_defense_id

            return {
              ...prev,
              ...updated,
              team_attack: wasSwapped
                ? updated.team_attack_id === prev.team_defense?.id
                  ? prev.team_defense
                  : prev.team_attack
                : prev.team_attack,
              team_defense: wasSwapped
                ? updated.team_defense_id === prev.team_attack?.id
                  ? prev.team_attack
                  : prev.team_defense
                : prev.team_defense,
            }
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'score_events',
          filter: `match_id=eq.${matchId}`,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newEvent = payload.new as ScoreEvent
            let juryName: string | undefined
            if (newEvent.jury_id === initialMatch.jury_1_id) juryName = initialMatch.jury_1?.name
            else if (newEvent.jury_id === initialMatch.jury_2_id) juryName = initialMatch.jury_2?.name

            setScoreEvents((prev) => {
              if (prev.some((e) => e.id === newEvent.id)) return prev
              return [{ ...newEvent, jury: juryName ? { name: juryName } : null }, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ScoreEvent
            setScoreEvents((prev) =>
              prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
            )
          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id: string }).id
            setScoreEvents((prev) => prev.filter((item) => item.id !== oldId))
          }
        }
      )
      .subscribe()

    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

      try {
        const { data: latestEvents } = await supabase
          .from('score_events')
          .select(`
            id,
            match_id,
            team_id,
            jury_id,
            event_type,
            points,
            status,
            created_at,
            cancelled_at,
            cancel_reason,
            jury:jury_id(name)
          `)
          .eq('match_id', matchId)
          .order('created_at', { ascending: false })

        if (latestEvents && latestEvents.length > 0) {
          setScoreEvents((prev) => {
            if (
              prev.length !== latestEvents.length ||
              prev[0]?.id !== latestEvents[0]?.id ||
              prev[0]?.status !== latestEvents[0]?.status
            ) {
              return latestEvents as any
            }
            return prev
          })
        }

        const { data: latestMatch } = await supabase
          .from('matches')
          .select('status, round, team_attack_id, team_defense_id')
          .eq('id', matchId)
          .single()

        if (latestMatch) {
          setMatch((prev) => {
            if (
              prev.status !== latestMatch.status ||
              prev.round !== latestMatch.round ||
              prev.team_attack_id !== latestMatch.team_attack_id
            ) {
              const wasSwapped = prev.team_attack_id !== latestMatch.team_attack_id
              return {
                ...prev,
                ...latestMatch,
                team_attack: wasSwapped ? prev.team_defense : prev.team_attack,
                team_defense: wasSwapped ? prev.team_attack : prev.team_defense,
              }
            }
            return prev
          })
        }
      } catch (err) {}
    }, 2500)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [initialMatch.id, initialMatch.jury_1?.name, initialMatch.jury_1_id, initialMatch.jury_2?.name, initialMatch.jury_2_id])

  // Memoized score calculation
  const { attackScore, defenseScore, activeEvents } = useMemo(() => {
    const active = scoreEvents.filter((e) => e.status === 'ACTIVE')
    const attack = active
      .filter((e) => e.team_id === match.team_attack_id)
      .reduce((sum, e) => sum + e.points, 0)
    const defense = active
      .filter((e) => e.team_id === match.team_defense_id)
      .reduce((sum, e) => sum + e.points, 0)
    return { attackScore: attack, defenseScore: defense, activeEvents: active }
  }, [scoreEvents, match.team_attack_id, match.team_defense_id])

  // Status handlers
  const handleStatusChange = (newStatus: string) => {
    setActionError(null)
    startTransition(async () => {
      const res = await updateMatchStatus(match.id, newStatus)
      if (res?.error) setActionError(res.error)
      else setMatch((prev) => ({ ...prev, status: newStatus as any }))
    })
  }

  const handleSwap = () => {
    setActionError(null)
    startTransition(async () => {
      const res = await swapTeams(match.id, newRoundName)
      if (res?.error) {
        setActionError(res.error)
      } else {
        setShowSwapModal(false)
        setMatch((prev) => ({
          ...prev,
          round: newRoundName,
          team_attack_id: prev.team_defense_id,
          team_defense_id: prev.team_attack_id,
          team_attack: prev.team_defense,
          team_defense: prev.team_attack,
        }))
      }
    })
  }

  const handleCancelScore = async (eventId: string) => {
    const reason = await promptUndoScoreReason()
    if (!reason) return // User cancelled

    startTransition(async () => {
      const res = await cancelScoreEvent(eventId, match.id, reason)
      if (res?.error) setActionError(res.error)
      else {
        setScoreEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, status: 'CANCELLED', cancel_reason: reason } : e))
        )
      }
    })
  }

  const handleManualAddScore = (teamId: string) => {
    startTransition(async () => {
      const res = await manualAddScore(match.id, teamId, 1)
      if (res?.error) setActionError(res.error)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1200px' }}>
      {/* Top Header & Quick Links */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Link href="/admin" className="metadata-text" style={{ textDecoration: 'underline' }}>
              ← Kembali ke Dashboard
            </Link>
            <span className="metadata-text">•</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>ID: {match.id.slice(0, 8)}...</span>
          </div>
          <h1 className="heading" style={{ fontSize: '2rem' }}>
            {match.name}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
            <span
              style={{
                backgroundColor: 'var(--badge-neutral-bg)',
                color: 'var(--badge-neutral-text)',
                border: '1px solid var(--border-color)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
              }}
            >
              {match.round || 'Babak 1'}
            </span>
            <span
              style={{
                backgroundColor:
                  match.status === 'LIVE'
                    ? 'var(--success-subtle)'
                    : match.status === 'PAUSED'
                    ? 'var(--warning-subtle)'
                    : 'var(--badge-neutral-bg)',
                color:
                  match.status === 'LIVE'
                    ? 'var(--success)'
                    : match.status === 'PAUSED'
                    ? 'var(--warning)'
                    : 'var(--badge-neutral-text)',
                border:
                  match.status === 'LIVE'
                    ? '1px solid var(--success)'
                    : match.status === 'PAUSED'
                    ? '1px solid var(--warning)'
                    : '1px solid var(--border-color)',
                fontWeight: 800,
                fontSize: '0.8125rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
              }}
            >
              {match.status === 'LIVE' ? '● LIVE' : match.status}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href={`/tv/${match.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.9375rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            }}
          >
            📺 Buka TV Scoreboard
          </Link>
        </div>
      </div>

      {actionError && (
        <div
          style={{
            backgroundColor: 'var(--danger-subtle)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {actionError}
        </div>
      )}

      {/* Main Scoreboard Arena */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '2rem',
          alignItems: 'center',
          gap: '1.5rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Team Attack Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor: 'var(--success-subtle)',
            border: '2px solid var(--success)',
            borderRadius: '10px',
            padding: '1.5rem',
          }}
        >
          <span
            style={{
              backgroundColor: 'var(--success)',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.75rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
          >
            ATTACK (PENYERANG)
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {match.team_attack?.name || 'Tim Serang'}
          </h2>
          <div className="tv-score" style={{ color: 'var(--success)', margin: '0.5rem 0' }}>
            {attackScore}
          </div>
          <button
            onClick={() => handleManualAddScore(match.team_attack_id)}
            disabled={isPending}
            style={{
              backgroundColor: 'var(--success)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
            }}
          >
            +1 Poin Manual
          </button>
        </div>

        {/* Center Divider & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>VS</span>
          <button
            onClick={() => setShowSwapModal(true)}
            disabled={isPending}
            style={{
              backgroundColor: 'var(--btn-secondary-bg)',
              color: 'var(--btn-secondary-text)',
              border: '1px solid var(--border-color)',
              padding: '0.625rem 1rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer',
            }}
          >
            ⇄ Tukar Posisi (Ganti Babak)
          </button>
        </div>

        {/* Team Defense Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor: 'var(--danger-subtle)',
            border: '2px solid var(--danger)',
            borderRadius: '10px',
            padding: '1.5rem',
          }}
        >
          <span
            style={{
              backgroundColor: 'var(--danger)',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.75rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              letterSpacing: '0.05em',
              marginBottom: '0.5rem',
            }}
          >
            DEFENSE (BERTAHAN)
          </span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {match.team_defense?.name || 'Tim Bertahan'}
          </h2>
          <div className="tv-score" style={{ color: 'var(--danger)', margin: '0.5rem 0' }}>
            {defenseScore}
          </div>
          <button
            onClick={() => handleManualAddScore(match.team_defense_id)}
            disabled={isPending}
            style={{
              backgroundColor: 'var(--danger)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
            }}
          >
            +1 Poin Manual
          </button>
        </div>
      </div>

      {/* Match Control Panel */}
      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Kontrol Status Pertandingan</h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          {match.status !== 'LIVE' && (
            <button
              onClick={() => handleStatusChange('LIVE')}
              disabled={isPending}
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                padding: '0.875rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              ▶ {match.status === 'PAUSED' ? 'LANJUTKAN (RESUME)' : 'MULAI PERTANDINGAN (LIVE)'}
            </button>
          )}

          {match.status === 'LIVE' && (
            <button
              onClick={() => handleStatusChange('PAUSED')}
              disabled={isPending}
              style={{
                backgroundColor: 'var(--warning)',
                color: 'black',
                padding: '0.875rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              ⏸ JEDA / PAUSE
            </button>
          )}

          {match.status !== 'FINISHED' && (
            <button
              onClick={() => {
                if (window.confirm('Apakah Anda yakin ingin menyelesaikan pertandingan ini?')) {
                  handleStatusChange('FINISHED')
                }
              }}
              disabled={isPending}
              style={{
                backgroundColor: 'var(--danger)',
                color: 'white',
                padding: '0.875rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              ⏹ SELESAIKAN PERTANDINGAN
            </button>
          )}

          {match.status === 'FINISHED' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pertandingan Selesai</span>
              <button
                onClick={() => handleStatusChange('LIVE')}
                disabled={isPending}
                style={{
                  backgroundColor: 'var(--btn-secondary-bg)',
                  color: 'var(--btn-secondary-text)',
                  border: '1px solid var(--border-color)',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Buka Kembali (Set LIVE)
              </button>
            </div>
          )}
        </div>

        {/* Assigned Scoring bar */}
        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Scoring 1 (Depan): </span>
            <strong style={{ color: 'var(--text-primary)' }}>{match.jury_1?.name || 'Belum ditugaskan'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-secondary)' }}>Scoring 2 (Belakang): </span>
            <strong style={{ color: 'var(--text-primary)' }}>{match.jury_2?.name || 'Belum ditugaskan'}</strong>
          </div>
        </div>
      </div>

      {/* Score Events Audit Feed */}
      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Riwayat Kejadian Skor ({scoreEvents.length})
          </h3>
          <span className="metadata-text">Diperbarui secara realtime</span>
        </div>

        {scoreEvents.length === 0 ? (
          <p className="metadata-text" style={{ padding: '1rem 0' }}>
            Belum ada poin yang tercatat pada pertandingan ini.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
            {scoreEvents.map((evt) => {
              const teamName =
                evt.team_id === match.team_attack_id
                  ? match.team_attack?.name
                  : evt.team_id === match.team_defense_id
                  ? match.team_defense?.name
                  : 'Tim'

              const timeStr = new Date(evt.created_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })

              const isCancelled = evt.status === 'CANCELLED'

              return (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isCancelled ? 'var(--surface-subtle)' : 'var(--card-inner-bg)',
                    padding: '0.875rem 1rem',
                    borderRadius: '6px',
                    border: isCancelled ? '1px dashed var(--border-color)' : '1px solid var(--border-color)',
                    opacity: isCancelled ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span
                      style={{
                        backgroundColor: isCancelled ? 'var(--badge-neutral-bg)' : 'var(--success)',
                        color: isCancelled ? 'var(--badge-neutral-text)' : 'white',
                        fontWeight: 800,
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        minWidth: '2.5rem',
                        textAlign: 'center',
                      }}
                    >
                      +{evt.points}
                    </span>

                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', textDecoration: isCancelled ? 'line-through' : 'none' }}>
                        {teamName}
                        {isCancelled && (
                          <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: 600 }}>
                            (DIBATALKAN: {evt.cancel_reason || 'Batal'})
                          </span>
                        )}
                      </div>
                      <div className="metadata-text" style={{ fontSize: '0.75rem' }}>
                        Waktu: {timeStr} • Pencatat: {evt.jury?.name || 'Admin/Sistem'} • Tipe: {evt.event_type}
                      </div>
                    </div>
                  </div>

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelScore(evt.id)}
                      disabled={isPending}
                      style={{
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                        backgroundColor: 'var(--danger-subtle)',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Batalkan Poin
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Swap Sides Modal */}
      {showSwapModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1rem',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '2rem',
              maxWidth: '450px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>Tukar Posisi Serang / Bertahan</h3>
            <p className="metadata-text">
              Aksi ini akan menukar posisi tim: <strong style={{ color: 'var(--text-primary)' }}>{match.team_defense?.name}</strong> menjadi Tim Penyerang
              (Attack), dan <strong style={{ color: 'var(--text-primary)' }}>{match.team_attack?.name}</strong> menjadi Tim Bertahan (Defense).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="roundName" className="metadata-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Perbarui Nama Babak / Ronde:
              </label>
              <input
                type="text"
                id="roundName"
                value={newRoundName}
                onChange={(e) => setNewRoundName(e.target.value)}
                placeholder="Contoh: Babak 2"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowSwapModal(false)}
                disabled={isPending}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--btn-secondary-bg)',
                  color: 'var(--btn-secondary-text)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSwap}
                disabled={isPending}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '6px',
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isPending ? 'Menukar...' : 'Ya, Tukar Posisi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
