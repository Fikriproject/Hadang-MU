import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const env = fs.readFileSync('.env.local', 'utf8')
let supabaseUrl = ''
let serviceRoleKey = ''

env.split('\n').forEach((line) => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim()
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
    serviceRoleKey = line.split('=')[1].trim()
  }
})

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function clearData() {
  console.log('1. Menghapus semua score_events di database...')
  const { error: scoreErr } = await supabase
    .from('score_events')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (scoreErr) {
    console.error('Error deleting score_events:', scoreErr)
  } else {
    console.log('score_events berhasil dihapus.')
  }

  console.log('2. Menghapus semua matches di database...')
  const { error: matchErr } = await supabase
    .from('matches')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (matchErr) {
    console.error('Error deleting matches:', matchErr)
  } else {
    console.log('matches berhasil dihapus.')
  }

  console.log('3. Menghapus semua teams di database...')
  const { error: teamErr } = await supabase
    .from('teams')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (teamErr) {
    console.error('Error deleting teams:', teamErr)
  } else {
    console.log('teams berhasil dihapus.')
  }

  console.log('4. Mereset file bagan (brackets.json)...')
  const emptyBrackets = JSON.stringify({ PUTRA: null, PUTRI: null }, null, 2)
  const p1 = path.join(process.cwd(), 'src', 'data', 'brackets.json')
  const p2 = path.join(process.cwd(), 'data', 'brackets.json')

  try {
    fs.mkdirSync(path.dirname(p1), { recursive: true })
    fs.writeFileSync(p1, emptyBrackets, 'utf-8')
    console.log('src/data/brackets.json berhasil direset.')
  } catch (err) {
    console.error('Error writing src/data/brackets.json:', err)
  }

  try {
    fs.mkdirSync(path.dirname(p2), { recursive: true })
    fs.writeFileSync(p2, emptyBrackets, 'utf-8')
    console.log('data/brackets.json berhasil direset.')
  } catch (err) {
    console.error('Error writing data/brackets.json:', err)
  }

  console.log('--- SELESAI: Semua bagan dan pertandingan telah bersih dan kosong! ---')
}

clearData()
