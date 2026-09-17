export type BracketCategory = 'PUTRA' | 'PUTRI'
export type BracketLayoutMode = 'LEFT_TO_RIGHT' | 'CENTER_SPLIT'

export interface TeamSlot {
  id?: string | null
  name: string
  isPlaceholder?: boolean
  isBye?: boolean
}

export interface BracketMatch {
  id: string // e.g. "M1", "M2", "M-BRONZE"
  roundIndex: number
  matchIndex: number
  matchNumber?: number // Urutan pertandingan turnamen (1, 2, 3, ...)
  title: string
  team1: TeamSlot | null
  team2: TeamSlot | null
  score1: number | null
  score2: number | null
  matchId: string | null // Linked Supabase match ID
  status: 'WAITING' | 'READY' | 'LIVE' | 'PAUSED' | 'FINISHED'
  winnerTeamId: string | null
  loserTeamId?: string | null
  nextMatchId: string | null
  nextSlot?: 'team1' | 'team2'
  isTieBreak?: boolean
}

export interface BracketRound {
  name: string
  matches: BracketMatch[]
}

export interface BracketData {
  category: BracketCategory
  teamCount: number // Fleksibel: 2 s/d 32 tim
  bracketSize?: number // Ukuran bagan pangkat 2 terdekat (2, 4, 8, 16, 32)
  layoutMode: BracketLayoutMode
  includeThirdPlace: boolean
  isLocked: boolean
  rounds: BracketRound[]
  thirdPlaceMatch: BracketMatch | null
  champion: TeamSlot | null
  runnerUp: TeamSlot | null
  thirdPlaceWinner: TeamSlot | null
  updatedAt: string
}

/**
 * Fisher-Yates array shuffle algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Menghitung kapasitas ukuran bagan (pangkat 2 terdekat: 2, 4, 8, 16, 32)
 */
export function getBracketSize(teamCount: number): number {
  if (teamCount <= 2) return 2
  if (teamCount <= 4) return 4
  if (teamCount <= 8) return 8
  if (teamCount <= 16) return 16
  return 32
}

/**
 * Mendapatkan nama-nama ronde berdasarkan ukuran bagan
 */
export function getRoundNames(bracketSize: number): string[] {
  if (bracketSize === 2) return ['Final']
  if (bracketSize === 4) return ['Semifinal', 'Final']
  if (bracketSize === 8) return ['Perempat Final', 'Semifinal', 'Final']
  if (bracketSize === 16) return ['Babak 16 Besar', 'Perempat Final', 'Semifinal', 'Final']
  return ['Babak 32 Besar', 'Babak 16 Besar', 'Perempat Final', 'Semifinal', 'Final']
}

/**
 * Menentukan urutan indeks pertandingan Round 0 yang mendapatkan slot BYE.
 * Slot BYE diposisikan di ujung-ujung bagan (sudut terluar) agar seimbang
 * dan tidak bertumpuk di satu sisi/babak.
 *
 * Contoh kasus 4 BYE pada bagan 16 tim (8 match Round 0):
 * - Atas Kiri 1 (Index 0)
 * - Bawah Kanan 1 (Index 7)
 * - Bawah Kiri 1 (Index 3)
 * - Atas Kanan 1 (Index 4)
 * Menghasilkan tepat 1 BYE di Atas Kiri, 1 di Atas Kanan, 1 di Bawah Kiri, dan 1 di Bawah Kanan.
 */
