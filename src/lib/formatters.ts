/**
 * Formatting utilities for HadangMU
 */

/**
 * Strips redundant "(Juri 1)", "(Juri 2)", "[Juri 1]", etc. from jury names for clean display
 */
export function formatJuryDisplayName(name?: string | null): string {
  if (!name) return ''
  return name.replace(/\s*[\(\[]\s*juri\s*\d*\s*[\)\]]/gi, '').trim()
}
