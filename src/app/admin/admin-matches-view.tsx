'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { detectMatchCategory } from '@/lib/categories'

export interface MatchWithRelations {
  id: string
  name: string
  round: string | null
  scheduled_at?: string | null
  status: 'DRAFT' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  created_at: string
  started_at: string | null
  finished_at: string | null
  team_attack: { id: string; name: string } | null
  team_defense: { id: string; name: string } | null
  jury_1: { id: string; name: string } | null
  jury_2: { id: string; name: string } | null
  score_events: { id: string; team_id: string; points: number; status: string }[]
}

interface AdminMatchesViewProps {
  initialMatches: MatchWithRelations[]
}

export default function AdminMatchesView({ initialMatches }: AdminMatchesViewProps) {
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'PUTRA' | 'PUTRI'>('ALL')

  const putraMatches = initialMatches.filter((m) => detectMatchCategory(m) === 'PUTRA')
  const putriMatches = initialMatches.filter((m) => detectMatchCategory(m) === 'PUTRI')

  const filteredMatches =
    filterCategory === 'PUTRA'
      ? putraMatches
      : filterCategory === 'PUTRI'
      ? putriMatches
      : initialMatches

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-color)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        padding: '1.25rem',
        boxShadow: 'var(--card-shadow)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      {/* Header & Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            Daftar Pertandingan ({initialMatches.length})
          </h2>
          <p className="metadata-text" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
            Filter dan pantau pertandingan berdasarkan kategori Putra dan Putri
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--surface-subtle)',
            padding: '0.3rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            gap: '0.25rem',
          }}
        >
          {/* Tab Semua */}
          <button
            type="button"
            onClick={() => setFilterCategory('ALL')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: filterCategory === 'ALL' ? 'var(--surface-color)' : 'transparent',
              color: filterCategory === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: filterCategory === 'ALL' ? 800 : 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              boxShadow: filterCategory === 'ALL' ? 'var(--card-shadow)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Semua ({initialMatches.length})
          </button>

          {/* Tab Putra */}
          <button
            type="button"
            onClick={() => setFilterCategory('PUTRA')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: filterCategory === 'PUTRA' ? '#2563EB' : 'transparent',
              color: filterCategory === 'PUTRA' ? 'white' : 'var(--text-secondary)',
              fontWeight: filterCategory === 'PUTRA' ? 800 : 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              boxShadow: filterCategory === 'PUTRA' ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🚹 Putra</span>
            <span
              style={{
                backgroundColor: filterCategory === 'PUTRA' ? 'rgba(255,255,255,0.25)' : 'var(--border-color)',
                color: filterCategory === 'PUTRA' ? 'white' : 'var(--text-muted)',
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 800,
              }}
            >
              {putraMatches.length}
            </span>
          </button>

          {/* Tab Putri */}
          <button
            type="button"
            onClick={() => setFilterCategory('PUTRI')}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: filterCategory === 'PUTRI' ? '#E11D48' : 'transparent',
              color: filterCategory === 'PUTRI' ? 'white' : 'var(--text-secondary)',
              fontWeight: filterCategory === 'PUTRI' ? 800 : 600,
              fontSize: '0.825rem',
              cursor: 'pointer',
              boxShadow: filterCategory === 'PUTRI' ? '0 2px 8px rgba(225, 29, 72, 0.3)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🚺 Putri</span>
            <span
              style={{
                backgroundColor: filterCategory === 'PUTRI' ? 'rgba(255,255,255,0.25)' : 'var(--border-color)',
                color: filterCategory === 'PUTRI' ? 'white' : 'var(--text-muted)',
                padding: '0.1rem 0.4rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 800,
              }}
            >
              {putriMatches.length}
            </span>
          </button>
        </div>
      </div>

      {/* Matches Content */}
      {filteredMatches.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '10px',
            border: '1px dashed var(--border-color)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
            {filterCategory === 'PUTRA' ? '🚹' : filterCategory === 'PUTRI' ? '🚺' : '📋'}
          </div>
          <p className="metadata-text" style={{ marginBottom: '1.25rem', fontSize: '0.95rem' }}>
            {filterCategory === 'ALL'
              ? 'Belum ada data pertandingan.'
              : `Belum ada pertandingan pada Kategori ${filterCategory === 'PUTRA' ? 'Putra' : 'Putri'}.`}
          </p>
          <Link
            href="/admin/matches/create"
            style={{
              backgroundColor: filterCategory === 'PUTRI' ? '#E11D48' : 'var(--primary)',
              color: 'white',
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.875rem',
              display: 'inline-block',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            + Buat Pertandingan {filterCategory === 'PUTRI' ? 'Putri' : filterCategory === 'PUTRA' ? 'Putra' : ''}
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredMatches.map((m) => {
            const matchCategory = detectMatchCategory(m)
            const isMatchPutra = matchCategory === 'PUTRA'

            const activeEvents = m.score_events?.filter((e) => e.status === 'ACTIVE') || []
            const attackScore = activeEvents
              .filter((e) => e.team_id === m.team_attack?.id)
              .reduce((sum, e) => sum + e.points, 0)
            const defenseScore = activeEvents
              .filter((e) => e.team_id === m.team_defense?.id)
              .reduce((sum, e) => sum + e.points, 0)

            // Status badge styling
            let statusBg = 'var(--badge-neutral-bg)'
            let statusColor = 'var(--badge-neutral-text)'
            let statusBorder = '1px solid var(--border-color)'
            let statusLabel: string = m.status

            if (m.status === 'LIVE') {
              statusBg = 'var(--success-subtle)'
              statusColor = 'var(--success)'
              statusBorder = '1px solid var(--success)'
              statusLabel = '● LIVE'
            } else if (m.status === 'PAUSED') {
              statusBg = 'var(--warning-subtle)'
              statusColor = 'var(--warning)'
              statusBorder = '1px solid var(--warning)'
              statusLabel = 'PAUSED'
            } else if (m.status === 'READY') {
              statusBg = 'var(--primary-subtle)'
              statusColor = 'var(--primary)'
              statusBorder = '1px solid var(--primary)'
              statusLabel = 'READY'
            } else if (m.status === 'FINISHED') {
              statusBg = 'var(--badge-neutral-bg)'
              statusColor = 'var(--badge-neutral-text)'
              statusBorder = '1px solid var(--border-color)'
              statusLabel = 'SELESAI'
            }

            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: 'var(--surface-color)',
                  border: m.status === 'LIVE' ? '2px solid var(--success)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: 'var(--card-shadow)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Category accent line on left border */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '4px',
                    backgroundColor: isMatchPutra ? '#2563EB' : '#E11D48',
                  }}
                />

                {/* Top Row: Category Badge, Status, Match Name & Quick Actions */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    paddingLeft: '0.35rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: '1 1 auto', flexWrap: 'wrap' }}>
                    {/* Category Badge (Putra / Putri) */}
                    <span
                      style={{
                        backgroundColor: isMatchPutra ? 'rgba(37, 99, 235, 0.12)' : 'rgba(225, 29, 72, 0.12)',
                        color: isMatchPutra ? '#2563EB' : '#E11D48',
                        border: isMatchPutra ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid rgba(225, 29, 72, 0.3)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem',
                        flexShrink: 0,
                      }}
                    >
                      {isMatchPutra ? '🚹 PUTRA' : '🚺 PUTRI'}
                    </span>

                    {/* Status Badge */}
                    <span
                      style={{
                        backgroundColor: statusBg,
                        color: statusColor,
                        border: statusBorder,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                      }}
                    >
                      {statusLabel}
                    </span>

                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.name}
                    </span>

                    {m.round && (
                      <span
                        style={{
                          backgroundColor: 'var(--badge-neutral-bg)',
                          border: '1px solid var(--border-color)',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          color: 'var(--badge-neutral-text)',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {m.round}
                      </span>
                    )}

                    {m.scheduled_at && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          marginLeft: '0.2rem'
                        }}
                      >
                        📅 {new Intl.DateTimeFormat('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(m.scheduled_at)).replace(/\./g, ':')} WIB
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, flexWrap: 'wrap' }}>
                    <Link
                      href={`/jury/matches/${m.id}`}
                      style={{
                        backgroundColor: 'var(--surface-color)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        textDecoration: 'none',
                      }}
                      title="Buka panel pencatatan Meja Scoring"
                    >
                      📱 Scoring
                    </Link>
                    <Link
                      href={`/admin/matches/${m.id}`}
                      style={{
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                        textDecoration: 'none',
                      }}
                    >
                      Ruang Kontrol
                    </Link>
                    <Link
                      href={`/tv/${m.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        backgroundColor: 'var(--btn-secondary-bg)',
                        color: 'var(--btn-secondary-text)',
                        border: '1px solid var(--border-color)',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        textDecoration: 'none',
                      }}
                    >
                      📺 TV Score
                    </Link>
                  </div>
                </div>

                {/* Scoreboard View */}
                {(() => {
                  const tA = m.team_attack || { id: 'team-a', name: 'Tim 1' }
                  const tB = m.team_defense || { id: 'team-b', name: 'Tim 2' }
                  const [teamLeft, teamRight] =
                    m.round === tA.id || (m.round !== tB.id && tA.id < tB.id) ? [tA, tB] : [tB, tA]
                  const isLeftAttacking = m.team_attack?.id === teamLeft.id
                  const sLeft = activeEvents
                    .filter((e) => e.team_id === teamLeft.id)
                    .reduce((sum, e) => sum + e.points, 0)
                  const sRight = activeEvents
                    .filter((e) => e.team_id === teamRight.id)
                    .reduce((sum, e) => sum + e.points, 0)

                  return (
                    <>
                      {/* Desktop View (>= 641px): 3-Column side-by-side */}
                      <div className="admin-scorebox-desktop" style={{ marginLeft: '0.35rem' }}>
                        {/* Team Left */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: isLeftAttacking ? 'var(--success)' : 'var(--text-muted)',
                              fontWeight: 800,
                            }}
                          >
                            {isLeftAttacking ? '⚡ GILIRAN SERANG' : 'BERTAHAN'}
                          </span>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '1.2rem',
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {teamLeft.name}
                          </span>
                        </div>

                        {/* Score display */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                          <span
                            style={{
                              fontSize: '2.25rem',
                              fontWeight: 900,
                              color: isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
                              minWidth: '2ch',
                              textAlign: 'center',
                            }}
                          >
                            {sLeft}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: '1.5rem' }}>:</span>
                          <span
                            style={{
                              fontSize: '2.25rem',
                              fontWeight: 900,
                              color: !isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
                              minWidth: '2ch',
                              textAlign: 'center',
                            }}
                          >
                            {sRight}
                          </span>
                        </div>

                        {/* Team Right */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', textAlign: 'right', minWidth: 0 }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: !isLeftAttacking ? 'var(--success)' : 'var(--text-muted)',
                              fontWeight: 800,
                            }}
                          >
                            {!isLeftAttacking ? '⚡ GILIRAN SERANG' : 'BERTAHAN'}
                          </span>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '1.2rem',
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {teamRight.name}
                          </span>
                        </div>
                      </div>

                      {/* Mobile View (<= 640px): 2 stacked team cards, zero overflow */}
                      <div className="admin-scorebox-mobile" style={{ marginLeft: '0.35rem' }}>
                        <div className={`admin-mobile-team-card ${isLeftAttacking ? 'is-attacking' : ''}`}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                color: isLeftAttacking ? 'var(--success)' : 'var(--text-muted)',
                                display: 'block',
                              }}
                            >
                              {isLeftAttacking ? '⚡ GILIRAN SERANG' : 'BERTAHAN'}
                            </span>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: '1rem',
                                color: 'var(--text-primary)',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {teamLeft.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '1.75rem',
                              fontWeight: 900,
                              color: isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
                              minWidth: '2ch',
                              textAlign: 'right',
                            }}
                          >
                            {sLeft}
                          </span>
                        </div>

                        <div className={`admin-mobile-team-card ${!isLeftAttacking ? 'is-attacking' : ''}`}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <span
                              style={{
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                color: !isLeftAttacking ? 'var(--success)' : 'var(--text-muted)',
                                display: 'block',
                              }}
                            >
                              {!isLeftAttacking ? '⚡ GILIRAN SERANG' : 'BERTAHAN'}
                            </span>
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: '1rem',
                                color: 'var(--text-primary)',
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {teamRight.name}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: '1.75rem',
                              fontWeight: 900,
                              color: !isLeftAttacking ? 'var(--success)' : 'var(--text-primary)',
                              minWidth: '2ch',
                              textAlign: 'right',
                            }}
                          >
                            {sRight}
                          </span>
                        </div>
                      </div>
                    </>
                  )
                })()}

                {/* Scoring Assigned info */}
                <div style={{ display: 'flex', gap: '0.5rem 1.5rem', fontSize: '0.78rem', flexWrap: 'wrap', paddingLeft: '0.35rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Scoring 1 (Depan): </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{m.jury_1?.name || '-'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Scoring 2 (Belakang): </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{m.jury_2?.name || '-'}</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
