// Drizzle ORM table definitions — the Surf SDK auto-syncs this file to Postgres.
const { pgTable, serial, text, integer, timestamp } = require('drizzle-orm/pg-core')

// Squeek Slam — one row per finished round (leaderboard + community stats).
// NOTE: this table pre-existed in the workspace DB with legacy columns
// (name NOT NULL, best_streak, rounds, game) and an old row from another game.
// We keep those intact: new rows mirror player_name into `name` and are scoped
// with game = 'squeek-slam'.
exports.gameScores = pgTable('game_scores', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  player_name: text('player_name'),
  score: integer('score').notNull(),
  max_combo: integer('max_combo'),
  hits: integer('hits'),
  misses: integer('misses'),
  mode: text('mode'),
  game: text('game'),
  created_at: timestamp('created_at').defaultNow(),
})

// Creator Lab — answers to the 100-question game design review (one row per question).
exports.creatorAnswers = pgTable('creator_answers', {
  id: serial('id').primaryKey(),
  question_id: integer('question_id').notNull(),
  status: text('status').notNull().default('open'),
  note: text('note').notNull().default(''),
  updated_at: timestamp('updated_at').defaultNow(),
})
