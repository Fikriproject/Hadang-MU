'use client'

import React, { useState, useEffect, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  updateMatchStatus,
  toggleAttackingTeam,
  cancelScoreEvent,
  manualAddScore,
} from './actions'
import { promptUndoScoreReason } from '@/lib/sweetalert'
import { formatJuryDisplayName } from '@/lib/categories'

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
  team_id: string
  event_type: string
  points: number
  status: 'ACTIVE' | 'CANCELLED'
  created_at: string
  cancelled_at?: string | null
  cancel_reason?: string | null
  jury_id?: string | null
  jury?: { name: string } | null
}

interface MatchData {
  id: string
  name: string
  round: string | null
  scheduled_at: string | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  started_at: string | null
  finished_at: string | null
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

interface ControlRoomProps {
  initialMatch: MatchData
  initialScoreEvents: ScoreEvent[]
  currentUserRole?: 'ADMIN' | 'JURY' | string
}

export default function ControlRoom({
  initialMatch,
  initialScoreEvents,
  currentUserRole = 'ADMIN',
}: ControlRoomProps) {
  const [match, setMatch] = useState<MatchData>(initialMatch)
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>(initialScoreEvents)
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  // Deterministic Left & Right teams: positions NEVER swap or flip on screen
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

  // Realtime Supabase Subscription + Background Polling Fallback
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
            let juryName: string | undefined
            if (newEvent.jury_id === initialMatch.jury_1_id) juryName = formatJuryDisplayName(initialMatch.jury_1?.name)
            else if (newEvent.jury_id === initialMatch.jury_2_id) juryName = formatJuryDisplayName(initialMatch.jury_2?.name)

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

      const [resMatch, resEvents] = await Promise.all([
        supabase
          .from('matches')
          .select('id, status, started_at, finished_at, updated_at, scheduled_at, team_attack_id, team_defense_id, round')
          .eq('id', matchId)
          .single(),
        supabase
          .from('score_events')
          .select('id, team_id, event_type, points, status, created_at, cancelled_at, cancel_reason, jury_id')
          .eq('match_id', matchId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (resMatch.data) {
        setMatch((prev) => ({
          ...prev,
          status: resMatch.data.status,
          started_at: resMatch.data.started_at,
          finished_at: resMatch.data.finished_at,
          updated_at: resMatch.data.updated_at,
          scheduled_at: resMatch.data.scheduled_at,
          team_attack_id: resMatch.data.team_attack_id,
          team_defense_id: resMatch.data.team_defense_id,
        }))
      }

      if (resEvents.data) {
        setScoreEvents((prev) => {
          const remoteEvents = resEvents.data as any[]
          const isSame =
            prev.length === remoteEvents.length &&
            remoteEvents.every((rem, i) => prev[i] && prev[i].id === rem.id && prev[i].status === rem.status)

          if (isSame) return prev

          return remoteEvents.map((rem) => {
            let juryName: string | undefined
            if (rem.jury_id === initialMatch.jury_1_id) juryName = formatJuryDisplayName(initialMatch.jury_1?.name)
            else if (rem.jury_id === initialMatch.jury_2_id) juryName = formatJuryDisplayName(initialMatch.jury_2?.name)
            return {
              ...rem,
              jury: juryName ? { name: juryName } : null,
            }
          })
        })
      }
    }, 2500)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [initialMatch.id, initialMatch.jury_1?.name, initialMatch.jury_1_id, initialMatch.jury_2?.name, initialMatch.jury_2_id])

  // Active attacking team state
  const isLeftAttacking = match.team_attack_id === teamLeft.id
  const isRightAttacking = match.team_attack_id === teamRight.id

  // Memoized score calculation for static Left & Right teams and per-jury totals
  const { scoreLeft, scoreRight, activeEvents, pointsJury1, pointsJury2, statsLeft, statsRight } = useMemo(() => {
    const active = scoreEvents.filter((e) => e.status === 'ACTIVE')
    const sLeft = active
      .filter((e) => e.team_id === teamLeft.id)
      .reduce((sum, e) => sum + e.points, 0)
    const sRight = active
      .filter((e) => e.team_id === teamRight.id)
      .reduce((sum, e) => sum + e.points, 0)

    const pJ1 = active
      .filter((e) => e.jury_id === match.jury_1_id)
      .reduce((sum, e) => sum + e.points, 0)
    const pJ2 = active
      .filter((e) => e.jury_id === match.jury_2_id)
      .reduce((sum, e) => sum + e.points, 0)

    const getStats = (teamId: string) => {
      const teamEvents = active.filter(e => e.team_id === teamId)
      let attackPoints = 0
      let defensePoints = 0

      teamEvents.forEach(e => {
        if (e.event_type === 'DEFENSE_POINT' || e.event_type === 'MANUAL_DEFENSE_POINT') {
          defensePoints += e.points
        } else {
          attackPoints += e.points
        }
      })
      return { attackPoints, defensePoints }
    }

    return {
      scoreLeft: sLeft,
      scoreRight: sRight,
      activeEvents: active,
      pointsJury1: pJ1,
      pointsJury2: pJ2,
      statsLeft: getStats(teamLeft.id),
      statsRight: getStats(teamRight.id),
    }
  }, [scoreEvents, teamLeft.id, teamRight.id, match.jury_1_id, match.jury_2_id])

  // Status handlers
  const handleStatusChange = (newStatus: string) => {
    setActionError(null)
    startTransition(async () => {
      const res = await updateMatchStatus(match.id, newStatus)
      if (res?.error) setActionError(res.error)
      else setMatch((prev) => ({ ...prev, status: newStatus as any }))
    })
  }

  // Toggle attacker (on foul or turnover)
  const handleToggleAttacker = (targetTeamId?: string) => {
    setActionError(null)
    const nextAttackId = targetTeamId || (isLeftAttacking ? teamRight.id : teamLeft.id)
    const nextDefenseId = nextAttackId === teamLeft.id ? teamRight.id : teamLeft.id

    // Optimistic update
    setMatch((prev) => ({
      ...prev,
      team_attack_id: nextAttackId,
      team_defense_id: nextDefenseId,
    }))

    startTransition(async () => {
      const res = await toggleAttackingTeam(match.id, nextAttackId)
      if (res?.error) {
        setActionError(res.error)
      }
    })
  }

  const handleCancelScore = async (eventId: string) => {
    const reason = await promptUndoScoreReason()
    if (!reason) return

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
    setActionError(null)
    startTransition(async () => {
      const res = await manualAddScore(match.id, teamId)
      if (res?.error) {
        setActionError(res.error)
      }
    })
  }

  // Real-time Stopwatch calculation
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header & Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
            <Link
              href={currentUserRole === 'JURY' ? '/jury' : '/admin'}
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-subtle)',
                border: '1px solid var(--border-color)',
              }}
            >
              ← {currentUserRole === 'JURY' ? 'Ke Meja Scoring' : 'Dashboard Admin'}
            </Link>

            <Link
              href="/admin/bracket"
              style={{
                color: '#CA8A04',
                textDecoration: 'none',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
              }}
            >
              <span>🏆</span>
              <span>Bagan Turnamen</span>
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 className="heading" style={{ fontSize: '1.75rem', margin: 0 }}>
                {match.name}
              </h1>
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
                      ? '1.5px solid var(--success)'
                      : match.status === 'PAUSED'
                        ? '1.5px solid var(--warning)'
                        : '1px solid var(--border-color)',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {match.status === 'LIVE' && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--success)',
                    }}
                  />
                )}
                {match.status === 'PAUSED' && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--warning)',
                    }}
                  />
                )}
                {match.status === 'LIVE' ? 'LIVE' : match.status}
              </span>
            </div>
            {match.scheduled_at && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.35rem' }}>
                📅 {new Intl.DateTimeFormat('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(match.scheduled_at)).replace(/\./g, ':')} WIB
              </span>
            )}
          </div>
        </div>

        {/* Dedicated Live TV / Scoring Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

          <Link
            href={`/jury/matches/${match.id}`}
            style={{
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              textDecoration: 'none',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            📱 Meja Scoring
          </Link>

          <Link
            href={`/tv/${match.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '0.65rem 1.15rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.875rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              textDecoration: 'none',
            }}
          >
            📺 TV Scoreboard
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

      {/* Main Scoreboard Arena with Static Left & Right Positions */}
      {/* Main Scoreboard Arena with Static Left & Right Positions & Dedicated Responsive Grid */}
      <div className="admin-control-arena">
        {/* TIM 1 (LEFT) CARD */}
        <div
          className="arena-team-left"
          style={{
            textAlign: 'center',
            backgroundColor: isLeftAttacking ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface-subtle)',
            border: isLeftAttacking ? '2.5px solid var(--success)' : '1px solid var(--border-color)',
            boxShadow: isLeftAttacking ? '0 0 24px rgba(34, 197, 94, 0.25)' : 'none',
            borderRadius: '10px',
            padding: '1.5rem',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
          }}
        >
          {isLeftAttacking ? (
            <span
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.75rem',
                padding: '0.3rem 0.85rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)',
              }}
            >
              PENYERANG
            </span>
          ) : (
            <span
              style={{
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '0.3rem 0.85rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
                border: '1px solid var(--border-color)',
              }}
            >
              BERTAHAN
            </span>
          )}

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {teamLeft.name}
          </h2>

          <div
            className="tv-score"
            style={{
              color: isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
              margin: '0.5rem 0',
              textShadow: isLeftAttacking ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
            }}
          >
            {scoreLeft}
          </div>

          <button
            onClick={() => handleManualAddScore(teamLeft.id)}
            disabled={isPending}
            style={{
              backgroundColor: isLeftAttacking ? 'var(--success)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            +1 Poin Manual
          </button>
        </div>

        {/* ARENA TIMER (Spans full width on mobile) */}
        <div className="arena-timer">
          <div
            className="arena-timer-box"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.65rem',
              backgroundColor: 'var(--surface-color)',
              border: match.status === 'LIVE' ? '2px solid var(--success)' : match.status === 'PAUSED' ? '1.5px solid var(--warning)' : '1px solid var(--border-color)',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              boxShadow: match.status === 'LIVE' ? '0 0 16px rgba(34, 197, 94, 0.25)' : 'var(--card-shadow)',
              transition: 'all 0.2s ease',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ fontSize: '1.35rem' }}>⏱</span>
            <span
              className="arena-timer-digits"
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '1.65rem',
                fontWeight: 900,
                color: match.status === 'LIVE' ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--text-primary)',
                letterSpacing: '0.05em',
                lineHeight: 1.1,
              }}
            >
              {elapsed}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                backgroundColor: match.status === 'LIVE' ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--badge-neutral-bg)',
                color: match.status === 'LIVE' ? 'white' : match.status === 'PAUSED' ? 'black' : 'var(--badge-neutral-text)',
                letterSpacing: '0.04em',
                marginLeft: '0.25rem',
              }}
            >
              {match.status}
            </span>
          </div>
        </div>

        {/* CENTER DIVIDER & ATTACK/FOUL TOGGLE CONTROLS */}
        <div className="arena-center-controls">
          <span className="arena-vs-text" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-muted)' }}>VS</span>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-color)',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
              PENGINPUTAN SKOR / FOUL
            </div>

            {/* Main Foul / Toggle Button */}
            <button
              type="button"
              onClick={() => handleToggleAttacker()}
              disabled={isPending}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                border: 'none',
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                cursor: isPending ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                width: '100%',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              <span>⇄</span>
              <span>Tukar Giliran Serang (Foul)</span>
            </button>

            {/* Direct selector segmented pills */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.35rem',
                width: '100%',
              }}
            >
              <button
                type="button"
                onClick={() => handleToggleAttacker(teamLeft.id)}
                disabled={isPending}
                style={{
                  padding: '0.45rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  borderRadius: '6px',
                  border: isLeftAttacking ? '1.5px solid var(--success)' : '1px solid var(--border-color)',
                  backgroundColor: isLeftAttacking ? 'var(--success-subtle)' : 'var(--surface-color)',
                  color: isLeftAttacking ? 'var(--success)' : 'var(--text-muted)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {teamLeft.name}
              </button>

              <button
                type="button"
                onClick={() => handleToggleAttacker(teamRight.id)}
                disabled={isPending}
                style={{
                  padding: '0.45rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  borderRadius: '6px',
                  border: isRightAttacking ? '1.5px solid var(--success)' : '1px solid var(--border-color)',
                  backgroundColor: isRightAttacking ? 'var(--success-subtle)' : 'var(--surface-color)',
                  color: isRightAttacking ? 'var(--success)' : 'var(--text-muted)',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
              >
                {teamRight.name}
              </button>
            </div>
          </div>
        </div>

        {/* TIM 2 (RIGHT) CARD */}
        <div
          className="arena-team-right"
          style={{
            textAlign: 'center',
            backgroundColor: isRightAttacking ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface-subtle)',
            border: isRightAttacking ? '2.5px solid var(--success)' : '1px solid var(--border-color)',
            boxShadow: isRightAttacking ? '0 0 24px rgba(34, 197, 94, 0.25)' : 'none',
            borderRadius: '10px',
            padding: '1.5rem',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
          }}
        >
          {isRightAttacking ? (
            <span
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                fontWeight: 800,
                fontSize: '0.75rem',
                padding: '0.3rem 0.85rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
                boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)',
              }}
            >
              PENYERANG
            </span>
          ) : (
            <span
              style={{
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '0.3rem 0.85rem',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
                border: '1px solid var(--border-color)',
              }}
            >
              BERTAHAN
            </span>
          )}

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            {teamRight.name}
          </h2>

          <div
            className="tv-score"
            style={{
              color: isRightAttacking ? 'var(--success)' : 'var(--text-primary)',
              margin: '0.5rem 0',
              textShadow: isRightAttacking ? '0 0 20px rgba(34, 197, 94, 0.3)' : 'none',
            }}
          >
            {scoreRight}
          </div>

          <button
            onClick={() => handleManualAddScore(teamRight.id)}
            disabled={isPending}
            style={{
              backgroundColor: isRightAttacking ? 'var(--success)' : 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginTop: '0.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
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
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Kontrol Status & Waktu Pertandingan
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Mulai, jeda, atau selesaikan pertandingan. Stopwatch berjalan otomatis saat status LIVE.
            </p>
          </div>

          {/* Realtime Stopwatch badge in control panel */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor:
                match.status === 'LIVE'
                  ? 'var(--success-subtle)'
                  : match.status === 'PAUSED'
                    ? 'var(--warning-subtle)'
                    : 'var(--surface-subtle)',
              border:
                match.status === 'LIVE'
                  ? '1.5px solid var(--success)'
                  : match.status === 'PAUSED'
                    ? '1.5px solid var(--warning)'
                    : '1px solid var(--border-color)',
              padding: '0.4rem 0.85rem',
              borderRadius: '8px',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>⏱</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Lama Pertandingan
              </span>
              <span
                style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  lineHeight: 1.1,
                  color: match.status === 'LIVE' ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--text-primary)',
                }}
              >
                {elapsed}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {match.status !== 'LIVE' && match.status !== 'FINISHED' && (
              <button
                onClick={() => handleStatusChange('LIVE')}
                disabled={isPending}
                style={{
                  backgroundColor: 'var(--success)',
                  color: 'white',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>▶</span>
                <span>{match.status === 'PAUSED' ? 'LANJUTKAN (RESUME)' : 'MULAI PERTANDINGAN (LIVE)'}</span>
              </button>
            )}

            {match.status === 'LIVE' && (
              <button
                onClick={() => handleStatusChange('PAUSED')}
                disabled={isPending}
                style={{
                  backgroundColor: 'var(--warning)',
                  color: '#000',
                  padding: '0.75rem 1.4rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>⏸</span>
                <span>JEDA / PAUSE</span>
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
                  padding: '0.75rem 1.4rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>⏹</span>
                <span>SELESAIKAN PERTANDINGAN</span>
              </button>
            )}

            {match.status === 'FINISHED' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.9rem' }}>
                  🏁 Pertandingan Selesai
                </span>
                <button
                  onClick={() => handleStatusChange('LIVE')}
                  disabled={isPending}
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    padding: '0.55rem 1.1rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                >
                  Buka Kembali Match
                </button>
              </div>
            )}
          </div>

          {match.status !== 'FINISHED' && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ⓘ Hanya 1 pertandingan yang boleh berjalan dalam satu waktu.
            </span>
          )}
        </div>

        {/* Assigned Scoring & Total Input Score Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.85rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          {/* Scoring 1 (Depan) Card */}
          <div
            style={{
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.85rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Scoring 1 (Depan):{' '}
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {formatJuryDisplayName(match.jury_1?.name) || 'Belum ditugaskan'}
                </strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Petugas Meja Scoring Depan/Awal
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: 'var(--surface-color)',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Input Skor
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'ui-monospace, monospace', color: 'var(--primary)', lineHeight: 1.1 }}>
                {pointsJury1} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Poin</span>
              </span>
            </div>
          </div>

          {/* Scoring 2 (Belakang) Card */}
          <div
            style={{
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '0.85rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Scoring 2 (Belakang):{' '}
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                  {formatJuryDisplayName(match.jury_2?.name) || 'Belum ditugaskan'}
                </strong>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                Petugas Meja Scoring Belakang/Akhir
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                justifyContent: 'center',
                flexShrink: 0,
                backgroundColor: 'var(--surface-color)',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Input Skor
              </span>
              <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'ui-monospace, monospace', color: '#E11D48', lineHeight: 1.1 }}>
                {pointsJury2} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Poin</span>
              </span>
            </div>
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
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Audit Feed Skor Realtime</h3>
            <p className="metadata-text">Riwayat kejadian poin skor yang dicatat oleh Meja Scoring & Admin.</p>
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Total {activeEvents.length} Poin Aktif
          </span>
        </div>

        {scoreEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            Belum ada kejadian skor yang dicatat.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
            {scoreEvents.map((evt) => {
              const isCancelled = evt.status === 'CANCELLED'
              const teamName = evt.team_id === teamLeft.id ? teamLeft.name : teamRight.name
              const timeStr = new Date(evt.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

              return (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    backgroundColor: isCancelled ? 'var(--surface-subtle)' : 'var(--surface-color)',
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

      {/* Post-Match Summary (List Penyerang & Bertahan) */}
      {match.status === 'FINISHED' && (
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '2px solid var(--primary)',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: 'var(--card-shadow)',
            marginTop: '1rem'
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', margin: '0 0 0.5rem 0' }}>Rekapitulasi Pertandingan</h3>
            <p className="metadata-text" style={{ margin: 0 }}>Statistik perolehan poin saat menjadi penyerang dan bertahan.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Tim 1 Summary */}
            <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', marginBottom: '1rem', color: 'var(--text-primary)' }}>{teamLeft.name}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Poin sebagai Penyerang</span>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>{statsLeft.attackPoints}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Poin sebagai Bertahan</span>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>{statsLeft.defensePoints}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Poin</span>
                <span style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary)' }}>{scoreLeft}</span>
              </div>
            </div>

            {/* Tim 2 Summary */}
            <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', marginBottom: '1rem', color: 'var(--text-primary)' }}>{teamRight.name}</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Poin sebagai Penyerang</span>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>{statsRight.attackPoints}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Poin sebagai Bertahan</span>
                <span style={{ fontWeight: 800, color: 'var(--success)' }}>{statsRight.defensePoints}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', marginTop: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Total Poin</span>
                <span style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--primary)' }}>{scoreRight}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
