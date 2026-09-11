'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addJuryScore(matchId: string, explicitTeamId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid. Silakan login kembali.' }
  }

  // Fetch current match to get team_attack_id and verify status
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, status, team_attack_id, team_defense_id, jury_1_id, jury_2_id')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    return { error: 'Pertandingan tidak ditemukan.' }
  }

  if (match.status !== 'LIVE') {
    return { error: 'Pertandingan tidak sedang berlangsung (status: ' + match.status + ').' }
  }

  // Use explicitly passed teamId if valid, otherwise fallback to team_attack_id
  let targetTeamId = match.team_attack_id
  if (explicitTeamId && (explicitTeamId === match.team_attack_id || explicitTeamId === match.team_defense_id)) {
    targetTeamId = explicitTeamId
  }

  if (!targetTeamId) {
    return { error: 'Tim penyerang belum ditentukan.' }
  }

  // Insert score event
  const { data: newEvent, error: insertError } = await supabase
    .from('score_events')
    .insert({
      match_id: matchId,
      team_id: targetTeamId,
      jury_id: user.id,
      event_type: targetTeamId === match.team_attack_id ? 'ATTACK_POINT' : 'DEFENSE_POINT',
      points: 1,
      status: 'ACTIVE',
    })
    .select('id')
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  // Note: We deliberately avoid heavy revalidatePath here because all clients
  // (Jury, Admin, TV) are connected via instant Supabase Realtime WebSockets.
  // Omitting revalidatePath avoids Next.js RSC flight payload network waterfalls.
  return { success: true, eventId: newEvent.id }
}

export async function cancelRecentScore(matchId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid.' }
  }

  // Find the most recent active event entered by this jury in this match
  const { data: lastEvent, error: findError } = await supabase
    .from('score_events')
    .select('id')
    .eq('match_id', matchId)
    .eq('jury_id', user.id)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (findError || !lastEvent) {
    return { error: 'Tidak ada poin aktif yang dapat dibatalkan.' }
  }

  // Update status to CANCELLED
  const { error: updateError } = await supabase
    .from('score_events')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancel_reason: reason || 'Kesalahan Teknis (Terpencet)',
    })
    .eq('id', lastEvent.id)

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: true }
}
