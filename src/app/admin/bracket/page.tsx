import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBracket } from './actions'
import BracketView from './bracket-view'

export const metadata = {
  title: 'Bagan Pertandingan Turnamen (Putra & Putri) - Admin',
  description: 'Automasi persiapan pertandingan turnamen sistem gugur Hadang Putra dan Putri.',
}

export default async function AdminBracketPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const { bracket, categoryTeams } = await getBracket('PUTRA')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      <BracketView
        initialCategory="PUTRA"
        initialBracket={bracket}
        initialCategoryTeams={categoryTeams}
      />
    </div>
  )
}
