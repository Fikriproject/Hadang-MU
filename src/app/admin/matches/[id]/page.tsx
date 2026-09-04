import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ControlRoom from './control-room'

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch match details with relations
  const { data: rawMatch, error } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      round,
      status,
      started_at,
      finished_at,
      team_attack_id,
      team_defense_id,
      jury_1_id,
      jury_2_id,
      team_attack:team_attack_id(id, name),
      team_defense:team_defense_id(id, name),
      jury_1:jury_1_id(id, name),
      jury_2:jury_2_id(id, name)
    `)
    .eq('id', id)
    .single()

  if (error || !rawMatch) {
    redirect('/admin')
  }

  // Fetch score events
  const { data: rawEvents } = await supabase
    .from('score_events')
    .select(`
      id,
      match_id,
      team_id,
      jury_id,
      event_type,
      points,
      status,
      created_at,
      cancelled_at,
      cancel_reason,
      jury:jury_id(name)
    `)
    .eq('match_id', id)
    .order('created_at', { ascending: false })

  return (
    <ControlRoom
      initialMatch={rawMatch as any}
      initialScoreEvents={(rawEvents || []) as any}
    />
  )
}
