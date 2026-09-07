'use client'

import React, { useState, useActionState } from 'react'
import Link from 'next/link'
import { createMatch, type CreateMatchState } from './actions'
import { detectTeamCategory } from '@/lib/categories'

interface OptionItem {
  id: string
  name: string
  category?: string | null
}

interface MatchFormProps {
  teams: OptionItem[]
  juries: OptionItem[]
}

const initialState: CreateMatchState = {}

export default function MatchForm({ teams, juries }: MatchFormProps) {
  const [state, formAction, isPending] = useActionState(createMatch, initialState)
  const [selectedCategory, setSelectedCategory] = useState<'PUTRA' | 'PUTRI'>('PUTRA')
  const [team1Id, setTeam1Id] = useState('')
  const [team2Id, setTeam2Id] = useState('')

  // Separate teams strictly by category
  const putraTeams = teams.filter((t) => detectTeamCategory(t) === 'PUTRA')
  const putriTeams = teams.filter((t) => detectTeamCategory(t) === 'PUTRI')

  const activeTeams = selectedCategory === 'PUTRA' ? putraTeams : putriTeams
  const isPutra = selectedCategory === 'PUTRA'
  const activeColor = isPutra ? '#2563EB' : '#E11D48'
  const activeBgSubtle = isPutra ? 'rgba(37, 99, 235, 0.08)' : 'rgba(225, 29, 72, 0.08)'
  const activeBorder = isPutra ? 'rgba(37, 99, 235, 0.35)' : 'rgba(225, 29, 72, 0.35)'

  const handleCategoryChange = (cat: 'PUTRA' | 'PUTRI') => {
    setSelectedCategory(cat)
    setTeam1Id('')
    setTeam2Id('')
  }

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {state?.error && (
        <div
          style={{
            backgroundColor: 'var(--danger-subtle)',
            border: '1px solid var(--danger)',
            color: 'var(--danger)',
            padding: '0.875rem 1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: 700,
          }}
        >
          {state.error}
        </div>
      )}

      {/* 1. KATEGORI PERTANDINGAN: PUTRA VS PUTRI SELECTOR */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="metadata-text" style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
            Kategori Pertandingan <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: activeColor }}>
            Tersedia: {activeTeams.length} Tim {isPutra ? 'Putra' : 'Putri'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* Tab Putra */}
          <button
            type="button"
            onClick={() => handleCategoryChange('PUTRA')}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: isPutra ? '2px solid #2563EB' : '1px solid var(--border-color)',
              backgroundColor: isPutra ? 'rgba(37, 99, 235, 0.12)' : 'var(--surface-subtle)',
              color: isPutra ? '#2563EB' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 800,
              fontSize: '0.95rem',
              boxShadow: isPutra ? '0 4px 14px rgba(37, 99, 235, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🚹</span>
              <span>Kategori Putra</span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: isPutra ? '#2563EB' : 'var(--border-color)',
                color: isPutra ? 'white' : 'var(--text-muted)',
                padding: '0.15rem 0.6rem',
                borderRadius: '9999px',
              }}
            >
              {putraTeams.length} Tim Terdaftar
            </span>
          </button>

          {/* Tab Putri */}
          <button
            type="button"
            onClick={() => handleCategoryChange('PUTRI')}
            style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              border: !isPutra ? '2px solid #E11D48' : '1px solid var(--border-color)',
              backgroundColor: !isPutra ? 'rgba(225, 29, 72, 0.12)' : 'var(--surface-subtle)',
              color: !isPutra ? '#E11D48' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 800,
              fontSize: '0.95rem',
              boxShadow: !isPutra ? '0 4px 14px rgba(225, 29, 72, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🚺</span>
              <span>Kategori Putri</span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: !isPutra ? '#E11D48' : 'var(--border-color)',
                color: !isPutra ? 'white' : 'var(--text-muted)',
                padding: '0.15rem 0.6rem',
                borderRadius: '9999px',
              }}
            >
              {putriTeams.length} Tim Terdaftar
            </span>
          </button>
        </div>
      </div>

      {/* Warning if fewer than 2 teams exist */}
      {activeTeams.length < 2 && (
        <div
          style={{
            backgroundColor: 'var(--warning-subtle)',
            border: '1px solid var(--warning)',
            color: 'var(--warning)',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontWeight: 800 }}>
            ⚠️ Tim {isPutra ? 'Putra' : 'Putri'} Kurang dari 2 Tim
          </div>
          <div>
            Hanya ada {activeTeams.length} tim {isPutra ? 'Putra' : 'Putri'} yang terdaftar. Minimal dibutuhkan 2 tim dalam kategori yang sama untuk menyelenggarakan pertandingan.
          </div>
          <Link
            href="/admin/teams"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.4rem 0.75rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.8rem',
              width: 'fit-content',
              marginTop: '0.25rem',
            }}
          >
            + Tambah Tim {isPutra ? 'Putra' : 'Putri'} di Menu Kelola Tim
          </Link>
        </div>
      )}

      {/* 2. NAMA PERTANDINGAN */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="name" className="metadata-text" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          Nama Pertandingan <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          key={`name-${selectedCategory}`}
          defaultValue={`Babak Penyisihan ${isPutra ? 'Putra' : 'Putri'} - Match 1`}
          placeholder={`Contoh: Babak Penyisihan ${isPutra ? 'Putra' : 'Putri'} - Match 1`}
          style={{
            padding: '0.75rem',
            borderRadius: '6px',
            border: `1.5px solid ${activeBorder}`,
            backgroundColor: 'var(--surface-subtle)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontWeight: 600,
          }}
        />
      </div>

      {/* 3. TEAMS SELECTION: TIM 1 & TIM 2 (HANYA KATEGORI TERPILIH) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: activeBgSubtle,
          border: `1.5px solid ${activeBorder}`,
          borderRadius: '10px',
          padding: '1.15rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: activeColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            ⚔️ Pilih Pasangan Tanding ({isPutra ? 'Putra vs Putra' : 'Putri vs Putri'})
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Hanya menampilkan tim {isPutra ? 'Putra' : 'Putri'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Tim 1 (Kiri) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="team_1_id" className="metadata-text" style={{ color: activeColor, fontWeight: 800 }}>
              Tim 1 (Sisi Kiri) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              id="team_1_id"
              name="team_1_id"
              value={team1Id}
              onChange={(e) => setTeam1Id(e.target.value)}
              required
              disabled={activeTeams.length === 0}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              <option value="">-- Pilih Tim 1 ({isPutra ? 'Putra' : 'Putri'}) --</option>
              {activeTeams.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === team2Id}>
                  {t.name} {t.id === team2Id ? '(Sudah dipilih sebagai Tim 2)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tim 2 (Kanan) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="team_2_id" className="metadata-text" style={{ color: activeColor, fontWeight: 800 }}>
              Tim 2 (Sisi Kanan) <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <select
              id="team_2_id"
              name="team_2_id"
              value={team2Id}
              onChange={(e) => setTeam2Id(e.target.value)}
              required
              disabled={activeTeams.length === 0}
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--surface-color)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              <option value="">-- Pilih Tim 2 ({isPutra ? 'Putra' : 'Putri'}) --</option>
              {activeTeams.map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === team1Id}>
                  {t.name} {t.id === team1Id ? '(Sudah dipilih sebagai Tim 1)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. GILIRAN MENYERANG PERTAMA KALI */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          backgroundColor: 'var(--surface-subtle)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <label className="metadata-text" style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
          Giliran Menyerang Pertama Kali (First Attacker):
        </label>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Pilih tim yang akan memegang giliran menyerang di awal pertandingan. Posisi serang dapat ditukar kapan saja saat terjadi pelanggaran (foul).
        </span>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700 }}>
            <input type="radio" name="first_attacker" value="team_1" defaultChecked />
            <span>Tim 1 (Sisi Kiri)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700 }}>
            <input type="radio" name="first_attacker" value="team_2" />
            <span>Tim 2 (Sisi Kanan)</span>
          </label>
        </div>
      </div>

      {/* 5. PENUGASAN PETUGAS SCORING */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="jury_1_id" className="metadata-text" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Scoring 1 (Area Depan/Awal) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select
            id="jury_1_id"
            name="jury_1_id"
            required
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
            }}
          >
            <option value="">Pilih Scoring...</option>
            {juries.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="jury_2_id" className="metadata-text" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Scoring 2 (Area Belakang/Akhir) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select
            id="jury_2_id"
            name="jury_2_id"
            required
            style={{
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
            }}
          >
            <option value="">Pilih Scoring...</option>
            {juries.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <Link
          href="/admin"
          style={{
            flex: 1,
            padding: '0.875rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-subtle)',
            color: 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '1rem',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
        >
          Batal
        </Link>

        <button
          type="submit"
          disabled={isPending || activeTeams.length < 2}
          style={{
            flex: 2,
            backgroundColor: activeTeams.length < 2 ? 'var(--surface-subtle)' : activeColor,
            color: activeTeams.length < 2 ? 'var(--text-muted)' : 'white',
            padding: '0.875rem',
            borderRadius: '8px',
            fontWeight: 800,
            fontSize: '1rem',
            border: 'none',
            cursor: isPending || activeTeams.length < 2 ? 'not-allowed' : 'pointer',
            opacity: isPending ? 0.7 : 1,
            boxShadow: activeTeams.length < 2 ? 'none' : `0 4px 14px ${activeColor}40`,
            transition: 'all 0.15s ease',
          }}
        >
          {isPending
            ? 'Membuat Pertandingan...'
            : `Buat Pertandingan ${isPutra ? 'Putra' : 'Putri'}`}
        </button>
      </div>
    </form>
  )
}
