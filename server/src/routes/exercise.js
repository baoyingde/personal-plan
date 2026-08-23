// 锻炼计划路由：锻炼条目 + 按日期打卡

const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/auth')

const router = express.Router()
router.use(authMiddleware)

// GET /api/exercise/entries 全部锻炼条目（按星期模板）
router.get('/entries', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM exercise_entries WHERE user_id = ? ORDER BY day_of_week', [req.userId])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// POST /api/exercise/entries
router.post('/entries', async (req, res) => {
  const { day_of_week, name, detail, time_range } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: '名称不能为空' })
  try {
    const [r] = await pool.query(
      'INSERT INTO exercise_entries (user_id, day_of_week, name, detail, time_range) VALUES (?, ?, ?, ?, ?)',
      [req.userId, day_of_week, name.trim(), detail || '', time_range || null])
    const [rows] = await pool.query('SELECT * FROM exercise_entries WHERE id = ?', [r.insertId])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /api/exercise/entries/:id
router.put('/entries/:id', async (req, res) => {
  const { name, detail, time_range, day_of_week } = req.body
  try {
    await pool.query(
      'UPDATE exercise_entries SET name = COALESCE(?, name), detail = COALESCE(?, detail), time_range = COALESCE(?, time_range), day_of_week = COALESCE(?, day_of_week) WHERE id = ? AND user_id = ?',
      [name, detail, time_range, day_of_week, req.params.id, req.userId])
    const [rows] = await pool.query('SELECT * FROM exercise_entries WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// DELETE /api/exercise/entries/:id
router.delete('/entries/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM exercise_entries WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// ===== 打卡 =====

// GET /api/exercise/completions 已打卡日期列表
router.get('/completions', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT date FROM exercise_completions WHERE user_id = ?', [req.userId])
    // mysql2 可能把 DATE 列返回成 Date 对象，统一转 YYYY-MM-DD（本地时区）
    const dates = rows.map(r => {
      const d = r.date instanceof Date ? r.date : new Date(r.date)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    })
    res.json(dates)
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// POST /api/exercise/completions 打卡（body: { date }）
router.post('/completions', async (req, res) => {
  const { date } = req.body
  if (!date) return res.status(400).json({ error: '缺少日期' })
  try {
    await pool.query('INSERT IGNORE INTO exercise_completions (user_id, date) VALUES (?, ?)', [req.userId, date])
    res.status(201).json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// DELETE /api/exercise/completions/:date 取消打卡
router.delete('/completions/:date', async (req, res) => {
  try {
    await pool.query('DELETE FROM exercise_completions WHERE user_id = ? AND date = ?', [req.userId, req.params.date])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

module.exports = router
