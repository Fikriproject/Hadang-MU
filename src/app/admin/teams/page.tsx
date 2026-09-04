import { createClient } from '@/lib/supabase/server'
import { addTeam, deleteTeam } from './actions'

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 className="heading" style={{ marginBottom: '2rem' }}>
        Kelola Tim
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', height: 'fit-content' }}>
          <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Tambah Tim Baru</h2>
          <form action={addTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="name" className="metadata-text">Nama Tim</label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="Contoh: Garuda Muda"
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Simpan Tim
            </button>
          </form>
        </div>

        <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ marginBottom: '1rem' }}>Daftar Tim ({teams?.length ?? 0})</h2>
          {teams?.length === 0 ? (
            <p className="metadata-text">Belum ada tim yang terdaftar.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {teams?.map((team) => (
                <li key={team.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--surface-subtle)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontWeight: 600 }}>{team.name}</span>
                  <form action={deleteTeam}>
                    <input type="hidden" name="id" value={team.id} />
                    <button type="submit" style={{ color: 'var(--danger)', padding: '0.5rem', fontSize: '0.875rem', fontWeight: 'bold' }}>
                      Hapus
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
