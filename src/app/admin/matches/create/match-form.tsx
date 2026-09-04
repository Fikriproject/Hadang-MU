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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="name" className="metadata-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          Nama Pertandingan
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          placeholder="Contoh: Final Putra - Pool A"
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="round" className="metadata-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          Babak / Ronde
        </label>
        <input
          type="text"
          id="round"
          name="round"
          defaultValue="Babak 1"
          placeholder="Contoh: Babak 1 / Babak 2"
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="team_attack_id" className="metadata-text" style={{ color: 'var(--success)', fontWeight: 700 }}>
            Tim Penyerang (Attack)
          </label>
          <select
            id="team_attack_id"
            name="team_attack_id"
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
            <option value="">Pilih Tim...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="team_defense_id" className="metadata-text" style={{ color: 'var(--danger)', fontWeight: 700 }}>
            Tim Bertahan (Defense)
          </label>
          <select
            id="team_defense_id"
            name="team_defense_id"
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
            <option value="">Pilih Tim...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="jury_1_id" className="metadata-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            Juri 1 (Area Depan/Awal)
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
            <option value="">Pilih Juri...</option>
            {juries.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="jury_2_id" className="metadata-text" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            Juri 2 (Area Belakang/Akhir)
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
            <option value="">Pilih Juri...</option>
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
          backgroundColor: isPending ? '#475569' : 'var(--primary)',
          color: 'white',
          padding: '1rem',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: isPending ? 'not-allowed' : 'pointer',
          marginTop: '1rem',
          fontSize: '1.125rem',
          letterSpacing: '0.05em',
          transition: 'background-color 0.2s',
        }}
      >
        {isPending ? 'MENYIMPAN...' : 'SIMPAN PERTANDINGAN'}
      </button>
    </form>
  )
}
