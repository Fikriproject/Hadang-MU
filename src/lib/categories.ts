/**
 * Category detection utilities for Hadang Teams & Matches (Putra vs Putri)
 */

export type Category = 'PUTRA' | 'PUTRI'

export function detectTeamCategory(team?: { name: string; category?: string | null } | null): Category {
  if (!team) return 'PUTRA'
  if (team.category) {
    return team.category.toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA'
  }
  const lower = team.name.toLowerCase()
  if (lower.includes('(putri)') || lower.includes('[putri]') || lower.includes('putri')) {
    return 'PUTRI'
  }
  return 'PUTRA'
}

export function detectMatchCategory(match?: {
  name?: string
  team_attack?: { name: string; category?: string | null } | null
  team_defense?: { name: string; category?: string | null } | null
} | null): Category {
  if (!match) return 'PUTRA'
  if (match.team_attack && detectTeamCategory(match.team_attack) === 'PUTRI') return 'PUTRI'
  if (match.team_defense && detectTeamCategory(match.team_defense) === 'PUTRI') return 'PUTRI'
  if (match.name && match.name.toLowerCase().includes('putri')) return 'PUTRI'
  return 'PUTRA'
}

export function cleanTeamDisplayName(name: string): string {
  return name.trim()
}
