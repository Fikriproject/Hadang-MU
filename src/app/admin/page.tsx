import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { detectMatchCategory, detectTeamCategory } from '@/lib/categories'
import AdminMatchesView, { type MatchWithRelations } from './admin-matches-view'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'ADMIN') {
    redirect('/jury')
  }

  // Fetch matches with relations & score events
  const { data: rawMatches } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      round,
      status,
      created_at,
      started_at,
      finished_at,
      team_attack:team_attack_id(id, name),
      team_defense:team_defense_id(id, name),
      jury_1:jury_1_id(id, name),
      jury_2:jury_2_id(id, name),
      score_events(id, team_id, points, status)
    `)
    .order('created_at', { ascending: false })

  const matches = (rawMatches || []) as unknown as MatchWithRelations[]

  // Fetch teams for detailed stats
  const { data: rawTeams } = await supabase
    .from('teams')
    .select('id, name')

  const teams = rawTeams || []
  const teamsPutra = teams.filter((t) => detectTeamCategory(t) === 'PUTRA')
  const teamsPutri = teams.filter((t) => detectTeamCategory(t) === 'PUTRI')

  // Compute category-separated match stats
  const matchesPutra = matches.filter((m) => detectMatchCategory(m) === 'PUTRA')
  const matchesPutri = matches.filter((m) => detectMatchCategory(m) === 'PUTRI')

  const liveMatches = matches.filter((m) => m.status === 'LIVE' || m.status === 'PAUSED')
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')

  const putraLive = matchesPutra.filter((m) => m.status === 'LIVE' || m.status === 'PAUSED').length
  const putraFinished = matchesPutra.filter((m) => m.status === 'FINISHED').length

  const putriLive = matchesPutri.filter((m) => m.status === 'LIVE' || m.status === 'PAUSED').length
  const putriFinished = matchesPutri.filter((m) => m.status === 'FINISHED').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="heading" style={{ fontSize: '1.875rem' }}>Dashboard Pertandingan</h1>
          <p className="metadata-text">Sistem Penilaian Hadang (Kategori Putra & Putri)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link
            href="/admin/matches/create"
            prefetch={false}
            style={{
              backgroundColor: 'var(--primary)',
              color: 'white',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s',
            }}
          >
            + Buat Pertandingan
          </Link>
          <Link
            href="/admin/teams"
            prefetch={false}
            style={{
              backgroundColor: 'var(--surface-color)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Kelola Tim ({teams.length})
          </Link>
        </div>
      </div>

      {/* Stats Overview: Pemisahan Total Pertandingan Putra & Putri */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.85rem' }}>
        {/* 1. Total Pertandingan */}
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            padding: '1.1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="metadata-text" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.72rem', fontWeight: 800 }}>
            Total Pertandingan
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {matches.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {liveMatches.length} Live • {finishedMatches.length} Selesai
          </div>
        </div>

        {/* 2. Kategori Putra */}
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            padding: '1.1rem',
            borderRadius: '10px',
            border: '1.5px solid #2563EB',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.72rem', fontWeight: 800, color: '#2563EB' }}>
              🚹 Match Putra
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              PUTRA
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.25rem', color: '#2563EB' }}>
            {matchesPutra.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {putraLive} Berjalan • {putraFinished} Selesai
          </div>
        </div>

        {/* 3. Kategori Putri */}
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            padding: '1.1rem',
            borderRadius: '10px',
            border: '1.5px solid #E11D48',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.72rem', fontWeight: 800, color: '#E11D48' }}>
              🚺 Match Putri
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, backgroundColor: 'rgba(225, 29, 72, 0.1)', color: '#E11D48', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              PUTRI
            </span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.25rem', color: '#E11D48' }}>
            {matchesPutri.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {putriLive} Berjalan • {putriFinished} Selesai
          </div>
        </div>

        {/* 4. Total Tim Terdaftar */}
        <div
          style={{
            backgroundColor: 'var(--surface-color)',
            padding: '1.1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <div className="metadata-text" style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.72rem', fontWeight: 800 }}>
            Total Tim
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 900, marginTop: '0.25rem', color: 'var(--text-primary)' }}>
            {teams.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {teamsPutra.length} Putra • {teamsPutri.length} Putri
          </div>
        </div>
      </div>

      {/* Matches List with Category Filter Tabs */}
      <AdminMatchesView initialMatches={matches} />
    </div>
  )
}
