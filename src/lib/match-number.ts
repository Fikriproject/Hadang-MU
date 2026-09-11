import { detectMatchCategory, type Category } from './categories'

export interface MatchSummary {
  id?: string
  name: string
  round?: string | null
  created_at?: string
  team_attack?: { id: string; name: string; category?: string | null } | { id: string; name: string }[] | null | any
  team_defense?: { id: string; name: string; category?: string | null } | { id: string; name: string }[] | null | any
}

/**
 * Calculates the next match number for a given category based on existing matches.
 * It looks for patterns like "Match X", "Pertandingan X", or trailing numbers,
 * and ensures the next number is strictly higher than both the maximum found number
 * and the count of matches in that category.
 */
export function getNextMatchNumber(matches: MatchSummary[], category: Category): number {
  const categoryMatches = matches.filter((m) => detectMatchCategory(m) === category)

  let maxNumber = 0
  let foundAnyNumber = false

  for (const match of categoryMatches) {
    if (!match.name) continue

    // 1. Check for "Match X" or "Pertandingan X"
    const matchRegex = /(?:match|pertandingan)\s*(\d+)/i
    const found = match.name.match(matchRegex)
    if (found && found[1]) {
      const parsed = parseInt(found[1], 10)
      if (!isNaN(parsed)) {
        foundAnyNumber = true
        if (parsed > maxNumber) {
          maxNumber = parsed
        }
      }
    } else {
      // 2. Check for any trailing number (e.g. "Babak Penyisihan 1")
      const trailingRegex = /\b(\d+)\s*$/
      const trailing = match.name.match(trailingRegex)
      if (trailing && trailing[1]) {
        const parsed = parseInt(trailing[1], 10)
        if (!isNaN(parsed)) {
          foundAnyNumber = true
          if (parsed > maxNumber) {
            maxNumber = parsed
          }
        }
      }
    }
  }

  // If any numbered match exists in this category, next is strictly maxNumber + 1
  if (foundAnyNumber && maxNumber > 0) {
    return maxNumber + 1
  }

  // Otherwise start after the count of matches in this category (or 1 if none)
  return categoryMatches.length + 1
}

/**
 * Generates standard default match name and quick presets
 */
export function getDefaultMatchName(category: Category, nextNumber: number): string {
  const categoryLabel = category === 'PUTRI' ? 'Putri' : 'Putra'
  return `Babak Penyisihan ${categoryLabel} - Match ${nextNumber}`
}

export function getMatchNamePresets(category: Category, nextNumber: number): string[] {
  const categoryLabel = category === 'PUTRI' ? 'Putri' : 'Putra'
  return [
    `Babak Penyisihan ${categoryLabel} - Match ${nextNumber}`,
    `Babak Penyisihan ${categoryLabel} - Pertandingan ${nextNumber}`,
    `Pertandingan ${nextNumber} (${categoryLabel})`,
    `Semifinal ${categoryLabel}`,
    `Final ${categoryLabel}`,
  ]
}
