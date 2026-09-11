'use client'

import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { addJuryScore, cancelRecentScore } from './actions'
import {
  toggleAttackingTeam,
  switchToBabak2,
  updateMatchStatus,
} from '@/app/admin/matches/[id]/actions'
import {
  promptUndoScoreReason,
  promptConfirmTukarBabak,
  promptConfirmStartBabak2,
} from '@/lib/sweetalert'
import { formatJuryDisplayName } from '@/lib/formatters'

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
  currentUserRole?: string
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

  // Resilient synchronization refs to prevent UI flicker ("ejlek") & double counting
  const pendingOptimisticIds = useRef<Set<string>>(new Set())
  const lastAttackerToggleTimeRef = useRef<number>(0)
  const targetAttackerIdRef = useRef<string | null>(null)

  // Deterministic Left & Right teams: positions NEVER swap on screen
  const { teamLeft, teamRight } = useMemo(() => {
    const tA = initialMatch.team_attack || { id: initialMatch.team_attack_id, name: 'Tim 1' }
    const tB = initialMatch.team_defense || { id: initialMatch.team_defense_id, name: 'Tim 2' }

    const anchorId = initialMatch.round ? initialMatch.round.split('::')[0] : ''
    if (anchorId === tA.id) return { teamLeft: tA, teamRight: tB }
    if (anchorId === tB.id) return { teamLeft: tB, teamRight: tA }

    return tA.id < tB.id ? { teamLeft: tA, teamRight: tB } : { teamLeft: tB, teamRight: tA }
  }, [
    initialMatch.team_attack,
    initialMatch.team_defense,
    initialMatch.team_attack_id,
    initialMatch.team_defense_id,
    initialMatch.round,
  ])

  // Realtime Supabase Subscription & Resilient Sync
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

          // Protect against stale attacker updates if user recently toggled attacker locally
          if (
            lastAttackerToggleTimeRef.current > 0 &&
            Date.now() - lastAttackerToggleTimeRef.current < 3500 &&
            targetAttackerIdRef.current
          ) {
            if (updated.team_attack_id !== targetAttackerIdRef.current) {
              setMatch((prev) => ({
                ...prev,
                ...updated,
                team_attack_id: targetAttackerIdRef.current!,
                team_defense_id:
                  targetAttackerIdRef.current === teamLeft.id ? teamRight.id : teamLeft.id,
              }))
              return
            }
            // Confirmed by server: clear the toggle lock
            lastAttackerToggleTimeRef.current = 0
            targetAttackerIdRef.current = null
          }

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
              // Deduplication check: if real ID already present, do nothing
              if (prev.some((e) => e.id === newEvent.id)) return prev

              // If this score event was made by current jury, reconcile with pending optimistic item
              if (newEvent.jury_id === currentUserId) {
                const optIndex = prev.findIndex(
                  (e) => e.id.startsWith('opt-') && e.team_id === newEvent.team_id
                )
                if (optIndex !== -1) {
                  const next = [...prev]
                  const optId = next[optIndex].id
                  pendingOptimisticIds.current.delete(optId)
                  next[optIndex] = newEvent
                  return next
                }
              }

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
            // Keep pending optimistic events so polling never drops them
            const pendingLocals = prev.filter((e) => e.id.startsWith('opt-'))
            if (pendingLocals.length > 0) {
              const remoteUpdated = latestEvents as ScoreEvent[]
              return [
                ...pendingLocals,
                ...remoteUpdated.filter(
                  (r) =>
                    !pendingLocals.some(
                      (p) =>
                        p.team_id === r.team_id &&
                        p.jury_id === r.jury_id &&
                        Math.abs(new Date(p.created_at).getTime() - new Date(r.created_at).getTime()) < 4000
                    )
                ),
              ]
            }

            if (
              prev.length === latestEvents.length &&
              prev[0]?.id === latestEvents[0]?.id &&
              prev[0]?.status === latestEvents[0]?.status
            ) {
              return prev
            }
            return latestEvents as any
          })
        }

        const { data: latestMatch } = await supabase
          .from('matches')
          .select('status, round, team_attack_id, team_defense_id, started_at, finished_at, updated_at')
          .eq('id', matchId)
          .single()

        if (latestMatch) {
          let attackId = latestMatch.team_attack_id
          let defenseId = latestMatch.team_defense_id

          // Protect local attacker toggle if still within 3.5s grace period
          if (
            lastAttackerToggleTimeRef.current > 0 &&
            Date.now() - lastAttackerToggleTimeRef.current < 3500 &&
            targetAttackerIdRef.current
          ) {
            attackId = targetAttackerIdRef.current
            defenseId = attackId === teamLeft.id ? teamRight.id : teamLeft.id
          }

          setMatch((prev) => ({
            ...prev,
            status: latestMatch.status,
            round: latestMatch.round,
            team_attack_id: attackId,
            team_defense_id: defenseId,
            started_at: latestMatch.started_at,
            finished_at: latestMatch.finished_at,
            updated_at: latestMatch.updated_at,
          }))
        }
      } catch (err) {
        // Silent error
      }
    }, 3000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [initialMatch.id, currentUserId, teamLeft.id, teamRight.id])

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

  const handleBackClick = (e: React.MouseEvent) => {
    if (match.status === 'LIVE') {
      const confirmed = window.confirm(
        '⚠️ PERINGATAN: Pertandingan masih berlangsung (LIVE)!\n\nApakah Anda yakin ingin keluar dari Meja Scoring? Waktu dan pencatatan skor akan terus berjalan.'
      )
      if (!confirmed) {
        e.preventDefault()
      }
    }
  }

  // Active attacking team
  const isLeftAttacking = match.team_attack_id === teamLeft.id
  const isRightAttacking = match.team_attack_id === teamRight.id
  const attackingTeamName = isLeftAttacking ? teamLeft.name : teamRight.name

  // Memoized scores, jury point counts & undo availability for static teams
  const { scoreLeft, scoreRight, pointsJury1, pointsJury2, myActiveEvents, canUndo } = useMemo(() => {
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
    const myActive = active.filter((e) => e.jury_id === currentUserId)
    return {
      scoreLeft: sLeft,
      scoreRight: sRight,
      pointsJury1: pJ1,
      pointsJury2: pJ2,
      myActiveEvents: myActive,
      canUndo: myActive.length > 0,
    }
  }, [scoreEvents, teamLeft.id, teamRight.id, match.jury_1_id, match.jury_2_id, currentUserId])

  const isLive = match.status === 'LIVE'
  const isFinished = match.status === 'FINISHED'
  const isBabak2 = match.round?.includes('BABAK_2') || false
  const isBabak2Pending = match.round?.includes('BABAK_2_PENDING') || false

  // Tukar Babak handler (Menjeda pertandingan & masuk ke Babak 2 tanpa menukar posisi tim)
  const handleTukarBabak = async () => {
    if (isFinished || isBabak2) return
    const confirmed = await promptConfirmTukarBabak()
    if (!confirmed) return

    startTransition(async () => {
      const res = await switchToBabak2(match.id)
      if (res?.error) {
        setToastMessage({ text: res.error, type: 'error' })
      } else {
        const anchorId = match.round ? match.round.split('::')[0] : ''
        setMatch((prev) => ({
          ...prev,
          status: 'PAUSED',
          round: `${anchorId}::BABAK_2_PENDING`,
        }))
        setToastMessage({ text: 'Pertandingan dijeda. Siap untuk Babak 2!', type: 'success' })
      }
    })
  }

  // Validasi Mulai Babak 2 handler
  const handleStartBabak2 = async () => {
    if (isFinished) return
    const confirmed = await promptConfirmStartBabak2()
    if (!confirmed) return

    startTransition(async () => {
      const res = await updateMatchStatus(match.id, 'LIVE', true)
      if (res?.error) {
        setToastMessage({ text: res.error, type: 'error' })
      } else {
        const anchorId = match.round ? match.round.split('::')[0] : ''
        setMatch((prev) => ({
          ...prev,
          status: 'LIVE',
          round: `${anchorId}::BABAK_2_STARTED`,
          started_at: new Date().toISOString(),
        }))
        setToastMessage({ text: 'Babak 2 Resmi Dimulai (LIVE)!', type: 'success' })
      }
    })
  }

  // Action: Add +1 Score (Instant Optimistic & Zero-Latency)
  const handleScoreClick = () => {
    if (!isLive || isFinished) return

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50)
      } catch (e) {}
    }

    setIsButtonActive(true)
    setTimeout(() => setIsButtonActive(false), 120)

    const tempId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const attackingId = match.team_attack_id

    pendingOptimisticIds.current.add(tempId)

    const optimisticEvent: ScoreEvent = {
      id: tempId,
      match_id: match.id,
      team_id: attackingId,
      jury_id: currentUserId,
      event_type: 'ATTACK_POINT',
      points: 1,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    }

    // Immediately reflect +1 point on screen
    setScoreEvents((prev) => [optimisticEvent, ...prev])
    setToastMessage({ text: `+1 Poin untuk ${attackingTeamName}!`, type: 'success' })

    // Send explicitly selected attacking team to server to eliminate any race condition
    addJuryScore(match.id, attackingId).then((res) => {
      if (res?.error) {
        pendingOptimisticIds.current.delete(tempId)
        setScoreEvents((prev) => prev.filter((e) => e.id !== tempId))
        setToastMessage({ text: res.error, type: 'error' })
      } else if (res?.eventId) {
        pendingOptimisticIds.current.delete(tempId)
        setScoreEvents((prev) => {
          // If the real event already arrived via Realtime WebSocket:
          if (prev.some((e) => e.id === res.eventId)) {
            return prev.filter((e) => e.id !== tempId)
          }
          // Otherwise, seamlessly promote temp ID to server event ID
          return prev.map((e) => (e.id === tempId ? { ...e, id: res.eventId } : e))
        })
      }
    })
  }

  // Action: Undo recent score (Instant Optimistic Rollback)
  const handleUndoClick = async () => {
    if (isFinished || !canUndo) return

    const reason = await promptUndoScoreReason()
    if (!reason) return

    const targetEvent = myActiveEvents[0]
    if (!targetEvent) return

    setScoreEvents((prev) =>
      prev.map((e) => (e.id === targetEvent.id ? { ...e, status: 'CANCELLED' } : e))
    )
    setToastMessage({ text: `Poin berhasil dibatalkan (${reason})`, type: 'success' })

    const res = await cancelRecentScore(match.id, reason)
    if (res?.error) {
      setScoreEvents((prev) =>
        prev.map((e) => (e.id === targetEvent.id ? { ...e, status: 'ACTIVE' } : e))
      )
      setToastMessage({ text: res.error, type: 'error' })
    }
  }

  // Action: Toggle Attacking Team (Foul / Tukar Posisi with Grace-Period Lock)
  const handleToggleAttacker = () => {
    if (isFinished) return
    const nextAttackId = isLeftAttacking ? teamRight.id : teamLeft.id
    const nextDefenseId = nextAttackId === teamLeft.id ? teamRight.id : teamLeft.id
    const nextAttackName = nextAttackId === teamLeft.id ? teamLeft.name : teamRight.name

    targetAttackerIdRef.current = nextAttackId
    lastAttackerToggleTimeRef.current = Date.now()

    setMatch((prev) => ({
      ...prev,
      team_attack_id: nextAttackId,
      team_defense_id: nextDefenseId,
    }))
    setToastMessage({ text: `Posisi ditukar! Penyerang: ${nextAttackName}`, type: 'success' })

    toggleAttackingTeam(match.id, nextAttackId).then((res) => {
      if (res?.error) {
        lastAttackerToggleTimeRef.current = 0
        targetAttackerIdRef.current = null
        setToastMessage({ text: res.error, type: 'error' })
      }
    })
  }


  // Count Card Component for Jury Points (1 row, 2 columns)
  const renderJuryCountCards = (isAtTop = false) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0.45rem',
        width: '100%',
        flexShrink: 0,
        marginTop: isAtTop ? '0.35rem' : '0',
      }}
    >
      {/* Card Juri 1 */}
      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          border: isJury1 ? '2px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: isAtTop ? '0.65rem 0.75rem' : '0.45rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: isJury1 ? '0 0 12px rgba(37, 99, 235, 0.2)' : 'var(--card-shadow)',
        }}
      >
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: '0.625rem',
              fontWeight: 800,
              color: isJury1 ? 'var(--primary)' : 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {isJury1 ? '★ Poin Juri 1 (Anda)' : 'Poin Juri 1'}
          </div>
          <div
            style={{
              fontSize: '0.825rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatJuryDisplayName(match.jury_1?.name) || 'Scoring 1'}
          </div>
        </div>
        <div
          style={{
            fontSize: isAtTop ? '1.65rem' : '1.4rem',
            fontWeight: 900,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            color: isJury1 ? 'var(--primary)' : 'var(--text-primary)',
            marginLeft: '0.4rem',
            lineHeight: 1,
          }}
        >
          {pointsJury1}
        </div>
      </div>

      {/* Card Juri 2 */}
      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          border: isJury2 ? '2px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: isAtTop ? '0.65rem 0.75rem' : '0.45rem 0.65rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: isJury2 ? '0 0 12px rgba(37, 99, 235, 0.2)' : 'var(--card-shadow)',
        }}
      >
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: '0.625rem',
              fontWeight: 800,
              color: isJury2 ? 'var(--primary)' : 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {isJury2 ? '★ Poin Juri 2 (Anda)' : 'Poin Juri 2'}
          </div>
          <div
            style={{
              fontSize: '0.825rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {formatJuryDisplayName(match.jury_2?.name) || 'Scoring 2'}
          </div>
        </div>
        <div
          style={{
            fontSize: isAtTop ? '1.65rem' : '1.4rem',
            fontWeight: 900,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            color: isJury2 ? 'var(--primary)' : 'var(--text-primary)',
            marginLeft: '0.4rem',
            lineHeight: 1,
          }}
        >
          {pointsJury2}
        </div>
      </div>
    </div>
  )

  return (
    <div
      className="safe-area-bottom no-select"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100dvh - 48px)',
        padding: '0.45rem 0.65rem',
        maxWidth: '500px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        gap: '0.4rem',
        justifyContent: 'space-between',
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
            onClick={handleBackClick}
            className="touch-manipulation"
            style={{
              color: 'var(--primary)',
              fontSize: '0.825rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              backgroundColor: 'var(--primary-subtle)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              flexShrink: 0,
              textDecoration: 'none',
              minHeight: '38px',
            }}
          >
            <span>←</span>
            <span>Meja Skor</span>
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
          {/* Running Stopwatch Badge (Hidden on mobile because mobile uses the prominent arena timer) */}
          <div
            className="hide-on-mobile"
            style={{
              backgroundColor: isLive ? 'var(--success-subtle)' : match.status === 'PAUSED' ? 'var(--warning-subtle)' : 'var(--surface-subtle)',
              border: isLive ? '1.5px solid var(--success)' : match.status === 'PAUSED' ? '1.5px solid var(--warning)' : '1px solid var(--border-color)',
              padding: '0.2rem 0.45rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span style={{ fontSize: '0.75rem' }}>⏱</span>
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.85rem',
                fontWeight: 900,
                color: isLive ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--text-primary)',
              }}
            >
              {elapsed}
            </span>
          </div>

          {/* Status Badge */}
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
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.2rem 0.5rem',
              borderRadius: '9999px',
              letterSpacing: '0.04em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            {isLive && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                  display: 'inline-block',
                }}
              />
            )}
            {isLive ? 'LIVE' : match.status}
          </span>
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
            : '⏳ Pertandingan belum LIVE (Status: ' + match.status + '). Menunggu Admin memulai pertandingan.'}
        </div>
      )}

      {/* Score Board: Compact & Highly Readable in bright sunlight with Responsive Grid */}
      <div className="scoring-scoreboard-arena">
        {/* Prominent Live Timer Card (Spans full width on mobile) */}
        <div className={`scoring-timer-card ${isLive ? 'is-live' : match.status === 'PAUSED' ? 'is-paused' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⏱</span>
            <span
              className="scoring-timer-digits"
              style={{
                color: isLive ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--text-primary)',
              }}
            >
              {elapsed}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px',
                backgroundColor: isLive ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--badge-neutral-bg)',
                color: isLive ? 'white' : match.status === 'PAUSED' ? 'black' : 'var(--badge-neutral-text)',
                letterSpacing: '0.05em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              {isLive && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    display: 'inline-block',
                  }}
                />
              )}
              {isLive ? 'LIVE' : match.status === 'PAUSED' ? 'DIJEDA' : match.status}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                backgroundColor: isBabak2 ? 'rgba(37, 99, 235, 0.15)' : 'rgba(22, 163, 74, 0.15)',
                color: isBabak2 ? '#2563EB' : '#16A34A',
                border: isBabak2 ? '1px solid #2563EB' : '1px solid #16A34A',
                letterSpacing: '0.04em',
              }}
            >
              {isBabak2 ? 'BABAK 2' : 'BABAK 1'}
            </span>
          </div>
        </div>

        {/* TIM 1 (LEFT) */}
        <div
          className="scoring-team-left"
          style={{
            textAlign: 'center',
            padding: '0.5rem 0.35rem',
            borderRadius: '10px',
            backgroundColor: isLeftAttacking ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
            border: isLeftAttacking ? '2px solid var(--success)' : '1px solid var(--border-color)',
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
                PENYERANG
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

        {/* CENTER DIVIDER (Hidden on mobile via CSS) */}
        <div className="scoring-vs-divider">
          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-muted)' }}>VS</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 600 }}>SKOR</div>
        </div>

        {/* TIM 2 (RIGHT) */}
        <div
          className="scoring-team-right"
          style={{
            textAlign: 'center',
            padding: '0.5rem 0.35rem',
            borderRadius: '10px',
            backgroundColor: isRightAttacking ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
            border: isRightAttacking ? '2px solid var(--success)' : '1px solid var(--border-color)',
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
                PENYERANG
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

      {/* When FINISHED: Prominent Final Match Result Banner & Return Button */}
      {isFinished && (
        <div
          style={{
            backgroundColor: 'rgba(34, 197, 94, 0.12)',
            border: '2px solid var(--success)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem',
            boxShadow: '0 4px 16px rgba(34, 197, 94, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)', fontWeight: 900, fontSize: '0.95rem' }}>
            <span>🏁</span>
            <span>PERTANDINGAN TELAH SELESAI</span>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            Skor Akhir: {teamLeft.name} {scoreLeft} - {scoreRight} {teamRight.name}
          </div>
          <p className="metadata-text" style={{ margin: 0, fontSize: '0.78rem' }}>
            Seluruh poin telah direkam dan status pertandingan terkunci permanen.
          </p>
          <Link
            href="/jury"
            className="touch-manipulation"
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px',
              fontWeight: 800,
              fontSize: '0.925rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              marginTop: '0.25rem',
            }}
          >
            <span>←</span>
            <span>Kembali ke Daftar Pertandingan</span>
          </Link>
        </div>
      )}

      {/* When FINISHED: Move Jury Count Cards to the TOP */}
      {isFinished && renderJuryCountCards(true)}

      {/* Primary Action: +1 POIN HADANG (Disabled when FINISHED) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          minHeight: '120px',
        }}
      >
        <button
          type="button"
          onClick={handleScoreClick}
          disabled={!isLive || isFinished}
          className="touch-manipulation"
          style={{
            height: '100%',
            width: '100%',
            backgroundColor: isFinished
              ? 'var(--surface-subtle)'
              : !isLive
              ? 'var(--surface-hover)'
              : isButtonActive
              ? '#15803D'
              : 'var(--success)',
            color: isFinished ? 'var(--text-muted)' : !isLive ? 'var(--text-muted)' : 'white',
            borderRadius: '16px',
            border: isFinished ? '2px dashed var(--border-color)' : !isLive ? '2px solid var(--border-color)' : '3px solid #16A34A',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            cursor: !isLive || isFinished ? 'not-allowed' : 'pointer',
            boxShadow: isLive && !isFinished ? '0 8px 24px rgba(22, 163, 74, 0.45)' : 'none',
            transform: isButtonActive && isLive && !isFinished ? 'scale(0.95)' : 'scale(1)',
            transition: 'transform 0.08s ease, background-color 0.12s ease',
            padding: '1rem',
            opacity: isFinished ? 0.6 : 1,
          }}
        >
          <span style={{ fontSize: isFinished ? '1.8rem' : 'clamp(2.6rem, 10vw, 3.5rem)', fontWeight: 900, lineHeight: 1 }}>
            {isFinished ? '🏁 SELESAI' : '+1 POIN'}
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '0.06em', opacity: 0.95 }}>
            {isFinished ? 'PERTANDINGAN BERAKHIR' : 'HADANG'}
          </span>
          <div
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              backgroundColor: isFinished ? 'var(--border-color)' : 'rgba(0,0,0,0.25)',
              padding: '0.25rem 0.85rem',
              borderRadius: '9999px',
              marginTop: '0.25rem',
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isFinished ? 'Input skor ditutup' : `Masuk ke: ${attackingTeamName}`}
          </div>
        </button>
      </div>

      {/* Actions Section: Tukar Posisi, Tukar Babak, Undo, and Match Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', flexShrink: 0 }}>
        {/* Tombol Mulai Babak 2 saat Babak 2 Siap (PAUSED) */}
        {!isFinished && isBabak2Pending && match.status === 'PAUSED' && (
          <button
            type="button"
            onClick={handleStartBabak2}
            disabled={isPending}
            className="touch-manipulation"
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: 'var(--success)',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.925rem',
              cursor: isPending ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 12px rgba(34, 197, 94, 0.35)',
              transition: 'all 0.12s ease',
            }}
          >
            <span>▶</span>
            <span>MULAI PERTANDINGAN (BABAK 2)</span>
          </button>
        )}

        {/* 1. BUTTON TUKAR POSISI (FOUL) */}
        <button
          type="button"
          onClick={handleToggleAttacker}
          disabled={isFinished}
          className="touch-manipulation"
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '10px',
            border: isFinished ? '1px solid var(--border-color)' : '2px solid var(--primary)',
            backgroundColor: isFinished ? 'var(--surface-subtle)' : 'var(--primary-subtle)',
            color: isFinished ? 'var(--text-muted)' : 'var(--primary)',
            fontWeight: 800,
            fontSize: '0.875rem',
            cursor: isFinished ? 'not-allowed' : 'pointer',
            opacity: isFinished ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.45rem',
            boxShadow: isFinished ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.15)',
            transition: 'all 0.12s ease',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>⇄</span>
          <span>TUKAR POSISI (FOUL)</span>
        </button>

        {/* 2. BUTTON TUKAR BABAK */}
        {!isFinished && (
          <button
            type="button"
            onClick={handleTukarBabak}
            disabled={isBabak2 || isPending}
            className="touch-manipulation"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '10px',
              border: isBabak2 ? '1px solid var(--border-color)' : '2px solid #2563EB',
              backgroundColor: isBabak2 ? 'var(--surface-subtle)' : '#EFF6FF',
              color: isBabak2 ? 'var(--text-muted)' : '#2563EB',
              fontWeight: 800,
              fontSize: '0.875rem',
              cursor: isBabak2 || isPending ? 'not-allowed' : 'pointer',
              opacity: isBabak2 ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: isBabak2 ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.15)',
              transition: 'all 0.12s ease',
            }}
            title={isBabak2 ? 'Sudah berada di Babak 2' : 'Tukar ke Babak 2'}
          >
            <span>🔄</span>
            <span>{isBabak2 ? 'BABAK 2 (AKTIF)' : 'TUKAR BABAK'}</span>
          </button>
        )}

        {/* 3. BUTTON BATALKAN POIN TERAKHIR (UNDO) */}
        <button
          type="button"
          onClick={handleUndoClick}
          disabled={isFinished || !canUndo}
          className="touch-manipulation"
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '10px',
            border: !isFinished && canUndo ? '2px solid var(--danger)' : '1px solid var(--border-color)',
            backgroundColor: !isFinished && canUndo ? 'var(--danger-subtle)' : 'var(--surface-subtle)',
            color: !isFinished && canUndo ? 'var(--danger)' : 'var(--text-muted)',
            fontWeight: 800,
            fontSize: '0.875rem',
            cursor: isFinished || !canUndo ? 'not-allowed' : 'pointer',
            opacity: !isFinished && canUndo ? 1 : 0.4,
            boxShadow: !isFinished && canUndo ? '0 2px 8px rgba(220, 38, 38, 0.2)' : 'none',
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

      {/* When NOT finished: Keep Count Cards at the BOTTOM */}
      {!isFinished && renderJuryCountCards(false)}

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
