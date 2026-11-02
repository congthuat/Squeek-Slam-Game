import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useI18n } from '../lib/i18n'
import { sfx } from '../lib/sounds'

const HOLE_COUNT = 9
const ROUND_MS = 30_000
const BOMB_PENALTY = 20
const QUICK_WINDOW_MS = 300
const QUICK_BONUS = 5
const COMBO_WINDOW_MS = 3200
const CLOCK_BONUS_MS = 3000

type Phase = 'idle' | 'countdown' | 'playing' | 'over'
type Kind = 'hamster' | 'golden' | 'clock' | 'bomb'
type RoundPhase = 'warmup' | 'speed' | 'frenzy' | 'final'
type ModeId = 'standard' | 'hard' | 'insane'
type FloatTone = 'good' | 'gold' | 'bad' | 'time' | 'quick' | 'miss'

interface Spawn {
  id: number
  hole: number
  kind: Kind
  bornAt: number
  expiresAt: number
}

interface FloatLabel {
  id: number
  hole: number
  text: string
  tone: FloatTone
}

interface Burst {
  id: number
  hole: number
  color: string
}

interface ChainStatusData {
  ok?: boolean
  freshness?: string | null
  coreStatus?: string | null
  rpm?: number | null
  distanceMm?: number | null
  workUnits?: number | null
}

interface PhaseBase {
  interval: number
  jitter: number
  lifetime: number
}

interface ModeConfig {
  speed: number
  lifetime: number
  concurrent: number[]
  bomb: number[]
  golden: number[]
  clock: number[]
  scoreMult: number
}

// Four escalating phases keep the round structured instead of a flat ramp.
const PHASE_BASE: Record<RoundPhase, PhaseBase> = {
  warmup: { interval: 820, jitter: 0.25, lifetime: 1550 },
  speed: { interval: 620, jitter: 0.22, lifetime: 1300 },
  frenzy: { interval: 430, jitter: 0.2, lifetime: 1000 },
  final: { interval: 430, jitter: 0.2, lifetime: 1000 },
}

const PHASE_ORDER: RoundPhase[] = ['warmup', 'speed', 'frenzy', 'final']

const PHASE_KEY: Record<RoundPhase, string> = {
  warmup: 'game.phaseWarmup',
  speed: 'game.phaseSpeed',
  frenzy: 'game.phaseFrenzy',
  final: 'game.phaseFinal',
}

const MODE_IDS: ModeId[] = ['standard', 'hard', 'insane']
const MODE_KEY = 'squeek-slam-mode'

const MODES: Record<ModeId, ModeConfig> = {
  standard: {
    speed: 1,
    lifetime: 1,
    concurrent: [1, 2, 2, 2],
    bomb: [0, 0.14, 0.18, 0.18],
    golden: [0.06, 0.07, 0.09, 0.09],
    clock: [0.04, 0.05, 0.06, 0.06],
    scoreMult: 1,
  },
  hard: {
    speed: 0.84,
    lifetime: 0.9,
    concurrent: [1, 2, 3, 3],
    bomb: [0.04, 0.2, 0.24, 0.24],
    golden: [0.07, 0.09, 0.11, 0.11],
    clock: [0.05, 0.06, 0.07, 0.07],
    scoreMult: 1.25,
  },
  insane: {
    speed: 0.7,
    lifetime: 0.82,
    concurrent: [2, 3, 3, 3],
    bomb: [0.08, 0.26, 0.3, 0.3],
    golden: [0.08, 0.1, 0.12, 0.12],
    clock: [0.06, 0.07, 0.08, 0.08],
    scoreMult: 1.5,
  },
}

const GRADE_TIERS: { grade: string; min: number }[] = [
  { grade: 'S', min: 3000 },
  { grade: 'A', min: 2000 },
  { grade: 'B', min: 1200 },
  { grade: 'C', min: 600 },
  { grade: 'D', min: 0 },
]

const PARTICLE_VECTORS: [number, number][] = [
  [-34, -30],
  [0, -44],
  [34, -30],
  [-40, 6],
  [40, 6],
  [0, 28],
]

interface Profile {
  games: number
  best: number
  bestCombo: number
}

const PROFILE_KEY = 'squeek-slam-profile'

