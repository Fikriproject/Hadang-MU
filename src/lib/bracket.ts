export type BracketCategory = 'PUTRA' | 'PUTRI'
export type BracketLayoutMode = 'LEFT_TO_RIGHT' | 'CENTER_SPLIT'

export interface TeamSlot {
  id?: string | null
  name: string
  isPlaceholder?: boolean
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
}

export interface BracketRound {
  name: string
  matches: BracketMatch[]
}

export interface BracketData {
  category: BracketCategory
  teamCount: number // 4, 8, or 16
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
 * Generates an empty or pre-populated knockout bracket structure for 4, 8, or 16 teams.
 */
export function generateBracketStructure(
  teamCount: 4 | 8 | 16,
  category: BracketCategory,
  initialTeams?: { id: string; name: string }[],
  includeThirdPlace: boolean = true,
  layoutMode: BracketLayoutMode = 'CENTER_SPLIT'
): BracketData {
  let roundNames: string[] = []
  if (teamCount === 4) {
    roundNames = ['Semifinal', 'Final']
  } else if (teamCount === 8) {
    roundNames = ['Perempat Final', 'Semifinal', 'Final']
  } else {
    roundNames = ['Babak 16 Besar', 'Perempat Final', 'Semifinal', 'Final']
  }

  const numRounds = roundNames.length
  const rounds: BracketRound[] = []
  let matchCounter = 1

  // Map to hold match IDs per round
  const roundMatchesMap: BracketMatch[][] = []

  // Create matches round by round from Round 0 to Final
  for (let r = 0; r < numRounds; r++) {
    const matchesInRoundCount = Math.pow(2, numRounds - 1 - r)
    const matches: BracketMatch[] = []

    for (let m = 0; m < matchesInRoundCount; m++) {
      const matchId = `M${matchCounter++}`
      const matchTitle = `${roundNames[r]} ${matchesInRoundCount > 1 ? m + 1 : ''}`.trim()

      let team1: TeamSlot | null = null
      let team2: TeamSlot | null = null

      // In Round 0 (First Round), assign initial teams if provided
      if (r === 0 && initialTeams && initialTeams.length > 0) {
        const t1Index = m * 2
        const t2Index = m * 2 + 1
        if (initialTeams[t1Index]) {
          team1 = { id: initialTeams[t1Index].id, name: initialTeams[t1Index].name }
        }
        if (initialTeams[t2Index]) {
          team2 = { id: initialTeams[t2Index].id, name: initialTeams[t2Index].name }
        }
      } else if (r > 0) {
        team1 = { name: `Pemenang Match`, isPlaceholder: true }
        team2 = { name: `Pemenang Match`, isPlaceholder: true }
      }

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
        status: team1?.id && team2?.id ? 'READY' : 'WAITING',
        winnerTeamId: null,
        loserTeamId: null,
        nextMatchId: null,
      })
    }

    roundMatchesMap.push(matches)
  }

  // Connect matches to their parent in the next round
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

        // Set descriptive placeholder in next match
        if (nextSlot === 'team1' && nextMatch.team1?.isPlaceholder) {
          nextMatch.team1.name = `Pemenang ${currentRound[m].id}`
        } else if (nextSlot === 'team2' && nextMatch.team2?.isPlaceholder) {
          nextMatch.team2.name = `Pemenang ${currentRound[m].id}`
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

  // Third place match (Bronze Match) between semifinal losers
  let thirdPlaceMatch: BracketMatch | null = null
  if (includeThirdPlace) {
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
    teamCount,
    layoutMode,
    includeThirdPlace,
    isLocked: false,
    rounds,
    thirdPlaceMatch,
    champion: null,
    runnerUp: null,
    thirdPlaceWinner: null,
    updatedAt: new Date().toISOString(),
  }

  return applyBracketMatchNumbering(bracketData)
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
 * Reconciles and auto-advances winners through the bracket
 * by checking real match scores and status from Supabase.
 */
export function reconcileBracketWithDb(
  bracket: BracketData,
  dbMatches: {
    id: string
    status: string
    team_attack_id: string
    team_defense_id: string
    team_attack?: { id: string; name: string } | null
    team_defense?: { id: string; name: string } | null
    score_events?: { team_id: string; points: number; status: string }[]
  }[]
): BracketData {
  const updatedBracket: BracketData = JSON.parse(JSON.stringify(bracket))

  // Ensure layoutMode & includeThirdPlace have defaults if missing in old json
  if (!updatedBracket.layoutMode) updatedBracket.layoutMode = 'CENTER_SPLIT'
  if (updatedBracket.includeThirdPlace === undefined) updatedBracket.includeThirdPlace = true

  // Pastikan penomoran silang matchNumber & title terbaru diaplikasikan
  applyBracketMatchNumbering(updatedBracket)

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
              // Tie breaker: prioritize attack team in DB
              if (dbM.team_attack_id === bm.team1.id) {
                winner = bm.team1
                loser = bm.team2
              } else {
                winner = bm.team2
                loser = bm.team1
              }
            }

            bm.winnerTeamId = winner.id!
            bm.loserTeamId = loser.id!

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
          const bronzeWinner =
            b1 > b2
              ? updatedBracket.thirdPlaceMatch.team1
              : b2 > b1
              ? updatedBracket.thirdPlaceMatch.team2
              : dbBronze.team_attack_id === updatedBracket.thirdPlaceMatch.team1.id
              ? updatedBracket.thirdPlaceMatch.team1
              : updatedBracket.thirdPlaceMatch.team2

          updatedBracket.thirdPlaceMatch.winnerTeamId = bronzeWinner.id!
          updatedBracket.thirdPlaceWinner = bronzeWinner
        }
      }
    }
  }

  return updatedBracket
}
