'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addTeam(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const categoryRaw = formData.get('category') as string
  const category = categoryRaw?.toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA'

  if (!name || !name.trim()) {
    return { error: 'Nama tim tidak boleh kosong.' }
  }

  const cleanName = name.trim()

  // 1. Attempt to insert with explicit 'category' column
  const { error: insertErr } = await supabase.from('teams').insert({
    name: cleanName,
    category: category,
  })

  if (insertErr) {
    // If 'category' column does not exist yet on remote table, fallback to tagging the name
    if (
      insertErr.message.includes('category') ||
      insertErr.code === '42703' ||
      insertErr.code === 'PGRST204'
    ) {
      const lower = cleanName.toLowerCase()
      const hasTag = lower.includes('putra') || lower.includes('putri')
      const finalName = hasTag
        ? cleanName
        : `${cleanName} (${category === 'PUTRI' ? 'Putri' : 'Putra'})`

      const { error: fallbackErr } = await supabase.from('teams').insert({
        name: finalName,
      })

      if (fallbackErr) {
        console.error('Error adding team (fallback):', fallbackErr.message)
        return { error: fallbackErr.message }
      }
    } else {
      console.error('Error adding team:', insertErr.message)
      return { error: insertErr.message }
    }
  }

  revalidatePath('/admin/teams')
  revalidatePath('/admin/matches/create')
  return { success: true }
}

export async function deleteTeam(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()
  const id = formData.get('id') as string

  if (!id) {
    return { error: 'ID tim tidak valid.' }
  }

  const { error } = await supabase.from('teams').delete().eq('id', id)

  if (error) {
    console.error('Error deleting team:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/teams')
  revalidatePath('/admin/matches/create')
  return { success: true }
}
