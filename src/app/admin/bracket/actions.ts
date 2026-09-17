'use server'

import fs from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  type BracketCategory,
  type BracketData,
  type BracketMatch,
  type BracketLayoutMode,
  generateBracketStructure,
  shuffleArray,
  reconcileBracketWithDb,
  applyBracketMatchNumbering,
  propagateByeMatches,
} from '@/lib/bracket'
import { detectTeamCategory } from '@/lib/categories'

const BRACKET_FILE = path.join(process.cwd(), 'src', 'data', 'brackets.json')
const BACKUP_BRACKET_FILE = path.join(process.cwd(), 'data', 'brackets.json')

// In-memory global store to preserve state across reloads/recompiles in dev & prod
declare global {
  // eslint-disable-next-line no-var
  var __hadang_brackets_store__: Record<string, BracketData | null> | undefined
  // eslint-disable-next-line no-var
  var __hadang_bracket_creation_locks__: Map<string, Promise<{ success?: boolean; matchId?: string; error?: string }>> | undefined
}

if (!globalThis.__hadang_brackets_store__) {
  globalThis.__hadang_brackets_store__ = { PUTRA: null, PUTRI: null }
}

if (!globalThis.__hadang_bracket_creation_locks__) {
  globalThis.__hadang_bracket_creation_locks__ = new Map()
}

