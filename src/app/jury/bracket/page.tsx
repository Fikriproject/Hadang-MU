import { type BracketCategory } from '@/lib/bracket'
import { getBracket } from '@/app/admin/bracket/actions'
import BracketView from '@/app/admin/bracket/bracket-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Bagan Pertandingan Turnamen - Meja Scoring Hadang',
  description: 'Pantau pohon bagan kejuaraan turnamen Hadang Putra dan Putri secara realtime bagi petugas juri scoring.',
}

interface PageProps {
  searchParams?: Promise<{ category?: string }>
}

export default async function JuryBracketPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const targetCategory: BracketCategory =
    resolvedSearchParams.category?.toUpperCase() === 'PUTRI' ? 'PUTRI' : 'PUTRA'

  let bracket = null
  let categoryTeams: { id: string; name: string }[] = []

  try {
    const res = await getBracket(targetCategory)
    bracket = res.bracket
    categoryTeams = res.categoryTeams
  } catch (err) {
    console.error('Error fetching jury bracket:', err)
  }

  return (
    <div className="admin-main-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <BracketView
          initialCategory={targetCategory}
          initialBracket={bracket}
          initialCategoryTeams={categoryTeams}
          isPublic={false}
          isJury={true}
        />
      </div>
    </div>
  )
}
