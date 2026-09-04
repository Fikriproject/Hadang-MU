'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTeam(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const name = formData.get('name') as string

  if (!name || !name.trim()) return

  const { error } = await supabase.from('teams').insert({ name: name.trim() })

  if (error) {
    console.error('Error adding team:', error.message)
    return
  }

  revalidatePath('/admin/teams')
}

export async function deleteTeam(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const id = formData.get('id') as string

  if (!id) return

  const { error } = await supabase.from('teams').delete().eq('id', id)

  if (error) {
    console.error('Error deleting team:', error.message)
    return
  }

  revalidatePath('/admin/teams')
}
