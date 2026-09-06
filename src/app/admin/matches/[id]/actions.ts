'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMatchStatus(matchId: string, status: string) {
  const supabase = await createClient()

  const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() }

  if (status === 'LIVE') {
    const { data: match } = await supabase
      .from('matches')
      .select('started_at')
      .eq('id', matchId)
      .single()

    if (match && !match.started_at) {
      updateData.started_at = new Date().toISOString()
    }
  } else if (status === 'FINISHED') {
    updateData.finished_at = new Date().toISOString()
  }

  const { error } = await supabase.from('matches').update(updateData).eq('id', matchId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  return { success: true }
}

export async function toggleAttackingTeam(matchId: string, targetAttackingTeamId?: string) {
  const supabase = await createClient()

  // Fetch current attack and defense IDs
  const { data: match, error: fetchError } = await supabase
    .from('matches')
    .select('team_attack_id, team_defense_id')
    .eq('id', matchId)
    .single()

  if (fetchError || !match) {
    return { error: fetchError?.message || 'Pertandingan tidak ditemukan' }
  }

  let newAttackId = match.team_defense_id
  let newDefenseId = match.team_attack_id

  if (targetAttackingTeamId) {
    if (targetAttackingTeamId === match.team_attack_id) {
      return { success: true } // Sudah berstatus penyerang
    }
    newAttackId = targetAttackingTeamId
    newDefenseId = targetAttackingTeamId === match.team_attack_id ? match.team_defense_id : match.team_attack_id
  }

  const { error } = await supabase
    .from('matches')
    .update({
      team_attack_id: newAttackId,
      team_defense_id: newDefenseId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  revalidatePath(`/jury/matches/${matchId}`)
  return { success: true, newAttackId }
}

export async function swapTeams(matchId: string, _newRound?: string) {
  return toggleAttackingTeam(matchId)
}

export async function cancelScoreEvent(eventId: string, matchId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('score_events')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user?.id || null,
      cancel_reason: reason || 'Dibatalkan oleh Admin',
    })
    .eq('id', eventId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  return { success: true }
}

export async function manualAddScore(matchId: string, teamId: string, points: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase.from('score_events').insert({
    match_id: matchId,
    team_id: teamId,
    jury_id: user?.id || null,
    event_type: 'MANUAL_ADMIN',
    points: points,
    status: 'ACTIVE',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  return { success: true }
}
