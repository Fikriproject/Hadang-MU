import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ScoreboardView from './scoreboard-view'
import { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('name')
    .eq('id', id)
    .single()

  return {
    title: match ? `${match.name} - TV Scoreboard Hadang` : 'TV Scoreboard Hadang',
    description: 'Papan skor langsung pertandingan Hadang realtime.',
  }
}

export default async function TVScoreboardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch match details
  const { data: rawMatch, error } = await supabase
    .from('matches')
    .select(`
      id,
      name,
      round,
      status,
      started_at,
      finished_at,
      updated_at,
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
    notFound()
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
      jury:jury_id(name)
    `)
    .eq('match_id', id)
    .order('created_at', { ascending: false })

  return (
    <ScoreboardView
      initialMatch={rawMatch as any}
      initialScoreEvents={(rawEvents || []) as any}
    />
  )
}