const KEYFRAMES = `
@keyframes sqk-pop { 0% { transform: translateY(45%) scale(.6); opacity: 0 } 60% { transform: translateY(-6%) scale(1.06); opacity: 1 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
.sqk-pop { animation: sqk-pop .18s ease-out both }
@keyframes sqk-float { 0% { transform: translate(-50%, 0); opacity: 1 } 100% { transform: translate(-50%, -30px); opacity: 0 } }
.sqk-float { animation: sqk-float .8s ease-out both }
@keyframes sqk-shake { 0%, 100% { transform: translateX(0) } 20% { transform: translateX(-6px) } 40% { transform: translateX(5px) } 60% { transform: translateX(-4px) } 80% { transform: translateX(3px) } }
.sqk-shake { animation: sqk-shake .32s ease-in-out }
@keyframes sqk-count { from { transform: scale(1.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.sqk-count { animation: sqk-count .25s ease-out both }
@keyframes sqk-banner { 0% { transform: scale(.7); opacity: 0 } 15% { transform: scale(1.06); opacity: 1 } 75% { transform: scale(1); opacity: 1 } 100% { transform: scale(1.18); opacity: 0 } }
.sqk-banner { animation: sqk-banner 1.25s ease-out both }
@keyframes sqk-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0) } 50% { box-shadow: 0 0 0 6px rgba(248,113,113,.18) } }
.sqk-pulse { animation: sqk-pulse 1s ease-in-out infinite }
@keyframes sqk-grade { 0% { transform: scale(.5) rotate(-8deg); opacity: 0 } 60% { transform: scale(1.15) rotate(2deg); opacity: 1 } 100% { transform: scale(1) rotate(0deg); opacity: 1 } }
.sqk-grade { animation: sqk-grade .45s cubic-bezier(.2,1.4,.4,1) both }
@keyframes sqk-best { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.07) } }
.sqk-best { animation: sqk-best 1s ease-in-out infinite }
@keyframes sqk-bump { from { transform: scale(1.16) } to { transform: scale(1) } }
.sqk-bump { animation: sqk-bump .15s ease-out both }
@keyframes sqk-particle { 0% { transform: translate(-50%, -50%) scale(1); opacity: 1 } 100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(.15); opacity: 0 } }
.sqk-particle { position: absolute; left: 50%; top: 50%; width: 7px; height: 7px; border-radius: 9999px; animation: sqk-particle .55s ease-out both }
@keyframes sqk-flash { from { opacity: .85 } to { opacity: 0 } }
.sqk-flash { animation: sqk-flash .4s ease-out both }
@keyframes sqk-vignette { 0%, 100% { opacity: .22 } 50% { opacity: .55 } }
.sqk-vignette { background: radial-gradient(circle at 50% 50%, transparent 52%, rgba(239,68,68,.55) 100%); animation: sqk-vignette 1s ease-in-out infinite }
@keyframes sqk-glow-gold { from { filter: drop-shadow(0 0 5px rgba(251,191,36,.45)) } to { filter: drop-shadow(0 0 16px rgba(251,191,36,1)) } }
.sqk-glow-gold { animation: sqk-glow-gold .5s ease-in-out infinite alternate }
@keyframes sqk-glow-cyan { from { filter: drop-shadow(0 0 5px rgba(56,189,248,.45)) } to { filter: drop-shadow(0 0 16px rgba(56,189,248,1)) } }
.sqk-glow-cyan { animation: sqk-glow-cyan .5s ease-in-out infinite alternate }
`

const BURST_COLORS: Record<FloatTone, string> = {
  good: '#34d399',
  gold: '#fbbf24',
  bad: '#f87171',
  time: '#38bdf8',
  quick: '#fcd34d',
  miss: '#71717a',
}

function multiplierFor(combo: number) {
  return Math.min(5, 1 + Math.floor(combo / 5))
}

function phaseFor(elapsed: number): RoundPhase {
  if (elapsed < 8000) return 'warmup'
  if (elapsed < 20000) return 'speed'
  if (elapsed < 25000) return 'frenzy'
  return 'final'
}

function gradeFor(score: number, mode: ModeId) {
  const normalized = score / MODES[mode].scoreMult
  return GRADE_TIERS.find((tier) => normalized >= tier.min)?.grade ?? 'D'
}

function gradeClass(grade: string) {
  if (grade === 'S') return 'bg-gradient-to-br from-amber-300 to-amber-500 text-zinc-950'
  if (grade === 'A') return 'bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/40'
  if (grade === 'B') return 'bg-sky-400/15 text-sky-300 ring-1 ring-sky-400/40'
  if (grade === 'C') return 'bg-zinc-700/60 text-zinc-200 ring-1 ring-zinc-600'
  return 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40'
}

function comboClass(mult: number) {
  if (mult >= 5) return 'bg-gradient-to-r from-amber-400 to-rose-500 text-zinc-950'
  if (mult === 4) return 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40'
  if (mult === 3) return 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/40'
  if (mult === 2) return 'bg-amber-400/10 text-amber-300 ring-1 ring-amber-400/30'
  return 'bg-zinc-800/80 text-zinc-300 ring-1 ring-zinc-700'
}

function fmt(n: number) {
  return n.toLocaleString('en-US')
}

function readMode(): ModeId {
  try {
    const raw = window.localStorage.getItem(MODE_KEY)
    if (raw === 'standard' || raw === 'hard' || raw === 'insane') return raw
  } catch {
    /* ignore */
  }
  return 'standard'
}

function readProfile(): Profile {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY)
    if (!raw) {
      const legacy = Number(window.localStorage.getItem('squeek-slam-best') ?? '0') || 0
      return { games: 0, best: legacy, bestCombo: 0 }
    }
    const parsed = JSON.parse(raw) as Partial<Profile>
    return {
      games: Number(parsed.games) || 0,
      best: Number(parsed.best) || 0,
      bestCombo: Number(parsed.bestCombo) || 0,
    }
  } catch {
    return { games: 0, best: 0, bestCombo: 0 }
  }
}

