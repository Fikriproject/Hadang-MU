'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateMatchStatus(matchId: string, status: string, isStartingBabak2: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid. Silakan login kembali.' }
  }

  const adminClient = createAdminClient()

  // Fetch match details to verify assigned jury or admin
  const { data: match } = await adminClient
    .from('matches')
    .select('id, name, round, started_at, updated_at, status, jury_1_id, jury_2_id')
    .eq('id', matchId)
    .single()

  if (!match) {
    return { error: 'Pertandingan tidak ditemukan.' }
  }

  // Check admin role permission or assigned jury
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'ADMIN'
  const isAssignedJury = match.jury_1_id === user.id || match.jury_2_id === user.id

  if (!isAdmin && !isAssignedJury) {
    return { error: 'Anda tidak memiliki hak akses untuk mengubah status pertandingan ini.' }
  }

  const updateData: Record<string, any> = { status, updated_at: new Date().toISOString() }

  if (status === 'LIVE') {
    // Cek apakah ada pertandingan lain yang sedang berjalan (LIVE/PAUSED)
    const { data: activeMatches } = await adminClient
      .from('matches')
      .select('id, name, status')
      .in('status', ['LIVE', 'PAUSED'])
      .neq('id', matchId)
      .limit(1)

    if (activeMatches && activeMatches.length > 0) {
      const activeMatch = activeMatches[0]
      const statusLabel = activeMatch.status === 'LIVE' ? 'sedang berlangsung (LIVE)' : 'sedang dijeda (PAUSED)'
      return {
        error: `Tidak bisa memulai pertandingan ini. Pertandingan "${activeMatch.name}" ${statusLabel}. Selesaikan pertandingan tersebut terlebih dahulu.`
      }
    }

    if (isStartingBabak2 || match.round?.includes('BABAK_2_PENDING')) {
      // Mulai babak 2: Reset stopwatch started_at ke waktu sekarang dan tandai Babak 2 telah dimulai
      const anchorId = match.round ? match.round.split('::')[0] : ''
      const b1Match = match.round?.match(/::B1\[(.*?)\]/)
      const b1Suffix = b1Match ? `::B1[${b1Match[1]}]` : ''
      updateData.round = `${anchorId}::BABAK_2_STARTED${b1Suffix}`
      updateData.started_at = new Date().toISOString()
    } else if (!match.started_at) {
      updateData.started_at = new Date().toISOString()
    } else if (match.status === 'PAUSED' && match.updated_at) {
      // Shift started_at forward by the pause duration so active playing clock is preserved
      const pausedDurationMs = Math.max(0, Date.now() - new Date(match.updated_at).getTime())
      const newStartTime = new Date(new Date(match.started_at).getTime() + pausedDurationMs)
      updateData.started_at = newStartTime.toISOString()
    }
  } else if (status === 'FINISHED') {
    updateData.finished_at = new Date().toISOString()
  }

  const { error } = await adminClient.from('matches').update(updateData).eq('id', matchId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath('/jury')
  revalidatePath(`/jury/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  return { success: true }
}

export async function switchToBabak2(
  matchId: string,
  b1Summary?: {
    scoreLeft: number
    scoreRight: number
    duration: string
    endedAt?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid. Silakan login kembali.' }
  }

  const adminClient = createAdminClient()
  const { data: match, error: fetchErr } = await adminClient
    .from('matches')
    .select('id, round, jury_1_id, jury_2_id, status')
    .eq('id', matchId)
    .single()

  if (fetchErr || !match) {
    return { error: 'Pertandingan tidak ditemukan.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'ADMIN'
  const isAssignedJury = match.jury_1_id === user.id || match.jury_2_id === user.id

  if (!isAdmin && !isAssignedJury) {
    return { error: 'Hanya Admin atau Petugas Meja Scoring yang berwenang menukar babak pertandingan.' }
  }

  // Anchor tim kiri diambil dari round lama, tandai sebagai PENDING sampai tombol Mulai Babak 2 ditekan
  const anchorId = match.round ? match.round.split('::')[0] : ''
  const b1Match = match.round?.match(/::B1\[(.*?)\]/)
  const existingB1 = b1Match ? `::B1[${b1Match[1]}]` : ''
  const b1DataStr = b1Summary
    ? `::B1[${b1Summary.scoreLeft},${b1Summary.scoreRight},${b1Summary.duration},${b1Summary.endedAt || new Date().toISOString()}]`
    : existingB1
  const newRound = `${anchorId}::BABAK_2_PENDING${b1DataStr}`

  const { error } = await adminClient
    .from('matches')
    .update({
      status: 'PAUSED',
      round: newRound,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath('/jury')
  revalidatePath(`/jury/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  return { success: true }
}

export async function syncTvScoreboard(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid. Silakan login kembali.' }
  }

  const adminClient = createAdminClient()

  // Update match updated_at to force realtime listener on TV and clients to refetch everything
  const now = new Date().toISOString()
  const { error } = await adminClient
    .from('matches')
    .update({ updated_at: now })
    .eq('id', matchId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath('/jury')
  revalidatePath(`/jury/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  revalidatePath('/')

  return { success: true, timestamp: now }
}

export async function toggleAttackingTeam(matchId: string, targetAttackingTeamId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid. Silakan login kembali.' }
  }

  const adminClient = createAdminClient()

  // Fetch current attack and defense IDs
  const { data: match, error: fetchError } = await adminClient
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

  const { error } = await adminClient
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

  // Supabase Realtime automatically broadcasts matches UPDATE to TV, Admin, and Jury
  return { success: true, newAttackId }
}

export async function swapTeams(matchId: string, _newRound?: string) {
  return toggleAttackingTeam(matchId)
}

export async function cancelScoreEvent(eventId: string, matchId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid.' }
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('score_events')
    .update({
      status: 'CANCELLED',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancel_reason: reason || 'Dibatalkan oleh Pengawas/Scoring',
    })
    .eq('id', eventId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath('/jury')
  revalidatePath(`/jury/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  return { success: true }
}

export async function manualAddScore(matchId: string, teamId: string, points: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sesi login tidak valid.' }
  }

  const adminClient = createAdminClient()

  // Fetch current match to determine attacking team
  const { data: match } = await adminClient
    .from('matches')
    .select('team_attack_id')
    .eq('id', matchId)
    .single()

  const isAttacking = match?.team_attack_id === teamId

  const { error } = await adminClient.from('score_events').insert({
    match_id: matchId,
    team_id: teamId,
    jury_id: user.id,
    event_type: isAttacking ? 'MANUAL_ATTACK_POINT' : 'MANUAL_DEFENSE_POINT',
    points: points,
    status: 'ACTIVE',
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath(`/admin/matches/${matchId}`)
  revalidatePath('/jury')
  revalidatePath(`/jury/matches/${matchId}`)
  revalidatePath(`/tv/${matchId}`)
  return { success: true }
}
