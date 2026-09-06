'use client'

import AppNavHeader from './app-nav-header'

export default function AdminMobileNav({ userName }: { userName: string }) {
  return <AppNavHeader userName={userName} userRole="ADMIN" titleBadge="ADMIN PANEL" />
}
