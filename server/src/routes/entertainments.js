// 娱乐计划路由

const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/auth')
const { fmtDate } = require('../utils/date')

const router = express.Router()
router.use(authMiddleware)

function fmtEnt(row) {
  if (row.date) row.date = fmtDate(row.date)
  return row
}

// GET /api/entertainments?date=... 可筛选日期
router.get('/', async (req, res) => {
  const { date } = req.query
  try {
    const params = [req.userId]
    let sql = 'SELECT * FROM entertainments WHERE user_id = ?'
    if (date) { sql += ' AND date = ?'; params.push(date) }
    sql += ' ORDER BY date, start_time'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(fmtEnt))
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// POST /api/entertainments
router.post('/', async (req, res) => {
  const { title, date, start_time, end_time, location, type, notes, done } = req.body
  if (!title || !title.trim() || !date) return res.status(400).json({ error: '标题和日期必填' })
  try {
    const [r] = await pool.query(
      'INSERT INTO entertainments (user_id, title, date, start_time, end_time, location, type, notes, done) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, title.trim(), date, start_time || null, end_time || null, location || null, type || 'other', notes || '', done ? 1 : 0])
    const [rows] = await pool.query('SELECT * FROM entertainments WHERE id = ?', [r.insertId])
    res.status(201).json(fmtEnt(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /api/entertainments/:id
router.put('/:id', async (req, res) => {
  const { title, date, start_time, end_time, location, type, notes, done } = req.body
  try {
    await pool.query(
      `UPDATE entertainments SET title = COALESCE(?, title), date = COALESCE(?, date),
       start_time = COALESCE(?, start_time), end_time = COALESCE(?, end_time),
       location = COALESCE(?, location), type = COALESCE(?, type),
       notes = COALESCE(?, notes), done = COALESCE(?, done)
       WHERE id = ? AND user_id = ?`,
      [title, date, start_time, end_time, location, type, notes, done, req.params.id, req.userId])
    const [rows] = await pool.query('SELECT * FROM entertainments WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json(fmtEnt(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// DELETE /api/entertainments/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM entertainments WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

module.exports = router