export function getByeMatchOrder(
  round0MatchCount: number,
  layoutMode: BracketLayoutMode = 'CENTER_SPLIT'
): number[] {
  if (round0MatchCount <= 1) return [0]

  const result: number[] = []
  const seen = new Set<number>()

  const addIndex = (idx: number) => {
    if (idx >= 0 && idx < round0MatchCount && !seen.has(idx)) {
      seen.add(idx)
      result.push(idx)
    }
  }

  if (layoutMode === 'CENTER_SPLIT') {
    const half = Math.ceil(round0MatchCount / 2)

    // Tier 1: 4 Sudut terluar (Ujung-ujung bagan)
    // 1. Atas Kiri (0)
    // 2. Bawah Kanan (round0MatchCount - 1)
    // 3. Bawah Kiri (half - 1)
    // 4. Atas Kanan (half)
    addIndex(0)
    addIndex(round0MatchCount - 1)
    addIndex(half - 1)
    addIndex(half)

    // Tier 2: Pembagian simetris untuk slot BYE tambahan jika > 4
    if (round0MatchCount === 8) {
      // Sisa match di 8-match Round 0: 1, 2, 5, 6
      addIndex(2) // Tengah Bawah Kiri
      addIndex(5) // Tengah Atas Kanan
      addIndex(1) // Tengah Atas Kiri
      addIndex(6) // Tengah Bawah Kanan
    } else if (round0MatchCount === 16) {
      // 32-tim (16 match di Round 0)
      const secondaryCorners = [3, 12, 4, 11, 1, 14, 6, 9, 2, 13, 5, 10]
      for (const idx of secondaryCorners) {
        addIndex(idx)
      }
    }

    // Fallback sisa indeks dari luar ke dalam
    for (let i = 0; i < round0MatchCount; i++) {
      addIndex(i)
    }
  } else {
    // Layout LEFT_TO_RIGHT: Ujung Atas (0), Ujung Bawah (count - 1), lalu bergantian ke tengah
    addIndex(0)
    addIndex(round0MatchCount - 1)

    for (let i = 1; i < round0MatchCount / 2; i++) {
      addIndex(round0MatchCount - 1 - i)
      addIndex(i)
    }

    for (let i = 0; i < round0MatchCount; i++) {
      addIndex(i)
    }
  }

  return result
}

/**
 * Generates an empty or pre-populated knockout bracket structure for any team count (2 s/d 32 teams).
 * Mendukung slot BYE (lolos otomatis) jika jumlah tim bukan kelipatan 2 (misal 6 tim).
 */
