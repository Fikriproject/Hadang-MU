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
  const round = (formData.get('round') as string)?.trim() || 'Babak 1'
  const team_attack_id = formData.get('team_attack_id') as string
  const team_defense_id = formData.get('team_defense_id') as string
  const jury_1_id = formData.get('jury_1_id') as string
  const jury_2_id = formData.get('jury_2_id') as string

  // Simple validation
  if (!name || !team_attack_id || !team_defense_id || !jury_1_id || !jury_2_id) {
    return { error: 'Semua kolom wajib diisi kecuali ronde.' }
  }

  if (team_attack_id === team_defense_id) {
    return { error: 'Tim Penyerang dan Bertahan tidak boleh sama.' }
  }

  if (jury_1_id === jury_2_id) {
    return { error: 'Juri 1 dan Juri 2 tidak boleh sama.' }
  }

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
