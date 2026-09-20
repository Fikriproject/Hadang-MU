import fs from 'fs'
import path from 'path'

// Database Team Mappings
const TEAMS = {
  // 12-team Bracket (PUTRA)
  putra_smkBudiTresna: { id: '66909de3-2f15-4ad2-99b6-fbc22b708a13', name: 'SMK Budi Tresna' },
  putra_sman3CikarangUtara: { id: '31adf437-93ea-4ce5-b272-83f82c8fc81c', name: 'SMAN 3 Cikarang Utara' },
  putra_sman4Cirebon: { id: '2e43d188-6194-4c76-abc0-9853e7bef6ad', name: 'SMAN 4 Cirebon' },
  putra_smkMuCiledug: { id: '683e55b4-98a3-423a-8421-9ae9b10a94f4', name: 'SMK MU Ciledug' },
  putra_sman1Jamblang: { id: '757e1c0b-6ae7-45f3-bc3b-4a80aa277d6b', name: 'SMAN 1 Jamblang' },
  putra_smkfMuCirebon: { id: 'e94f421c-200a-4e94-a42e-5438a77f576a', name: 'SMKF MU Cirebon' },
  putra_sman1Dukupuntang: { id: 'e9cb68d2-c7bb-4513-8290-114fb3bf155c', name: 'SMAN 1 Dukupuntang' },
  putra_sman1Mandirancan: { id: 'cbfa2bda-d2e1-4970-97af-1abe04104f6e', name: 'SMAN 1 Mandirancan' },
  putra_man1KotaCirebon: { id: '57fd179b-5498-4f89-b258-0a72faca8ae2', name: 'MAN 1 Kota Cirebon' },
  putra_sman5KotaCirebon: { id: 'cdcc434c-2d47-4024-9700-e0a41c2c9a04', name: 'SMAN 5 Kota Cirebon' },
  putra_disbudporaBekasi: { id: 'a7dbca44-e1dc-4790-a49c-acf54996e276', name: 'DISBUDPORA Kab. Bekasi' },
  putra_smaTelkomSekarKemuning: { id: '3077f26b-42b2-4848-827f-b7d2798f9b30', name: 'SMA Telkom Sekar Kemuning' },

  // 10-team Bracket (PUTRI)
  putri_disbudporaBekasi: { id: '88e7be82-f0cd-4c3b-a161-01f234731245', name: 'DISBUDPORA Kab. Bekasi' },
  putri_sman1Pabedilan: { id: '4baeff89-5a9a-43be-ba58-9da01ab802d9', name: 'SMAN 1 Pabedilan' },
  putri_sman4Cirebon: { id: '98db0d2f-0b17-4b96-ae08-ac718e188c79', name: 'SMAN 4 Cirebon' },
  putri_sman1Mandirancan: { id: '0adbb30f-b053-44b9-ab9a-b3cbcfbd9267', name: 'SMAN 1 Mandirancan' },
  putri_sman1Gegesik: { id: '9568f711-dede-4744-bfa6-a340ffe061f2', name: 'SMAN 1 Gegesik' },
  putri_sman1Dukupuntang: { id: 'b4e41bac-ce87-493b-b0de-38fbddd8d80c', name: 'SMAN 1 Dukupuntang' },
  putri_sman1Jamblang: { id: 'bcce9e4b-7ffe-4914-a16c-198dd2fbdab9', name: 'SMAN 1 Jamblang' },
  putri_smkfMu2Kedawung: { id: '82e7f907-c0c5-42fa-95ba-67aff9939fa7', name: 'SMKF MU 2 Kedawung' },
  putri_sman5KotaCirebon: { id: 'eb510407-27ec-439c-a29d-bb3af14de6c9', name: 'SMAN 5 Kota Cirebon' },
  putri_smaTelkomSekarKemuning: { id: '468dd409-b3b2-434a-b1e1-53408b9b0936', name: 'SMA Telkom Sekar Kemuning' },
}

const BYE_SLOT = { name: 'BYE (Lolos Otomatis)', isPlaceholder: true, isBye: true }

/**
 * BAGAN PUTRA: 12 TIM (4 Slot BYE)
 * Sesuai instruksi:
 * Status Badge: 12 Tim Terdaftar
 * Susunan Pertandingan 16 Besar:
 * Match 1: SMK Budi Tresna vs SMAN 3 Cikarang Utara
 * Match 2: SMAN 4 Cirebon (Lolos Otomatis / BYE)
 * Match 3: SMK MU Ciledug vs SMAN 1 Jamblang
 * Match 4: SMKF MU Cirebon (Lolos Otomatis / BYE)
 * Match 5: SMAN 1 Dukupuntang vs SMAN 1 Mandirancan
 * Match 6: MAN 1 Kota Cirebon (Lolos Otomatis / BYE)
 * Match 7: SMAN 5 Kota Cirebon vs DISBUDPORA Kab. Bekasi
 * Match 8: SMA Telkom Sekar Kemuning (Lolos Otomatis / BYE)
 */
