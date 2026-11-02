// Tiny WebAudio synth — all game sounds are generated, no audio assets.
const MUTE_KEY = 'squeek-slam-muted'

let ctx: AudioContext | null = null
let muted = readMuted()

function readMuted(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  try {
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

interface ToneOptions {
  type?: OscillatorType
  gain?: number
  delayMs?: number
  slideTo?: number
}

function tone(freq: number, durMs: number, opts: ToneOptions = {}) {
  const ac = audio()
  if (!ac || muted) return
  const { type = 'square', gain = 0.05, delayMs = 0, slideTo } = opts
  try {
    const t0 = ac.currentTime + delayMs / 1000
    const dur = durMs / 1000
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g)
    g.connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.03)
  } catch {
    /* ignore */
  }
}

export const sfx = {
  isMuted: () => muted,
  setMuted(next: boolean) {
    muted = next
    try {
      window.localStorage.setItem(MUTE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  },
  hit(combo: number) {
    const f = 380 + Math.min(combo, 24) * 18
    tone(f, 70, { type: 'square', gain: 0.05 })
    tone(f * 2, 50, { type: 'square', gain: 0.025, delayMs: 30 })
  },
  golden() {
    tone(660, 90, { type: 'triangle', gain: 0.06 })
    tone(880, 90, { type: 'triangle', gain: 0.06, delayMs: 70 })
    tone(1320, 140, { type: 'triangle', gain: 0.06, delayMs: 140 })
  },
  bomb() {
    tone(160, 260, { type: 'sawtooth', gain: 0.08, slideTo: 55 })
  },
  miss() {
    tone(220, 50, { type: 'sine', gain: 0.015, slideTo: 180 })
  },
  tick() {
    tone(1000, 40, { type: 'square', gain: 0.03 })
  },
  start() {
    tone(440, 90, { type: 'square', gain: 0.05 })
    tone(660, 130, { type: 'square', gain: 0.05, delayMs: 90 })
  },
  end() {
    tone(660, 120, { type: 'square', gain: 0.05 })
    tone(520, 120, { type: 'square', gain: 0.05, delayMs: 110 })
    tone(392, 220, { type: 'square', gain: 0.05, delayMs: 220 })
  },
  comboTier(tier: number) {
    const base = 520 + tier * 90
    tone(base, 60, { type: 'triangle', gain: 0.05 })
    tone(base * 1.26, 60, { type: 'triangle', gain: 0.05, delayMs: 55 })
    tone(base * 1.5, 90, { type: 'triangle', gain: 0.05, delayMs: 110 })
  },
  clock() {
    tone(560, 70, { type: 'sine', gain: 0.06 })
    tone(840, 110, { type: 'sine', gain: 0.06, delayMs: 60 })
  },
  phase() {
    tone(240, 180, { type: 'sawtooth', gain: 0.04, slideTo: 640 })
  },
  finalTick(secondsLeft: number) {
    const f = 700 + (6 - Math.max(1, Math.min(6, secondsLeft))) * 90
    tone(f, 60, { type: 'square', gain: 0.045 })
  },
  spark() {
    tone(1400, 45, { type: 'triangle', gain: 0.035 })
  },
  record() {
    tone(523, 110, { type: 'square', gain: 0.05 })
    tone(659, 110, { type: 'square', gain: 0.05, delayMs: 100 })
    tone(784, 110, { type: 'square', gain: 0.05, delayMs: 200 })
    tone(1047, 260, { type: 'square', gain: 0.06, delayMs: 300 })
  },
}
