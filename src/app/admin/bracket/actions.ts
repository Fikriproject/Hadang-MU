'use server'

import fs from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  type BracketCategory,
  type BracketData,
  type BracketLayoutMode,
  generateBracketStructure,
  shuffleArray,
  reconcileBracketWithDb,
  applyBracketMatchNumbering,
} from '@/lib/bracket'
import { detectTeamCategory } from '@/lib/categories'

const BRACKET_FILE = path.join(process.cwd(), 'src', 'data', 'brackets.json')

async function readBracketsStore(): Promise<Record<string, BracketData | null>> {
  try {
    const data = await fs.readFile(BRACKET_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (err) {
    return { PUTRA: null, PUTRI: null }
  }
}

async function writeBracketsStore(store: Record<string, BracketData | null>) {
  try {
    await fs.mkdir(path.dirname(BRACKET_FILE), { recursive: true })
    await fs.writeFile(BRACKET_FILE, JSON.stringify(store, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Gagal menyimpan file brackets ke filesystem (read-only environment):', err)
  }
}

export type BracketActionResult = {
  error?: string
  success?: boolean
  bracket?: BracketData
}

/**
 * Fetch bracket data for a category and reconcile with active DB matches
 */
export async function getBracket(category: BracketCategory) {
  try {
    const supabase = await createClient()

    // 1. Read stored bracket
    const store = await readBracketsStore()
    let bracket = store[category]

    // 2. Fetch all teams of this category
    const { data: rawTeams, error: teamsErr } = await supabase
      .from('teams')
      .select('id, name')
      .order('name')

    if (teamsErr) {
      console.warn('Warning: Gagal fetch teams untuk bracket:', teamsErr.message)
    }

    const allTeams = (rawTeams || []).filter((t) => detectTeamCategory(t) === category)

    // 3. Fetch matches to reconcile scores and winners
    const { data: rawMatches, error: matchesErr } = await supabase
      .from('matches')
      .select(`
        id,
        status,
        team_attack_id,
        team_defense_id,
        team_attack:team_attack_id(id, name),
        team_defense:team_defense_id(id, name),
        score_events(team_id, points, status)
      `)

    if (matchesErr) {
      console.warn('Warning: Gagal fetch matches untuk bracket:', matchesErr.message)
    }

    if (bracket) {
      bracket = applyBracketMatchNumbering(bracket)
    }

    if (bracket && rawMatches) {
      try {
        const reconciled = reconcileBracketWithDb(bracket, rawMatches as any)
        if (JSON.stringify(reconciled) !== JSON.stringify(bracket)) {
          bracket = reconciled
          store[category] = bracket
          await writeBracketsStore(store)
        }
      } catch (recErr) {
        console.warn('Warning: Gagal reconcile bracket dengan db:', recErr)
      }
    }

    // 4. Fetch available juries
    const { data: juries, error: juriesErr } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'JURY')
      .order('name')

    if (juriesErr) {
      console.warn('Warning: Gagal fetch juries untuk bracket:', juriesErr.message)
    }

    return {
      bracket,
      categoryTeams: allTeams,
      juries: juries || [],
    }
  } catch (err: any) {
    if (err?.digest === 'DYNAMIC_SERVER_USAGE' || err?.message?.includes('Dynamic server usage')) {
      throw err
    }
    console.error('Critical error in getBracket:', err)
    return {
      bracket: null,
      categoryTeams: [],
      juries: [],
    }
  }
}

/**
 * Auto-generate bracket by randomly shuffling registered teams
 */
export async function rollRandomBracket(
  category: BracketCategory,
  teamCount: 4 | 8 | 16,
  includeThirdPlace: boolean = true,
  layoutMode: BracketLayoutMode = 'CENTER_SPLIT'
): Promise<BracketActionResult> {
  const supabase = await createClient()

  const { data: rawTeams } = await supabase
    .from('teams')
    .select('id, name')
    .order('name')

  const availableTeams = (rawTeams || []).filter((t) => detectTeamCategory(t) === category)

  if (availableTeams.length < 2) {
    return {
      error: `Jumlah tim ${category === 'PUTRA' ? 'Putra' : 'Putri'} tidak cukup. Minimal 2 tim diperlukan (tersedia: ${availableTeams.length}).`,
    }
  }

  // Take up to teamCount teams, then shuffle them
  const pool = availableTeams.slice(0, teamCount)
  const shuffled = shuffleArray(pool)

  const bracket = generateBracketStructure(teamCount, category, shuffled, includeThirdPlace, layoutMode)

  const store = await readBracketsStore()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  return { success: true, bracket }
}

/**
 * Initialize manual bracket with empty/placeholder slots
 */
export async function createManualBracket(
  category: BracketCategory,
  teamCount: 4 | 8 | 16,
  includeThirdPlace: boolean = true,
  layoutMode: BracketLayoutMode = 'CENTER_SPLIT'
): Promise<BracketActionResult> {
  const bracket = generateBracketStructure(teamCount, category, undefined, includeThirdPlace, layoutMode)

  const store = await readBracketsStore()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  return { success: true, bracket }
}

/**
 * Switch layout mode between LEFT_TO_RIGHT and CENTER_SPLIT
 */
export async function updateBracketLayout(
  category: BracketCategory,
  layoutMode: BracketLayoutMode
): Promise<BracketActionResult> {
  const store = await readBracketsStore()
  let bracket = store[category]

  if (!bracket) return { error: 'Bagan belum dibuat.' }

  bracket.layoutMode = layoutMode
  bracket = applyBracketMatchNumbering(bracket)
  bracket.updatedAt = new Date().toISOString()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  return { success: true, bracket }
}

/**
 * Toggle whether the tournament includes a 3rd place match
 */
export async function updateIncludeThirdPlace(
  category: BracketCategory,
  includeThirdPlace: boolean
): Promise<BracketActionResult> {
  const store = await readBracketsStore()
  let bracket = store[category]

  if (!bracket) return { error: 'Bagan belum dibuat.' }

  bracket.includeThirdPlace = includeThirdPlace
  if (!includeThirdPlace) {
    bracket.thirdPlaceMatch = null
    bracket.thirdPlaceWinner = null
  } else if (!bracket.thirdPlaceMatch) {
    bracket.thirdPlaceMatch = {
      id: 'M-BRONZE',
      roundIndex: bracket.rounds.length - 1,
      matchIndex: 1,
      title: 'Perebutan Juara 3 (Bronze Match)',
      team1: { name: 'Kalah Semifinal 1', isPlaceholder: true },
      team2: { name: 'Kalah Semifinal 2', isPlaceholder: true },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
    }
  }

  bracket = applyBracketMatchNumbering(bracket)
  bracket.updatedAt = new Date().toISOString()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  return { success: true, bracket }
}

/**
 * Update team in a specific match slot (Edit Mode)
 */
export async function updateBracketSlot(
  category: BracketCategory,
  matchId: string,
  slot: 'team1' | 'team2',
  teamId: string,
  teamName: string
): Promise<BracketActionResult> {
  const store = await readBracketsStore()
  const bracket = store[category]

  if (!bracket) return { error: 'Bagan belum dibuat.' }
  if (bracket.isLocked) return { error: 'Bagan sedang terkunci. Buka kunci (Mode Edit) terlebih dahulu.' }

  let found = false
  for (const round of bracket.rounds) {
    const match = round.matches.find((m) => m.id === matchId)
    if (match) {
      if (slot === 'team1') {
        match.team1 = { id: teamId, name: teamName, isPlaceholder: false }
      } else {
        match.team2 = { id: teamId, name: teamName, isPlaceholder: false }
      }

      if (match.team1?.id && match.team2?.id) {
        match.status = 'READY'
      } else {
        match.status = 'WAITING'
      }
      found = true
      break
    }
  }

  // Check third place match slot if edited
  if (!found && bracket.thirdPlaceMatch && bracket.thirdPlaceMatch.id === matchId) {
    if (slot === 'team1') {
      bracket.thirdPlaceMatch.team1 = { id: teamId, name: teamName, isPlaceholder: false }
    } else {
      bracket.thirdPlaceMatch.team2 = { id: teamId, name: teamName, isPlaceholder: false }
    }
    if (bracket.thirdPlaceMatch.team1?.id && bracket.thirdPlaceMatch.team2?.id) {
      bracket.thirdPlaceMatch.status = 'READY'
    } else {
      bracket.thirdPlaceMatch.status = 'WAITING'
    }
  }

  bracket.updatedAt = new Date().toISOString()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  return { success: true, bracket }
}

/**
 * Toggle Lock/Edit mode
 */
export async function toggleBracketLock(category: BracketCategory, isLocked: boolean) {
  const store = await readBracketsStore()
  const bracket = store[category]

  if (!bracket) return { error: 'Bagan belum dibuat.' }

  bracket.isLocked = isLocked
  bracket.updatedAt = new Date().toISOString()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  return { success: true, isLocked }
}

/**
 * Generate a real Supabase match from a ready bracket match
 */
export async function generateMatchFromBracket(
  category: BracketCategory,
  bracketMatchId: string,
  team1Id: string,
  team2Id: string,
  matchTitle: string
) {
  const supabase = await createClient()

  // Get available juries for default assignment
  const { data: juries } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'JURY')
    .limit(2)

  const jury1Id = juries?.[0]?.id || null
  const jury2Id = juries?.[1]?.id || juries?.[0]?.id || null

  const matchName = `${matchTitle} (${category === 'PUTRA' ? 'Putra' : 'Putri'})`

  const { data: newMatch, error } = await supabase
    .from('matches')
    .insert({
      name: matchName,
      round: team1Id, // Anchor team1 on left
      team_attack_id: team1Id,
      team_defense_id: team2Id,
      jury_1_id: jury1Id,
      jury_2_id: jury2Id,
      status: 'READY',
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  // Link match to bracket
  const store = await readBracketsStore()
  const bracket = store[category]
  if (bracket) {
    let matched = false
    for (const round of bracket.rounds) {
      const match = round.matches.find((m) => m.id === bracketMatchId)
      if (match) {
        match.matchId = newMatch.id
        match.status = 'READY'
        matched = true
        break
      }
    }

    if (!matched && bracket.thirdPlaceMatch && bracket.thirdPlaceMatch.id === bracketMatchId) {
      bracket.thirdPlaceMatch.matchId = newMatch.id
      bracket.thirdPlaceMatch.status = 'READY'
    }

    await writeBracketsStore(store)
  }

  revalidatePath('/admin/bracket')
  revalidatePath('/admin')
  return { success: true, matchId: newMatch.id }
}

/**
 * Reset / Delete bracket for a category
 */
export async function resetBracket(category: BracketCategory) {
  const store = await readBracketsStore()
  store[category] = null
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  return { success: true }
}
