import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import MatchForm from './match-form'

export default async function CreateMatchPage() {
  const supabase = await createClient()

  // Fetch teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .order('name')

  // Fetch juries
  const { data: juries } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('role', 'JURY')
    .order('name')

  // Fetch existing matches for sequential numbering
  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      round,
      created_at,
      team_attack:team_attack_id(id, name),
      team_defense:team_defense_id(id, name)
    `)
    .order('created_at', { ascending: true })

  return (
    <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Breadcrumb Back Navigation */}
      <div>
        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.4rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--surface-color)',
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <span>←</span>
          <span>Kembali ke Dashboard Admin</span>
        </Link>
      </div>

      <div>
        <h1 className="heading" style={{ fontSize: '1.75rem', margin: '0 0 0.25rem' }}>
          Buat Pertandingan
        </h1>
        <p className="metadata-text" style={{ margin: 0 }}>
          Jadwalkan pertandingan baru kategori Putra atau Putri dengan penugasan meja scoring.
        </p>
      </div>

      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <MatchForm teams={teams || []} juries={juries || []} existingMatches={matches || []} />
      </div>
    </div>
  )
}
