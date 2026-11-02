import { useState } from 'react'
import { ExternalLink, Volume2, VolumeX } from 'lucide-react'
import { LangProvider, useI18n, type Lang } from './lib/i18n'
import { sfx } from './lib/sounds'
import ChainStatus from './components/ChainStatus'
import CommunityStats from './components/CommunityStats'
import GameBoard from './components/GameBoard'
import Leaderboard from './components/Leaderboard'
import TournamentCard from './components/TournamentCard'

function LangToggle() {
  const { lang, setLang } = useI18n()
  const options: { value: Lang; label: string }[] = [
    { value: 'vi', label: 'VI' },
    { value: 'en', label: 'EN' },
  ]
  return (
    <div className="flex overflow-hidden rounded-full border border-zinc-700 text-xs font-bold">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          className={`px-3 py-1.5 transition-colors ${
            lang === option.value ? 'bg-amber-400 text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SoundToggle() {
  const [muted, setMutedState] = useState(() => sfx.isMuted())
  return (
    <button
      type="button"
      onClick={() => {
        const next = !muted
        sfx.setMuted(next)
        setMutedState(next)
      }}
      aria-label={muted ? 'Unmute' : 'Mute'}
      className="rounded-full border border-zinc-700 p-2 text-zinc-400 transition-colors hover:text-zinc-200"
    >
      {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
    </button>
  )
}

function HowTo() {
  const { t } = useI18n()
  const rows = [
    { icon: '🐹', text: t('how.hamster') },
    { icon: '✨', text: t('how.golden') },
    { icon: '⏰', text: t('how.clock') },
    { icon: '💣', text: t('how.bomb') },
    { icon: '🔥', text: t('how.combo') },
    { icon: '⚡', text: t('how.quick') },
    { icon: '📈', text: t('how.phases') },
    { icon: '🎚️', text: t('how.modes') },
    { icon: '🏃', text: t('how.rush') },
    { icon: '⏱️', text: t('how.time') },
  ]
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{t('how.title')}</h2>
      <ul className="mt-3 space-y-2 text-sm text-zinc-300">
        {rows.map((row) => (
          <li key={row.text} className="flex items-start gap-2">
            <span className="w-5 shrink-0 text-center">{row.icon}</span>
            <span>{row.text}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Shell() {
  const { t } = useI18n()
  const [highlightId, setHighlightId] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <span className="text-4xl" aria-hidden="true">
              🐹
            </span>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-50">Squeek Slam</h1>
              <p className="text-sm text-zinc-500">{t('app.tagline')}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ChainStatus />
            <div className="flex items-center gap-2">
              <LangToggle />
              <SoundToggle />
            </div>
          </div>
        </header>

        <main className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <GameBoard onSubmitted={setHighlightId} />
          <aside className="flex flex-col gap-6">
            <TournamentCard />
            <Leaderboard highlightId={highlightId} />
            <CommunityStats />
            <HowTo />
          </aside>
        </main>

        <footer className="mt-10 flex flex-col gap-2 border-t border-zinc-800 pt-5 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.disclaimer')}</p>
          <div className="flex items-center gap-4">
            <a
              href="https://squeekchain.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-zinc-300"
            >
              squeekchain.com <ExternalLink size={12} />
            </a>
            <a
              href="https://sepolia.squeekchain.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 transition-colors hover:text-zinc-300"
            >
              Explorer <ExternalLink size={12} />
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  )
}
