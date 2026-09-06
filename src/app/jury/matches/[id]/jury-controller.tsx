'use client'

import React, { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { addJuryScore, cancelRecentScore } from './actions'
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
}

interface MatchData {
  id: string
  name: string
  round: string | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  started_at?: string | null
  finished_at?: string | null
  updated_at?: string | null
  team_attack_id: string
  team_defense_id: string
  jury_1_id: string
  jury_2_id: string
  team_attack: Team | null
  team_defense: Team | null
  jury_1: Profile | null
  jury_2: Profile | null
}

interface JuryControllerProps {
  initialMatch: MatchData
  initialScoreEvents: ScoreEvent[]
  currentUserId: string
}

export default function JuryController({
  initialMatch,
  initialScoreEvents,
  currentUserId,
}: JuryControllerProps) {
  const [match, setMatch] = useState<MatchData>(initialMatch)
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>(initialScoreEvents)
  const [isPending, startTransition] = useTransition()
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [isButtonActive, setIsButtonActive] = useState(false)

  // Deterministic Left & Right teams: positions NEVER swap on screen
  const { teamLeft, teamRight } = useMemo(() => {
    const tA = initialMatch.team_attack || { id: initialMatch.team_attack_id, name: 'Tim 1' }
    const tB = initialMatch.team_defense || { id: initialMatch.team_defense_id, name: 'Tim 2' }

    if (initialMatch.round === tA.id) return { teamLeft: tA, teamRight: tB }
    if (initialMatch.round === tB.id) return { teamLeft: tB, teamRight: tA }

    return tA.id < tB.id ? { teamLeft: tA, teamRight: tB } : { teamLeft: tB, teamRight: tA }
  }, [
    initialMatch.team_attack,
    initialMatch.team_defense,
    initialMatch.team_attack_id,
    initialMatch.team_defense_id,
    initialMatch.round,
  ])

  // Realtime Supabase Subscription
  useEffect(() => {
    const supabase = createClient()
    const matchId = initialMatch.id

    const channel = supabase
      .channel(`jury-match-${matchId}`)
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
          setMatch((prev) => ({
            ...prev,
            ...updated,
          }))
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
            setScoreEvents((prev) => {
              if (prev.some((e) => e.id === newEvent.id)) return prev
              return [newEvent, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as ScoreEvent
            setScoreEvents((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
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
          .select('id, match_id, team_id, jury_id, event_type, points, status, created_at')
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
          .select('status, round, team_attack_id, team_defense_id, started_at, finished_at, updated_at')
          .eq('id', matchId)
          .single()

        if (latestMatch) {
          setMatch((prev) => ({
            ...prev,
            status: latestMatch.status,
            round: latestMatch.round,
            team_attack_id: latestMatch.team_attack_id,
            team_defense_id: latestMatch.team_defense_id,
            started_at: latestMatch.started_at,
            finished_at: latestMatch.finished_at,
            updated_at: latestMatch.updated_at,
          }))
        }
      } catch (err) {
        // Silent error
      }
    }, 2500)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [initialMatch.id])

  // Real-time Match Stopwatch
  const [elapsed, setElapsed] = useState<string>('00:00')
  useEffect(() => {
    if (!match.started_at) {
      setElapsed('00:00')
      return
    }

    const calcElapsed = () => {
      const start = new Date(match.started_at!).getTime()
      const end = match.finished_at
        ? new Date(match.finished_at).getTime()
        : match.status === 'PAUSED' && match.updated_at
        ? new Date(match.updated_at).getTime()
        : Date.now()
      const diffSecs = Math.max(0, Math.floor((end - start) / 1000))
      const hours = Math.floor(diffSecs / 3600)
      const mins = Math.floor((diffSecs % 3600) / 60)
      const secs = diffSecs % 60
      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    setElapsed(calcElapsed())

    if (match.status === 'LIVE') {
      const timer = setInterval(() => setElapsed(calcElapsed()), 1000)
      return () => clearInterval(timer)
    }
  }, [match.started_at, match.finished_at, match.updated_at, match.status])

  // Clear toast timer
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => {
      setToastMessage(null)
    }, 2500)
    return () => clearTimeout(timer)
  }, [toastMessage])

  // Determine user's assigned role
  const isJury1 = match.jury_1_id === currentUserId
  const isJury2 = match.jury_2_id === currentUserId
  const juryLabel = isJury1
    ? 'Scoring 1 (Area Depan)'
    : isJury2
    ? 'Scoring 2 (Area Belakang)'
    : 'Petugas Meja Scoring'

  // Active attacking team
  const isLeftAttacking = match.team_attack_id === teamLeft.id
  const isRightAttacking = match.team_attack_id === teamRight.id
  const attackingTeamName = isLeftAttacking ? teamLeft.name : teamRight.name

  // Memoized scores & undo availability for static teams
  const { scoreLeft, scoreRight, myActiveEvents, canUndo } = useMemo(() => {
    const active = scoreEvents.filter((e) => e.status === 'ACTIVE')
    const sLeft = active
      .filter((e) => e.team_id === teamLeft.id)
      .reduce((sum, e) => sum + e.points, 0)
    const sRight = active
      .filter((e) => e.team_id === teamRight.id)
      .reduce((sum, e) => sum + e.points, 0)
    const myActive = active.filter((e) => e.jury_id === currentUserId)
    return {
      scoreLeft: sLeft,
      scoreRight: sRight,
      myActiveEvents: myActive,
      canUndo: myActive.length > 0,
    }
  }, [scoreEvents, teamLeft.id, teamRight.id, currentUserId])

  const isLive = match.status === 'LIVE'

  // Action: Add +1 Score
  const handleScoreClick = () => {
    if (!isLive || isPending) return

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(60)
      } catch (e) {}
    }

    setIsButtonActive(true)
    setTimeout(() => setIsButtonActive(false), 150)

    const tempId = `optimistic-${Date.now()}`
    const attackingId = match.team_attack_id
    const optimisticEvent: ScoreEvent = {
      id: tempId,
      match_id: match.id,
      team_id: attackingId,
      jury_id: currentUserId,
      event_type: 'HADANG_POINT',
      points: 1,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    }

    setScoreEvents((prev) => [optimisticEvent, ...prev])
    setToastMessage({ text: `+1 Poin untuk ${attackingTeamName}!`, type: 'success' })

    startTransition(async () => {
      const res = await addJuryScore(match.id)
      if (res?.error) {
        setScoreEvents((prev) => prev.filter((e) => e.id !== tempId))
        setToastMessage({ text: res.error, type: 'error' })
      } else if (res?.eventId) {
        setScoreEvents((prev) =>
          prev.map((e) => (e.id === tempId ? { ...e, id: res.eventId } : e))
        )
      }
    })
  }

  // Action: Undo recent score
  const handleUndoClick = async () => {
    if (!canUndo || isPending) return

    const reason = await promptUndoScoreReason()
    if (!reason) return

    const targetEvent = myActiveEvents[0]
    if (!targetEvent) return

    setScoreEvents((prev) =>
      prev.map((e) => (e.id === targetEvent.id ? { ...e, status: 'CANCELLED' } : e))
    )
    setToastMessage({ text: `Poin berhasil dibatalkan (${reason})`, type: 'success' })

    startTransition(async () => {
      const res = await cancelRecentScore(match.id, reason)
      if (res?.error) {
        setScoreEvents((prev) =>
          prev.map((e) => (e.id === targetEvent.id ? { ...e, status: 'ACTIVE' } : e))
        )
        setToastMessage({ text: res.error, type: 'error' })
      }
    })
  }

  return (
    <div
      className="safe-area-bottom no-select"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100dvh - 48px)',
        maxHeight: 'calc(100dvh - 48px)',
        padding: '0.65rem 0.85rem',
        maxWidth: '500px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        gap: '0.65rem',
        justifyContent: 'space-between',
        overflow: 'hidden',
      }}
    >
      {/* Match Header Bar - Ultra Compact for HP */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          boxShadow: 'var(--card-shadow)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <Link
            href="/jury"
            className="touch-manipulation"
            style={{
              color: 'var(--primary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              padding: '0.25rem 0.35rem',
              borderRadius: '4px',
              backgroundColor: 'var(--primary-subtle)',
              flexShrink: 0,
            }}
          >
            ← List
          </Link>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h2
              style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
              }}
            >
              {match.name}
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>
              {juryLabel}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: '0.35rem' }}>
          {/* Running Stopwatch Badge */}
          <div
            style={{
              backgroundColor: isLive ? 'var(--success-subtle)' : match.status === 'PAUSED' ? 'var(--warning-subtle)' : 'var(--surface-subtle)',
              border: isLive ? '1.5px solid var(--success)' : match.status === 'PAUSED' ? '1.5px solid var(--warning)' : '1px solid var(--border-color)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            <span style={{ fontSize: '0.75rem' }}>⏱</span>
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.875rem',
                fontWeight: 900,
                color: isLive ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--text-primary)',
              }}
            >
              {elapsed}
            </span>
          </div>

          {/* Quick link to Ruang Kontrol */}
          <Link
            href={`/admin/matches/${match.id}`}
            className="touch-manipulation"
            style={{
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            ⚙️ Kontrol
          </Link>
        </div>
      </div>

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: toastMessage.type === 'success' ? '#16A34A' : '#EF4444',
            color: 'white',
            fontWeight: 800,
            fontSize: '0.8125rem',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Non-LIVE Notice Banner */}
      {!isLive && (
        <div
          style={{
            backgroundColor: 'var(--warning-subtle)',
            border: '1px solid var(--warning)',
            color: 'var(--warning)',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            textAlign: 'center',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {match.status === 'PAUSED'
            ? '⏸ Pertandingan dijeda Admin. Tombol input dinonaktifkan.'
            : match.status === 'FINISHED'
            ? '🏁 Pertandingan telah selesai.'
            : '⏳ Pertandingan belum LIVE (Status: ' + match.status + ').'}
        </div>
      )}

      {/* Score Board: Compact & Highly Readable in bright sunlight */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.75rem 0.5rem',
          alignItems: 'center',
          gap: '0.4rem',
          boxShadow: 'var(--card-shadow)',
          flexShrink: 0,
        }}
      >
        {/* TIM 1 (LEFT) */}
        <div
          style={{
            textAlign: 'center',
            padding: '0.4rem 0.25rem',
            borderRadius: '8px',
            backgroundColor: isLeftAttacking ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
            border: isLeftAttacking ? '1.5px solid var(--success)' : '1px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ minHeight: '22px' }}>
            {isLeftAttacking ? (
              <span
                className="pulse-attack"
                style={{
                  backgroundColor: 'var(--success)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.04em',
                  display: 'inline-block',
                }}
              >
                ⚡ SERANG
              </span>
            ) : (
              <span
                style={{
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.6rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.03em',
                  border: '1px solid var(--border-color)',
                  display: 'inline-block',
                }}
              >
                BERTAHAN
              </span>
            )}
          </div>

          <div
            style={{
              fontWeight: 800,
              fontSize: '0.95rem',
              marginTop: '0.25rem',
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {teamLeft.name}
          </div>
          <div
            style={{
              fontSize: 'clamp(2.4rem, 9vw, 3.2rem)',
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
              margin: '0.15rem 0 0',
            }}
          >
            {scoreLeft}
          </div>
        </div>

        {/* CENTER DIVIDER */}
        <div style={{ textAlign: 'center', padding: '0 0.15rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-muted)' }}>VS</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SKOR</div>
        </div>

        {/* TIM 2 (RIGHT) */}
        <div
          style={{
            textAlign: 'center',
            padding: '0.4rem 0.25rem',
            borderRadius: '8px',
            backgroundColor: isRightAttacking ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
            border: isRightAttacking ? '1.5px solid var(--success)' : '1px solid transparent',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ minHeight: '22px' }}>
            {isRightAttacking ? (
              <span
                className="pulse-attack"
                style={{
                  backgroundColor: 'var(--success)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.55rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.04em',
                  display: 'inline-block',
                }}
              >
                ⚡ SERANG
              </span>
            ) : (
              <span
                style={{
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.6rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.03em',
                  border: '1px solid var(--border-color)',
                  display: 'inline-block',
                }}
              >
                BERTAHAN
              </span>
            )}
          </div>

          <div
            style={{
              fontWeight: 800,
              fontSize: '0.95rem',
              marginTop: '0.25rem',
              lineHeight: 1.2,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {teamRight.name}
          </div>
          <div
            style={{
              fontSize: 'clamp(2.4rem, 9vw, 3.2rem)',
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
              color: isRightAttacking ? 'var(--success)' : 'var(--text-primary)',
              margin: '0.15rem 0 0',
            }}
          >
            {scoreRight}
          </div>
        </div>
      </div>

      {/* Dominant Primary Action: MASSIVE TOUCH TARGET +1 POIN HADANG */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          minHeight: '140px',
        }}
      >
        <button
          type="button"
          onClick={handleScoreClick}
          disabled={!isLive || isPending}
          className="touch-manipulation"
          style={{
            height: '100%',
            width: '100%',
            backgroundColor: !isLive
              ? 'var(--surface-hover)'
              : isButtonActive
              ? '#15803D'
              : 'var(--success)',
            color: !isLive ? 'var(--text-muted)' : 'white',
            borderRadius: '16px',
            border: !isLive ? '2px solid var(--border-color)' : '3px solid #16A34A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            cursor: !isLive ? 'not-allowed' : 'pointer',
            boxShadow: isLive ? '0 8px 24px rgba(22, 163, 74, 0.45)' : 'none',
            transform: isButtonActive ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 0.08s ease, background-color 0.12s ease',
            padding: '1rem',
          }}
        >
          <span style={{ fontSize: 'clamp(2.6rem, 10vw, 3.5rem)', fontWeight: 900, lineHeight: 1 }}>
            +1 POIN
          </span>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '0.06em', opacity: 0.95 }}>
            HADANG
          </span>
          <div
            style={{
              fontSize: '0.85rem',
              fontWeight: 800,
              backgroundColor: 'rgba(0,0,0,0.25)',
              padding: '0.25rem 0.85rem',
              borderRadius: '9999px',
              marginTop: '0.25rem',
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            Masuk ke: {attackingTeamName}
          </div>
        </button>
      </div>

      {/* Secondary Action: BATALKAN POIN TERAKHIR (UNDO) */}
      <div style={{ flexShrink: 0 }}>
        <button
          type="button"
          onClick={handleUndoClick}
          disabled={!canUndo || isPending}
          className="touch-manipulation"
          style={{
            width: '100%',
            height: '46px',
            borderRadius: '10px',
            border: canUndo ? '2px solid var(--danger)' : '1px solid var(--border-color)',
            backgroundColor: canUndo ? 'var(--danger-subtle)' : 'var(--surface-subtle)',
            color: canUndo ? 'var(--danger)' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.875rem',
            cursor: !canUndo || isPending ? 'not-allowed' : 'pointer',
            opacity: canUndo ? 1 : 0.45,
            boxShadow: canUndo ? '0 2px 8px rgba(220, 38, 38, 0.2)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            transition: 'all 0.12s ease',
          }}
        >
          <span>↩</span>
          <span>BATALKAN POIN TERAKHIR (UNDO)</span>
        </button>
      </div>

      {/* Micro Status Bar for Realtime */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.4rem',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#22c55e',
            display: 'inline-block',
          }}
        />
        <p className="metadata-text" style={{ fontSize: '0.7rem', margin: 0 }}>
          Tersinkronisasi otomatis ke Layar TV & Ruang Kontrol
        </p>
      </div>
    </div>
  )
}
