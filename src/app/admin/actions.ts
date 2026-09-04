'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateMatchStatus(matchId: string, status: string) {
  const supabase = await createClient()

  let updateData: any = { status }
  
  if (status === 'LIVE') {
    // If it's the first time going live, set started_at
    const { data: match } = await supabase.from('matches').select('started_at').eq('id', matchId).single()
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
  return { success: true }
}
