'use client'

import { useActionState } from 'react'
import { createMatch, type CreateMatchState } from './actions'

interface OptionItem {
  id: string
  name: string
}

interface MatchFormProps {
  teams: OptionItem[]
  juries: OptionItem[]
}

const initialState: CreateMatchState = {}

export default function MatchForm({ teams, juries }: MatchFormProps) {
  const [state, formAction, isPending] = useActionState(createMatch, initialState)

  const putraTeams = teams.filter((t) => !t.name.toLowerCase().includes('putri'))
  const putriTeams = teams.filter((t) => t.name.toLowerCase().includes('putri'))

  const renderTeamOptions = () => {
    if (putriTeams.length > 0 && putraTeams.length > 0) {
      return (
        <>
          <optgroup label="🚹 Tim Putra">
            {putraTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="🚺 Tim Putri">
            {putriTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </optgroup>
        </>
      )
    }
    return teams.map((t) => (
      <option key={t.id} value={t.id}>
        {t.name}
      </option>
    ))
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
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {state.error}
        </div>
      )}

      {/* Match Name */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="name" className="metadata-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          Nama Pertandingan <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          placeholder="Contoh: Babak Penyisihan - Match 1"
          style={{
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-subtle)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
          }}
        />
      </div>

      {/* Teams Selection: Tim 1 (Kiri) & Tim 2 (Kanan) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="team_1_id" className="metadata-text" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Tim 1 (Sisi Kiri) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select
            id="team_1_id"
            name="team_1_id"
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
            <option value="">Pilih Tim 1...</option>
            {renderTeamOptions()}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="team_2_id" className="metadata-text" style={{ color: '#E11D48', fontWeight: 700 }}>
            Tim 2 (Sisi Kanan) <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <select
            id="team_2_id"
            name="team_2_id"
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
            <option value="">Pilih Tim 2...</option>
            {renderTeamOptions()}
          </select>
        </div>
      </div>

      {/* First Attacker Choice */}
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
        <label className="metadata-text" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
          Giliran Menyerang Pertama Kali (First Attacker):
        </label>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Pilih tim yang akan memegang giliran menyerang di awal pertandingan. Posisi serang dapat ditukar kapan saja saat terjadi pelanggaran (foul).
        </span>
        <div style={{ display: 'flex', gap: '2rem', marginTop: '0.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
            <input type="radio" name="first_attacker" value="team_1" defaultChecked />
            <span>Tim 1 (Sisi Kiri)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
            <input type="radio" name="first_attacker" value="team_2" />
            <span>Tim 2 (Sisi Kanan)</span>
          </label>
        </div>
      </div>

      {/* Scoring Assignment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="jury_1_id" className="metadata-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
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
          <label htmlFor="jury_2_id" className="metadata-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
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

      <button
        type="submit"
        disabled={isPending}
        style={{
          backgroundColor: 'var(--primary)',
          color: 'white',
          padding: '0.875rem',
          borderRadius: '6px',
          fontWeight: 700,
          fontSize: '1rem',
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
          marginTop: '1rem',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
        }}
      >
        {isPending ? 'Membuat Pertandingan...' : 'Buat Pertandingan'}
      </button>
    </form>
  )
}
