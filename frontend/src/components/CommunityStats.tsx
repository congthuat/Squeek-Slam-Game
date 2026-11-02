import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useI18n } from '../lib/i18n'

interface StatsData {
  games?: number
  total_hits?: number
  best_score?: number
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

export default function CommunityStats() {
  const { t } = useI18n()
  const { data } = useQuery<StatsData>({
    queryKey: ['game-stats'],
    queryFn: async () => {
      const res = await fetch(api('game/stats'))
      if (!res.ok) throw new Error('stats_failed')
      return res.json()
    },
    refetchInterval: 30_000,
  })

  const games = typeof data?.games === 'number' ? data.games : 0
  const hits = typeof data?.total_hits === 'number' ? data.total_hits : 0
  const best = typeof data?.best_score === 'number' ? data.best_score : 0

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('stats.title')}</h2>
      <dl className="mt-3 divide-y divide-zinc-800">
        <div className="flex items-center justify-between py-2">
          <dt className="text-sm text-zinc-400">{t('stats.games')}</dt>
          <dd className="font-mono text-sm font-bold text-zinc-100">{fmt(games)}</dd>
        </div>
        <div className="flex items-center justify-between py-2">
          <dt className="text-sm text-zinc-400">{t('stats.hits')}</dt>
          <dd className="font-mono text-sm font-bold text-zinc-100">{fmt(hits)}</dd>
        </div>
        <div className="flex items-center justify-between py-2">
          <dt className="text-sm text-zinc-400">{t('stats.top')}</dt>
          <dd className="font-mono text-sm font-bold text-amber-300">{fmt(best)}</dd>
        </div>
      </dl>
    </section>
  )
}
