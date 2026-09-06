'use client'

import AppNavHeader from './app-nav-header'

export default function JuryMobileNav({
  userName,
  userRole,
}: {
  userName: string
  userRole?: string
}) {
  return (
    <AppNavHeader
      userName={userName}
      userRole={userRole || 'JURY'}
      titleBadge="MEJA SCORING"
    />
  )
}