function readStoredName(): string {
  try {
    return window.localStorage.getItem('squeek-slam-name') ?? ''
  } catch {
    return ''
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export default function GameBoard({ onSubmitted }: { onSubmitted: (entryId: number) => void }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  // Live hamster telemetry — same query key as the header widget, so the cache is shared.
  const { data: chain } = useQuery<ChainStatusData>({
    queryKey: ['chain-status'],
    queryFn: async () => {
      const res = await fetch(api('chain/status'))
      if (!res.ok) throw new Error('chain_status_failed')
      return res.json()
    },
    refetchInterval: 10_000,
  })

  const [phase, setPhase] = useState<Phase>('idle')
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('warmup')
  const [mode, setMode] = useState<ModeId>(readMode)
  const [spawns, setSpawns] = useState<Spawn[]>([])
  const [floats, setFloats] = useState<FloatLabel[]>([])
  const [bursts, setBursts] = useState<Burst[]>([])
  const [flash, setFlash] = useState(0)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [comboBar, setComboBar] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [quickHits, setQuickHits] = useState(0)
  const [timeAddedMs, setTimeAddedMs] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_MS)
  const [countdown, setCountdown] = useState(3)
  const [shaking, setShaking] = useState(false)
  const [announceKey, setAnnounceKey] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>(() => readProfile())
  const [newBest, setNewBest] = useState(false)
  const [playerName, setPlayerName] = useState(readStoredName)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<'name' | 'network' | null>(null)
  const [savedRank, setSavedRank] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  // Chain Rush — the real Squeekchain hamster is running: every hit pays ×1.5.
  const liveOnline = chain?.ok === true
  const rushing =
    liveOnline && (chain?.coreStatus === 'RUNNING' || (typeof chain?.rpm === 'number' && chain.rpm > 0.5))

  const scoreRef = useRef(0)
  const comboRef = useRef(0)
  const hitsRef = useRef(0)
  const missesRef = useRef(0)
  const maxComboRef = useRef(0)
  const quickHitsRef = useRef(0)
  const timeAddedRef = useRef(0)
  const idRef = useRef(0)
  const endAtRef = useRef(0)
  const roundStartRef = useRef(0)
  const endedRef = useRef(false)
  const spawnAtRef = useRef(0)
  const lastHitAtRef = useRef(0)
  const prevMultRef = useRef(1)
  const lastTickRef = useRef(6)
  const spawnsRef = useRef<Spawn[]>([])
  const phaseRef = useRef<Phase>('idle')
  const roundPhaseRef = useRef<RoundPhase>('warmup')
  const modeRef = useRef<ModeId>(mode)
  const profileRef = useRef(profile)
  const shakeTimerRef = useRef<number | null>(null)
  const announceTimerRef = useRef<number | null>(null)
  const copiedTimerRef = useRef<number | null>(null)
  const rushRef = useRef(false)
  const rushSeenRef = useRef(false)

  phaseRef.current = phase
  modeRef.current = mode
  profileRef.current = profile
  rushRef.current = rushing

  const announce = useCallback((key: string) => {
    setAnnounceKey(key)
    if (announceTimerRef.current) window.clearTimeout(announceTimerRef.current)
    announceTimerRef.current = window.setTimeout(() => setAnnounceKey(null), 1250)
  }, [])

  const finish = useCallback(() => {
    setPhase('over')
    spawnsRef.current = []
    setSpawns([])
    comboRef.current = 0
    setCombo(0)
    setComboBar(0)
    const finalScore = scoreRef.current
    const prev = profileRef.current
    const beat = finalScore > prev.best && finalScore > 0
    const next: Profile = {
      games: prev.games + 1,
      best: Math.max(prev.best, finalScore),
      bestCombo: Math.max(prev.bestCombo, maxComboRef.current),
    }
    profileRef.current = next
    try {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    setProfile(next)
    setNewBest(beat)
    if (beat) sfx.record()
    else sfx.end()
  }, [])

  // Main loop — timer, phase pacing, spawn scheduling, expiry, combo decay.
  useEffect(() => {
    if (phase !== 'playing') return
    const loop = window.setInterval(() => {
      const now = Date.now()
      const left = Math.max(0, endAtRef.current - now)
      setTimeLeft(left)

      const elapsed = now - roundStartRef.current
      const nextPhase = phaseFor(elapsed)
      if (nextPhase !== roundPhaseRef.current) {
        roundPhaseRef.current = nextPhase
        setRoundPhase(nextPhase)
        if (nextPhase !== 'warmup') {
          announce(nextPhase === 'final' ? 'game.announceFinal' : PHASE_KEY[nextPhase])
          sfx.phase()
        }
      }

      if (roundPhaseRef.current === 'final') {
        const secondsLeft = Math.ceil(left / 1000)
        if (secondsLeft > 0 && secondsLeft !== lastTickRef.current) {
          lastTickRef.current = secondsLeft
          sfx.finalTick(secondsLeft)
        }
      }

      // Announce when the live hamster starts or stops running mid-round.
      if (rushRef.current !== rushSeenRef.current) {
        rushSeenRef.current = rushRef.current
        if (rushRef.current) {
          announce('rush.badge')
          sfx.phase()
        }
      }

      // Combo decays if the player stops connecting.
      if (comboRef.current > 0 && now - lastHitAtRef.current > COMBO_WINDOW_MS) {
        comboRef.current = 0
        prevMultRef.current = 1
        setCombo(0)
        setComboBar(0)
      } else if (comboRef.current > 0) {
        const remaining = 1 - (now - lastHitAtRef.current) / COMBO_WINDOW_MS
        setComboBar(Math.max(0, Math.min(1, remaining)))
      }

      // Expire spawns. Ignoring a bomb is fine; letting a target slip is a miss.
      const expired = spawnsRef.current.filter((s) => s.expiresAt <= now)
      if (expired.length > 0) {
        const slipped = expired.filter((s) => s.kind !== 'bomb').length
        spawnsRef.current = spawnsRef.current.filter((s) => s.expiresAt > now)
        setSpawns(spawnsRef.current)
        if (slipped > 0) {
          missesRef.current += slipped
          setMisses(missesRef.current)
        }
      }

      const base = PHASE_BASE[roundPhaseRef.current]
      const tuning = MODES[modeRef.current]
      const phaseIndex = PHASE_ORDER.indexOf(roundPhaseRef.current)
      const interval = base.interval * tuning.speed
      const lifetime = base.lifetime * tuning.lifetime

      if (now >= spawnAtRef.current) {
        spawnAtRef.current = now + interval * (1 - base.jitter + Math.random() * base.jitter * 2)
        if (spawnsRef.current.length < tuning.concurrent[phaseIndex]) {
          const occupied = new Set(spawnsRef.current.map((s) => s.hole))
          const free: number[] = []
          for (let h = 0; h < HOLE_COUNT; h += 1) {
            if (!occupied.has(h)) free.push(h)
          }
          if (free.length > 0) {
            const hole = free[Math.floor(Math.random() * free.length)]
            const roll = Math.random()
            const bombRate = tuning.bomb[phaseIndex]
            const goldenRate = tuning.golden[phaseIndex]
            const clockRate = tuning.clock[phaseIndex]
            let kind: Kind = 'hamster'
            if (roll < bombRate) kind = 'bomb'
            else if (roll < bombRate + goldenRate) kind = 'golden'
            else if (roll < bombRate + goldenRate + clockRate) kind = 'clock'
            idRef.current += 1
            const spawn: Spawn = {
              id: idRef.current,
              hole,
              kind,
              bornAt: now,
              expiresAt: now + lifetime,
            }
            spawnsRef.current = [...spawnsRef.current, spawn]
            setSpawns(spawnsRef.current)
          }
        }
      }

      if (left <= 0 && !endedRef.current) {
        endedRef.current = true
        finish()
      }
    }, 100)
    return () => window.clearInterval(loop)
  }, [phase, finish, announce])

  // 3-2-1 countdown, then reset and start the round.
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      scoreRef.current = 0
      comboRef.current = 0
      hitsRef.current = 0
      missesRef.current = 0
      maxComboRef.current = 0
      quickHitsRef.current = 0
      timeAddedRef.current = 0
      prevMultRef.current = 1
      lastTickRef.current = 6
      lastHitAtRef.current = 0
      rushSeenRef.current = false
      roundPhaseRef.current = 'warmup'
      spawnsRef.current = []
      setScore(0)
      setCombo(0)
      setComboBar(0)
      setHits(0)
      setMisses(0)
      setMaxCombo(0)
      setQuickHits(0)
      setTimeAddedMs(0)
      setSpawns([])
      setFloats([])
      setBursts([])
      setRoundPhase('warmup')
      setNewBest(false)
      setCopied(false)
      setSaved(false)
      setSavedRank(null)
      setSubmitError(null)
      setAnnounceKey(null)
      setTimeLeft(ROUND_MS)
      const nowTs = Date.now()
      roundStartRef.current = nowTs
      endedRef.current = false
      endAtRef.current = nowTs + ROUND_MS
      spawnAtRef.current = nowTs + 400
      setPhase('playing')
      return
    }
    sfx.tick()
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 700)
    return () => window.clearTimeout(timer)
  }, [phase, countdown])

  function startRound() {
    if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') return
    sfx.start()
    setCountdown(3)
    setPhase('countdown')
  }

  function selectMode(next: ModeId) {
    setMode(next)
    modeRef.current = next
    try {
      window.localStorage.setItem(MODE_KEY, next)
    } catch {
      /* ignore */
    }
    sfx.tick()
  }

  function triggerShake() {
    setShaking(true)
    if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current)
    shakeTimerRef.current = window.setTimeout(() => setShaking(false), 350)
  }

  function addFloat(hole: number, text: string, tone: FloatTone) {
    idRef.current += 1
    const id = idRef.current
    setFloats((prev) => [...prev, { id, hole, text, tone }])
    window.setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 820)
  }

  function addBurst(hole: number, tone: FloatTone) {
    idRef.current += 1
    const id = idRef.current
    setBursts((prev) => [...prev, { id, hole, color: BURST_COLORS[tone] }])
    window.setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 620)
  }

  const tryHit = useCallback(
    (hole: number) => {
      if (phaseRef.current !== 'playing') return
      const now = Date.now()
      const target = spawnsRef.current.find((s) => s.hole === hole && s.expiresAt > now)
      if (!target) {
        missesRef.current += 1
        setMisses(missesRef.current)
        addFloat(hole, '✕', 'miss')
        sfx.miss()
        return
      }
      spawnsRef.current = spawnsRef.current.filter((s) => s.id !== target.id)
      setSpawns(spawnsRef.current)

      const tuning = MODES[modeRef.current]

      if (target.kind === 'bomb') {
        const penalty = Math.round(BOMB_PENALTY * tuning.scoreMult)
        scoreRef.current = Math.max(0, scoreRef.current - penalty)
        comboRef.current = 0
        prevMultRef.current = 1
        setScore(scoreRef.current)
        setCombo(0)
        setComboBar(0)
        addFloat(hole, `−${penalty}`, 'bad')
        addBurst(hole, 'bad')
        setFlash((f) => f + 1)
        triggerShake()
        sfx.bomb()
        return
      }

      hitsRef.current += 1
      comboRef.current += 1
      lastHitAtRef.current = now
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current
      setHits(hitsRef.current)
      setCombo(comboRef.current)
      setComboBar(1)
      setMaxCombo(maxComboRef.current)

      const multiplier = multiplierFor(comboRef.current)
      if (multiplier > prevMultRef.current && multiplier >= 2) sfx.comboTier(multiplier)
      prevMultRef.current = multiplier

      if (target.kind === 'clock') {
        endAtRef.current += CLOCK_BONUS_MS
        timeAddedRef.current += CLOCK_BONUS_MS
        setTimeAddedMs(timeAddedRef.current)
        addFloat(hole, `+${CLOCK_BONUS_MS / 1000}s`, 'time')
        addBurst(hole, 'time')
        sfx.clock()
        return
      }

      const reaction = now - target.bornAt
      const quick = reaction <= QUICK_WINDOW_MS
      if (quick) {
        quickHitsRef.current += 1
        setQuickHits(quickHitsRef.current)
      }
      const base = target.kind === 'golden' ? 50 : 10
      const doubled = roundPhaseRef.current === 'final'
      const rushMult = rushRef.current ? 1.5 : 1
      const gained = Math.round(
        (base * multiplier + (quick ? QUICK_BONUS : 0)) * (doubled ? 2 : 1) * tuning.scoreMult * rushMult
      )
      scoreRef.current += gained
      setScore(scoreRef.current)
      const tone: FloatTone = quick ? 'quick' : target.kind === 'golden' ? 'gold' : 'good'
      addFloat(
        hole,
        `+${gained}${quick ? ' ⚡' : ''}${multiplier > 1 && !quick ? ` ×${multiplier}` : ''}`,
        tone
      )
      addBurst(hole, tone)
      if (target.kind === 'golden') sfx.golden()
      else sfx.hit(comboRef.current)
      if (quick) sfx.spark()
    },
    // addFloat/triggerShake/sfx are module- or ref-based; no state reads here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  function slam(hole: number, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    tryHit(hole)
  }

  // Keyboard: Space starts a round, 1–9 slam the matching cell.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat) return
      const active = document.activeElement
      const typing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      if (typing) return
      if (event.code === 'Space' || event.key === 'Enter') {
        if (phaseRef.current === 'idle' || phaseRef.current === 'over') {
          event.preventDefault()
          startRound()
        }
        return
      }
      if (/^[1-9]$/.test(event.key) && phaseRef.current === 'playing') {
        event.preventDefault()
        tryHit(Number(event.key) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitScore() {
    if (saved || submitting) return
    const name = playerName.replace(/[<>]/g, '').trim().slice(0, 20)
    if (!name) {
      setSubmitError('name')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(api('game/scores'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          player_name: name,
          score,
          max_combo: maxCombo,
          hits,
          misses,
          mode,
        }),
      })
      if (!res.ok) throw new Error(`http_${res.status}`)
      const json = await res.json()
      setSaved(true)
      setSavedRank(typeof json?.rank === 'number' ? json.rank : null)
      try {
        window.localStorage.setItem('squeek-slam-name', name)
      } catch {
        /* ignore */
      }
      if (typeof json?.entry?.id === 'number') onSubmitted(json.entry.id)
      void queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      void queryClient.invalidateQueries({ queryKey: ['tournament'] })
      void queryClient.invalidateQueries({ queryKey: ['game-stats'] })
      sfx.golden()
    } catch {
      setSubmitError('network')
    } finally {
      setSubmitting(false)
    }
  }

  async function shareResult() {
    const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0
    const text = `🐹 Squeek Slam — ${fmt(score)} ${t('game.score').toLowerCase()} · ${t('game.maxCombo').toLowerCase()} ×${maxCombo} · ${t('game.accuracy').toLowerCase()} ${accuracy}% · ${t(`mode.${mode}`)} · ${t('game.grade')} ${gradeFor(score, mode)}\n${window.location.href}`
    const ok = await copyText(text)
    if (ok) {
      setCopied(true)
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current)
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1800)
    }
  }

  const multiplier = multiplierFor(combo)
  const timePercent = Math.max(0, Math.min(100, (timeLeft / ROUND_MS) * 100))
  const urgent = phase === 'playing' && timeLeft <= 5000
  const totalTaps = hits + misses
  const accuracy = totalTaps > 0 ? Math.round((hits / totalTaps) * 100) : null
  const grade = gradeFor(score, mode)
  const finalActive = phase === 'playing' && roundPhase === 'final'
  const bombPenalty = Math.round(BOMB_PENALTY * MODES[mode].scoreMult)
  const secondsLabel =
    timeLeft <= 10_000 ? (timeLeft / 1000).toFixed(1) : String(Math.ceil(timeLeft / 1000))

  const aura =
    phase === 'playing' && multiplier >= 2
      ? multiplier >= 5
        ? '0 0 70px rgba(251,113,133,.35)'
        : multiplier >= 3
          ? '0 0 55px rgba(251,146,60,.28)'
          : '0 0 45px rgba(251,191,36,.22)'
      : undefined

  const phaseChipClass = finalActive
    ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/40'
    : roundPhase === 'frenzy'
      ? 'bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/40'
      : roundPhase === 'speed'
        ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/40'
        : 'bg-zinc-800/80 text-zinc-300 ring-1 ring-zinc-700'

  const resultTiles = [
    { label: t('game.hits'), value: String(hits) },
    { label: t('game.misses'), value: String(misses) },
    { label: t('game.accuracy'), value: accuracy != null ? `${accuracy}%` : '—' },
    { label: t('game.maxCombo'), value: `×${maxCombo}` },
    { label: t('game.quick'), value: String(quickHits) },
    { label: t('game.clockStat'), value: `+${Math.round(timeAddedMs / 1000)}s` },
  ]

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
      <style>{KEYFRAMES}</style>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            {t('game.score')}
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums text-zinc-50">
            <span key={score} className="sqk-bump inline-block">
              {fmt(score)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {combo > 0 && (
            <div className="flex flex-col items-end gap-1">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${comboClass(multiplier)}`}>
                {multiplier >= 5
                  ? `🔥 ${t('game.comboMax')} ×5`
                  : `${t('game.combo')} ${combo} · ×${multiplier}`}
              </span>
              <span className="h-1 w-24 overflow-hidden rounded-full bg-zinc-800">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${Math.round(comboBar * 100)}%`, transition: 'width 100ms linear' }}
                />
              </span>
            </div>
          )}
          {profile.best > 0 && (
            <span className="text-xs text-zinc-500">
              {t('game.best')}: <span className="font-mono text-zinc-300">{fmt(profile.best)}</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 sm:gap-3">
        <span className="hidden shrink-0 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-300 sm:inline-block">
          {t(`mode.${mode}`)}
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${phaseChipClass}`}
        >
          {t(PHASE_KEY[roundPhase])}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
              urgent || finalActive ? 'bg-red-500' : 'bg-amber-400'
            }`}
            style={{ width: `${timePercent}%` }}
          />
        </div>
        {finalActive && (
          <span className="sqk-best shrink-0 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-black text-red-300 ring-1 ring-red-500/40">
            {t('game.doubleBadge')}
          </span>
        )}
        <span
          className={`w-10 shrink-0 text-right font-mono text-xs tabular-nums ${
            urgent || finalActive ? 'text-red-400' : 'text-zinc-500'
          }`}
        >
          {secondsLabel}s
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
        <span className="flex flex-wrap items-center gap-x-1.5">
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              rushing ? 'animate-pulse bg-amber-400' : liveOnline ? 'bg-emerald-400' : 'bg-zinc-600'
            }`}
          />
          <span>{t('rush.live')}:</span>
          {liveOnline ? (
            <span className="flex flex-wrap items-center gap-x-1.5">
              <span className="font-semibold text-zinc-400">
                {rushing ? t('chain.running') : t('chain.idle')}
              </span>
              {typeof chain?.rpm === 'number' && (
                <span>
                  · <span className="font-mono">{chain.rpm.toFixed(1)}</span> RPM
                </span>
              )}
              {typeof chain?.distanceMm === 'number' && (
                <span>
                  · <span className="font-mono">{(chain.distanceMm / 1_000_000).toFixed(1)}</span> km
                </span>
              )}
              {typeof chain?.workUnits === 'number' && (
                <span>
                  · <span className="font-mono">{chain.workUnits.toLocaleString('en-US')}</span>{' '}
                  {t('chain.work')}
                </span>
              )}
            </span>
          ) : (
            <span className="font-mono">…</span>
          )}
        </span>
        {rushing && (
          <span className="sqk-best shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-300 ring-1 ring-amber-400/40">
            ⚡ {t('rush.badge')}
          </span>
        )}
      </div>

      <div className={`relative mt-4 ${shaking ? 'sqk-shake' : ''}`}>
        <div
          className={`grid grid-cols-3 gap-2 rounded-3xl p-1 transition-[box-shadow] duration-300 sm:gap-3 ${
            finalActive ? 'sqk-pulse bg-red-500/5' : ''
          }`}
          style={{ boxShadow: aura }}
        >
          {Array.from({ length: HOLE_COUNT }).map((_, hole) => {
            const spawn = spawns.find((s) => s.hole === hole)
            const holeFloats = floats.filter((f) => f.hole === hole)
            const holeBursts = bursts.filter((b) => b.hole === hole)
            return (
              <button
                key={hole}
                type="button"
                onPointerDown={(event) => slam(hole, event)}
                className={`relative aspect-square touch-manipulation select-none overflow-hidden rounded-2xl bg-zinc-950/80 ring-1 transition-colors focus:outline-none enabled:hover:ring-amber-400/40 ${
                  finalActive ? 'ring-red-500/30' : 'ring-zinc-800'
                }`}
              >
                <span className="pointer-events-none absolute left-2 top-1.5 hidden font-mono text-[10px] text-zinc-600 sm:block">
                  {hole + 1}
                </span>
                <span className="pointer-events-none absolute inset-x-[18%] bottom-[14%] h-[38%] rounded-[50%] bg-black/70 ring-1 ring-zinc-800" />
                {spawn && (
                  <span
                    key={spawn.id}
                    className={`sqk-pop pointer-events-none absolute inset-0 flex items-center justify-center text-4xl sm:text-5xl ${
                      spawn.kind === 'golden'
                        ? 'sqk-glow-gold'
                        : spawn.kind === 'clock'
                          ? 'sqk-glow-cyan'
                          : spawn.kind === 'bomb'
                            ? 'drop-shadow-[0_0_10px_rgba(248,113,113,0.8)]'
                            : ''
                    }`}
                  >
                    {spawn.kind === 'golden' ? (
                      <span className="relative">
                        🐹
                        <span className="absolute -right-2 -top-1 text-lg">✨</span>
                      </span>
                    ) : spawn.kind === 'bomb' ? (
                      '💣'
                    ) : spawn.kind === 'clock' ? (
                      '⏰'
                    ) : (
                      '🐹'
                    )}
                  </span>
                )}
                {holeBursts.map((b) => (
                  <span key={b.id} className="pointer-events-none absolute inset-0">
                    {PARTICLE_VECTORS.map((v, i) => (
                      <span
                        key={i}
                        className="sqk-particle"
                        style={
                          {
                            '--dx': `${v[0]}px`,
                            '--dy': `${v[1]}px`,
                            background: b.color,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </span>
                ))}
                {holeFloats.map((f) => (
                  <span
                    key={f.id}
                    className={`sqk-float pointer-events-none absolute left-1/2 top-2 font-mono text-sm font-bold ${
                      f.tone === 'bad'
                        ? 'text-red-400'
                        : f.tone === 'gold'
                          ? 'text-amber-300'
                          : f.tone === 'time'
                            ? 'text-sky-300'
                            : f.tone === 'quick'
                              ? 'text-amber-200'
                              : f.tone === 'miss'
                                ? 'text-zinc-500'
                                : 'text-emerald-300'
                    }`}
                  >
                    {f.text}
                  </span>
                ))}
              </button>
            )
          })}
        </div>

        {finalActive && (
          <span className="sqk-vignette pointer-events-none absolute inset-0 z-10 rounded-2xl" />
        )}

        {flash > 0 && (
          <span key={flash} className="sqk-flash pointer-events-none absolute inset-0 z-10 rounded-2xl bg-red-500/25" />
        )}

        {announceKey && (
          <div
            key={announceKey}
            className={`sqk-banner pointer-events-none absolute inset-x-0 top-[38%] z-10 text-center text-2xl font-black uppercase tracking-wider drop-shadow-lg sm:text-3xl ${
              announceKey === 'game.announceFinal' ? 'text-red-400' : 'text-amber-300'
            }`}
          >
            {t(announceKey)}
          </div>
        )}

        {phase === 'idle' && (
          <div className="absolute inset-0 z-20 flex justify-center overflow-y-auto rounded-2xl bg-zinc-950/85 p-6 backdrop-blur-sm">
            <div className="my-auto flex w-full max-w-sm flex-col items-center gap-4 text-center">
              <div className="text-5xl">🐹</div>
              <div>
                <p className="text-lg font-bold text-zinc-100">{t('game.readyTitle')}</p>
                <p className="mt-1 text-sm text-zinc-500">{t('game.readyHint')}</p>
              </div>
              <div className="w-full">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  {t('mode.pick')}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {MODE_IDS.map((id) => {
                    const selected = mode === id
                    const descKey =
                      id === 'hard' ? 'mode.descHard' : id === 'insane' ? 'mode.descInsane' : 'mode.descStandard'
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectMode(id)}
                        className={`rounded-xl border px-2 py-2 transition ${
                          selected
                            ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                            : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <span className="block text-sm font-bold">{t(`mode.${id}`)}</span>
                        <span className="mt-0.5 block text-[10px] leading-tight opacity-80">
                          {t(descKey)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="space-y-1 font-mono text-xs text-zinc-400">
                <p>🐹 +10 · ✨ +50 · ⏰ +3s</p>
                <p>💣 −{bombPenalty} · ⚡ +5 · 🔥 ×5</p>
              </div>
              <button
                type="button"
                onClick={startRound}
                className="rounded-full bg-amber-400 px-10 py-3 text-lg font-black tracking-wide text-zinc-950 transition hover:bg-amber-300 active:scale-95"
              >
                {t('game.start')}
              </button>
              <p className="text-[11px] text-zinc-600">{t('game.spaceHint')}</p>
              {profile.games > 0 && (
                <p className="text-xs text-zinc-500">
                  {t('game.profileGames')}: <span className="font-mono text-zinc-300">{fmt(profile.games)}</span>
                  {' · '}
                  {t('game.best')}: <span className="font-mono text-zinc-300">{fmt(profile.best)}</span>
                  {profile.bestCombo > 0 && (
                    <>
                      {' · '}
                      {t('game.profileBestCombo')}:{' '}
                      <span className="font-mono text-zinc-300">×{profile.bestCombo}</span>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {phase === 'countdown' && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-zinc-950/85 backdrop-blur-sm">
            <span key={countdown} className="sqk-count font-mono text-7xl font-black text-amber-300">
              {countdown}
            </span>
          </div>
        )}

        {phase === 'over' && (
          <div className="absolute inset-0 z-20 flex justify-center overflow-y-auto rounded-2xl bg-zinc-950/90 p-4 backdrop-blur-sm">
            <div className="my-auto w-full max-w-md text-center">
              {newBest && (
                <p className="sqk-best mx-auto mb-3 w-fit rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-4 py-1 text-xs font-black uppercase tracking-wider text-zinc-950">
                  🏆 {t('game.newBest')}
                </p>
              )}
              <p className="text-sm font-semibold uppercase tracking-wider text-amber-300">{t('game.timeUp')}</p>

              <div className="mt-3 flex items-center justify-center gap-4">
                <div
                  className={`sqk-grade flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-4xl font-black ${gradeClass(grade)}`}
                >
                  {grade}
                </div>
                <div className="text-left">
                  <p className="font-mono text-4xl font-black tabular-nums text-zinc-50">{fmt(score)}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">
                    {t('game.grade')} {grade} · {t(`mode.${mode}`)} · {t('game.best')} {fmt(profile.best)}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-left sm:grid-cols-3">
                {resultTiles.map((tile) => (
                  <div key={tile.label} className="rounded-xl bg-zinc-900/80 px-3 py-2">
                    <dt className="text-[10px] uppercase tracking-wider text-zinc-500">{tile.label}</dt>
                    <dd className="font-mono text-lg font-bold text-zinc-100">{tile.value}</dd>
                  </div>
                ))}
              </dl>

              {!saved ? (
                <div className="mt-4 space-y-2">
                  <label className="block text-left text-xs font-semibold text-zinc-400" htmlFor="sqk-name">
                    {t('game.enterName')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="sqk-name"
                      value={playerName}
                      onChange={(event) => {
                        setPlayerName(event.target.value)
                        if (submitError === 'name') setSubmitError(null)
                      }}
                      maxLength={20}
                      placeholder={t('game.namePlaceholder')}
                      className={`min-w-0 flex-1 rounded-xl border bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none ${
                        submitError === 'name'
                          ? 'border-red-500/60'
                          : 'border-zinc-700 focus:border-amber-400/60'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => void submitScore()}
                      disabled={submitting}
                      className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
                    >
                      {submitting ? t('game.saving') : t('game.submit')}
                    </button>
                  </div>
                  {submitError && (
                    <p className="text-xs text-red-400">
                      {submitError === 'name' ? t('game.errName') : t('game.errNetwork')}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm font-semibold text-emerald-300">
                  {savedRank != null ? t('game.savedRank', { rank: savedRank }) : t('game.savedNoRank')}
                </p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void shareResult()}
                  className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-amber-400/50 hover:text-amber-300"
                >
                  {copied ? t('game.copied') : t('game.share')}
                </button>
                <button
                  type="button"
                  onClick={startRound}
                  className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black tracking-wide text-zinc-950 transition hover:bg-amber-300"
                >
                  {t('game.playAgain')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 hidden text-center text-[11px] text-zinc-600 sm:block">{t('game.keyHint')}</p>
    </section>
  )
}
