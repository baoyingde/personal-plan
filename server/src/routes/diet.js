// 饮食计划路由：饮食记录 + 常用食物预设

const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/auth')
const { fmtDate } = require('../utils/date')

const router = express.Router()
router.use(authMiddleware)

function fmtDiet(row) {
  if (row.date) row.date = fmtDate(row.date)
  return row
}

// ===== 饮食记录 =====

// GET /api/diet/records?date=2026-09-07 查某天（可省略 date 查全部）
router.get('/records', async (req, res) => {
  const { date } = req.query
  try {
    const params = [req.userId]
    let sql = 'SELECT * FROM diet_records WHERE user_id = ?'
    if (date) { sql += ' AND date = ?'; params.push(date) }
    sql += ' ORDER BY date DESC, id'
    const [rows] = await pool.query(sql, params)
    res.json(rows.map(fmtDiet))
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// POST /api/diet/records 新增一条食物记录
router.post('/records', async (req, res) => {
  const { date, meal, name, amount, calories, protein, carbs, fat } = req.body
  if (!date || !meal || !name || !name.trim()) {
    return res.status(400).json({ error: '日期、餐段、名称必填' })
  }
  try {
    const [r] = await pool.query(
      'INSERT INTO diet_records (user_id, date, meal, name, amount, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.userId, date, meal, name.trim(), amount || '', calories || 0, protein ?? null, carbs ?? null, fat ?? null])
    const [rows] = await pool.query('SELECT * FROM diet_records WHERE id = ?', [r.insertId])
    res.status(201).json(fmtDiet(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /api/diet/records/:id
router.put('/records/:id', async (req, res) => {
  const { name, amount, calories, protein, carbs, fat, meal } = req.body
  try {
    await pool.query(
      `UPDATE diet_records SET name = COALESCE(?, name), amount = COALESCE(?, amount),
       calories = COALESCE(?, calories), protein = COALESCE(?, protein),
       carbs = COALESCE(?, carbs), fat = COALESCE(?, fat), meal = COALESCE(?, meal)
       WHERE id = ? AND user_id = ?`,
      [name, amount, calories, protein, carbs, fat, meal, req.params.id, req.userId])
    const [rows] = await pool.query('SELECT * FROM diet_records WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json(fmtDiet(rows[0]))
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// DELETE /api/diet/records/:id
router.delete('/records/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM diet_records WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// ===== 常用食物预设 =====

// GET /api/diet/presets
router.get('/presets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM food_presets WHERE user_id = ? ORDER BY id', [req.userId])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// POST /api/diet/presets
router.post('/presets', async (req, res) => {
  const { name, unit, default_calories } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: '名称必填' })
  try {
    const [r] = await pool.query('INSERT INTO food_presets (user_id, name, unit, default_calories) VALUES (?, ?, ?, ?)',
      [req.userId, name.trim(), unit || '', default_calories || 0])
    const [rows] = await pool.query('SELECT * FROM food_presets WHERE id = ?', [r.insertId])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// DELETE /api/diet/presets/:id
router.delete('/presets/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM food_presets WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

module.exports = router
