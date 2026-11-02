// Creator Lab — save and load answers to the 100-question design review.
const express = require('express')
const { dbQuery } = require('@surf-ai/sdk/db')

const router = express.Router()
router.use(express.json())

const MAX_QUESTION_ID = 100
const MAX_NOTE = 2000

function parseQuestionId(raw) {
  const n = Number.parseInt(String(raw), 10)
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUESTION_ID) return null
  return n
}

// GET /api/review/answers
router.get('/answers', async (_req, res) => {
  try {
    const { rows } = await dbQuery(
      'SELECT question_id, status, note, updated_at FROM creator_answers ORDER BY question_id'
    )
    res.json(rows)
  } catch (err) {
    console.error('[review] list failed:', err.message)
    res.status(500).json({ error: 'answers_failed' })
  }
})

// PUT /api/review/answers/:questionId — { status: 'open'|'done', note: string }
router.put('/answers/:questionId', async (req, res) => {
  try {
    const questionId = parseQuestionId(req.params.questionId)
    if (questionId == null) return res.status(400).json({ error: 'bad_question_id' })

    const body = req.body ?? {}
    const status = body.status === 'done' ? 'done' : 'open'
    const note = String(body.note ?? '').replace(/\u0000/g, '').slice(0, MAX_NOTE)

    // Empty and open = nothing worth remembering; keep the table clean.
    if (status === 'open' && note.trim() === '') {
      await dbQuery('DELETE FROM creator_answers WHERE question_id = $1', [questionId])
      return res.json({ question_id: questionId, deleted: true })
    }

    const { rows: updated } = await dbQuery(
      `UPDATE creator_answers
          SET status = $2, note = $3, updated_at = now()
        WHERE question_id = $1
        RETURNING question_id, status, note, updated_at`,
      [questionId, status, note]
    )
    if (updated.length > 0) return res.json(updated[0])

    const { rows: inserted } = await dbQuery(
      `INSERT INTO creator_answers (question_id, status, note, updated_at)
       VALUES ($1, $2, $3, now())
       RETURNING question_id, status, note, updated_at`,
      [questionId, status, note]
    )
    res.json(inserted[0])
  } catch (err) {
    console.error('[review] save failed:', err.message)
    res.status(500).json({ error: 'save_failed' })
  }
})

module.exports = router
