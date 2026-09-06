'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
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

  // Realtime Supabase Subscription + Background Fallback
  useEffect(() => {
    const supabase = createClient()
    const matchId = initialMatch.id

    const channel = supabase
      .channel(`jury-live-${matchId}`)
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
      // Skip polling when tab is inactive to save battery and reduce background work
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
  }, [initialMatch.id])

  // Clear toast after 3 seconds
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 3000)
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

  // Memoized scores & undo availability
  const { attackScore, defenseScore, myActiveEvents, canUndo } = useMemo(() => {
    const active = scoreEvents.filter((e) => e.status === 'ACTIVE')
    const attack = active
      .filter((e) => e.team_id === match.team_attack_id)
      .reduce((sum, e) => sum + e.points, 0)
    const defense = active
      .filter((e) => e.team_id === match.team_defense_id)
      .reduce((sum, e) => sum + e.points, 0)
    const myActive = active.filter((e) => e.jury_id === currentUserId)
    return {
      attackScore: attack,
      defenseScore: defense,
      myActiveEvents: myActive,
      canUndo: myActive.length > 0,
    }
  }, [scoreEvents, match.team_attack_id, match.team_defense_id, currentUserId])

  const isLive = match.status === 'LIVE'

  // Handle Score Button Click
  const handleScoreClick = () => {
    if (!isLive || isPending) return

    // Haptic feedback
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60])
    }

    setIsButtonActive(true)
    setTimeout(() => setIsButtonActive(false), 200)

    startTransition(async () => {
      const res = await addJuryScore(match.id)
      if (res?.error) {
        setToastMessage({ text: res.error, type: 'error' })
      } else {
        setToastMessage({ text: '+1 POIN DITAMBAHKAN!', type: 'success' })
      }
    })
  }

  // Handle Undo Click with SweetAlert validation
  const handleUndoClick = async () => {
    if (isPending || !canUndo) return

    const reason = await promptUndoScoreReason()
    if (!reason) return

    startTransition(async () => {
      const res = await cancelRecentScore(match.id, reason)
      if (res?.error) {
        setToastMessage({ text: res.error, type: 'error' })
      } else {
        setToastMessage({ text: `Poin dibatalkan: ${reason}`, type: 'success' })
      }
    })
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '1rem',
        maxWidth: '540px',
        margin: '0 auto',
        width: '100%',
        gap: '1rem',
        userSelect: 'none',
      }}
    >
      {/* Top Bar: Match Info */}
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
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>•</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 700 }}>
              {match.round || 'Babak 1'}
            </span>
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
              display: 'inline-block',
            }}
          >
            {isLive ? '● LIVE' : match.status}
          </span>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            backgroundColor: toastMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '0.9375rem',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.2s ease-in',
          }}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Non-LIVE Notice */}
      {!isLive && (
        <div
          style={{
            backgroundColor: match.status === 'PAUSED' ? 'var(--warning-subtle)' : 'var(--surface-subtle)',
            border: match.status === 'PAUSED' ? '1px solid var(--warning)' : '1px solid var(--border-color)',
            color: match.status === 'PAUSED' ? 'var(--warning)' : 'var(--text-secondary)',
            padding: '0.875rem',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {match.status === 'PAUSED'
            ? '⏸ Pertandingan sedang dijeda (PAUSED). Tombol skor terkunci sementara.'
            : match.status === 'READY'
            ? '⏳ Menunggu Admin memulai pertandingan (Status: READY).'
            : match.status === 'FINISHED'
            ? '🏁 Pertandingan telah selesai.'
            : 'Pertandingan berstatus: ' + match.status}
        </div>
      )}

      {/* Score Overview Card */}
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
        {/* Attack Team */}
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              backgroundColor: 'var(--success)',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.65rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '9999px',
              letterSpacing: '0.05em',
            }}
          >
            ATTACK
          </span>
          <div style={{ fontWeight: 800, fontSize: '1.125rem', marginTop: '0.4rem', lineHeight: 1.2, color: 'var(--text-primary)' }}>
            {match.team_attack?.name || 'Tim Serang'}
          </div>
          <div className="jury-score" style={{ color: 'var(--success)', margin: '0.25rem 0' }}>
            {attackScore}
          </div>
        </div>

        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-muted)' }}>VS</div>

        {/* Defense Team */}
        <div style={{ textAlign: 'center' }}>
          <span
            style={{
              backgroundColor: 'var(--danger)',
              color: 'white',
              fontWeight: 800,
              fontSize: '0.65rem',
              padding: '0.2rem 0.5rem',
              borderRadius: '9999px',
              letterSpacing: '0.05em',
            }}
          >
            DEFENSE
          </span>
          <div style={{ fontWeight: 800, fontSize: '1.125rem', marginTop: '0.4rem', lineHeight: 1.2, color: 'var(--text-primary)' }}>
            {match.team_defense?.name || 'Tim Bertahan'}
          </div>
          <div className="jury-score" style={{ color: 'var(--danger)', margin: '0.25rem 0' }}>
            {defenseScore}
          </div>
        </div>
      </div>

      {/* Massive Touch Button: +1 POIN */}
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
          <span style={{ fontSize: '0.8125rem', opacity: 0.85 }}>
            Untuk Tim: {match.team_attack?.name}
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
            backgroundColor: canUndo ? 'var(--danger-subtle)' : 'var(--surface-subtle)',
            border: canUndo ? '1px solid var(--danger)' : '1px solid var(--border-color)',
            color: canUndo ? 'var(--danger)' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.9375rem',
            cursor: canUndo && !isPending ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          ↩ BATALKAN POIN TERAKHIR ({myActiveEvents.length})
        </button>
      </div>

      {/* Footer Info */}
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', paddingBottom: '0.5rem' }}>
        Sentuh tombol hijau saat pemain menyerang berhasil menembus garis hadang.
      </div>
    </div>
  )
}
