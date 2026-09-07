import { getBracket } from './actions'
import BracketView from './bracket-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Bagan Pertandingan Turnamen (Putra & Putri) - Admin',
  description: 'Automasi persiapan pertandingan turnamen sistem gugur Hadang Putra dan Putri.',
}

export default async function AdminBracketPage() {
  let bracket = null
  let categoryTeams: { id: string; name: string }[] = []

  try {
    const res = await getBracket('PUTRA')
    bracket = res.bracket
    categoryTeams = res.categoryTeams
  } catch (err) {
    console.error('Error fetching admin bracket:', err)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      <BracketView
        initialCategory="PUTRA"
        initialBracket={bracket}
        initialCategoryTeams={categoryTeams}
      />
    </div>
  )
}
