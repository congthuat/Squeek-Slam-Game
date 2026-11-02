import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useI18n, type Lang } from '../lib/i18n'

type Range = 'week' | 'today' | 'all'
type ModeFilter = 'all' | 'standard' | 'hard' | 'insane'

interface Entry {
  id?: number
  player_name?: string
  score?: number
  max_combo?: number
  mode?: string
  created_at?: string
}

interface LeaderboardData {
  entries?: Entry[]
  games?: number
}

const MEDALS = ['🥇', '🥈', '🥉']
const RANGES: Range[] = ['week', 'today', 'all']
const MODE_FILTERS: ModeFilter[] = ['all', 'standard', 'hard', 'insane']

const MODE_BADGE: Record<string, string> = {
  standard: 'bg-zinc-700/60 text-zinc-300',
  hard: 'bg-orange-500/15 text-orange-300',
  insane: 'bg-rose-500/15 text-rose-300',
}

function modeLabelKey(mode: string | undefined) {
  return mode === 'hard' ? 'mode.hard' : mode === 'insane' ? 'mode.insane' : 'mode.standard'
}

function rangeLabelKey(range: Range) {
  if (range === 'week') return 'lb.week'
  if (range === 'today') return 'lb.today'
  return 'lb.all'
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

function timeAgo(iso: string | undefined, lang: Lang): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return ''
  const minutes = Math.floor((Date.now() - ts) / 60_000)
  if (minutes < 1) return lang === 'vi' ? 'vừa xong' : 'just now'
  if (minutes < 60) return lang === 'vi' ? `${minutes} phút` : `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return lang === 'vi' ? `${hours} giờ` : `${hours}h`
  const days = Math.floor(hours / 24)
  return lang === 'vi' ? `${days} ngày` : `${days}d`
}

export default function Leaderboard({ highlightId }: { highlightId: number | null }) {
  const { t, lang } = useI18n()
  const [range, setRange] = useState<Range>('week')
  const [mode, setMode] = useState<ModeFilter>('all')

  const { data, isLoading, isError } = useQuery<LeaderboardData>({
    queryKey: ['leaderboard', range, mode],
    queryFn: async () => {
      const res = await fetch(api(`game/leaderboard?range=${range}&mode=${mode}`))
      if (!res.ok) throw new Error('leaderboard_failed')
      return res.json()
    },
    refetchInterval: 15_000,
  })

  const entries = Array.isArray(data?.entries) ? data.entries : []
  const games = typeof data?.games === 'number' ? data.games : 0

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('lb.title')}</h2>
        <div className="flex gap-1 rounded-full bg-zinc-950/60 p-1 ring-1 ring-zinc-800">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                range === r ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t(rangeLabelKey(r))}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {MODE_FILTERS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              mode === m
                ? 'bg-amber-400 text-zinc-950'
                : 'border border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t(`mode.${m}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-zinc-800/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-3 text-sm text-zinc-500">{t('lb.error')}</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{range === 'week' ? t('tourney.empty') : t('lb.empty')}</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {entries.map((entry, index) => {
            const isYou = highlightId != null && entry.id === highlightId
            return (
              <li
                key={entry.id ?? index}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                  isYou ? 'bg-amber-400/10 ring-1 ring-amber-400/40' : 'bg-zinc-950/40'
                }`}
              >
                <span className="w-7 shrink-0 text-center font-mono text-sm text-zinc-500">
                  {index < 3 ? MEDALS[index] : `#${index + 1}`}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-100">
                    {entry.player_name ?? '—'}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                    <span>×{entry.max_combo ?? 0} {t('game.combo')}</span>
                    {mode === 'all' && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          MODE_BADGE[entry.mode ?? 'standard'] ?? MODE_BADGE.standard
                        }`}
                      >
                        {t(modeLabelKey(entry.mode))}
                      </span>
                    )}
                    <span>{timeAgo(entry.created_at, lang)}</span>
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm font-bold text-amber-300">
                  {fmt(entry.score ?? 0)}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <p className="mt-3 text-right text-[11px] text-zinc-600">
        {fmt(games)} {t('lb.games')}
      </p>
    </section>
  )
}
