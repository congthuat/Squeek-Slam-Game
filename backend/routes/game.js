// Squeek Slam — score submission, leaderboards (all-time / today / this week),
// the weekly tournament and community stats.
const express = require('express')
const { dbQuery } = require('@surf-ai/sdk/db')

const router = express.Router()
router.use(express.json())

const GAME_ID = 'squeek-slam'
const MODES = ['standard', 'hard', 'insane']
const MAX_NAME = 20
// Casual sanity bounds — keeps nonsense out of the board.
const LIMITS = { score: 100000, combo: 2000, hits: 2000, misses: 2000 }

function cleanName(raw) {
  return String(raw ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .trim()
    .slice(0, MAX_NAME)
}

function toInt(raw) {
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) ? n : NaN
}

function cleanMode(raw) {
  return MODES.includes(raw) ? raw : 'standard'
}

function rangeFilter(range) {
  if (range === 'today') return 'created_at >= CURRENT_DATE'
  if (range === 'week') return "created_at >= date_trunc('week', now())"
  return null
}

// GET /api/game/leaderboard?range=all|today|week&mode=all|standard|hard|insane&limit=20
router.get('/leaderboard', async (req, res) => {
  try {
    const range = ['all', 'today', 'week'].includes(req.query.range) ? req.query.range : 'all'
    const mode = MODES.includes(req.query.mode) ? req.query.mode : 'all'
    const limit = Math.min(50, Math.max(1, toInt(req.query.limit) || 20))

    const filters = ['game = $1']
    const params = [GAME_ID]
    const rangeClause = rangeFilter(range)
    if (rangeClause) filters.push(rangeClause)
    if (mode !== 'all') {
      params.push(mode)
      filters.push(`COALESCE(mode, 'standard') = $${params.length}`)
    }
    const where = `WHERE ${filters.join(' AND ')}`
    const countParams = [...params]

    params.push(limit)
    const { rows } = await dbQuery(
      `SELECT id,
              COALESCE(player_name, name) AS player_name,
              score,
              COALESCE(max_combo, 0) AS max_combo,
              COALESCE(hits, 0) AS hits,
              COALESCE(misses, 0) AS misses,
              COALESCE(mode, 'standard') AS mode,
              created_at
         FROM game_scores
         ${where}
        ORDER BY score DESC, COALESCE(max_combo, 0) DESC, created_at ASC
        LIMIT $${params.length}`,
      params
    )
    const { rows: countRows } = await dbQuery(
      `SELECT COUNT(*)::int AS games FROM game_scores ${where}`,
      countParams
    )

    res.json({ range, mode, entries: rows, games: countRows[0]?.games ?? 0 })
  } catch (err) {
    console.error('[game] leaderboard failed:', err.message)
    res.status(500).json({ error: 'leaderboard_failed' })
  }
})

// GET /api/game/tournament?mode=standard|hard|insane — current week's board.
router.get('/tournament', async (req, res) => {
  try {
    const mode = cleanMode(req.query.mode)
    const { rows: bounds } = await dbQuery(
      "SELECT date_trunc('week', now()) AS week_start, date_trunc('week', now()) + interval '7 days' AS week_end"
    )
    const { rows: entries } = await dbQuery(
      `SELECT id,
              COALESCE(player_name, name) AS player_name,
              score,
              COALESCE(max_combo, 0) AS max_combo,
              COALESCE(hits, 0) AS hits,
              COALESCE(misses, 0) AS misses,
              created_at
         FROM game_scores
        WHERE game = $1
          AND COALESCE(mode, 'standard') = $2
          AND created_at >= date_trunc('week', now())
        ORDER BY score DESC, COALESCE(max_combo, 0) DESC, created_at ASC
        LIMIT 10`,
      [GAME_ID, mode]
    )
    const { rows: countRows } = await dbQuery(
      `SELECT COUNT(*)::int AS games
         FROM game_scores
        WHERE game = $1
          AND COALESCE(mode, 'standard') = $2
          AND created_at >= date_trunc('week', now())`,
      [GAME_ID, mode]
    )

    res.json({
      mode,
      weekStart: bounds[0]?.week_start ?? null,
      weekEnd: bounds[0]?.week_end ?? null,
      entries,
      champion: entries[0] ?? null,
      games: countRows[0]?.games ?? 0,
    })
  } catch (err) {
    console.error('[game] tournament failed:', err.message)
    res.status(500).json({ error: 'tournament_failed' })
  }
})

// POST /api/game/scores — { player_name, score, max_combo, hits, misses, mode }
router.post('/scores', async (req, res) => {
  try {
    const body = req.body ?? {}
    const name = cleanName(body.player_name)
    const mode = cleanMode(body.mode)
    const score = toInt(body.score)
    const maxCombo = toInt(body.max_combo)
    const hits = toInt(body.hits)
    const misses = toInt(body.misses)

    if (!name) return res.status(400).json({ error: 'name_required' })
    if (!(score >= 0 && score <= LIMITS.score)) return res.status(400).json({ error: 'bad_score' })
    if (!(maxCombo >= 0 && maxCombo <= LIMITS.combo)) return res.status(400).json({ error: 'bad_combo' })
    if (!(hits >= 0 && hits <= LIMITS.hits)) return res.status(400).json({ error: 'bad_hits' })
    if (!(misses >= 0 && misses <= LIMITS.misses)) return res.status(400).json({ error: 'bad_misses' })

    // The legacy `name` column is NOT NULL — mirror the player name into it.
    const { rows } = await dbQuery(
      `INSERT INTO game_scores (name, player_name, score, max_combo, hits, misses, mode, game)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7)
       RETURNING id, player_name, score, max_combo, hits, misses, mode, created_at`,
      [name, score, maxCombo, hits, misses, mode, GAME_ID]
    )
    const { rows: rankRows } = await dbQuery(
      `SELECT COUNT(*)::int + 1 AS rank
         FROM game_scores
        WHERE game = $1 AND score > $2 AND COALESCE(mode, 'standard') = $3`,
      [GAME_ID, score, mode]
    )

    res.json({ entry: rows[0], rank: rankRows[0]?.rank ?? null })
  } catch (err) {
    console.error('[game] submit failed:', err.message)
    res.status(500).json({ error: 'submit_failed' })
  }
})

// GET /api/game/stats — community totals
router.get('/stats', async (_req, res) => {
  try {
    const { rows } = await dbQuery(
      `SELECT COUNT(*)::int AS games,
              COALESCE(SUM(hits), 0)::int AS total_hits,
              COALESCE(SUM(score), 0)::int AS total_score,
              COALESCE(MAX(score), 0)::int AS best_score
         FROM game_scores
        WHERE game = $1`,
      [GAME_ID]
    )
    res.json(rows[0] ?? { games: 0, total_hits: 0, total_score: 0, best_score: 0 })
  } catch (err) {
    console.error('[game] stats failed:', err.message)
    res.status(500).json({ error: 'stats_failed' })
  }
})

module.exports = router
