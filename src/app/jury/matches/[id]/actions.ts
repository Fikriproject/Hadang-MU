'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addJuryScore(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid. Silakan login kembali.' }
  }

  // Fetch current match to get team_attack_id and verify status
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('id, status, team_attack_id, jury_1_id, jury_2_id')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    return { error: 'Pertandingan tidak ditemukan.' }
  }

  if (match.status !== 'LIVE') {
    return { error: 'Pertandingan tidak sedang berlangsung (status: ' + match.status + ').' }
  }

  if (!match.team_attack_id) {
    return { error: 'Tim penyerang belum ditentukan.' }
  }

  // Insert score event
  const { data: newEvent, error: insertError } = await supabase
    .from('score_events')
    .insert({
      match_id: matchId,
      team_id: match.team_attack_id,
      jury_id: user.id,
      event_type: 'HADANG_POINT',
      points: 1,
      status: 'ACTIVE',
    })
    .select('id')
    .single()

  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/jury/matches/${matchId}`)
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)

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

  revalidatePath(`/jury/matches/${matchId}`)
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)

  return { success: true }
}
