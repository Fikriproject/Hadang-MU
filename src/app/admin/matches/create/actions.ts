'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type CreateMatchState = {
  error?: string
}

export async function createMatch(
  prevState: CreateMatchState | null,
  formData: FormData
): Promise<CreateMatchState> {
  const supabase = await createClient()
  
  const name = (formData.get('name') as string)?.trim()
  const team_1_id = ((formData.get('team_1_id') || formData.get('team_attack_id')) as string)?.trim()
  const team_2_id = ((formData.get('team_2_id') || formData.get('team_defense_id')) as string)?.trim()
  const first_attacker = formData.get('first_attacker') as string
  const jury_1_id = formData.get('jury_1_id') as string
  const jury_2_id = formData.get('jury_2_id') as string

  // Simple validation
  if (!name || !team_1_id || !team_2_id || !jury_1_id || !jury_2_id) {
    return { error: 'Semua kolom wajib diisi.' }
  }

  if (team_1_id === team_2_id) {
    return { error: 'Tim 1 dan Tim 2 tidak boleh sama.' }
  }

  if (jury_1_id === jury_2_id) {
    return { error: 'Scoring 1 dan Scoring 2 tidak boleh sama.' }
  }

  // Validate that both teams belong to the same category (Putra vs Putri separation)
  const { data: selectedTeams } = await supabase
    .from('teams')
    .select('id, name')
    .in('id', [team_1_id, team_2_id])

  if (selectedTeams && selectedTeams.length === 2) {
    const isPutri1 = selectedTeams[0].name.toLowerCase().includes('putri')
    const isPutri2 = selectedTeams[1].name.toLowerCase().includes('putri')
    if (isPutri1 !== isPutri2) {
      return { error: 'Tidak dapat membuat pertandingan silang antara Tim Putra dan Tim Putri. Pilih tim dalam kategori yang sama.' }
    }
  }

  const team_attack_id = first_attacker === 'team_2' ? team_2_id : team_1_id
  const team_defense_id = first_attacker === 'team_2' ? team_1_id : team_2_id
  
  // Store team_1_id as the anchor left team in round so devices always anchor team 1 on left
  const round = team_1_id

  const { data: newMatch, error } = await supabase
    .from('matches')
    .insert({
      name,
      round,
      team_attack_id,
      team_defense_id,
      jury_1_id,
      jury_2_id,
      status: 'READY'
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  redirect(`/admin/matches/${newMatch.id}`)
}
