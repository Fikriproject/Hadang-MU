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

  return (
    <div style={{ maxWidth: '640px' }}>
      <h1 className="heading" style={{ marginBottom: '2rem' }}>
        Buat Pertandingan
      </h1>

      <div
        style={{
          backgroundColor: 'var(--surface-color)',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <MatchForm teams={teams || []} juries={juries || []} />
      </div>
    </div>
  )
}
