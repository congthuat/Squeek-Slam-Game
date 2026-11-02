import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useI18n, type Lang } from '../lib/i18n'

type ModeId = 'standard' | 'hard' | 'insane'

const MODE_IDS: ModeId[] = ['standard', 'hard', 'insane']
const MEDALS = ['🥇', '🥈', '🥉']

interface Entry {
  id?: number
  player_name?: string
  score?: number
  max_combo?: number
}

interface TournamentData {
  mode?: string
  weekStart?: string
  weekEnd?: string
  entries?: Entry[]
  champion?: Entry | null
  games?: number
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

function fmtDay(iso: string | undefined, offsetDays = 0) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  d.setDate(d.getDate() + offsetDays)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function fmtRemain(ms: number, lang: Lang) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(total / 86400)
  const h = String(Math.floor((total % 86400) / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  if (days > 0) return lang === 'vi' ? `${days} ngày ${h}:${m}:${s}` : `${days}d ${h}:${m}:${s}`
  return `${h}:${m}:${s}`
}

export default function TournamentCard() {
  const { t, lang } = useI18n()
  const [mode, setMode] = useState<ModeId>('standard')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { data, isLoading, isError } = useQuery<TournamentData>({
    queryKey: ['tournament', mode],
    queryFn: async () => {
      const res = await fetch(api(`game/tournament?mode=${mode}`))
      if (!res.ok) throw new Error('tournament_failed')
      return res.json()
    },
    refetchInterval: 30_000,
  })

  const entries = Array.isArray(data?.entries) ? data.entries : []
  const champion = data?.champion ?? null
  const games = typeof data?.games === 'number' ? data.games : 0
  const endTs = data?.weekEnd ? new Date(data.weekEnd).getTime() : NaN
  const remain = Number.isFinite(endTs) ? endTs - now : null

  return (
    <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-b from-amber-400/[0.06] to-zinc-900/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
          🏆 {t('tourney.title')}
        </h2>
        {remain != null && (
          <span className="rounded-full bg-amber-400/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30">
            {t('tourney.endsIn')} {fmtRemain(remain, lang)}
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        {fmtDay(data?.weekStart)} – {fmtDay(data?.weekEnd, -1)}
      </p>

      <div className="mt-3 flex gap-1.5">
        {MODE_IDS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              mode === m
                ? 'bg-amber-400 text-zinc-950'
                : 'border border-zinc-700/70 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t(`mode.${m}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-zinc-800/60" />
          ))}
        </div>
      ) : isError ? (
        <p className="mt-3 text-sm text-zinc-500">{t('lb.error')}</p>
      ) : entries.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{t('tourney.empty')}</p>
      ) : (
        <>
          {champion && (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                👑 {t('tourney.champion')}
              </p>
              <p className="mt-0.5 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-bold text-zinc-100">
                  {champion.player_name ?? '—'}
                </span>
                <span className="shrink-0 font-mono text-sm font-bold text-amber-300">
                  {fmt(champion.score ?? 0)}
                </span>
              </p>
            </div>
          )}
          <ol className="mt-3 space-y-1.5">
            {entries.slice(0, 3).map((entry, index) => (
              <li
                key={entry.id ?? index}
                className="flex items-center gap-3 rounded-xl bg-zinc-950/40 px-3 py-1.5"
              >
                <span className="w-7 shrink-0 text-center text-sm">{MEDALS[index]}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">
                  {entry.player_name ?? '—'}
                </span>
                <span className="shrink-0 font-mono text-xs text-zinc-400">
                  ×{entry.max_combo ?? 0}
                </span>
                <span className="shrink-0 font-mono text-sm font-bold text-amber-300">
                  {fmt(entry.score ?? 0)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <p className="mt-3 text-right text-[11px] text-zinc-600">
        {fmt(games)} {t('tourney.games')}
      </p>
    </section>
  )
}
