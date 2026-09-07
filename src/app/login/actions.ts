'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTarget = (formData.get('redirect') as string)?.trim()

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    const errorUrl =
      '/login?error=' +
      encodeURIComponent(error.message) +
      (redirectTarget && redirectTarget.startsWith('/')
        ? '&redirect=' + encodeURIComponent(redirectTarget)
        : '')
    return redirect(errorUrl)
  }

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  revalidatePath('/', 'layout')

  const isAdmin = profile?.role === 'ADMIN'

  if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
    if (redirectTarget.startsWith('/admin') && !isAdmin) {
      redirect('/jury')
    } else {
      redirect(redirectTarget)
    }
  }

  if (isAdmin) {
    redirect('/admin')
  } else {
    redirect('/jury')
  }
}
