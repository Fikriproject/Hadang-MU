import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
  if (match) {
    let val = match[2] || ''
    if (val.startsWith('#')) continue
    env[match[1]] = val.trim()
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

function applyBracketMatchNumbering(bracket) {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return bracket

  const numRounds = bracket.rounds.length
  const finalRoundIndex = numRounds - 1
  let currentMatchNumber = 1

  if (bracket.layoutMode === 'CENTER_SPLIT') {
    for (let r = 0; r < finalRoundIndex; r++) {
      const round = bracket.rounds[r]
      const matches = round.matches
      const count = matches.length
      const half = Math.ceil(count / 2)

      for (let i = 0; i < half; i++) {
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
  } else {
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

function propagateByeMatches(bracket) {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) return bracket

  const matchMap = new Map()
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
          bm.winnerTeamId = realTeam.id
          bm.score1 = bm.team1?.id ? 1 : 0
          bm.score2 = bm.team2?.id ? 1 : 0

          if (bm.nextMatchId) {
            const nextMatch = matchMap.get(bm.nextMatchId)
            if (nextMatch) {
              const advancedTeam = {
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
        }
      }
    }
  }

  return bracket
}

function reconcileBracketWithDb(bracket, dbMatches) {
  const updatedBracket = JSON.parse(JSON.stringify(bracket))
  if (!updatedBracket.layoutMode) updatedBracket.layoutMode = 'CENTER_SPLIT'
  if (updatedBracket.includeThirdPlace === undefined) updatedBracket.includeThirdPlace = true

  applyBracketMatchNumbering(updatedBracket)
  propagateByeMatches(updatedBracket)

  const matchMap = new Map()
  for (const round of updatedBracket.rounds) {
    for (const bm of round.matches) {
      matchMap.set(bm.id, bm)
    }
  }

  const numRounds = updatedBracket.rounds.length
  const semifinalRoundIndex = numRounds >= 2 ? numRounds - 2 : -1
  const semifinalLosers = []

  for (let r = 0; r < numRounds; r++) {
    const round = updatedBracket.rounds[r]

    for (let m = 0; m < round.matches.length; m++) {
      const bm = round.matches[m]

      if (!bm.matchId && bm.team1?.id && bm.team2?.id) {
        const expectedName = `${bm.title} (${bracket.category === 'PUTRA' ? 'Putra' : 'Putri'})`
        let matchedDb = dbMatches.find((dm) => {
          const nameMatches = dm.name && dm.name.trim().toLowerCase() === expectedName.trim().toLowerCase()
          if (nameMatches) {
            const hasTeam1 = dm.team_attack_id === bm.team1.id || dm.team_defense_id === bm.team1.id
            const hasTeam2 = dm.team_attack_id === bm.team2.id || dm.team_defense_id === bm.team2.id
            return hasTeam1 && hasTeam2
          }
          return false
        })

        if (!matchedDb) {
          matchedDb = dbMatches.find((dm) => {
            const hasTeam1 = dm.team_attack_id === bm.team1.id || dm.team_defense_id === bm.team1.id
            const hasTeam2 = dm.team_attack_id === bm.team2.id || dm.team_defense_id === bm.team2.id
            return hasTeam1 && hasTeam2
          })
        }

        if (matchedDb) {
          bm.matchId = matchedDb.id
        }
      }

      if (bm.matchId) {
        const dbM = dbMatches.find((item) => item.id === bm.matchId)
        if (dbM) {
          bm.status = dbM.status

          const activeEvents = dbM.score_events?.filter((e) => e.status === 'ACTIVE') || []
          const s1 = bm.team1?.id
            ? activeEvents.filter((e) => e.team_id === bm.team1.id).reduce((s, e) => s + e.points, 0)
            : 0
          const s2 = bm.team2?.id
            ? activeEvents.filter((e) => e.team_id === bm.team2.id).reduce((s, e) => s + e.points, 0)
            : 0

          bm.score1 = s1
          bm.score2 = s2

          if (dbM.status === 'FINISHED' && bm.team1?.id && bm.team2?.id) {
            let winner
            let loser

            if (s1 > s2) {
              winner = bm.team1
              loser = bm.team2
            } else if (s2 > s1) {
              winner = bm.team2
              loser = bm.team1
            } else {
              const isBelakang = (e) => (dbM.jury_2_id ? e.jury_id === dbM.jury_2_id : false)
              const isDepan = (e) => (dbM.jury_1_id ? e.jury_id === dbM.jury_1_id : !isBelakang(e))

              const depan1 = activeEvents
                .filter((e) => e.team_id === bm.team1.id && isDepan(e))
                .reduce((s, e) => s + e.points, 0)
              const depan2 = activeEvents
                .filter((e) => e.team_id === bm.team2.id && isDepan(e))
                .reduce((s, e) => s + e.points, 0)

              if (depan1 > depan2) {
                winner = bm.team1
                loser = bm.team2
              } else if (depan2 > depan1) {
                winner = bm.team2
                loser = bm.team1
              } else {
                if (dbM.team_attack_id === bm.team1.id) {
                  winner = bm.team1
                  loser = bm.team2
                } else {
                  winner = bm.team2
                  loser = bm.team1
                }
              }
            }

            bm.winnerTeamId = winner.id
            bm.loserTeamId = loser.id
            bm.isTieBreak = s1 === s2

            if (r === semifinalRoundIndex) {
              semifinalLosers.push({
                slot: m === 0 ? 'team1' : 'team2',
                loser: { id: loser.id, name: loser.name, isPlaceholder: false },
              })
            }

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
              updatedBracket.champion = winner
              updatedBracket.runnerUp = loser
            }
          }
        }
      }
    }
  }

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

    if (
      !updatedBracket.thirdPlaceMatch.matchId &&
      updatedBracket.thirdPlaceMatch.team1?.id &&
      updatedBracket.thirdPlaceMatch.team2?.id
    ) {
      const expectedBronzeName = `${updatedBracket.thirdPlaceMatch.title} (${bracket.category === 'PUTRA' ? 'Putra' : 'Putri'})`
      let matchedBronzeDb = dbMatches.find((dm) => {
        const nameMatches = dm.name && dm.name.trim().toLowerCase() === expectedBronzeName.trim().toLowerCase()
        if (nameMatches) {
          const hasTeam1 =
            dm.team_attack_id === updatedBracket.thirdPlaceMatch.team1.id ||
            dm.team_defense_id === updatedBracket.thirdPlaceMatch.team1.id
          const hasTeam2 =
            dm.team_attack_id === updatedBracket.thirdPlaceMatch.team2.id ||
            dm.team_defense_id === updatedBracket.thirdPlaceMatch.team2.id
          return hasTeam1 && hasTeam2
        }
        return false
      })

      if (!matchedBronzeDb) {
        matchedBronzeDb = dbMatches.find((dm) => {
          const hasTeam1 =
            dm.team_attack_id === updatedBracket.thirdPlaceMatch.team1.id ||
            dm.team_defense_id === updatedBracket.thirdPlaceMatch.team1.id
          const hasTeam2 =
            dm.team_attack_id === updatedBracket.thirdPlaceMatch.team2.id ||
            dm.team_defense_id === updatedBracket.thirdPlaceMatch.team2.id
          return hasTeam1 && hasTeam2
        })
      }

      if (matchedBronzeDb) {
        updatedBracket.thirdPlaceMatch.matchId = matchedBronzeDb.id
      }
    }

    if (updatedBracket.thirdPlaceMatch.matchId) {
      const dbBronze = dbMatches.find((m) => m.id === updatedBracket.thirdPlaceMatch.matchId)
      if (dbBronze) {
        updatedBracket.thirdPlaceMatch.status = dbBronze.status
        const activeEvents = dbBronze.score_events?.filter((e) => e.status === 'ACTIVE') || []
        const b1 = updatedBracket.thirdPlaceMatch.team1?.id
          ? activeEvents
              .filter((e) => e.team_id === updatedBracket.thirdPlaceMatch.team1.id)
              .reduce((s, e) => s + e.points, 0)
          : 0
        const b2 = updatedBracket.thirdPlaceMatch.team2?.id
          ? activeEvents
              .filter((e) => e.team_id === updatedBracket.thirdPlaceMatch.team2.id)
              .reduce((s, e) => s + e.points, 0)
          : 0

        updatedBracket.thirdPlaceMatch.score1 = b1
        updatedBracket.thirdPlaceMatch.score2 = b2

        if (
          dbBronze.status === 'FINISHED' &&
          updatedBracket.thirdPlaceMatch.team1?.id &&
          updatedBracket.thirdPlaceMatch.team2?.id
        ) {
          const winnerBronze =
            b1 >= b2 ? updatedBracket.thirdPlaceMatch.team1 : updatedBracket.thirdPlaceMatch.team2
          const loserBronze =
            b1 >= b2 ? updatedBracket.thirdPlaceMatch.team2 : updatedBracket.thirdPlaceMatch.team1
          updatedBracket.thirdPlaceMatch.winnerTeamId = winnerBronze.id
          updatedBracket.thirdPlaceMatch.loserTeamId = loserBronze.id
          updatedBracket.thirdPlaceWinner = winnerBronze
        }
      }
    }
  }

  updatedBracket.updatedAt = new Date().toISOString()
  return updatedBracket
}

async function run() {
  console.log('1. Mengambil pertandingan dari database...')
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
    .order('created_at', { ascending: true })

  if (matchesErr) {
    console.error('Error fetching matches:', matchesErr)
    return
  }
  console.log(`Ditemukan ${rawMatches.length} pertandingan di DB.`)

  const p1 = path.join(process.cwd(), 'src', 'data', 'brackets.json')
  const p2 = path.join(process.cwd(), 'data', 'brackets.json')

  const raw = fs.readFileSync(p1, 'utf-8')
  const store = JSON.parse(raw)

  for (const cat of ['PUTRA', 'PUTRI']) {
    console.log(`\n================== REKONSILIASI ${cat} ==================`)
    if (!store[cat]) continue

    store[cat] = reconcileBracketWithDb(store[cat], rawMatches)

    const bk = store[cat]
    for (let r = 0; r < bk.rounds.length; r++) {
      const rd = bk.rounds[r]
      console.log(`\nBabak ${r} (${rd.name}):`)
      for (const m of rd.matches) {
        console.log(`  [${m.status}] ${m.id} (${m.title}) -> ${m.team1?.name} (${m.score1 ?? '-'}) vs ${m.team2?.name} (${m.score2 ?? '-'}) | winner: ${m.winnerTeamId ? 'Ya' : 'Belum'}`)
      }
    }

    if (bk.thirdPlaceMatch) {
      const tp = bk.thirdPlaceMatch
      console.log(`\nPerebutan Juara 3:`)
      console.log(`  [${tp.status}] ${tp.id} (${tp.title}) -> ${tp.team1?.name} (${tp.score1 ?? '-'}) vs ${tp.team2?.name} (${tp.score2 ?? '-'})`)
    }

    if (bk.champion) {
      console.log(`\n🏆 Juara: ${bk.champion.name}`)
    }
  }

  const json = JSON.stringify(store, null, 2)
  fs.writeFileSync(p1, json, 'utf-8')
  fs.writeFileSync(p2, json, 'utf-8')
  console.log('\n✅ File brackets.json (src dan root) berhasil diperbarui!')
}

run()
