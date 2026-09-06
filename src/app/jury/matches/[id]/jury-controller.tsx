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
          .select('status, round, team_attack_id, team_defense_id')
          .eq('id', matchId)
          .single()

        if (latestMatch) {
          setMatch((prev) => ({
            ...prev,
            status: latestMatch.status,
            round: latestMatch.round,
            team_attack_id: latestMatch.team_attack_id,
            team_defense_id: latestMatch.team_defense_id,
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 80px)',
        padding: '1rem',
        maxWidth: '520px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        gap: '1rem',
      }}
    >
      {/* Match Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link href="/jury" style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textDecoration: 'underline' }}>
              ← Meja Scoring
            </Link>
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '0.2rem', color: 'var(--text-primary)' }}>{match.name}</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{juryLabel}</span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              backgroundColor: isLive
                ? 'var(--success-subtle)'
                : match.status === 'PAUSED'
                ? 'var(--warning-subtle)'
                : 'var(--badge-neutral-bg)',
              color: isLive ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--badge-neutral-text)',
              border: isLive
                ? '1px solid var(--success)'
                : match.status === 'PAUSED'
                ? '1px solid var(--warning)'
                : '1px solid var(--border-color)',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              letterSpacing: '0.05em',
            }}
          >
            {isLive ? '● LIVE' : match.status}
          </span>
        </div>
      </div>

      {/* Floating Feedback Toast */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: toastMessage.type === 'success' ? '#22c55e' : '#ef4444',
            color: 'white',
            fontWeight: 700,
            fontSize: '0.875rem',
            padding: '0.65rem 1rem',
            borderRadius: '6px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.2s ease-in-out',
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
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          {match.status === 'PAUSED'
            ? '⏸ Pertandingan sedang dijeda oleh Admin. Tombol input dinonaktifkan.'
            : match.status === 'FINISHED'
            ? '🏁 Pertandingan telah selesai.'
            : '⏳ Pertandingan belum dimulai (Status: ' + match.status + ').'}
        </div>
      )}

      {/* Compact Score Board with Static Left & Right Positions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* TIM 1 (LEFT) */}
        <div style={{ textAlign: 'center' }}>
          {isLeftAttacking ? (
            <span
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.65rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)',
              }}
            >
              ⚡ SERANG
            </span>
          ) : (
            <span
              style={{
                backgroundColor: 'var(--surface-subtle)',
                color: 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.65rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                border: '1px solid var(--border-color)',
              }}
            >
              BERTAHAN
            </span>
          )}

          <div style={{ fontWeight: 800, fontSize: '1.125rem', marginTop: '0.4rem', lineHeight: 1.2, color: 'var(--text-primary)' }}>
            {teamLeft.name}
          </div>
          <div className="jury-score" style={{ color: isLeftAttacking ? 'var(--success)' : 'var(--text-primary)', margin: '0.25rem 0' }}>
            {scoreLeft}
          </div>
        </div>

        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-muted)' }}>VS</div>

        {/* TIM 2 (RIGHT) */}
        <div style={{ textAlign: 'center' }}>
          {isRightAttacking ? (
            <span
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.65rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)',
              }}
            >
              ⚡ SERANG
            </span>
          ) : (
            <span
              style={{
                backgroundColor: 'var(--surface-subtle)',
                color: 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.65rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                border: '1px solid var(--border-color)',
              }}
            >
              BERTAHAN
            </span>
          )}

          <div style={{ fontWeight: 800, fontSize: '1.125rem', marginTop: '0.4rem', lineHeight: 1.2, color: 'var(--text-primary)' }}>
            {teamRight.name}
          </div>
          <div className="jury-score" style={{ color: isRightAttacking ? 'var(--success)' : 'var(--text-primary)', margin: '0.25rem 0' }}>
            {scoreRight}
          </div>
        </div>
      </div>

      {/* Massive Touch Button: +1 POIN HADANG */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'center' }}>
        <button
          type="button"
          onClick={handleScoreClick}
          disabled={!isLive || isPending}
          style={{
            minHeight: '160px',
            width: '100%',
            backgroundColor: !isLive ? 'var(--surface-hover)' : isButtonActive ? 'var(--primary-hover)' : 'var(--success)',
            color: !isLive ? 'var(--text-muted)' : 'white',
            borderRadius: '16px',
            border: !isLive ? '2px solid var(--border-color)' : '3px solid var(--success)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            cursor: !isLive ? 'not-allowed' : 'pointer',
            boxShadow: isLive ? '0 8px 24px rgba(22, 163, 74, 0.45)' : 'none',
            transform: isButtonActive ? 'scale(0.97)' : 'scale(1)',
            transition: 'transform 0.1s, background-color 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1 }}>+1 POIN</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '0.05em', opacity: 0.9 }}>
            HADANG
          </span>
          <span style={{ fontSize: '0.875rem', opacity: 0.95, fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.75rem', borderRadius: '6px' }}>
            Untuk Tim: {attackingTeamName}
          </span>
        </button>

        {/* Secondary Action: BATALKAN POIN TERAKHIR (Undo) */}
        <button
          type="button"
          onClick={handleUndoClick}
          disabled={!canUndo || isPending}
          style={{
            padding: '1rem',
            borderRadius: '10px',
            border: canUndo ? '2px solid var(--danger)' : '1px solid var(--border-color)',
            backgroundColor: canUndo ? 'var(--danger-subtle)' : 'var(--surface-subtle)',
            color: canUndo ? 'var(--danger)' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '1rem',
            cursor: !canUndo || isPending ? 'not-allowed' : 'pointer',
            opacity: canUndo ? 1 : 0.5,
            boxShadow: canUndo ? '0 2px 8px rgba(220, 38, 38, 0.2)' : 'none',
            transition: 'all 0.15s ease',
          }}
        >
          ↩ BATALKAN POIN TERAKHIR (UNDO)
        </button>
      </div>

      {/* Footer Info */}
      <div style={{ textAlign: 'center', marginTop: 'auto', paddingBottom: '0.5rem' }}>
        <p className="metadata-text" style={{ fontSize: '0.75rem' }}>
          Poin otomatis tersinkronisasi ke Layar TV & Ruang Kontrol secara realtime.
        </p>
      </div>
    </div>
  )
}
