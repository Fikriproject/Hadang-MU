import { createClient } from '@/lib/supabase/server'
import TeamManager, { TeamItem } from './team-manager'

export const metadata = {
  title: 'Kelola Tim Hadang (Putra & Putri)',
  description: 'Pengelompokan dan pendaftaran tim Hadang Putra dan Putri.',
}

export default async function TeamsPage() {
  const supabase = await createClient()
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false })

  return <TeamManager initialTeams={(teams as TeamItem[]) || []} />
}
