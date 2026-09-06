'use client'

import React, { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import {
  type BracketCategory,
  type BracketData,
  type BracketMatch,
  type BracketRound,
  type BracketLayoutMode,
} from '@/lib/bracket'
import {
  rollRandomBracket,
  createManualBracket,
  updateBracketSlot,
  toggleBracketLock,
  generateMatchFromBracket,
  resetBracket,
  getBracket,
  updateBracketLayout,
  updateIncludeThirdPlace,
} from './actions'

interface TeamOption {
  id: string
  name: string
}

interface BracketViewProps {
  initialCategory: BracketCategory
  initialBracket: BracketData | null
  initialCategoryTeams: TeamOption[]
}

export default function BracketView({
  initialCategory,
  initialBracket,
  initialCategoryTeams,
}: BracketViewProps) {
  const [category, setCategory] = useState<BracketCategory>(initialCategory)
  const [bracket, setBracket] = useState<BracketData | null>(initialBracket)
  const [teams, setTeams] = useState<TeamOption[]>(initialCategoryTeams)

  // Zoom scale for desktop tree view
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Creation modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [createMode, setCreateMode] = useState<'AUTO' | 'MANUAL'>('AUTO')
  const [teamCountInput, setTeamCountInput] = useState<4 | 8 | 16>(8)
  const [modalLayoutMode, setModalLayoutMode] = useState<BracketLayoutMode>(
    bracket?.layoutMode || 'CENTER_SPLIT'
  )
  const [modalIncludeThirdPlace, setModalIncludeThirdPlace] = useState<boolean>(
    bracket?.includeThirdPlace ?? true
  )

  // Slot edit modal state
  const [editingSlot, setEditingSlot] = useState<{
    matchId: string
    slot: 'team1' | 'team2'
    currentTeamId?: string | null
  } | null>(null)
  const [selectedEditTeamId, setSelectedEditTeamId] = useState('')

  // Toast / feedback message
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const containerRef = useRef<HTMLDivElement>(null)

  const isPutra = category === 'PUTRA'
  const primaryColor = isPutra ? '#2563EB' : '#E11D48'
  const isLocked = bracket?.isLocked ?? false
  const layoutMode: BracketLayoutMode = bracket?.layoutMode || 'CENTER_SPLIT'
  const includeThirdPlace = bracket?.includeThirdPlace ?? true

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3200)
  }

  // Switch Category (Putra vs Putri)
  const handleCategorySwitch = (newCat: BracketCategory) => {
    if (newCat === category) return
    setCategory(newCat)
    startTransition(async () => {
      const res = await getBracket(newCat)
      setBracket(res.bracket)
      setTeams(res.categoryTeams)
      setZoomLevel(1)
    })
  }

  // Handle auto roll / manual creation
  const handleCreateSubmit = () => {
    startTransition(async () => {
      const res =
        createMode === 'AUTO'
          ? await rollRandomBracket(category, teamCountInput, modalIncludeThirdPlace, modalLayoutMode)
          : await createManualBracket(category, teamCountInput, modalIncludeThirdPlace, modalLayoutMode)

      if (res.error) {
        showToast(res.error, 'error')
      } else if (res.bracket) {
        setBracket(res.bracket)
        setIsCreateModalOpen(false)
        showToast(
          createMode === 'AUTO'
            ? `Bagan ${isPutra ? 'Putra' : 'Putri'} berhasil di-roll acak (${teamCountInput} Tim)!`
            : `Bagan manual ${isPutra ? 'Putra' : 'Putri'} berhasil dibuat!`
        )
      }
    })
  }

  // Toggle Layout Mode (Lurus Kiri-Kanan vs Kiri & Kanan ke Tengah)
  const handleSwitchLayout = (newLayout: BracketLayoutMode) => {
    if (!bracket || bracket.layoutMode === newLayout) return
    startTransition(async () => {
      const res = await updateBracketLayout(category, newLayout)
      if (res.error) {
        showToast(res.error, 'error')
      } else if (res.bracket) {
        setBracket(res.bracket)
        showToast(
          newLayout === 'LEFT_TO_RIGHT'
            ? 'Tampilan bagan: ➡️ Lurus (Kiri ke Kanan)'
            : 'Tampilan bagan: 🔀 Kiri & Kanan ke Tengah'
        )
      }
    })
  }

  // Toggle Third Place Option (Juara 1-2 Saja vs Sampai Juara 3)
  const handleSwitchThirdPlace = (include: boolean) => {
    if (!bracket || bracket.includeThirdPlace === include) return
    startTransition(async () => {
      const res = await updateIncludeThirdPlace(category, include)
      if (res.error) {
        showToast(res.error, 'error')
      } else if (res.bracket) {
        setBracket(res.bracket)
        showToast(
          include
            ? 'Format Juara: 🥇🥈🥉 Sampai Juara 3 (Ada Perebutan Juara 3)'
            : 'Format Juara: 🥇🥈 Hanya Juara 1 & 2'
        )
      }
    })
  }

  // Toggle Lock / Edit
  const handleToggleLock = () => {
    if (!bracket) return
    const nextLocked = !isLocked
    startTransition(async () => {
      const res = await toggleBracketLock(category, nextLocked)
      if (res.error) {
        showToast(res.error, 'error')
      } else {
        setBracket((prev) => (prev ? { ...prev, isLocked: nextLocked } : null))
        showToast(nextLocked ? 'Bagan terkunci (Mode Aman).' : 'Mode Edit aktif. Anda dapat mengganti tim.')
      }
    })
  }

  // Update a team slot
  const handleSaveSlot = () => {
    if (!editingSlot || !selectedEditTeamId) return
    const targetTeam = teams.find((t) => t.id === selectedEditTeamId)
    if (!targetTeam) return

    startTransition(async () => {
      const res = await updateBracketSlot(
        category,
        editingSlot.matchId,
        editingSlot.slot,
        targetTeam.id,
        targetTeam.name
      )
      if (res.error) {
        showToast(res.error, 'error')
      } else if (res.bracket) {
        setBracket(res.bracket)
        setEditingSlot(null)
        setSelectedEditTeamId('')
        showToast(`Tim "${targetTeam.name}" berhasil dipasang di bagan!`)
      }
    })
  }

  // Generate real Supabase match
  const handleGenerateMatch = (bm: BracketMatch) => {
    if (!bm.team1?.id || !bm.team2?.id) {
      showToast('Kedua tim harus terisi sebelum match dimulai.', 'error')
      return
    }

    startTransition(async () => {
      const res = await generateMatchFromBracket(
        category,
        bm.id,
        bm.team1!.id!,
        bm.team2!.id!,
        bm.title
      )
      if (res.error) {
        showToast(res.error, 'error')
      } else if (res.matchId) {
        // Refresh bracket state
        const refreshed = await getBracket(category)
        setBracket(refreshed.bracket)
        showToast(`Pertandingan "${bm.title}" berhasil dibuat! Siap dimainkan.`)
      }
    })
  }

  // Reset bracket
  const handleResetBracket = () => {
    if (
      !window.confirm(
        `Apakah Anda yakin ingin mereset/menghapus bagan ${isPutra ? 'Putra' : 'Putri'} ini?`
      )
    )
      return
    startTransition(async () => {
      await resetBracket(category)
      setBracket(null)
      showToast(`Bagan ${isPutra ? 'Putra' : 'Putri'} telah direset.`)
    })
  }

  // Refresh & reconcile from database
  const handleRefresh = () => {
    startTransition(async () => {
      const res = await getBracket(category)
      setBracket(res.bracket)
      setTeams(res.categoryTeams)
      showToast('Bagan telah disinkronkan dengan hasil pertandingan!')
    })
  }

  // RENDER MATCH CARD (Reusable for all rounds & third-place match)
  const renderMatchCard = (bm: BracketMatch, roundIndex: number, isBronze = false) => {
    const isMatchLive = bm.status === 'LIVE'
    const isMatchFinished = bm.status === 'FINISHED'
    const isReadyToPlay = Boolean(bm.team1?.id && bm.team2?.id)
    const canEdit = !isLocked && roundIndex === 0

    return (
      <div
        key={bm.id}
        style={{
          backgroundColor: isBronze ? 'rgba(217, 119, 6, 0.05)' : 'var(--surface-subtle)',
          border: isBronze
            ? '1.5px dashed #D97706'
            : isMatchLive
            ? '2px solid var(--success)'
            : isMatchFinished
            ? '1.5px solid var(--border-color)'
            : '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.85rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem',
          boxShadow: isMatchLive ? '0 0 16px rgba(34, 197, 94, 0.25)' : 'var(--card-shadow)',
          position: 'relative',
        }}
      >
        {/* Match Header: Title & Status */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.725rem',
          }}
        >
          <span
            style={{
              fontWeight: 800,
              color: isBronze ? '#D97706' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            {isBronze && <span>🥉</span>}
            <span>{bm.title}</span>
          </span>

          <span
            style={{
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontSize: '0.65rem',
              fontWeight: 800,
              backgroundColor: isMatchLive
                ? 'var(--success-subtle)'
                : isMatchFinished
                ? 'var(--badge-neutral-bg)'
                : isReadyToPlay
                ? 'var(--primary-subtle)'
                : 'var(--surface-color)',
              color: isMatchLive
                ? 'var(--success)'
                : isMatchFinished
                ? 'var(--text-secondary)'
                : isReadyToPlay
                ? 'var(--primary)'
                : 'var(--text-muted)',
              border: '1px solid var(--border-color)',
            }}
          >
            {bm.status === 'LIVE'
              ? '● LIVE'
              : bm.status === 'FINISHED'
              ? 'SELESAI'
              : bm.status === 'READY'
              ? 'SIAP'
              : 'MENUNGGU'}
          </span>
        </div>

        {/* Team 1 Slot */}
        <div
          style={{
            backgroundColor:
              isMatchFinished && bm.winnerTeamId === bm.team1?.id
                ? 'rgba(34, 197, 94, 0.12)'
                : 'var(--surface-color)',
            border:
              isMatchFinished && bm.winnerTeamId === bm.team1?.id
                ? '1.5px solid var(--success)'
                : '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.45rem 0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <span
              style={{
                fontWeight: bm.winnerTeamId === bm.team1?.id ? 800 : 700,
                fontSize: '0.825rem',
                color: bm.team1?.isPlaceholder ? 'var(--text-muted)' : 'var(--text-primary)',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isMatchFinished && bm.winnerTeamId === bm.team1?.id ? (isBronze ? '🥉 ' : '👑 ') : ''}
              {bm.team1?.name || 'TBD'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {/* Score */}
            {bm.score1 !== null && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '1rem',
                  color:
                    isMatchFinished && bm.winnerTeamId === bm.team1?.id
                      ? 'var(--success)'
                      : 'var(--text-primary)',
                }}
              >
                {bm.score1}
              </span>
            )}

            {/* Edit Button in Edit Mode (Round 0 only) */}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditingSlot({
                    matchId: bm.id,
                    slot: 'team1',
                    currentTeamId: bm.team1?.id,
                  })
                  setSelectedEditTeamId(bm.team1?.id || '')
                }}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: 'var(--primary)',
                  padding: '0.1rem 0.2rem',
                }}
                title="Ganti Tim"
              >
                ✎
              </button>
            )}
          </div>
        </div>

        {/* Team 2 Slot */}
        <div
          style={{
            backgroundColor:
              isMatchFinished && bm.winnerTeamId === bm.team2?.id
                ? 'rgba(34, 197, 94, 0.12)'
                : 'var(--surface-color)',
            border:
              isMatchFinished && bm.winnerTeamId === bm.team2?.id
                ? '1.5px solid var(--success)'
                : '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.45rem 0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <span
              style={{
                fontWeight: bm.winnerTeamId === bm.team2?.id ? 800 : 700,
                fontSize: '0.825rem',
                color: bm.team2?.isPlaceholder ? 'var(--text-muted)' : 'var(--text-primary)',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isMatchFinished && bm.winnerTeamId === bm.team2?.id ? (isBronze ? '🥉 ' : '👑 ') : ''}
              {bm.team2?.name || 'TBD'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            {/* Score */}
            {bm.score2 !== null && (
              <span
                style={{
                  fontFamily: 'monospace',
                  fontWeight: 900,
                  fontSize: '1rem',
                  color:
                    isMatchFinished && bm.winnerTeamId === bm.team2?.id
                      ? 'var(--success)'
                      : 'var(--text-primary)',
                }}
              >
                {bm.score2}
              </span>
            )}

            {/* Edit Button in Edit Mode (Round 0 only) */}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setEditingSlot({
                    matchId: bm.id,
                    slot: 'team2',
                    currentTeamId: bm.team2?.id,
                  })
                  setSelectedEditTeamId(bm.team2?.id || '')
                }}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  color: 'var(--primary)',
                  padding: '0.1rem 0.2rem',
                }}
                title="Ganti Tim"
              >
                ✎
              </button>
            )}
          </div>
        </div>

        {/* Action Button: Create / Link Match, or View Control Room */}
        {!bm.matchId && isReadyToPlay ? (
          <button
            type="button"
            onClick={() => handleGenerateMatch(bm)}
            disabled={isPending}
            style={{
              width: '100%',
              padding: '0.4rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: isBronze ? '#D97706' : primaryColor,
              color: 'white',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
              marginTop: '0.2rem',
            }}
          >
            <span>▶</span>
            <span>Mulai / Buka Match</span>
          </button>
        ) : bm.matchId ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', marginTop: '0.2rem' }}>
            <Link
              href={`/admin/matches/${bm.matchId}`}
              style={{
                padding: '0.35rem 0.45rem',
                borderRadius: '6px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.7rem',
                textAlign: 'center',
              }}
            >
              Kontrol
            </Link>
            <Link
              href={`/tv/${bm.matchId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.35rem 0.45rem',
                borderRadius: '6px',
                backgroundColor: 'var(--surface-color)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.7rem',
                textAlign: 'center',
              }}
            >
              📺 TV
            </Link>
          </div>
        ) : null}
      </div>
    )
  }

  // RENDER PODIUM (Juara 1, 2, dan 3)
  const renderPodium = () => {
    if (!bracket?.champion) return null

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          padding: '1.25rem',
          borderRadius: '16px',
          backgroundColor: 'var(--surface-subtle)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--card-shadow)',
          width: '260px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            fontWeight: 900,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '0.5rem',
          }}
        >
          🏆 PODIUM KEJUARAAN ({isPutra ? 'PUTRA' : 'PUTRI'})
        </div>

        {/* JUARA 1 (EMAS) */}
        <div
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.14)',
            border: '2px solid #EAB308',
            borderRadius: '10px',
            padding: '0.75rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.2rem',
          }}
        >
          <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>🥇</div>
          <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#CA8A04', letterSpacing: '0.05em' }}>
            JUARA 1 (CHAMPION)
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {bracket.champion.name}
          </span>
        </div>

        {/* JUARA 2 (PERAK) */}
        {bracket.runnerUp && (
          <div
            style={{
              backgroundColor: 'rgba(148, 163, 184, 0.12)',
              border: '1.5px solid #94A3B8',
              borderRadius: '10px',
              padding: '0.65rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.15rem',
            }}
          >
            <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>🥈</div>
            <span style={{ fontSize: '0.68rem', fontWeight: 900, color: '#64748B', letterSpacing: '0.05em' }}>
              JUARA 2 (RUNNER-UP)
            </span>
            <span style={{ fontSize: '0.925rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {bracket.runnerUp.name}
            </span>
          </div>
        )}

        {/* JUARA 3 (PERUNGGU - HANYA JIKA includeThirdPlace AKTIF) */}
        {bracket.includeThirdPlace && (
          <div
            style={{
              backgroundColor: bracket.thirdPlaceWinner
                ? 'rgba(217, 119, 6, 0.12)'
                : 'var(--surface-color)',
              border: bracket.thirdPlaceWinner ? '1.5px solid #D97706' : '1px dashed var(--border-color)',
              borderRadius: '10px',
              padding: '0.65rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.15rem',
            }}
          >
            <div style={{ fontSize: '1.4rem', lineHeight: 1 }}>🥉</div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 900,
                color: bracket.thirdPlaceWinner ? '#D97706' : 'var(--text-muted)',
                letterSpacing: '0.05em',
              }}
            >
              JUARA 3 (PERUNGGU)
            </span>
            <span
              style={{
                fontSize: '0.925rem',
                fontWeight: 800,
                color: bracket.thirdPlaceWinner ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {bracket.thirdPlaceWinner?.name || 'Belum Ditentukan'}
            </span>
          </div>
        )}
      </div>
    )
  }

  // RENDER BRACKET TREE: MODE 1 (LURUS KIRI KE KANAN)
  const renderLeftToRightBracket = () => {
    if (!bracket) return null

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '2.5rem',
          minWidth: 'max-content',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          transition: 'transform 0.1s ease',
          paddingBottom: '2rem',
        }}
      >
        {bracket.rounds.map((round: BracketRound, rIndex: number) => {
          const isFinal = rIndex === bracket.rounds.length - 1
          return (
            <div
              key={`ltr-round-${rIndex}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '260px',
                flexShrink: 0,
              }}
            >
              {/* Round Header Badge */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: isFinal ? primaryColor : 'var(--surface-subtle)',
                  color: isFinal ? 'white' : 'var(--text-primary)',
                  border: isFinal ? 'none' : '1px solid var(--border-color)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '1.25rem',
                  boxShadow: isFinal ? `0 4px 12px ${primaryColor}40` : 'none',
                }}
              >
                {isFinal ? `🏆 ${round.name}` : round.name}
              </div>

              {/* Matches in Round with vertical spacing */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  flexGrow: 1,
                  gap: `${Math.pow(2, rIndex) * 1.5}rem`,
                }}
              >
                {round.matches.map((bm: BracketMatch) => renderMatchCard(bm, rIndex))}
              </div>
            </div>
          )
        })}

        {/* BRONZE MATCH CARD (IF ENABLED IN LTR MODE) */}
        {bracket.includeThirdPlace && bracket.thirdPlaceMatch && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '260px',
              flexShrink: 0,
              alignSelf: 'center',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                padding: '0.55rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(217, 119, 6, 0.15)',
                color: '#D97706',
                border: '1px solid #D97706',
                fontWeight: 800,
                fontSize: '0.85rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '1.25rem',
              }}
            >
              🥉 PEREBUTAN JUARA 3
            </div>
            {renderMatchCard(bracket.thirdPlaceMatch, bracket.rounds.length - 1, true)}
          </div>
        )}

        {/* CHAMPION PODIUM DISPLAY */}
        {renderPodium()}
      </div>
    )
  }

  // RENDER BRACKET TREE: MODE 2 (KIRI KE TENGAH & KANAN KE TENGAH / SPLIT CENTER)
  const renderCenterSplitBracket = () => {
    if (!bracket) return null

    const numRounds = bracket.rounds.length
    const finalRoundIndex = numRounds - 1
    const finalRound = bracket.rounds[finalRoundIndex]

    // Earlier rounds (before final)
    const earlierRounds = bracket.rounds.slice(0, finalRoundIndex)

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '2.5rem',
          minWidth: 'max-content',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          transition: 'transform 0.1s ease',
          paddingBottom: '2rem',
        }}
      >
        {/* ================= LEFT WING: POOL A (ROUND 0 -> SEMIFINAL 1) ================= */}
        {earlierRounds.map((round: BracketRound, rIndex: number) => {
          const half = Math.ceil(round.matches.length / 2)
          const leftMatches = round.matches.slice(0, half)
          const isSemi = rIndex === finalRoundIndex - 1

          return (
            <div
              key={`split-left-round-${rIndex}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '260px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '1.25rem',
                }}
              >
                {isSemi ? 'Semifinal 1 (Bagan Kiri)' : `${round.name} (Kiri)`}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  flexGrow: 1,
                  gap: `${Math.pow(2, rIndex) * 1.5}rem`,
                }}
              >
                {leftMatches.map((bm: BracketMatch) => renderMatchCard(bm, rIndex))}
              </div>
            </div>
          )
        })}

        {/* ================= CENTER COLUMN: FINAL + BRONZE MATCH + PODIUM ================= */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '280px',
            flexShrink: 0,
            gap: '1.5rem',
            alignSelf: 'center',
          }}
        >
          {/* FINAL MATCH */}
          <div>
            <div
              style={{
                textAlign: 'center',
                padding: '0.65rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: primaryColor,
                color: 'white',
                fontWeight: 800,
                fontSize: '0.9rem',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
                boxShadow: `0 4px 14px ${primaryColor}50`,
              }}
            >
              🏆 {finalRound.name} (FINAL)
            </div>

            {finalRound.matches.map((bm: BracketMatch) => renderMatchCard(bm, finalRoundIndex))}
          </div>

          {/* BRONZE MATCH (PEREBUTAN JUARA 3) */}
          {bracket.includeThirdPlace && bracket.thirdPlaceMatch && (
            <div>
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(217, 119, 6, 0.15)',
                  color: '#D97706',
                  border: '1px solid #D97706',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '0.75rem',
                }}
              >
                🥉 PEREBUTAN JUARA 3
              </div>

              {renderMatchCard(bracket.thirdPlaceMatch, finalRoundIndex, true)}
            </div>
          )}

          {/* PODIUM DISPLAY */}
          {renderPodium()}
        </div>

        {/* ================= RIGHT WING: POOL B (SEMIFINAL 2 <- ROUND 0) ================= */}
        {[...earlierRounds].reverse().map((round: BracketRound, revIndex: number) => {
          const rIndex = earlierRounds.length - 1 - revIndex
          const half = Math.ceil(round.matches.length / 2)
          const rightMatches = round.matches.slice(half)
          const isSemi = rIndex === finalRoundIndex - 1

          return (
            <div
              key={`split-right-round-${rIndex}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '260px',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '1.25rem',
                }}
              >
                {isSemi ? 'Semifinal 2 (Bagan Kanan)' : `${round.name} (Kanan)`}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-around',
                  flexGrow: 1,
                  gap: `${Math.pow(2, rIndex) * 1.5}rem`,
                }}
              >
                {rightMatches.map((bm: BracketMatch) => renderMatchCard(bm, rIndex))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        minHeight: '80vh',
      }}
    >
      {/* FLOATING TOAST NOTIFICATION */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: toast.type === 'success' ? '#16A34A' : '#DC2626',
            color: 'white',
            fontWeight: 800,
            fontSize: '0.875rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* MOBILE LANDSCAPE ADVICE BANNER */}
      <div className="bracket-mobile-notice">
        <span>💡</span>
        <span>
          <strong>Tips Tampilan HP:</strong> Miringkan ponsel Anda ke mode <em>Landscape</em> atau gunakan tombol <strong>Layar Penuh</strong> untuk melihat bagan secara utuh.
        </span>
      </div>

      {/* TOP HEADER: 1 BARIS KANAN & KIRI */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.85rem',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '0.75rem 1rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* KIRI: TOGGLE KATEGORI PUTRA & PUTRI (1 BARIS) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--surface-subtle)',
              padding: '0.25rem',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              gap: '0.25rem',
            }}
          >
            {/* Tab Putra */}
            <button
              type="button"
              onClick={() => handleCategorySwitch('PUTRA')}
              disabled={isPending}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: isPutra ? '2px solid #2563EB' : '1px solid transparent',
                backgroundColor: isPutra ? '#2563EB' : 'transparent',
                color: isPutra ? 'white' : 'var(--text-secondary)',
                fontWeight: 800,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: isPutra ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🚹</span>
              <span>Bagan Putra</span>
            </button>

            {/* Tab Putri */}
            <button
              type="button"
              onClick={() => handleCategorySwitch('PUTRI')}
              disabled={isPending}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: !isPutra ? '2px solid #E11D48' : '1px solid transparent',
                backgroundColor: !isPutra ? '#E11D48' : 'transparent',
                color: !isPutra ? 'white' : 'var(--text-secondary)',
                fontWeight: 800,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: !isPutra ? '0 4px 12px rgba(225, 29, 72, 0.3)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>🚺</span>
              <span>Bagan Putri</span>
            </button>
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              fontWeight: 700,
              marginLeft: '0.25rem',
            }}
          >
            {teams.length} Tim Terdaftar
          </span>
        </div>

        {/* KANAN: TOMBOL KONTROL & AKSI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Lock / Edit Mode Toggle Button */}
          {bracket && (
            <button
              type="button"
              onClick={handleToggleLock}
              disabled={isPending}
              style={{
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: isLocked ? '1px solid var(--border-color)' : '2px solid #EAB308',
                backgroundColor: isLocked ? 'var(--surface-subtle)' : 'rgba(234, 179, 8, 0.15)',
                color: isLocked ? 'var(--text-primary)' : '#CA8A04',
                fontWeight: 800,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'all 0.15s ease',
              }}
              title={isLocked ? 'Klik untuk membuka Mode Edit' : 'Klik untuk mengunci bagan'}
            >
              <span>{isLocked ? '🔒 Terkunci (Locked)' : '✏️ Mode Edit'}</span>
            </button>
          )}

          {/* Refresh / Sync with DB */}
          {bracket && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-subtle)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              title="Perbarui skor dan status dari database"
            >
              <span>🔄</span>
              <span className="bracket-btn-text">Sinkron</span>
            </button>
          )}

          {/* Full Screen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>{isFullScreen ? '🗗' : '⛶'}</span>
            <span className="bracket-btn-text">{isFullScreen ? 'Tutup' : 'Layar Penuh'}</span>
          </button>

          {/* Buat / Acak Bagan Baru */}
          <button
            type="button"
            onClick={() => {
              setModalLayoutMode(bracket?.layoutMode || 'CENTER_SPLIT')
              setModalIncludeThirdPlace(bracket?.includeThirdPlace ?? true)
              setIsCreateModalOpen(true)
            }}
            disabled={isPending}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: primaryColor,
              color: 'white',
              fontWeight: 800,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: `0 4px 12px ${primaryColor}40`,
              transition: 'all 0.15s ease',
            }}
          >
            <span>🎲</span>
            <span>{bracket ? 'Acak / Buat Ulang' : 'Buat Bagan Baru'}</span>
          </button>
        </div>
      </div>

      {/* SECONDARY TOOLBAR: PILIHAN MODE BAGAN & PILIHAN JUARA */}
      {bracket && (
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.65rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          {/* KIRI: 2 MODE TABEL & PILIHAN JUARA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Opsi 1: Mode Alur Tabel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                Alur Bagan:
              </span>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--surface-subtle)',
                  padding: '0.2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  gap: '0.2rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSwitchLayout('LEFT_TO_RIGHT')}
                  disabled={isPending}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: layoutMode === 'LEFT_TO_RIGHT' ? primaryColor : 'transparent',
                    color: layoutMode === 'LEFT_TO_RIGHT' ? 'white' : 'var(--text-primary)',
                    fontWeight: layoutMode === 'LEFT_TO_RIGHT' ? 800 : 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                  }}
                  title="Membaca lurus dari kiri ke kanan dari banyak tim hingga final"
                >
                  <span>➡️</span>
                  <span>Lurus (Kiri-Kanan)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchLayout('CENTER_SPLIT')}
                  disabled={isPending}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: layoutMode === 'CENTER_SPLIT' ? primaryColor : 'transparent',
                    color: layoutMode === 'CENTER_SPLIT' ? 'white' : 'var(--text-primary)',
                    fontWeight: layoutMode === 'CENTER_SPLIT' ? 800 : 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                  }}
                  title="Pembacaan dari kiri ke tengah dan kanan ke tengah (Pohon Kejuaraan)"
                >
                  <span>🔀</span>
                  <span>Kiri & Kanan ke Tengah</span>
                </button>
              </div>
            </div>

            {/* Opsi 2: Pilihan Juara 1-2 Saja atau Sampai 3 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                Format Juara:
              </span>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: 'var(--surface-subtle)',
                  padding: '0.2rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  gap: '0.2rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSwitchThirdPlace(false)}
                  disabled={isPending}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: !includeThirdPlace ? 'var(--primary)' : 'transparent',
                    color: !includeThirdPlace ? 'white' : 'var(--text-primary)',
                    fontWeight: !includeThirdPlace ? 800 : 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                  }}
                  title="Hanya Juara 1 & 2 (Tanpa perebutan juara 3)"
                >
                  <span>🥇🥈</span>
                  <span>Juara 1 & 2 Saja</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchThirdPlace(true)}
                  disabled={isPending}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: includeThirdPlace ? 'var(--primary)' : 'transparent',
                    color: includeThirdPlace ? 'white' : 'var(--text-primary)',
                    fontWeight: includeThirdPlace ? 800 : 600,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    transition: 'all 0.15s ease',
                  }}
                  title="Sampai Juara 3 (Ada pertandingan perebutan juara 3)"
                >
                  <span>🥇🥈🥉</span>
                  <span>Sampai Juara 3</span>
                </button>
              </div>
            </div>
          </div>

          {/* KANAN: ZOOM CONTROLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Zoom:</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              -
            </button>
            <span style={{ width: '45px', textAlign: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontSize: '0.725rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reset Fit
            </button>
          </div>
        </div>
      )}

      {/* TOURNAMENT BRACKET TREE DISPLAY CONTAINER */}
      {!bracket ? (
        /* Empty State */
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '2px dashed var(--border-color)',
            borderRadius: '16px',
            padding: '4rem 1.5rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '3.5rem' }}>{isPutra ? '🚹' : '🚺'}</div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
              Belum Ada Bagan Pertandingan {isPutra ? 'Putra' : 'Putri'}
            </h3>
            <p className="metadata-text" style={{ maxWidth: '480px', margin: '0 auto', fontSize: '0.9rem' }}>
              Sistem dapat mengocok (roll acak) otomatis tim-tim yang sudah terdaftar menjadi bagan turnamen sistem gugur siap pakai, atau Anda dapat menyusunnya secara manual.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              backgroundColor: primaryColor,
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              border: 'none',
              boxShadow: `0 4px 14px ${primaryColor}50`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>🎲</span>
            <span>Mulai Buat / Roll Bagan {isPutra ? 'Putra' : 'Putri'}</span>
          </button>
        </div>
      ) : (
        /* Active Bracket Tree with selected layout mode */
        <div
          ref={containerRef}
          className={`bracket-tree-wrapper ${isFullScreen ? 'is-fullscreen' : ''}`}
          style={{
            backgroundColor: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.5rem',
            overflowX: 'auto',
            overflowY: 'auto',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {layoutMode === 'LEFT_TO_RIGHT' ? renderLeftToRightBracket() : renderCenterSplitBracket()}
        </div>
      )}

      {/* MODAL: BUAT / ROLL BAGAN BARU */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Persiapan Bagan {isPutra ? 'Putra' : 'Putri'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Pilihan 1: Mode Pembuatan (Otomatis vs Manual) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="metadata-text" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                1. Mode Pembuatan Tim:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCreateMode('AUTO')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: createMode === 'AUTO' ? `2px solid ${primaryColor}` : '1px solid var(--border-color)',
                    backgroundColor: createMode === 'AUTO' ? `${primaryColor}15` : 'var(--surface-subtle)',
                    color: createMode === 'AUTO' ? primaryColor : 'var(--text-secondary)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <span>🎲 Mode Otomatis</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.8 }}>Roll Acak Sekaligus</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCreateMode('MANUAL')}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: createMode === 'MANUAL' ? `2px solid ${primaryColor}` : '1px solid var(--border-color)',
                    backgroundColor: createMode === 'MANUAL' ? `${primaryColor}15` : 'var(--surface-subtle)',
                    color: createMode === 'MANUAL' ? primaryColor : 'var(--text-secondary)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <span>✍️ Mode Manual</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.8 }}>Susun Slot per Slot</span>
                </button>
              </div>
            </div>

            {/* Pilihan 2: Input Jumlah Tim Peserta */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="metadata-text" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                2. Jumlah Tim yang Ikut:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {([4, 8, 16] as const).map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setTeamCountInput(count)}
                    style={{
                      padding: '0.65rem 0.5rem',
                      borderRadius: '8px',
                      border: teamCountInput === count ? `2px solid ${primaryColor}` : '1px solid var(--border-color)',
                      backgroundColor: teamCountInput === count ? `${primaryColor}20` : 'var(--surface-subtle)',
                      color: teamCountInput === count ? primaryColor : 'var(--text-primary)',
                      fontWeight: 800,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                    }}
                  >
                    {count} Tim
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tersedia {teams.length} tim {isPutra ? 'Putra' : 'Putri'} terdaftar di database.
              </span>
            </div>

            {/* Pilihan 3: Mode Alur Bagan (Lurus vs Kiri-Kanan ke Tengah) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="metadata-text" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                3. Pilihan Alur Bagan (Layout):
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalLayoutMode('LEFT_TO_RIGHT')}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border:
                      modalLayoutMode === 'LEFT_TO_RIGHT'
                        ? `2px solid ${primaryColor}`
                        : '1px solid var(--border-color)',
                    backgroundColor:
                      modalLayoutMode === 'LEFT_TO_RIGHT' ? `${primaryColor}15` : 'var(--surface-subtle)',
                    color: modalLayoutMode === 'LEFT_TO_RIGHT' ? primaryColor : 'var(--text-primary)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <span>➡️ Lurus Kiri-Kanan</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.8 }}>
                    Dari banyak tim ke final di kanan
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalLayoutMode('CENTER_SPLIT')}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border:
                      modalLayoutMode === 'CENTER_SPLIT'
                        ? `2px solid ${primaryColor}`
                        : '1px solid var(--border-color)',
                    backgroundColor:
                      modalLayoutMode === 'CENTER_SPLIT' ? `${primaryColor}15` : 'var(--surface-subtle)',
                    color: modalLayoutMode === 'CENTER_SPLIT' ? primaryColor : 'var(--text-primary)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <span>🔀 Kiri & Kanan ke Tengah</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.8 }}>
                    Pool Kiri & Kanan bertemu di Final tengah
                  </span>
                </button>
              </div>
            </div>

            {/* Pilihan 4: Format Juara (Juara 1-2 Saja vs Sampai Juara 3) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="metadata-text" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                4. Pilihan Format Juara:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalIncludeThirdPlace(false)}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border:
                      !modalIncludeThirdPlace
                        ? `2px solid ${primaryColor}`
                        : '1px solid var(--border-color)',
                    backgroundColor:
                      !modalIncludeThirdPlace ? `${primaryColor}15` : 'var(--surface-subtle)',
                    color: !modalIncludeThirdPlace ? primaryColor : 'var(--text-primary)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <span>🥇🥈 Juara 1 & 2 Saja</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.8 }}>
                    Final menentukan Juara 1 & 2
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalIncludeThirdPlace(true)}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '8px',
                    border:
                      modalIncludeThirdPlace
                        ? `2px solid ${primaryColor}`
                        : '1px solid var(--border-color)',
                    backgroundColor:
                      modalIncludeThirdPlace ? `${primaryColor}15` : 'var(--surface-subtle)',
                    color: modalIncludeThirdPlace ? primaryColor : 'var(--text-primary)',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                  }}
                >
                  <span>🥇🥈🥉 Sampai Juara 3</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, opacity: 0.8 }}>
                    Ada match Perebutan Juara 3
                  </span>
                </button>
              </div>
            </div>

            {/* Tombol Eksekusi */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isPending}
                style={{
                  flex: 2,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: primaryColor,
                  color: 'white',
                  fontWeight: 800,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  boxShadow: `0 4px 14px ${primaryColor}40`,
                }}
              >
                {isPending
                  ? 'Menyusun Bagan...'
                  : createMode === 'AUTO'
                  ? `🎲 Roll Acak (${teamCountInput} Tim)`
                  : `Buat Manual (${teamCountInput} Tim)`}
              </button>
            </div>

            {bracket && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleResetBracket}
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--danger)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ⚠️ Reset / Hapus Bagan {isPutra ? 'Putra' : 'Putri'} Ini
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT SLOT TIM */}
      {editingSlot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-color)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.5rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
              Ganti Tim ({editingSlot.slot === 'team1' ? 'Tim 1' : 'Tim 2'})
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label className="metadata-text" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                Pilih Tim {isPutra ? 'Putra' : 'Putri'}:
              </label>
              <select
                value={selectedEditTeamId}
                onChange={(e) => setSelectedEditTeamId(e.target.value)}
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                }}
              >
                <option value="">-- Pilih Tim --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSlot}
                disabled={!selectedEditTeamId || isPending}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: primaryColor,
                  color: 'white',
                  fontWeight: 800,
                  cursor: !selectedEditTeamId || isPending ? 'not-allowed' : 'pointer',
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
