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
  team_attack?: any
  team_defense?: any
} | null): Category {
  if (!match) return 'PUTRA'
  const tAttack = Array.isArray(match.team_attack) ? match.team_attack[0] : match.team_attack
  const tDefense = Array.isArray(match.team_defense) ? match.team_defense[0] : match.team_defense
  if (tAttack && detectTeamCategory(tAttack) === 'PUTRI') return 'PUTRI'
  if (tDefense && detectTeamCategory(tDefense) === 'PUTRI') return 'PUTRI'
  if (match.name && match.name.toLowerCase().includes('putri')) return 'PUTRI'
  return 'PUTRA'
}

export function cleanTeamDisplayName(name: string): string {
  return name.trim()
}

export { formatJuryDisplayName } from './formatters'
