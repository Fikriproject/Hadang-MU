'use client'

import React, { useState, useTransition, useRef } from 'react'
import { addTeam, deleteTeam } from './actions'
import { promptConfirmDeleteTeam } from '@/lib/sweetalert'

export type TeamItem = {
  id: string
  name: string
  category?: string | null
  logo?: string | null
  created_at?: string
}

interface TeamManagerProps {
  initialTeams: TeamItem[]
}

export function detectTeamCategory(team: TeamItem): 'PUTRA' | 'PUTRI' {
  if (team.category) {
    return team.category.toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA'
  }
  const lower = team.name.toLowerCase()
  if (lower.includes('(putri)') || lower.includes('[putri]') || lower.includes('putri')) {
    return 'PUTRI'
  }
  return 'PUTRA'
}

export function cleanTeamDisplayName(team: TeamItem): string {
  // If team has explicit category column, remove duplicated '(Putra)' or '(Putri)' if at end
  return team.name
}

export default function TeamManager({ initialTeams }: TeamManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState<'PUTRA' | 'PUTRI'>('PUTRA')
  const [teamNameInput, setTeamNameInput] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const nameInputRef = useRef<HTMLInputElement>(null)

  const teamsPutra = initialTeams.filter((t) => detectTeamCategory(t) === 'PUTRA')
  const teamsPutri = initialTeams.filter((t) => detectTeamCategory(t) === 'PUTRI')

  const handleSelectCategory = (cat: 'PUTRA' | 'PUTRI') => {
    setSelectedCategory(cat)
    setFeedback(null)
    setTimeout(() => {
      nameInputRef.current?.focus()
    }, 50)
  }

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!teamNameInput.trim()) return

    setFeedback(null)
    const formData = new FormData()
    formData.append('name', teamNameInput.trim())
    formData.append('category', selectedCategory)

    startTransition(async () => {
      const res = await addTeam(formData)
      if (res?.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setTeamNameInput('')
        setFeedback({
          type: 'success',
          message: `Tim ${selectedCategory === 'PUTRA' ? 'Putra' : 'Putri'} "${teamNameInput.trim()}" berhasil ditambahkan!`,
        })
      }
    })
  }

  const handleDelete = async (team: TeamItem) => {
    const confirmed = await promptConfirmDeleteTeam(team.name)
    if (!confirmed) return

    setFeedback(null)
    const formData = new FormData()
    formData.append('id', team.id)

    startTransition(async () => {
      const res = await deleteTeam(formData)
      if (res?.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({
          type: 'success',
          message: `Tim "${team.name}" berhasil dihapus.`,
        })
      }
    })
  }

  const isPutra = selectedCategory === 'PUTRA'
  const activeColor = isPutra ? '#2563EB' : '#E11D48'
  const activeGlow = isPutra ? 'rgba(37, 99, 235, 0.25)' : 'rgba(225, 29, 72, 0.25)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: 'var(--surface-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        <div>
          <h1 className="heading" style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>
            Kelola Tim Pertandingan
          </h1>
          <p className="metadata-text">
            Sistem pengelompokan dan pendaftaran tim Hadang kategori Putra & Putri.
          </p>
        </div>

        {/* Counter Badges */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(37, 99, 235, 0.12)',
              border: '1px solid rgba(37, 99, 235, 0.3)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🚹</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3B82F6', letterSpacing: '0.05em' }}>
                TIM PUTRA
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {teamsPutra.length} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Tim</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'rgba(225, 29, 72, 0.12)',
              border: '1px solid rgba(225, 29, 72, 0.3)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🚺</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FB7185', letterSpacing: '0.05em' }}>
                TIM PUTRI
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {teamsPutri.length} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Tim</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--surface-subtle)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🏆</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                TOTAL TIM
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {initialTeams.length} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Tim</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Input Card & Grouped Lists */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* ========================================================================= */}
        {/* 1. INPUT FORM CARD WITH CLEAR CATEGORY SWITCHER                          */}
        {/* ========================================================================= */}
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            borderRadius: '12px',
            border: `1.5px solid ${activeColor}`,
            boxShadow: `0 8px 24px ${activeGlow}`,
            padding: '1.5rem',
            transition: 'border-color 0.25s, box-shadow 0.25s',
            position: 'sticky',
            top: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1.3rem' }}>➕</span>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Tambah Tim Baru
            </h2>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                backgroundColor: feedback.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: feedback.type === 'success' ? '#22C55E' : '#EF4444',
                border: `1px solid ${feedback.type === 'success' ? '#22C55E' : '#EF4444'}`,
              }}
            >
              {feedback.type === 'success' ? '✓ ' : '⚠ '} {feedback.message}
            </div>
          )}

          <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Category Selector Tabs */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.03em',
                }}
              >
                PILIH KATEGORI TIM <span style={{ color: 'var(--danger)' }}>*</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                {/* Putra Tab */}
                <button
                  type="button"
                  onClick={() => handleSelectCategory('PUTRA')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 0.5rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isPutra ? '2px solid #2563EB' : '1px solid var(--border-color)',
                    backgroundColor: isPutra ? 'rgba(37, 99, 235, 0.18)' : 'var(--surface-subtle)',
                    color: isPutra ? '#3B82F6' : 'var(--text-secondary)',
                    boxShadow: isPutra ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '1.15rem' }}>🚹</span>
                  <span>Tim Putra</span>
                </button>

                {/* Putri Tab */}
                <button
                  type="button"
                  onClick={() => handleSelectCategory('PUTRI')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 0.5rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: !isPutra ? '2px solid #E11D48' : '1px solid var(--border-color)',
                    backgroundColor: !isPutra ? 'rgba(225, 29, 72, 0.18)' : 'var(--surface-subtle)',
                    color: !isPutra ? '#FB7185' : 'var(--text-secondary)',
                    boxShadow: !isPutra ? '0 4px 12px rgba(225, 29, 72, 0.2)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '1.15rem' }}>🚺</span>
                  <span>Tim Putri</span>
                </button>
              </div>
            </div>

            {/* Team Name Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label
                htmlFor="name"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.03em',
                }}
              >
                NAMA TIM {isPutra ? 'PUTRA' : 'PUTRI'} <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                ref={nameInputRef}
                type="text"
                id="name"
                name="name"
                required
                value={teamNameInput}
                onChange={(e) => setTeamNameInput(e.target.value)}
                placeholder={isPutra ? 'Contoh: Garuda Perkasa' : 'Contoh: Srikandi Utama'}
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => (e.target.style.borderColor = activeColor)}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tim akan dimasukkan ke kategori <strong>{isPutra ? 'Tim Putra 🚹' : 'Tim Putri 🚺'}</strong>.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending || !teamNameInput.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: activeColor,
                color: 'white',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '0.95rem',
                border: 'none',
                cursor: isPending || !teamNameInput.trim() ? 'not-allowed' : 'pointer',
                opacity: isPending || !teamNameInput.trim() ? 0.6 : 1,
                boxShadow: `0 4px 14px ${activeGlow}`,
                transition: 'all 0.2s ease',
              }}
            >
              {isPending ? (
                'Menyimpan Tim...'
              ) : (
                <>
                  <span>+</span>
                  <span>Simpan Tim {isPutra ? 'Putra' : 'Putri'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* 2. GROUPED LISTS: PUTRA & PUTRI SIDE-BY-SIDE COLUMNS                     */}
        {/* ========================================================================= */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            
            {/* ------------------------------------------------------------- */}
            {/* KOLOM 1: KATEGORI TIM PUTRA                                   */}
            {/* ------------------------------------------------------------- */}
            <div
              style={{
                backgroundColor: 'var(--surface-color)',
                borderRadius: '12px',
                border: '1.5px solid rgba(37, 99, 235, 0.35)',
                boxShadow: 'var(--card-shadow)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Putra Group Header */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                  borderBottom: '1.5px solid rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🚹</span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#3B82F6', lineHeight: 1.2 }}>
                      Kategori Tim Putra
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Pertandingan Hadang Putra
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#2563EB',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                  }}
                >
                  {teamsPutra.length} Tim
                </div>
              </div>

              {/* Putra Group Content */}
              <div style={{ padding: '1rem' }}>
                {teamsPutra.length === 0 ? (
                  <div
                    style={{
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--surface-subtle)',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚹</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Belum Ada Tim Putra
                    </div>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>
                      Gunakan form di samping untuk mendaftarkan tim putra.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory('PUTRA')}
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#3B82F6',
                        backgroundColor: 'rgba(37, 99, 235, 0.12)',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      + Tambah Tim Putra Sekarang
                    </button>
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {teamsPutra.map((team, idx) => (
                      <li
                        key={team.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.85rem 1rem',
                          backgroundColor: 'var(--surface-subtle)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          transition: 'transform 0.15s, border-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: '#2563EB',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.875rem',
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {cleanTeamDisplayName(team)}
                            </div>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                color: '#3B82F6',
                                backgroundColor: 'rgba(37, 99, 235, 0.15)',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px',
                                display: 'inline-block',
                                marginTop: '0.2rem',
                              }}
                            >
                              PUTRA
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(team)}
                          disabled={isPending}
                          style={{
                            color: 'var(--danger)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'background-color 0.15s',
                          }}
                        >
                          Hapus
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* KOLOM 2: KATEGORI TIM PUTRI                                   */}
            {/* ------------------------------------------------------------- */}
            <div
              style={{
                backgroundColor: 'var(--surface-color)',
                borderRadius: '12px',
                border: '1.5px solid rgba(225, 29, 72, 0.35)',
                boxShadow: 'var(--card-shadow)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Putri Group Header */}
              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'rgba(225, 29, 72, 0.1)',
                  borderBottom: '1.5px solid rgba(225, 29, 72, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🚺</span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FB7185', lineHeight: 1.2 }}>
                      Kategori Tim Putri
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Pertandingan Hadang Putri
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#E11D48',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.25rem 0.65rem',
                    borderRadius: '9999px',
                  }}
                >
                  {teamsPutri.length} Tim
                </div>
              </div>

              {/* Putri Group Content */}
              <div style={{ padding: '1rem' }}>
                {teamsPutri.length === 0 ? (
                  <div
                    style={{
                      padding: '2.5rem 1rem',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      backgroundColor: 'var(--surface-subtle)',
                      borderRadius: '8px',
                      border: '1px dashed var(--border-color)',
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚺</div>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                      Belum Ada Tim Putri
                    </div>
                    <p style={{ fontSize: '0.8rem', margin: 0 }}>
                      Gunakan form di samping untuk mendaftarkan tim putri.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSelectCategory('PUTRI')}
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: '#FB7185',
                        backgroundColor: 'rgba(225, 29, 72, 0.12)',
                        border: '1px solid rgba(225, 29, 72, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      + Tambah Tim Putri Sekarang
                    </button>
                  </div>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {teamsPutri.map((team, idx) => (
                      <li
                        key={team.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.85rem 1rem',
                          backgroundColor: 'var(--surface-subtle)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          transition: 'transform 0.15s, border-color 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              backgroundColor: '#E11D48',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.875rem',
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                color: 'var(--text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {cleanTeamDisplayName(team)}
                            </div>
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                color: '#FB7185',
                                backgroundColor: 'rgba(225, 29, 72, 0.15)',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '4px',
                                display: 'inline-block',
                                marginTop: '0.2rem',
                              }}
                            >
                              PUTRI
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(team)}
                          disabled={isPending}
                          style={{
                            color: 'var(--danger)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'background-color 0.15s',
                          }}
                        >
                          Hapus
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
}
