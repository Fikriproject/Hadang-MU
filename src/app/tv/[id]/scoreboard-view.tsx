'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/theme-toggle'

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

interface ScoreboardViewProps {
  initialMatch: MatchData
  initialScoreEvents: ScoreEvent[]
}

export default function ScoreboardView({
  initialMatch,
  initialScoreEvents,
}: ScoreboardViewProps) {
  const [match, setMatch] = useState<MatchData>(initialMatch)
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>(initialScoreEvents)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastScoredTeam, setLastScoredTeam] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<string>('CONNECTING')

  const matchRef = useRef<MatchData>(match)
  matchRef.current = match

  // Persistent Realtime Subscription + Background Sync Fallback
  useEffect(() => {
    const supabase = createClient()
    const matchId = initialMatch.id

    // 1. Setup Single Unified Realtime Channel
    const channel = supabase
      .channel(`tv-live-${matchId}`)
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
            // Immediate visual glow on scoring team
            setLastScoredTeam(newEvent.team_id)
            setTimeout(() => setLastScoredTeam(null), 1500)

            // Immediate state update (NO await, instant UI update)
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
        setRealtimeStatus(status)
      })

    // 2. High-reliability Polling Fallback (every 2.5s)
    // Ensures updates are 100% received even if WebSocket encounters network jitter
    const pollInterval = setInterval(async () => {
      // Skip poll when tab is hidden to save battery & CPU
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
            jury:jury_id(name)
          `)
          .eq('match_id', matchId)
          .order('created_at', { ascending: false })

        if (latestEvents && latestEvents.length > 0) {
          setScoreEvents((prev) => {
            // Check if length or top event changed
            if (
              prev.length !== latestEvents.length ||
              (prev[0]?.id !== latestEvents[0]?.id) ||
              (prev[0]?.status !== latestEvents[0]?.status)
            ) {
              return latestEvents as any
            }
            return prev
          })
        }

        // Also sync match status & roles
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
      } catch (err) {
        // Silent poll error
      }
    }, 2500)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [initialMatch.id])

  // Memoized score calculation for rendering efficiency
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

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const isLive = match.status === 'LIVE'

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '2vw 4vw',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Background Atmosphere Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '10%',
          width: '40vw',
          height: '40vw',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          borderRadius: '50%',
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-20%',
          right: '10%',
          width: '40vw',
          height: '40vw',
          backgroundColor: 'rgba(22, 163, 74, 0.08)',
          borderRadius: '50%',
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }}
      />

      {/* TOP BAR */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 'clamp(1rem, 2vw, 1.5rem)',
              letterSpacing: '0.1em',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            HADANG LIVE SCORE
          </div>
          <span style={{ color: 'var(--text-muted)' }}>|</span>
          <span
            style={{
              fontSize: 'clamp(0.9rem, 1.6vw, 1.25rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
            }}
          >
            {match.name}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span
            style={{
              backgroundColor: 'var(--badge-neutral-bg)',
              border: '1px solid var(--border-color)',
              color: 'var(--badge-neutral-text)',
              fontSize: 'clamp(0.8rem, 1.4vw, 1.1rem)',
              fontWeight: 700,
              padding: '0.4em 1em',
              borderRadius: '6px',
            }}
          >
            {match.round || 'Babak 1'}
          </span>

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

      {/* MAIN ARENA SCORE BOARD */}
      <main
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          gap: '3vw',
          margin: 'auto 0',
          padding: '2vh 0',
          zIndex: 10,
        }}
      >
        {/* TEAM ATTACK (LEFT) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor:
              lastScoredTeam === match.team_attack_id
                ? 'var(--success-subtle)'
                : 'var(--surface-color)',
            border:
              lastScoredTeam === match.team_attack_id
                ? '3px solid var(--success)'
                : '2px solid var(--border-color)',
            borderRadius: '20px',
            padding: '3vw 2vw',
            boxShadow:
              lastScoredTeam === match.team_attack_id
                ? '0 0 60px rgba(34, 197, 94, 0.5)'
                : 'var(--card-shadow)',
            transform: lastScoredTeam === match.team_attack_id ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.25s ease',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span
            style={{
              backgroundColor: 'var(--success)',
              color: 'white',
              fontWeight: 900,
              fontSize: 'clamp(0.85rem, 1.6vw, 1.35rem)',
              padding: '0.4em 1.2em',
              borderRadius: '9999px',
              letterSpacing: '0.1em',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
            }}
          >
            ATTACK (PENYERANG)
          </span>

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
            {match.team_attack?.name || 'Tim Serang'}
          </h2>

          <div
            className="tv-score"
            style={{
              color: 'var(--success)',
              textShadow: '0 0 30px rgba(34, 197, 94, 0.4)',
              margin: '1vh 0',
              fontFamily: "'Plus Jakarta Sans', monospace",
            }}
          >
            {attackScore}
          </div>

          <span style={{ fontSize: 'clamp(0.75rem, 1.2vw, 1rem)', color: 'var(--text-secondary)', fontWeight: 600 }}>
            POIN HADANG
          </span>
        </div>

        {/* CENTER VS BADGE */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5vh',
          }}
        >
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
            GROBAK SODOR
          </div>
        </div>

        {/* TEAM DEFENSE (RIGHT) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            backgroundColor:
              lastScoredTeam === match.team_defense_id
                ? 'var(--danger-subtle)'
                : 'var(--surface-color)',
            border:
              lastScoredTeam === match.team_defense_id
                ? '3px solid var(--danger)'
                : '2px solid var(--border-color)',
            borderRadius: '20px',
            padding: '3vw 2vw',
            boxShadow:
              lastScoredTeam === match.team_defense_id
                ? '0 0 60px rgba(239, 68, 68, 0.5)'
                : 'var(--card-shadow)',
            transform: lastScoredTeam === match.team_defense_id ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.25s ease',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span
            style={{
              backgroundColor: 'var(--danger)',
              color: 'white',
              fontWeight: 900,
              fontSize: 'clamp(0.85rem, 1.6vw, 1.35rem)',
              padding: '0.4em 1.2em',
              borderRadius: '9999px',
              letterSpacing: '0.1em',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
            }}
          >
            DEFENSE (BERTAHAN)
          </span>

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
            {match.team_defense?.name || 'Tim Bertahan'}
          </h2>

          <div
            className="tv-score"
            style={{
              color: 'var(--danger)',
              textShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
              margin: '1vh 0',
              fontFamily: "'Plus Jakarta Sans', monospace",
            }}
          >
            {defenseScore}
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
          padding: '1.2vh 2vw',
          borderRadius: '10px',
          zIndex: 10,
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: 'clamp(0.75rem, 1.2vw, 0.95rem)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Juri 1: <strong style={{ color: 'var(--text-primary)' }}>{match.jury_1?.name || '-'}</strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Juri 2: <strong style={{ color: 'var(--text-primary)' }}>{match.jury_2?.name || '-'}</strong>
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
            {realtimeStatus === 'SUBSCRIBED' ? '🟢 REALTIME AKTIF' : '🟡 MENYINKRONKAN...'}
          </span>

          <div style={{ color: 'var(--success)', fontWeight: 700 }}>
            {activeEvents.length > 0 ? (
              <span>
                ⚡ Poin Terakhir: {new Date(activeEvents[0].created_at).toLocaleTimeString('id-ID')}
                {activeEvents[0].jury?.name ? ` (oleh ${activeEvents[0].jury.name})` : ''}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Menunggu poin pertama...</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}