export function generateBracketStructure(
  teamCount: number,
  category: BracketCategory,
  initialTeams?: { id: string; name: string }[],
  includeThirdPlace: boolean = true,
  layoutMode: BracketLayoutMode = 'CENTER_SPLIT'
): BracketData {
  const normalizedCount = Math.max(2, Math.min(32, teamCount || 4))
  const bracketSize = getBracketSize(normalizedCount)
  const roundNames = getRoundNames(bracketSize)
  const numRounds = roundNames.length
  const rounds: BracketRound[] = []
  let matchCounter = 1

  const roundMatchesMap: BracketMatch[][] = []
  const round0MatchCount = Math.pow(2, numRounds - 1)

  // Hitung jumlah slot BYE (jika tim terdaftar/dipilih kurang dari kapasitas bagan)
  const totalSlots = bracketSize
  const byesCount = Math.max(0, totalSlots - normalizedCount)

  // Distribusikan slot BYE di ujung-ujung bagan di Round 0 agar tidak bertumpuk
  const byeMatchIndices = new Set<number>()
  if (byesCount > 0) {
    const candidateOrder = getByeMatchOrder(round0MatchCount, layoutMode)
    for (let b = 0; b < byesCount && b < candidateOrder.length; b++) {
      byeMatchIndices.add(candidateOrder[b])
    }
  }

  let teamCursor = 0

  // 1. Buat ronde 0 s/d Final
  for (let r = 0; r < numRounds; r++) {
    const matchesInRoundCount = Math.pow(2, numRounds - 1 - r)
    const matches: BracketMatch[] = []

    for (let m = 0; m < matchesInRoundCount; m++) {
      const matchId = `M${matchCounter++}`
      const matchTitle = `${roundNames[r]} ${matchesInRoundCount > 1 ? m + 1 : ''}`.trim()

      let team1: TeamSlot | null = null
      let team2: TeamSlot | null = null

      if (r === 0) {
        const isByeMatch = byeMatchIndices.has(m)

        if (initialTeams && initialTeams.length > 0) {
          if (teamCursor < initialTeams.length) {
            team1 = { id: initialTeams[teamCursor].id, name: initialTeams[teamCursor].name, isPlaceholder: false }
            teamCursor++
          }

          if (isByeMatch) {
            team2 = { name: 'BYE (Lolos Otomatis)', isPlaceholder: true, isBye: true }
          } else if (teamCursor < initialTeams.length) {
            team2 = { id: initialTeams[teamCursor].id, name: initialTeams[teamCursor].name, isPlaceholder: false }
            teamCursor++
          }
        } else {
          // Manual Mode
          if (isByeMatch) {
            team1 = { name: 'Pilih Tim', isPlaceholder: true }
            team2 = { name: 'BYE (Lolos Otomatis)', isPlaceholder: true, isBye: true }
          } else {
            team1 = { name: 'Pilih Tim', isPlaceholder: true }
            team2 = { name: 'Pilih Tim', isPlaceholder: true }
          }
        }

        const hasBye = isByeMatch && team2?.isBye
        const isFinishedByBye = hasBye && !!team1?.id

        matches.push({
          id: matchId,
          roundIndex: r,
          matchIndex: m,
          title: matchTitle,
          team1,
          team2,
          score1: isFinishedByBye ? 1 : null,
          score2: isFinishedByBye ? 0 : null,
          matchId: null,
          status: isFinishedByBye ? 'FINISHED' : (team1?.id && team2?.id ? 'READY' : 'WAITING'),
          winnerTeamId: isFinishedByBye ? team1!.id! : null,
          loserTeamId: null,
          nextMatchId: null,
        })
      } else {
        // Ronde 1 ke atas (placeholder pemenang)
        team1 = { name: 'Pemenang Match', isPlaceholder: true }
        team2 = { name: 'Pemenang Match', isPlaceholder: true }

        matches.push({
          id: matchId,
          roundIndex: r,
          matchIndex: m,
          title: matchTitle,
          team1,
          team2,
          score1: null,
          score2: null,
          matchId: null,
          status: 'WAITING',
          winnerTeamId: null,
          loserTeamId: null,
          nextMatchId: null,
        })
      }
    }

    roundMatchesMap.push(matches)
  }

  // 2. Hubungkan parent ronde berikutnya
  for (let r = 0; r < numRounds - 1; r++) {
    const currentRound = roundMatchesMap[r]
    const nextRound = roundMatchesMap[r + 1]

    for (let m = 0; m < currentRound.length; m++) {
      const nextMatchIndex = Math.floor(m / 2)
      const nextSlot = m % 2 === 0 ? 'team1' : 'team2'
      const nextMatch = nextRound[nextMatchIndex]

      if (nextMatch) {
        currentRound[m].nextMatchId = nextMatch.id
        currentRound[m].nextSlot = nextSlot

        // Jika match ini menang karena BYE, langsung masukkan pemenang ke ronde berikutnya!
        if (currentRound[m].status === 'FINISHED' && currentRound[m].winnerTeamId && currentRound[m].team1) {
          if (nextSlot === 'team1') {
            nextMatch.team1 = { id: currentRound[m].team1!.id, name: currentRound[m].team1!.name, isPlaceholder: false }
          } else {
            nextMatch.team2 = { id: currentRound[m].team1!.id, name: currentRound[m].team1!.name, isPlaceholder: false }
          }
          if (nextMatch.team1?.id && nextMatch.team2?.id) {
            nextMatch.status = 'READY'
          }
        } else {
          if (nextSlot === 'team1' && nextMatch.team1?.isPlaceholder) {
            nextMatch.team1.name = `Pemenang ${currentRound[m].id}`
          } else if (nextSlot === 'team2' && nextMatch.team2?.isPlaceholder) {
            nextMatch.team2.name = `Pemenang ${currentRound[m].id}`
          }
        }
      }
    }
  }

  // Assemble final rounds
  for (let r = 0; r < numRounds; r++) {
    rounds.push({
      name: roundNames[r],
      matches: roundMatchesMap[r],
    })
  }

  // Third place match (hanya jika ada semifinal, yaitu minimal 2 ronde / 4 tim)
  let thirdPlaceMatch: BracketMatch | null = null
  const canHaveThirdPlace = includeThirdPlace && numRounds >= 2
  if (canHaveThirdPlace) {
    thirdPlaceMatch = {
      id: 'M-BRONZE',
      roundIndex: numRounds - 1,
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

  const bracketData: BracketData = {
    category,
    teamCount: normalizedCount,
    bracketSize,
    layoutMode,
    includeThirdPlace: canHaveThirdPlace,
    isLocked: false,
    rounds,
    thirdPlaceMatch,
    champion: null,
    runnerUp: null,
    thirdPlaceWinner: null,
    updatedAt: new Date().toISOString(),
  }

  return propagateByeMatches(applyBracketMatchNumbering(bracketData))
}

/**
 * Mengisi/memperbarui penomoran pertandingan (matchNumber), ID, dan Title:
 * Khusus layout CENTER_SPLIT (Kanan-Kiri ke Tengah Silang):
 * - Jika Match 1 di Kanan Atas, maka Match 2 di Kiri Bawah, Match 3 di Kanan Bawah/berikutnya, Match 4 di Kiri Atas/berikutnya, dst.
 * - Semifinal Kanan: Match berikutnya
 * - Semifinal Kiri: Match berikutnya
 * - Perebutan Juara 3 (Bronze): Match sebelum Final (jika ada)
 * - Final: Match terakhir puncak turnamen
 */
export function applyBracketMatchNumbering(bracket: BracketData): BracketData {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return bracket

  const numRounds = bracket.rounds.length
  const finalRoundIndex = numRounds - 1
  let currentMatchNumber = 1

  if (bracket.layoutMode === 'CENTER_SPLIT') {
    // 1. Ronde-ronde sebelum Final (Round 0 s/d Semifinal)
    for (let r = 0; r < finalRoundIndex; r++) {
      const round = bracket.rounds[r]
      const matches = round.matches
      const count = matches.length
      const half = Math.ceil(count / 2)

      // Silang: Kanan (atas ke bawah) & Kiri (bawah ke atas)
      for (let i = 0; i < half; i++) {
        // Kanan: index half + i
        const rightMatchIndex = half + i
        if (rightMatchIndex < count) {
          const mRight = matches[rightMatchIndex]
          const mNum = currentMatchNumber++
          mRight.matchNumber = mNum
          mRight.id = `M${mNum}`
          const isSemi = r === finalRoundIndex - 1
          const stageName = isSemi ? 'Semifinal 2 (Kanan)' : `${round.name} (Kanan)`
          mRight.title = `Match ${mNum} • ${stageName}`
        }

        // Kiri: index (half - 1) - i
        const leftMatchIndex = half - 1 - i
        if (leftMatchIndex >= 0) {
          const mLeft = matches[leftMatchIndex]
          const mNum = currentMatchNumber++
          mLeft.matchNumber = mNum
          mLeft.id = `M${mNum}`
          const isSemi = r === finalRoundIndex - 1
          const stageName = isSemi ? 'Semifinal 1 (Kiri)' : `${round.name} (Kiri)`
          mLeft.title = `Match ${mNum} • ${stageName}`
        }
      }
    }

    // 2. Perebutan Juara 3 (Bronze Match) jika diikutsertakan
    if (bracket.includeThirdPlace && bracket.thirdPlaceMatch) {
      const bronzeNum = currentMatchNumber++
      bracket.thirdPlaceMatch.matchNumber = bronzeNum
      bracket.thirdPlaceMatch.id = `M${bronzeNum}`
      bracket.thirdPlaceMatch.title = `Match ${bronzeNum} • Perebutan Juara 3`
    }

    // 3. Final Match
    const finalRound = bracket.rounds[finalRoundIndex]
    if (finalRound && finalRound.matches.length > 0) {
      const finalMatch = finalRound.matches[0]
      const finalNum = currentMatchNumber++
      finalMatch.matchNumber = finalNum
      finalMatch.id = `M${finalNum}`
      finalMatch.title = `Match ${finalNum} • FINAL`
    }
  } else {
    // Layout LEFT_TO_RIGHT: Penomoran lurus berurutan dari atas ke bawah
    for (let r = 0; r < finalRoundIndex; r++) {
      const round = bracket.rounds[r]
      for (let m = 0; m < round.matches.length; m++) {
        const match = round.matches[m]
        const mNum = currentMatchNumber++
        match.matchNumber = mNum
        match.id = `M${mNum}`
        match.title = `Match ${mNum} • ${round.name} ${round.matches.length > 1 ? m + 1 : ''}`.trim()
      }
    }

    if (bracket.includeThirdPlace && bracket.thirdPlaceMatch) {
      const bronzeNum = currentMatchNumber++
      bracket.thirdPlaceMatch.matchNumber = bronzeNum
      bracket.thirdPlaceMatch.id = `M${bronzeNum}`
      bracket.thirdPlaceMatch.title = `Match ${bronzeNum} • Perebutan Juara 3`
    }

    const finalRound = bracket.rounds[finalRoundIndex]
    if (finalRound && finalRound.matches.length > 0) {
      const finalMatch = finalRound.matches[0]
      const finalNum = currentMatchNumber++
      finalMatch.matchNumber = finalNum
      finalMatch.id = `M${finalNum}`
      finalMatch.title = `Match ${finalNum} • FINAL`
    }
  }

  // 4. Perbarui koneksi parent (nextMatchId dan nama placeholder)
  for (let r = 0; r < numRounds - 1; r++) {
    const currentRound = bracket.rounds[r]
    const nextRound = bracket.rounds[r + 1]

    for (let m = 0; m < currentRound.matches.length; m++) {
      const nextMatchIndex = Math.floor(m / 2)
      const nextSlot = m % 2 === 0 ? 'team1' : 'team2'
      const nextMatch = nextRound.matches[nextMatchIndex]

      if (nextMatch) {
        currentRound.matches[m].nextMatchId = nextMatch.id
        currentRound.matches[m].nextSlot = nextSlot

        const winPlaceholder = `Pemenang Match ${currentRound.matches[m].matchNumber || currentRound.matches[m].id}`
        if (nextSlot === 'team1' && nextMatch.team1?.isPlaceholder) {
          nextMatch.team1.name = winPlaceholder
        } else if (nextSlot === 'team2' && nextMatch.team2?.isPlaceholder) {
          nextMatch.team2.name = winPlaceholder
        }
      }
    }
  }

  // 5. Update nama placeholder di Perebutan Juara 3
  if (bracket.includeThirdPlace && bracket.thirdPlaceMatch && numRounds >= 2) {
    const semiRound = bracket.rounds[numRounds - 2]
    if (semiRound && semiRound.matches.length >= 2) {
      const semi1Match = semiRound.matches[0]
      const semi2Match = semiRound.matches[1]
      if (bracket.thirdPlaceMatch.team1?.isPlaceholder) {
        bracket.thirdPlaceMatch.team1.name = `Kalah Match ${semi1Match.matchNumber || 'Semi 1'}`
      }
      if (bracket.thirdPlaceMatch.team2?.isPlaceholder) {
        bracket.thirdPlaceMatch.team2.name = `Kalah Match ${semi2Match.matchNumber || 'Semi 2'}`
      }
    }
  }

  return bracket
}

/**
 * Memastikan semua pertandingan yang memiliki slot BYE (Lolos Otomatis)
 * secara otomatis berstatus FINISHED dan memajukan tim pemenang ke ronde berikutnya.
 */
export function propagateByeMatches(bracket: BracketData): BracketData {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return bracket

  const matchMap = new Map<string, BracketMatch>()
  for (const round of bracket.rounds) {
    for (const bm of round.matches) {
      matchMap.set(bm.id, bm)
    }
  }

  for (let r = 0; r < bracket.rounds.length; r++) {
    const round = bracket.rounds[r]
    for (const bm of round.matches) {
      const hasBye1 = bm.team1?.isBye
      const hasBye2 = bm.team2?.isBye

      if (hasBye1 || hasBye2) {
        const realTeam = bm.team1?.id && !hasBye1
          ? bm.team1
          : bm.team2?.id && !hasBye2
          ? bm.team2
          : null

        if (realTeam) {
          bm.status = 'FINISHED'
          bm.winnerTeamId = realTeam.id!
          bm.score1 = bm.team1?.id ? 1 : 0
          bm.score2 = bm.team2?.id ? 1 : 0

          // Majukan tim pemenang ke slot di ronde berikutnya
          if (bm.nextMatchId) {
            const nextMatch = matchMap.get(bm.nextMatchId)
            if (nextMatch) {
              const advancedTeam: TeamSlot = {
                id: realTeam.id,
                name: realTeam.name,
                isPlaceholder: false,
              }

              if (bm.nextSlot === 'team1') {
                nextMatch.team1 = advancedTeam
              } else {
                nextMatch.team2 = advancedTeam
              }

              if (nextMatch.team1?.id && nextMatch.team2?.id) {
                if (nextMatch.status === 'WAITING') {
                  nextMatch.status = 'READY'
                }
              }
            }
          }
        } else {
          // Jika belum ada tim yang dipilih untuk slot melawan BYE
          bm.status = 'WAITING'
          bm.winnerTeamId = null
          bm.score1 = null
          bm.score2 = null
        }
      }
    }
  }

  return bracket
}

/**
 * Reconciles and auto-advances winners through the bracket
 * by checking real match scores and status from Supabase.
 */
export function reconcileBracketWithDb(
  bracket: BracketData,
  dbMatches: {
    id: string
    name?: string
    status: string
    team_attack_id: string
    team_defense_id: string
    jury_1_id?: string | null
    jury_2_id?: string | null
    team_attack?: { id: string; name: string } | null
    team_defense?: { id: string; name: string } | null
    score_events?: { team_id: string; points: number; status: string; jury_id?: string | null }[]
  }[]
): BracketData {
  const updatedBracket: BracketData = JSON.parse(JSON.stringify(bracket))

  // Ensure layoutMode & includeThirdPlace have defaults if missing in old json
  if (!updatedBracket.layoutMode) updatedBracket.layoutMode = 'CENTER_SPLIT'
  if (updatedBracket.includeThirdPlace === undefined) updatedBracket.includeThirdPlace = true

  // Pastikan penomoran silang matchNumber & title terbaru diaplikasikan
  applyBracketMatchNumbering(updatedBracket)

  // Otomatis majukan semua pertandingan yang menang via BYE
  propagateByeMatches(updatedBracket)

  const matchMap = new Map<string, BracketMatch>()

  // Index all bracket matches
  for (const round of updatedBracket.rounds) {
    for (const bm of round.matches) {
      matchMap.set(bm.id, bm)
    }
  }

  const numRounds = updatedBracket.rounds.length
  const semifinalRoundIndex = numRounds >= 2 ? numRounds - 2 : -1
  const semifinalLosers: { slot: 'team1' | 'team2'; loser: TeamSlot }[] = []

  // Process rounds in sequential order (from round 0 to final)
  for (let r = 0; r < numRounds; r++) {
    const round = updatedBracket.rounds[r]

    for (let m = 0; m < round.matches.length; m++) {
      const bm = round.matches[m]

      // Auto-reconnect DB match if bm.matchId is missing but match was created in Supabase
      if (!bm.matchId && bm.team1?.id && bm.team2?.id) {
        const expectedName = `${bm.title} (${bracket.category === 'PUTRA' ? 'Putra' : 'Putri'})`
        const matchedDb = dbMatches.find((dm) => {
          const nameMatches = dm.name && dm.name.trim().toLowerCase() === expectedName.trim().toLowerCase()
          if (nameMatches) {
            const hasTeam1 = dm.team_attack_id === bm.team1!.id || dm.team_defense_id === bm.team1!.id
            const hasTeam2 = dm.team_attack_id === bm.team2!.id || dm.team_defense_id === bm.team2!.id
            return hasTeam1 && hasTeam2
          }
          return false
        })
        if (matchedDb) {
          bm.matchId = matchedDb.id
        }
      }

      // Find linked DB match
      if (bm.matchId) {
        const dbM = dbMatches.find((matchItem) => matchItem.id === bm.matchId)
        if (dbM) {
          bm.status = dbM.status as any

          // Calculate current scores
          const activeEvents = dbM.score_events?.filter((e) => e.status === 'ACTIVE') || []
          const s1 = bm.team1?.id
            ? activeEvents.filter((e) => e.team_id === bm.team1!.id).reduce((s, e) => s + e.points, 0)
            : 0
          const s2 = bm.team2?.id
            ? activeEvents.filter((e) => e.team_id === bm.team2!.id).reduce((s, e) => s + e.points, 0)
            : 0

          bm.score1 = s1
          bm.score2 = s2

          // If match is finished, determine winner and loser
          if (dbM.status === 'FINISHED' && bm.team1?.id && bm.team2?.id) {
            let winner: TeamSlot
            let loser: TeamSlot

            if (s1 > s2) {
              winner = bm.team1
              loser = bm.team2
            } else if (s2 > s1) {
              winner = bm.team2
              loser = bm.team1
            } else {
              // Validasi Kondisi Nilai Seri (s1 === s2):
              // Sesuai aturan Hadang: Pemenang ditentukan dari regu yang memperoleh skor garis depan tertinggi
              const isBelakang = (e: any) => (dbM.jury_2_id ? e.jury_id === dbM.jury_2_id : false)
              const isDepan = (e: any) => (dbM.jury_1_id ? e.jury_id === dbM.jury_1_id : !isBelakang(e))

              const depan1 = activeEvents
                .filter((e) => e.team_id === bm.team1!.id && isDepan(e))
                .reduce((s, e) => s + e.points, 0)
              const depan2 = activeEvents
                .filter((e) => e.team_id === bm.team2!.id && isDepan(e))
                .reduce((s, e) => s + e.points, 0)

              if (depan1 > depan2) {
                winner = bm.team1
                loser = bm.team2
              } else if (depan2 > depan1) {
                winner = bm.team2
                loser = bm.team1
              } else {
                // Jika skor depan sama persis, fallback ke tim penyerang awal
                if (dbM.team_attack_id === bm.team1.id) {
                  winner = bm.team1
                  loser = bm.team2
                } else {
                  winner = bm.team2
                  loser = bm.team1
                }
              }
            }

            bm.winnerTeamId = winner.id!
            bm.loserTeamId = loser.id!
            bm.isTieBreak = s1 === s2

            // If this was a semifinal match, track loser for the third place match
            if (r === semifinalRoundIndex) {
              semifinalLosers.push({
                slot: m === 0 ? 'team1' : 'team2',
                loser: { id: loser.id, name: loser.name, isPlaceholder: false },
              })
            }

            // Advance winner to next match if there is a next round
            if (bm.nextMatchId && winner) {
              const nextMatch = matchMap.get(bm.nextMatchId)
              if (nextMatch) {
                if (bm.nextSlot === 'team1') {
                  nextMatch.team1 = { id: winner.id, name: winner.name, isPlaceholder: false }
                } else {
                  nextMatch.team2 = { id: winner.id, name: winner.name, isPlaceholder: false }
                }

                if (nextMatch.team1?.id && nextMatch.team2?.id) {
                  if (nextMatch.status === 'WAITING') {
                    nextMatch.status = 'READY'
                  }
                }
              }
            } else if (!bm.nextMatchId && winner) {
              // This was the FINAL MATCH!
              updatedBracket.champion = winner
              updatedBracket.runnerUp = loser
            }
          }
        } else {
          // Linked DB match was deleted, reset match link safely
          bm.matchId = null
          bm.score1 = null
          bm.score2 = null
          bm.status = bm.team1?.id && bm.team2?.id ? 'READY' : 'WAITING'
          bm.winnerTeamId = null
          bm.loserTeamId = null
        }
      }
    }
  }

  // Populate Third Place Match with Semifinal losers
  if (updatedBracket.includeThirdPlace && updatedBracket.thirdPlaceMatch) {
    for (const sl of semifinalLosers) {
      if (sl.slot === 'team1') {
        updatedBracket.thirdPlaceMatch.team1 = sl.loser
      } else {
        updatedBracket.thirdPlaceMatch.team2 = sl.loser
      }
    }

    if (
      updatedBracket.thirdPlaceMatch.team1?.id &&
      updatedBracket.thirdPlaceMatch.team2?.id &&
      updatedBracket.thirdPlaceMatch.status === 'WAITING'
    ) {
      updatedBracket.thirdPlaceMatch.status = 'READY'
    }

    // Auto-reconnect DB bronze match if matchId is missing but match exists in Supabase
    if (
      !updatedBracket.thirdPlaceMatch.matchId &&
      updatedBracket.thirdPlaceMatch.team1?.id &&
      updatedBracket.thirdPlaceMatch.team2?.id
    ) {
      const expectedBronzeName = `${updatedBracket.thirdPlaceMatch.title} (${bracket.category === 'PUTRA' ? 'Putra' : 'Putri'})`
      const matchedBronzeDb = dbMatches.find((dm) => {
        const nameMatches = dm.name && dm.name.trim().toLowerCase() === expectedBronzeName.trim().toLowerCase()
        if (nameMatches) {
          const hasTeam1 =
            dm.team_attack_id === updatedBracket.thirdPlaceMatch!.team1!.id ||
            dm.team_defense_id === updatedBracket.thirdPlaceMatch!.team1!.id
          const hasTeam2 =
            dm.team_attack_id === updatedBracket.thirdPlaceMatch!.team2!.id ||
            dm.team_defense_id === updatedBracket.thirdPlaceMatch!.team2!.id
          return hasTeam1 && hasTeam2
        }
        return false
      })
      if (matchedBronzeDb) {
        updatedBracket.thirdPlaceMatch.matchId = matchedBronzeDb.id
      }
    }

    // Check third place match DB result
    if (updatedBracket.thirdPlaceMatch.matchId) {
      const dbBronze = dbMatches.find((m) => m.id === updatedBracket.thirdPlaceMatch!.matchId)
      if (dbBronze) {
        updatedBracket.thirdPlaceMatch.status = dbBronze.status as any
        const activeEvents = dbBronze.score_events?.filter((e) => e.status === 'ACTIVE') || []
        const b1 = updatedBracket.thirdPlaceMatch.team1?.id
          ? activeEvents
              .filter((e) => e.team_id === updatedBracket.thirdPlaceMatch!.team1!.id)
              .reduce((s, e) => s + e.points, 0)
          : 0
        const b2 = updatedBracket.thirdPlaceMatch.team2?.id
          ? activeEvents
              .filter((e) => e.team_id === updatedBracket.thirdPlaceMatch!.team2!.id)
              .reduce((s, e) => s + e.points, 0)
          : 0

        updatedBracket.thirdPlaceMatch.score1 = b1
        updatedBracket.thirdPlaceMatch.score2 = b2

        if (
          dbBronze.status === 'FINISHED' &&
          updatedBracket.thirdPlaceMatch.team1?.id &&
          updatedBracket.thirdPlaceMatch.team2?.id
        ) {
          let bronzeWinner: TeamSlot
          if (b1 > b2) {
            bronzeWinner = updatedBracket.thirdPlaceMatch.team1
          } else if (b2 > b1) {
            bronzeWinner = updatedBracket.thirdPlaceMatch.team2
          } else {
            // Validasi Kondisi Seri Juara 3 (b1 === b2): Pemenang diambil dari skor garis depan tertinggi
            const isBelakang = (e: any) => (dbBronze.jury_2_id ? e.jury_id === dbBronze.jury_2_id : false)
            const isDepan = (e: any) => (dbBronze.jury_1_id ? e.jury_id === dbBronze.jury_1_id : !isBelakang(e))

            const depan1 = activeEvents
              .filter((e) => e.team_id === updatedBracket.thirdPlaceMatch!.team1!.id && isDepan(e))
              .reduce((s, e) => s + e.points, 0)
            const depan2 = activeEvents
              .filter((e) => e.team_id === updatedBracket.thirdPlaceMatch!.team2!.id && isDepan(e))
              .reduce((s, e) => s + e.points, 0)

            if (depan1 > depan2) {
              bronzeWinner = updatedBracket.thirdPlaceMatch.team1
            } else if (depan2 > depan1) {
              bronzeWinner = updatedBracket.thirdPlaceMatch.team2
            } else {
              bronzeWinner =
                dbBronze.team_attack_id === updatedBracket.thirdPlaceMatch.team1.id
                  ? updatedBracket.thirdPlaceMatch.team1
                  : updatedBracket.thirdPlaceMatch.team2
            }
          }

          updatedBracket.thirdPlaceMatch.winnerTeamId = bronzeWinner.id!
          updatedBracket.thirdPlaceWinner = bronzeWinner
          updatedBracket.thirdPlaceMatch.isTieBreak = b1 === b2
        }
      } else {
        // Linked DB bronze match was deleted, reset safely
        updatedBracket.thirdPlaceMatch.matchId = null
        updatedBracket.thirdPlaceMatch.score1 = null
        updatedBracket.thirdPlaceMatch.score2 = null
        updatedBracket.thirdPlaceMatch.status =
          updatedBracket.thirdPlaceMatch.team1?.id && updatedBracket.thirdPlaceMatch.team2?.id
            ? 'READY'
            : 'WAITING'
        updatedBracket.thirdPlaceMatch.winnerTeamId = null
        updatedBracket.thirdPlaceWinner = null
      }
    }
  }

  propagateByeMatches(updatedBracket)

  return updatedBracket
}
