'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/theme-toggle'
import { formatJuryDisplayName } from '@/lib/categories'

interface Team {
  id: string
  name: string
  logo?: string | null
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
  jury_id: string | null
  jury?: { name: string } | null
}

interface MatchData {
  id: string
  name: string
  round: string | null
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

interface ScoreboardViewProps {
  initialMatch: MatchData
  initialScoreEvents: ScoreEvent[]
}

export default function ScoreboardView({ initialMatch, initialScoreEvents }: ScoreboardViewProps) {
  const [match, setMatch] = useState<MatchData>(initialMatch)
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>(initialScoreEvents)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastScoredTeam, setLastScoredTeam] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING')

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

  // Realtime Supabase Subscription
  useEffect(() => {
    const supabase = createClient()
    const matchId = initialMatch.id

    const fetchAllEvents = async () => {
      try {
        const { data: freshEvents } = await supabase
          .from('score_events')
          .select('id, team_id, event_type, points, status, created_at, jury_id')
          .eq('match_id', matchId)
          .order('created_at', { ascending: false })

        if (freshEvents) {
          setScoreEvents(freshEvents as ScoreEvent[])
        }
      } catch (e) {}
    }

    const channel = supabase
      .channel(`tv-scoreboard-${matchId}`)
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
          // Selaraskan seluruh skor seketika saat Admin menekan tombol Refresh / Update Match
          fetchAllEvents()
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
            setLastScoredTeam(newEvent.team_id)
            setTimeout(() => setLastScoredTeam(null), 1500)

            setScoreEvents((prev) => {
              if (prev.some((e) => e.id === newEvent.id)) return prev
              return [newEvent, ...prev]
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
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('SUBSCRIBED')
          fetchAllEvents()
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setRealtimeStatus('DISCONNECTED')
        } else {
          setRealtimeStatus('CONNECTING')
        }
      })

    // Background Polling Fallback every 2s (menyelaraskan data tanpa limit)
    const pollInterval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

      try {
        const [resMatch, resEvents] = await Promise.all([
          supabase
            .from('matches')
            .select('id, status, started_at, finished_at, updated_at, team_attack_id, team_defense_id, round')
            .eq('id', matchId)
            .single(),
          supabase
            .from('score_events')
            .select('id, team_id, event_type, points, status, created_at, jury_id')
            .eq('match_id', matchId)
            .order('created_at', { ascending: false }),
        ])

        if (resEvents.data) {
          setScoreEvents((prev) => {
            const remoteEvents = resEvents.data as ScoreEvent[]
            const isSame =
              prev.length === remoteEvents.length &&
              remoteEvents.every((rem, i) => prev[i] && prev[i].id === rem.id && prev[i].status === rem.status)

            if (isSame) return prev
            return remoteEvents
          })
        }

        if (resMatch.data) {
          const latestMatch = resMatch.data
          setMatch((prev) => ({
            ...prev,
            ...latestMatch,
          }))
        }
      } catch (err) {
        // Silent poll error
      }
    }, 2000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [initialMatch.id])

  // Active attacking state
  const isLeftAttacking = match.team_attack_id === teamLeft.id
  const isRightAttacking = match.team_attack_id === teamRight.id

  // Memoized score calculation for static Left & Right teams
  const { scoreLeft, scoreRight, activeEvents } = useMemo(() => {
    const active = scoreEvents.filter((e) => e.status === 'ACTIVE')
    const sLeft = active
      .filter((e) => e.team_id === teamLeft.id)
      .reduce((sum, e) => sum + e.points, 0)
    const sRight = active
      .filter((e) => e.team_id === teamRight.id)
      .reduce((sum, e) => sum + e.points, 0)
    return { scoreLeft: sLeft, scoreRight: sRight, activeEvents: active }
  }, [scoreEvents, teamLeft.id, teamRight.id])

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const isLive = match.status === 'LIVE'

  // Match Timer calculation
  const [matchDuration, setMatchDuration] = useState<string>('00:00')
  useEffect(() => {
    if (!match.started_at) {
      setMatchDuration('00:00')
      return
    }

    const calculateTime = () => {
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

    setMatchDuration(calculateTime())

    if (match.status === 'LIVE') {
      const timer = setInterval(() => setMatchDuration(calculateTime()), 1000)
      return () => clearInterval(timer)
    }
  }, [match.started_at, match.finished_at, match.updated_at, match.status])

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '2.5vw 3.5vw',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background Ambient Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70vw',
          height: '50vh',
          background: 'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.12) 0%, rgba(11, 18, 32, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* HEADER SECTION */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1.5vh',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5vw' }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 'clamp(1.25rem, 2.5vw, 2rem)',
              letterSpacing: '0.05em',
              color: 'var(--primary)',
            }}
          >
            HADANGMU
          </div>
          <div style={{ height: '1.8rem', width: '2px', backgroundColor: 'var(--border-color)' }} />
          <div>
            <h1
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.6rem)',
                fontWeight: 800,
                margin: 0,
                color: 'var(--text-primary)',
              }}
            >
              {match.name}
            </h1>
          </div>
        </div>

        {/* Status & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

          <span
            style={{
              backgroundColor: isLive
                ? 'var(--success-subtle)'
                : match.status === 'PAUSED'
                ? 'var(--warning-subtle)'
                : 'var(--badge-neutral-bg)',
              border: isLive
                ? '1px solid var(--success)'
                : match.status === 'PAUSED'
                ? '1px solid var(--warning)'
                : '1px solid var(--border-color)',
              color: isLive ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--badge-neutral-text)',
              fontSize: 'clamp(0.8rem, 1.4vw, 1.1rem)',
              fontWeight: 800,
              padding: '0.4em 1em',
              borderRadius: '9999px',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {isLive ? '● LIVE' : match.status}
          </span>

          <span
            style={{
              backgroundColor: match.round?.includes('BABAK_2') ? 'rgba(37, 99, 235, 0.15)' : 'rgba(22, 163, 74, 0.15)',
              border: match.round?.includes('BABAK_2') ? '1px solid #2563EB' : '1px solid #16A34A',
              color: match.round?.includes('BABAK_2') ? '#2563EB' : '#16A34A',
              fontSize: 'clamp(0.8rem, 1.4vw, 1.1rem)',
              fontWeight: 800,
              padding: '0.4em 1em',
              borderRadius: '9999px',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {match.round?.includes('BABAK_2') ? 'BABAK 2' : 'BABAK 1'}
          </span>

          <ThemeToggle />

          <button
            onClick={toggleFullscreen}
            title="Layar Penuh (Fullscreen)"
            style={{
              backgroundColor: 'var(--btn-secondary-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--btn-secondary-text)',
              borderRadius: '6px',
              padding: '0.45em 0.75em',
              fontSize: 'clamp(0.8rem, 1.4vw, 1rem)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isFullscreen ? '⤓ Kecilkan' : '⤢ Layar Penuh'}
          </button>
        </div>
      </header>

      {/* TOP CENTER LIVE TIMER (Diletakkan di tengah atas, di bawah header dan di atas card tim vs tim) */}
      <div className="tv-arena-timer-container">
        <div className={`tv-arena-timer-box ${isLive ? 'is-live' : match.status === 'PAUSED' ? 'is-paused' : ''}`}>
          <span style={{ fontSize: 'clamp(1.2rem, 2.2vw, 1.8rem)' }}>⏱</span>
          <span
            className="tv-arena-timer-digits"
            style={{
              color: isLive ? 'var(--success)' : match.status === 'PAUSED' ? 'var(--warning)' : 'var(--text-primary)',
            }}
          >
            {matchDuration}
          </span>
        </div>
      </div>

      {/* MAIN ARENA SCORE BOARD WITH STATIC LEFT & RIGHT POSITIONS */}
      <main className="tv-scoreboard-arena">
        
        {/* TIM 1 (LEFT) CARD */}
        <div
          className="tv-arena-team-left"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor:
              lastScoredTeam === teamLeft.id
                ? 'var(--success-subtle)'
                : isLeftAttacking
                ? 'rgba(34, 197, 94, 0.06)'
                : 'var(--surface-color)',
            border:
              lastScoredTeam === teamLeft.id
                ? '3px solid var(--success)'
                : isLeftAttacking
                ? '3px solid var(--success)'
                : '2px solid var(--border-color)',
            borderRadius: '20px',
            padding: '3vw 2vw',
            boxShadow:
              lastScoredTeam === teamLeft.id
                ? '0 0 60px rgba(34, 197, 94, 0.5)'
                : isLeftAttacking
                ? '0 0 30px rgba(34, 197, 94, 0.2)'
                : 'var(--card-shadow)',
            transform: lastScoredTeam === teamLeft.id ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.25s ease',
            backdropFilter: 'blur(10px)',
          }}
        >
          {isLeftAttacking ? (
            <span
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                fontWeight: 900,
                fontSize: 'clamp(0.85rem, 1.5vw, 1.25rem)',
                padding: '0.4em 1.2em',
                borderRadius: '9999px',
                letterSpacing: '0.08em',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.45)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
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
                fontSize: 'clamp(0.75rem, 1.2vw, 1rem)',
                padding: '0.35em 1em',
                borderRadius: '9999px',
                letterSpacing: '0.08em',
                border: '1px solid var(--border-color)',
              }}
            >
              BERTAHAN
            </span>
          )}

          <h2
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 4rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              marginTop: '1.5vh',
              marginBottom: '0.5vh',
              lineHeight: 1.1,
              color: 'var(--text-primary)',
            }}
          >
            {teamLeft.name}
          </h2>

          <div
            className="tv-score"
            style={{
              color: isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
              textShadow: isLeftAttacking ? '0 0 30px rgba(34, 197, 94, 0.4)' : 'none',
              margin: '1vh 0',
              fontFamily: "'Plus Jakarta Sans', monospace",
            }}
          >
            {scoreLeft}
          </div>

          <span style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)', color: 'var(--text-secondary)', fontWeight: 600 }}>
            POIN HADANG
          </span>
        </div>

        {/* CENTER VS BADGE */}
        <div className="tv-arena-vs">
          <div
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5.5rem)',
              fontWeight: 900,
              color: 'var(--text-muted)',
              letterSpacing: '0.05em',
            }}
          >
            VS
          </div>
          <div
            style={{
              backgroundColor: 'var(--badge-neutral-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.6em 1.2em',
              fontSize: 'clamp(0.75rem, 1.2vw, 1rem)',
              fontWeight: 700,
              color: 'var(--badge-neutral-text)',
              letterSpacing: '0.05em',
            }}
          >
            HADANG
          </div>
        </div>

        {/* TIM 2 (RIGHT) CARD */}
        <div
          className="tv-arena-team-right"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor:
              lastScoredTeam === teamRight.id
                ? 'var(--success-subtle)'
                : isRightAttacking
                ? 'rgba(34, 197, 94, 0.06)'
                : 'var(--surface-color)',
            border:
              lastScoredTeam === teamRight.id
                ? '3px solid var(--success)'
                : isRightAttacking
                ? '3px solid var(--success)'
                : '2px solid var(--border-color)',
            borderRadius: '20px',
            padding: '3vw 2vw',
            boxShadow:
              lastScoredTeam === teamRight.id
                ? '0 0 60px rgba(34, 197, 94, 0.5)'
                : isRightAttacking
                ? '0 0 30px rgba(34, 197, 94, 0.2)'
                : 'var(--card-shadow)',
            transform: lastScoredTeam === teamRight.id ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.25s ease',
            backdropFilter: 'blur(10px)',
          }}
        >
          {isRightAttacking ? (
            <span
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
                fontWeight: 900,
                fontSize: 'clamp(0.85rem, 1.5vw, 1.25rem)',
                padding: '0.4em 1.2em',
                borderRadius: '9999px',
                letterSpacing: '0.08em',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.45)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
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
                fontSize: 'clamp(0.75rem, 1.2vw, 1rem)',
                padding: '0.35em 1em',
                borderRadius: '9999px',
                letterSpacing: '0.08em',
                border: '1px solid var(--border-color)',
              }}
            >
              BERTAHAN
            </span>
          )}

          <h2
            style={{
              fontSize: 'clamp(2rem, 4.5vw, 4rem)',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              marginTop: '1.5vh',
              marginBottom: '0.5vh',
              lineHeight: 1.1,
              color: 'var(--text-primary)',
            }}
          >
            {teamRight.name}
          </h2>

          <div
            className="tv-score"
            style={{
              color: isRightAttacking ? 'var(--success)' : 'var(--text-primary)',
              textShadow: isRightAttacking ? '0 0 30px rgba(34, 197, 94, 0.4)' : 'none',
              margin: '1vh 0',
              fontFamily: "'Plus Jakarta Sans', monospace",
            }}
          >
            {scoreRight}
          </div>

          <span style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)', color: 'var(--text-secondary)', fontWeight: 600 }}>
            POIN HADANG
          </span>
        </div>
      </main>

      {/* FOOTER TICKER */}
      <footer
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.2vh 2vw',
          zIndex: 10,
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: 'clamp(0.75rem, 1.2vw, 0.95rem)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Scoring 1: <strong style={{ color: 'var(--text-primary)' }}>{formatJuryDisplayName(match.jury_1?.name) || '-'}</strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Scoring 2: <strong style={{ color: 'var(--text-primary)' }}>{formatJuryDisplayName(match.jury_2?.name) || '-'}</strong>
          </span>
        </div>

        {/* Realtime Status Indicator + Latest Event Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: 'clamp(0.75rem, 1.2vw, 0.95rem)' }}>
          <span
            style={{
              fontSize: '0.75rem',
              color: realtimeStatus === 'SUBSCRIBED' ? 'var(--success)' : 'var(--warning)',
              fontWeight: 800,
            }}
          >
            {realtimeStatus === 'SUBSCRIBED' ? '● Realtime Live Connected' : '○ Sinkronisasi...'}
          </span>

          {activeEvents.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--success-subtle)',
                color: 'var(--success)',
                border: '1px solid var(--success)',
                padding: '0.3em 0.8em',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: 'clamp(0.7rem, 1.1vw, 0.85rem)',
              }}
            >
              Poin Terakhir:{' '}
              <strong>
                {activeEvents[0].team_id === teamLeft.id ? teamLeft.name : teamRight.name} (+{activeEvents[0].points})
              </strong>
              {activeEvents[0].jury?.name ? ` (oleh ${activeEvents[0].jury.name})` : ''}
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
