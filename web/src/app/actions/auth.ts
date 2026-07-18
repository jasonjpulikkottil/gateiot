'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'

export async function login(prevState: any, formData: FormData) {
  const username = formData.get('username')
  const password = formData.get('password')

  if (!username) {
    return { error: 'Username is required' }
  }

  if (!password) {
    return { error: 'Password is required' }
  }

  if (username !== 'admin') {
    return { error: 'Invalid administrative identity' }
  }

  const db = supabaseService()
  const { data, error } = await db
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_password')
    .single()

  const adminPassword = data?.value || process.env.ADMIN_PASSWORD

  if (password === adminPassword) {
    // Set a session cookie
    const cookieStore = await cookies()
    cookieStore.set('gateiot_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })
    
    redirect('/')
  } else {
    return { error: 'Invalid password' }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('gateiot_session')
  redirect('/login')
}

export async function updatePassword(prevState: any, formData: FormData) {
  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'All fields are required' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New passwords do not match' }
  }

  const db = supabaseService()
  
  // Verify current password
  const { data: currentData } = await db
    .from('app_settings')
    .select('value')
    .eq('key', 'admin_password')
    .single()

  const adminPassword = currentData?.value || process.env.ADMIN_PASSWORD

  if (currentPassword !== adminPassword) {
    return { error: 'Incorrect current password' }
  }

  // Update password in DB
  const { error: updateError } = await db
    .from('app_settings')
    .upsert({ key: 'admin_password', value: newPassword, updated_at: new Date().toISOString() })

  if (updateError) {
    return { error: 'Failed to update password' }
  }

  return { success: 'Password updated successfully!' }
}