async function readBracketsStore(): Promise<Record<string, BracketData | null>> {
  // 1. Check in-memory store
  if (
    globalThis.__hadang_brackets_store__ &&
    (globalThis.__hadang_brackets_store__.PUTRA !== null || globalThis.__hadang_brackets_store__.PUTRI !== null)
  ) {
    return globalThis.__hadang_brackets_store__
  }

  // 2. Try read primary file
  try {
    const data = await fs.readFile(BRACKET_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    if (parsed && typeof parsed === 'object') {
      globalThis.__hadang_brackets_store__ = {
        PUTRA: parsed.PUTRA ?? null,
        PUTRI: parsed.PUTRI ?? null,
      }
      return globalThis.__hadang_brackets_store__
    }
  } catch {
    // Try backup file
    try {
      const data = await fs.readFile(BACKUP_BRACKET_FILE, 'utf-8')
      const parsed = JSON.parse(data)
      if (parsed && typeof parsed === 'object') {
        globalThis.__hadang_brackets_store__ = {
          PUTRA: parsed.PUTRA ?? null,
          PUTRI: parsed.PUTRI ?? null,
        }
        return globalThis.__hadang_brackets_store__
      }
    } catch {
      // ignore
    }
  }

  return globalThis.__hadang_brackets_store__ || { PUTRA: null, PUTRI: null }
}

async function writeBracketsStore(store: Record<string, BracketData | null>) {
  // 1. Update in-memory global store immediately
  globalThis.__hadang_brackets_store__ = { ...store }

  const json = JSON.stringify(store, null, 2)

  // 2. Write to primary file
  try {
    await fs.mkdir(path.dirname(BRACKET_FILE), { recursive: true })
    await fs.writeFile(BRACKET_FILE, json, 'utf-8')
  } catch (err) {
    console.warn('Warning: Gagal menyimpan brackets.json primer:', err)
  }

  // 3. Write to backup file (outside src)
  try {
    await fs.mkdir(path.dirname(BACKUP_BRACKET_FILE), { recursive: true })
    await fs.writeFile(BACKUP_BRACKET_FILE, json, 'utf-8')
  } catch (err) {
    // ignore
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
        name,
        status,
        team_attack_id,
        team_defense_id,
        jury_1_id,
        jury_2_id,
        team_attack:team_attack_id(id, name),
        team_defense:team_defense_id(id, name),
        score_events(team_id, points, status, jury_id)
      `)

    if (matchesErr) {
      console.warn('Warning: Gagal fetch matches untuk bracket:', matchesErr.message)
    }

    if (bracket) {
      bracket = applyBracketMatchNumbering(bracket)
      bracket = propagateByeMatches(bracket)
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
    } else if (bracket) {
      store[category] = bracket
      await writeBracketsStore(store)
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
  teamCount: number,
  includeThirdPlace: boolean = true,
  layoutMode: BracketLayoutMode = 'CENTER_SPLIT',
  selectedTeamIds?: string[]
): Promise<BracketActionResult> {
  const supabase = await createClient()

  const { data: rawTeams } = await supabase
    .from('teams')
    .select('id, name')
    .order('name')

  let availableTeams = (rawTeams || []).filter((t) => detectTeamCategory(t) === category)

  // If specific team IDs were selected, filter by them
  if (selectedTeamIds && selectedTeamIds.length > 0) {
    const selectedSet = new Set(selectedTeamIds)
    availableTeams = availableTeams.filter((t) => selectedSet.has(t.id))
  }

  if (availableTeams.length < 2) {
    return {
      error: `Jumlah tim ${category === 'PUTRA' ? 'Putra' : 'Putri'} tidak cukup. Minimal 2 tim diperlukan (tersedia: ${availableTeams.length}).`,
    }
  }

  const requestedCount = Math.max(2, Math.min(32, teamCount || availableTeams.length))
  const pool = availableTeams.slice(0, requestedCount)
  const shuffled = shuffleArray(pool)

  const bracket = generateBracketStructure(requestedCount, category, shuffled, includeThirdPlace, layoutMode)

  const store = await readBracketsStore()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  revalidatePath('/bracket')
  return { success: true, bracket }
}

/**
 * Initialize manual bracket with empty/placeholder slots
 */
export async function createManualBracket(
  category: BracketCategory,
  teamCount: number,
  includeThirdPlace: boolean = true,
  layoutMode: BracketLayoutMode = 'CENTER_SPLIT'
): Promise<BracketActionResult> {
  const requestedCount = Math.max(2, Math.min(32, teamCount || 4))
  const bracket = generateBracketStructure(requestedCount, category, undefined, includeThirdPlace, layoutMode)

  const store = await readBracketsStore()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  revalidatePath('/bracket')
  return { success: true, bracket }
}

/**
 * Sync bracket data from client (e.g. from localStorage restoration or client state)
 */
export async function syncBracketToServer(
  category: BracketCategory,
  bracket: BracketData
): Promise<BracketActionResult> {
  if (!bracket || bracket.category !== category) {
    return { error: 'Data bagan tidak valid untuk disinkronkan.' }
  }

  bracket = propagateByeMatches(bracket)
  const store = await readBracketsStore()
  store[category] = bracket
  await writeBracketsStore(store)

  revalidatePath('/admin/bracket')
  revalidatePath('/bracket')
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
  let bracket = store[category]

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

  bracket = propagateByeMatches(bracket)
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
 * Generate a real Supabase match from a ready bracket match.
 * Dilengkapi concurrency lock dan proteksi idempotency agar tidak tercipta match ganda
 * meskipun tombol diklik 2 kali cepat atau diklik oleh 2 admin bersamaan.
 */
export async function generateMatchFromBracket(
  category: BracketCategory,
  bracketMatchId: string,
  team1Id: string,
  team2Id: string,
  matchTitle: string
): Promise<{ success?: boolean; matchId?: string; error?: string }> {
  const lockKey = `${category}::${bracketMatchId}`

  // 1. In-flight concurrency lock: cegah eksekusi paralel untuk bracketMatchId yang sama
  if (globalThis.__hadang_bracket_creation_locks__?.has(lockKey)) {
    return await globalThis.__hadang_bracket_creation_locks__.get(lockKey)!
  }

  const executionPromise = (async () => {
    try {
      const supabase = await createClient()

      // 2. Baca bracket store dan cari target match
      const store = await readBracketsStore()
      const bracket = store[category]
      if (!bracket) {
        return { error: 'Bagan belum dibuat.' }
      }

      let targetMatch: BracketMatch | undefined
      for (const round of bracket.rounds) {
        const m = round.matches.find((item) => item.id === bracketMatchId)
        if (m) {
          targetMatch = m
          break
        }
      }
      if (!targetMatch && bracket.thirdPlaceMatch && bracket.thirdPlaceMatch.id === bracketMatchId) {
        targetMatch = bracket.thirdPlaceMatch
      }

      if (!targetMatch) {
        return { error: 'Pertandingan bagan tidak ditemukan.' }
      }

      const actualTeam1Id = targetMatch.team1?.id || team1Id
      const actualTeam2Id = targetMatch.team2?.id || team2Id
      if (!actualTeam1Id || !actualTeam2Id) {
        return { error: 'Kedua tim harus terisi sebelum match dimulai.' }
      }

      // 3. Jika bracket match sudah memiliki matchId yang valid di DB, kembalikan langsung
      if (targetMatch.matchId) {
        const { data: existingLinked } = await supabase
          .from('matches')
          .select('id, status')
          .eq('id', targetMatch.matchId)
          .maybeSingle()

        if (existingLinked) {
          targetMatch.status = (existingLinked.status as any) || targetMatch.status
          await writeBracketsStore(store)
          revalidatePath('/admin/bracket')
          revalidatePath('/bracket')
          revalidatePath('/admin')
          return { success: true, matchId: existingLinked.id }
        }
      }

      // 4. Idempotency DB check: Periksa apakah match dengan judul/kategori ini sudah ada di Supabase
      const matchName = `${matchTitle} (${category === 'PUTRA' ? 'Putra' : 'Putri'})`
      const { data: existingMatches, error: searchErr } = await supabase
        .from('matches')
        .select('id, name, status, team_attack_id, team_defense_id, created_at')
        .eq('name', matchName)
        .order('created_at', { ascending: true })

      if (!searchErr && existingMatches && existingMatches.length > 0) {
        // Cari match yang timnya sesuai
        const matched =
          existingMatches.find((m) => {
            const hasTeam1 = m.team_attack_id === actualTeam1Id || m.team_defense_id === actualTeam1Id
            const hasTeam2 = m.team_attack_id === actualTeam2Id || m.team_defense_id === actualTeam2Id
            return hasTeam1 && hasTeam2
          }) || existingMatches[0]

        if (matched) {
          // Bersihkan match duplikat berstatus READY tanpa score events jika sebelumnya sempat tercipta
          if (existingMatches.length > 1) {
            const duplicatesToRemove = existingMatches.filter(
              (m) => m.id !== matched.id && m.status === 'READY'
            )
            for (const dup of duplicatesToRemove) {
              const { count } = await supabase
                .from('score_events')
                .select('id', { count: 'exact', head: true })
                .eq('match_id', dup.id)

              if (!count || count === 0) {
                await supabase.from('matches').delete().eq('id', dup.id)
              }
            }
          }

          targetMatch.matchId = matched.id
          targetMatch.status = (matched.status as any) || 'READY'
          await writeBracketsStore(store)
          revalidatePath('/admin/bracket')
          revalidatePath('/bracket')
          revalidatePath('/admin')
          return { success: true, matchId: matched.id }
        }
      }

      // 5. Belum ada match -> Buat tepat 1 match baru di Supabase
      const { data: juries } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'JURY')
        .limit(2)

      const jury1Id = juries?.[0]?.id || null
      const jury2Id = juries?.[1]?.id || juries?.[0]?.id || null

      const { data: newMatch, error: insertError } = await supabase
        .from('matches')
        .insert({
          name: matchName,
          round: actualTeam1Id, // Anchor team1 on left
          team_attack_id: actualTeam1Id,
          team_defense_id: actualTeam2Id,
          jury_1_id: jury1Id,
          jury_2_id: jury2Id,
          status: 'READY',
        })
        .select('id')
        .single()

      if (insertError) {
        return { error: insertError.message }
      }

      targetMatch.matchId = newMatch.id
      targetMatch.status = 'READY'
      await writeBracketsStore(store)

      revalidatePath('/admin/bracket')
      revalidatePath('/bracket')
      revalidatePath('/admin')
      return { success: true, matchId: newMatch.id }
    } catch (err: any) {
      console.error('Error generating match from bracket:', err)
      return { error: err?.message || 'Gagal membuat pertandingan.' }
    }
  })()

  if (!globalThis.__hadang_bracket_creation_locks__) {
    globalThis.__hadang_bracket_creation_locks__ = new Map()
  }
  globalThis.__hadang_bracket_creation_locks__.set(lockKey, executionPromise)

  try {
    return await executionPromise
  } finally {
    globalThis.__hadang_bracket_creation_locks__?.delete(lockKey)
  }
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