function buildPutraBracket() {
  const T = TEAMS
  const now = new Date().toISOString()

  // 16 Besar (8 matches)
  const round0Matches = [
    {
      id: 'M1',
      matchNumber: 1,
      roundIndex: 0,
      matchIndex: 0,
      title: 'Match 1 • Babak 16 Besar 1',
      team1: { id: T.putra_smkBudiTresna.id, name: T.putra_smkBudiTresna.name, isPlaceholder: false },
      team2: { id: T.putra_sman3CikarangUtara.id, name: T.putra_sman3CikarangUtara.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'READY',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M9',
      nextSlot: 'team1',
    },
    {
      id: 'M2',
      matchNumber: 2,
      roundIndex: 0,
      matchIndex: 1,
      title: 'Match 2 • Babak 16 Besar 2',
      team1: { id: T.putra_sman4Cirebon.id, name: T.putra_sman4Cirebon.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putra_sman4Cirebon.id,
      loserTeamId: null,
      nextMatchId: 'M9',
      nextSlot: 'team2',
    },
    {
      id: 'M3',
      matchNumber: 3,
      roundIndex: 0,
      matchIndex: 2,
      title: 'Match 3 • Babak 16 Besar 3',
      team1: { id: T.putra_smkMuCiledug.id, name: T.putra_smkMuCiledug.name, isPlaceholder: false },
      team2: { id: T.putra_sman1Jamblang.id, name: T.putra_sman1Jamblang.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'READY',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M10',
      nextSlot: 'team1',
    },
    {
      id: 'M4',
      matchNumber: 4,
      roundIndex: 0,
      matchIndex: 3,
      title: 'Match 4 • Babak 16 Besar 4',
      team1: { id: T.putra_smkfMuCirebon.id, name: T.putra_smkfMuCirebon.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putra_smkfMuCirebon.id,
      loserTeamId: null,
      nextMatchId: 'M10',
      nextSlot: 'team2',
    },
    {
      id: 'M5',
      matchNumber: 5,
      roundIndex: 0,
      matchIndex: 4,
      title: 'Match 5 • Babak 16 Besar 5',
      team1: { id: T.putra_sman1Dukupuntang.id, name: T.putra_sman1Dukupuntang.name, isPlaceholder: false },
      team2: { id: T.putra_sman1Mandirancan.id, name: T.putra_sman1Mandirancan.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'READY',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M11',
      nextSlot: 'team1',
    },
    {
      id: 'M6',
      matchNumber: 6,
      roundIndex: 0,
      matchIndex: 5,
      title: 'Match 6 • Babak 16 Besar 6',
      team1: { id: T.putra_man1KotaCirebon.id, name: T.putra_man1KotaCirebon.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putra_man1KotaCirebon.id,
      loserTeamId: null,
      nextMatchId: 'M11',
      nextSlot: 'team2',
    },
    {
      id: 'M7',
      matchNumber: 7,
      roundIndex: 0,
      matchIndex: 6,
      title: 'Match 7 • Babak 16 Besar 7',
      team1: { id: T.putra_sman5KotaCirebon.id, name: T.putra_sman5KotaCirebon.name, isPlaceholder: false },
      team2: { id: T.putra_disbudporaBekasi.id, name: T.putra_disbudporaBekasi.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'READY',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M12',
      nextSlot: 'team1',
    },
    {
      id: 'M8',
      matchNumber: 8,
      roundIndex: 0,
      matchIndex: 7,
      title: 'Match 8 • Babak 16 Besar 8',
      team1: { id: T.putra_smaTelkomSekarKemuning.id, name: T.putra_smaTelkomSekarKemuning.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putra_smaTelkomSekarKemuning.id,
      loserTeamId: null,
      nextMatchId: 'M12',
      nextSlot: 'team2',
    },
  ]

  // Perempat Final (4 matches)
  const round1Matches = [
    {
      id: 'M9',
      matchNumber: 9,
      roundIndex: 1,
      matchIndex: 0,
      title: 'Match 9 • Perempat Final 1',
      team1: { name: 'Pemenang Match 1', isPlaceholder: true },
      team2: { id: T.putra_sman4Cirebon.id, name: T.putra_sman4Cirebon.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M13',
      nextSlot: 'team1',
    },
    {
      id: 'M10',
      matchNumber: 10,
      roundIndex: 1,
      matchIndex: 1,
      title: 'Match 10 • Perempat Final 2',
      team1: { name: 'Pemenang Match 3', isPlaceholder: true },
      team2: { id: T.putra_smkfMuCirebon.id, name: T.putra_smkfMuCirebon.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M13',
      nextSlot: 'team2',
    },
    {
      id: 'M11',
      matchNumber: 11,
      roundIndex: 1,
      matchIndex: 2,
      title: 'Match 11 • Perempat Final 3',
      team1: { name: 'Pemenang Match 5', isPlaceholder: true },
      team2: { id: T.putra_man1KotaCirebon.id, name: T.putra_man1KotaCirebon.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M14',
      nextSlot: 'team1',
    },
    {
      id: 'M12',
      matchNumber: 12,
      roundIndex: 1,
      matchIndex: 3,
      title: 'Match 12 • Perempat Final 4',
      team1: { name: 'Pemenang Match 7', isPlaceholder: true },
      team2: { id: T.putra_smaTelkomSekarKemuning.id, name: T.putra_smaTelkomSekarKemuning.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M14',
      nextSlot: 'team2',
    },
  ]

  // Semifinal (2 matches)
  const round2Matches = [
    {
      id: 'M13',
      matchNumber: 13,
      roundIndex: 2,
      matchIndex: 0,
      title: 'Match 13 • Semifinal 1',
      team1: { name: 'Pemenang Match 9', isPlaceholder: true },
      team2: { name: 'Pemenang Match 10', isPlaceholder: true },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M16',
      nextSlot: 'team1',
    },
    {
      id: 'M14',
      matchNumber: 14,
      roundIndex: 2,
      matchIndex: 1,
      title: 'Match 14 • Semifinal 2',
      team1: { name: 'Pemenang Match 11', isPlaceholder: true },
      team2: { name: 'Pemenang Match 12', isPlaceholder: true },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M16',
      nextSlot: 'team2',
    },
  ]

  // Final (1 match)
  const round3Matches = [
    {
      id: 'M16',
      matchNumber: 16,
      roundIndex: 3,
      matchIndex: 0,
      title: 'Match 16 • FINAL',
      team1: { name: 'Pemenang Match 13', isPlaceholder: true },
      team2: { name: 'Pemenang Match 14', isPlaceholder: true },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
    },
  ]

  // Perebutan Juara 3 (Bronze Match)
  const thirdPlaceMatch = {
    id: 'M15',
    matchNumber: 15,
    roundIndex: 3,
    matchIndex: 1,
    title: 'Match 15 • Perebutan Juara 3',
    team1: { name: 'Kalah Match 13', isPlaceholder: true },
    team2: { name: 'Kalah Match 14', isPlaceholder: true },
    score1: null,
    score2: null,
    matchId: null,
    status: 'WAITING',
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: null,
  }

  return {
    category: 'PUTRA',
    teamCount: 12,
    bracketSize: 16,
    layoutMode: 'LEFT_TO_RIGHT',
    includeThirdPlace: true,
    isLocked: false,
    rounds: [
      { name: 'Babak 16 Besar', matches: round0Matches },
      { name: 'Perempat Final', matches: round1Matches },
      { name: 'Semifinal', matches: round2Matches },
      { name: 'Final', matches: round3Matches },
    ],
    thirdPlaceMatch,
    champion: null,
    runnerUp: null,
    thirdPlaceWinner: null,
    updatedAt: now,
  }
}

/**
 * BAGAN PUTRI: 10 TIM (6 Slot BYE)
 * Sesuai instruksi:
 * Status Badge: 10 Tim Terdaftar
 * Susunan Pertandingan 16 Besar:
 * Match 1: DISBUDPORA Kab. Bekasi vs SMAN 1 Pabedilan
 * Match 2: SMAN 4 Cirebon (Lolos Otomatis / BYE)
 * Match 3: SMAN 1 Mandirancan (Lolos Otomatis / BYE)
 * Match 4: SMAN 1 Gegesik (Lolos Otomatis / BYE)
 * Match 5: SMAN 1 Dukupuntang (Lolos Otomatis / BYE)
 * Match 6: SMAN 1 Jamblang (Lolos Otomatis / BYE)
 * Match 7: SMKF MU 2 Kedawung vs SMAN 5 Kota Cirebon
 * Match 8: SMA Telkom Sekar Kemuning (Lolos Otomatis / BYE)
 */
function buildPutriBracket() {
  const T = TEAMS
  const now = new Date().toISOString()

  // 16 Besar (8 matches)
  const round0Matches = [
    {
      id: 'M1',
      matchNumber: 1,
      roundIndex: 0,
      matchIndex: 0,
      title: 'Match 1 • Babak 16 Besar 1',
      team1: { id: T.putri_disbudporaBekasi.id, name: T.putri_disbudporaBekasi.name, isPlaceholder: false },
      team2: { id: T.putri_sman1Pabedilan.id, name: T.putri_sman1Pabedilan.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'READY',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M9',
      nextSlot: 'team1',
    },
    {
      id: 'M2',
      matchNumber: 2,
      roundIndex: 0,
      matchIndex: 1,
      title: 'Match 2 • Babak 16 Besar 2',
      team1: { id: T.putri_sman4Cirebon.id, name: T.putri_sman4Cirebon.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putri_sman4Cirebon.id,
      loserTeamId: null,
      nextMatchId: 'M9',
      nextSlot: 'team2',
    },
    {
      id: 'M3',
      matchNumber: 3,
      roundIndex: 0,
      matchIndex: 2,
      title: 'Match 3 • Babak 16 Besar 3',
      team1: { id: T.putri_sman1Mandirancan.id, name: T.putri_sman1Mandirancan.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putri_sman1Mandirancan.id,
      loserTeamId: null,
      nextMatchId: 'M10',
      nextSlot: 'team1',
    },
    {
      id: 'M4',
      matchNumber: 4,
      roundIndex: 0,
      matchIndex: 3,
      title: 'Match 4 • Babak 16 Besar 4',
      team1: { id: T.putri_sman1Gegesik.id, name: T.putri_sman1Gegesik.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putri_sman1Gegesik.id,
      loserTeamId: null,
      nextMatchId: 'M10',
      nextSlot: 'team2',
    },
    {
      id: 'M5',
      matchNumber: 5,
      roundIndex: 0,
      matchIndex: 4,
      title: 'Match 5 • Babak 16 Besar 5',
      team1: { id: T.putri_sman1Dukupuntang.id, name: T.putri_sman1Dukupuntang.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putri_sman1Dukupuntang.id,
      loserTeamId: null,
      nextMatchId: 'M11',
      nextSlot: 'team1',
    },
    {
      id: 'M6',
      matchNumber: 6,
      roundIndex: 0,
      matchIndex: 5,
      title: 'Match 6 • Babak 16 Besar 6',
      team1: { id: T.putri_sman1Jamblang.id, name: T.putri_sman1Jamblang.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putri_sman1Jamblang.id,
      loserTeamId: null,
      nextMatchId: 'M11',
      nextSlot: 'team2',
    },
    {
      id: 'M7',
      matchNumber: 7,
      roundIndex: 0,
      matchIndex: 6,
      title: 'Match 7 • Babak 16 Besar 7',
      team1: { id: T.putri_smkfMu2Kedawung.id, name: T.putri_smkfMu2Kedawung.name, isPlaceholder: false },
      team2: { id: T.putri_sman5KotaCirebon.id, name: T.putri_sman5KotaCirebon.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'READY',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M12',
      nextSlot: 'team1',
    },
    {
      id: 'M8',
      matchNumber: 8,
      roundIndex: 0,
      matchIndex: 7,
      title: 'Match 8 • Babak 16 Besar 8',
      team1: { id: T.putri_smaTelkomSekarKemuning.id, name: T.putri_smaTelkomSekarKemuning.name, isPlaceholder: false },
      team2: { ...BYE_SLOT },
      score1: 1,
      score2: 0,
      matchId: null,
      status: 'FINISHED',
      winnerTeamId: T.putri_smaTelkomSekarKemuning.id,
      loserTeamId: null,
      nextMatchId: 'M12',
      nextSlot: 'team2',
    },
  ]

  // Perempat Final (4 matches)
  const round1Matches = [
    {
      id: 'M9',
      matchNumber: 9,
      roundIndex: 1,
      matchIndex: 0,
      title: 'Match 9 • Perempat Final 1',
      team1: { name: 'Pemenang Match 1', isPlaceholder: true },
      team2: { id: T.putri_sman4Cirebon.id, name: T.putri_sman4Cirebon.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M13',
      nextSlot: 'team1',
    },
    {
      id: 'M10',
      matchNumber: 10,
      roundIndex: 1,
      matchIndex: 1,
      title: 'Match 10 • Perempat Final 2',
      team1: { id: T.putri_sman1Mandirancan.id, name: T.putri_sman1Mandirancan.name, isPlaceholder: false },
      team2: { id: T.putri_sman1Gegesik.id, name: T.putri_sman1Gegesik.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'READY',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M13',
      nextSlot: 'team2',
    },
    {
      id: 'M11',
      matchNumber: 11,
      roundIndex: 1,
      matchIndex: 2,
      title: 'Match 11 • Perempat Final 3',
      team1: { id: T.putri_sman1Dukupuntang.id, name: T.putri_sman1Dukupuntang.name, isPlaceholder: false },
      team2: { id: T.putri_sman1Jamblang.id, name: T.putri_sman1Jamblang.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'READY',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M14',
      nextSlot: 'team1',
    },
    {
      id: 'M12',
      matchNumber: 12,
      roundIndex: 1,
      matchIndex: 3,
      title: 'Match 12 • Perempat Final 4',
      team1: { name: 'Pemenang Match 7', isPlaceholder: true },
      team2: { id: T.putri_smaTelkomSekarKemuning.id, name: T.putri_smaTelkomSekarKemuning.name, isPlaceholder: false },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M14',
      nextSlot: 'team2',
    },
  ]

  // Semifinal (2 matches)
  const round2Matches = [
    {
      id: 'M13',
      matchNumber: 13,
      roundIndex: 2,
      matchIndex: 0,
      title: 'Match 13 • Semifinal 1',
      team1: { name: 'Pemenang Match 9', isPlaceholder: true },
      team2: { name: 'Pemenang Match 10', isPlaceholder: true },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M16',
      nextSlot: 'team1',
    },
    {
      id: 'M14',
      matchNumber: 14,
      roundIndex: 2,
      matchIndex: 1,
      title: 'Match 14 • Semifinal 2',
      team1: { name: 'Pemenang Match 11', isPlaceholder: true },
      team2: { name: 'Pemenang Match 12', isPlaceholder: true },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: 'M16',
      nextSlot: 'team2',
    },
  ]

  // Final (1 match)
  const round3Matches = [
    {
      id: 'M16',
      matchNumber: 16,
      roundIndex: 3,
      matchIndex: 0,
      title: 'Match 16 • FINAL',
      team1: { name: 'Pemenang Match 13', isPlaceholder: true },
      team2: { name: 'Pemenang Match 14', isPlaceholder: true },
      score1: null,
      score2: null,
      matchId: null,
      status: 'WAITING',
      winnerTeamId: null,
      loserTeamId: null,
      nextMatchId: null,
    },
  ]

  // Perebutan Juara 3 (Bronze Match)
  const thirdPlaceMatch = {
    id: 'M15',
    matchNumber: 15,
    roundIndex: 3,
    matchIndex: 1,
    title: 'Match 15 • Perebutan Juara 3',
    team1: { name: 'Kalah Match 13', isPlaceholder: true },
    team2: { name: 'Kalah Match 14', isPlaceholder: true },
    score1: null,
    score2: null,
    matchId: null,
    status: 'WAITING',
    winnerTeamId: null,
    loserTeamId: null,
    nextMatchId: null,
  }

  return {
    category: 'PUTRI',
    teamCount: 10,
    bracketSize: 16,
    layoutMode: 'LEFT_TO_RIGHT',
    includeThirdPlace: true,
    isLocked: false,
    rounds: [
      { name: 'Babak 16 Besar', matches: round0Matches },
      { name: 'Perempat Final', matches: round1Matches },
      { name: 'Semifinal', matches: round2Matches },
      { name: 'Final', matches: round3Matches },
    ],
    thirdPlaceMatch,
    champion: null,
    runnerUp: null,
    thirdPlaceWinner: null,
    updatedAt: now,
  }
}

const bracketsStore = {
  PUTRA: buildPutraBracket(),
  PUTRI: buildPutriBracket(),
}

const json = JSON.stringify(bracketsStore, null, 2)

const p1 = path.join(process.cwd(), 'src', 'data', 'brackets.json')
const p2 = path.join(process.cwd(), 'data', 'brackets.json')

fs.mkdirSync(path.dirname(p1), { recursive: true })
fs.writeFileSync(p1, json, 'utf-8')
console.log('Successfully written to:', p1)

fs.mkdirSync(path.dirname(p2), { recursive: true })
fs.writeFileSync(p2, json, 'utf-8')
console.log('Successfully written to:', p2)

console.log('Tournament brackets updated: PUTRA now has 12 teams, PUTRI now has 10 teams!')
