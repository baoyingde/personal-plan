// 学期课表路由：课程 + 用户设置（学期信息、节次等）

const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/auth')
const { fmtDate } = require('../utils/date')

const router = express.Router()
router.use(authMiddleware)

// ===== 用户设置（学期/节次/主题/首页卡片） =====
// 注意：/settings 必须放在 /:id 之前定义，否则会被当成课程 id

// GET /api/courses/settings 获取当前用户设置
router.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM user_settings WHERE user_id = ?', [req.userId])
    if (rows.length === 0) return res.json(null)
    const s = rows[0]
    // JSON 字段转对象（mysql2 可能已自动解析 JSON 列，防御处理）
    if (s.periods_json) s.periods = typeof s.periods_json === 'string' ? JSON.parse(s.periods_json) : s.periods_json
    if (s.home_cards_json) s.home_cards = typeof s.home_cards_json === 'string' ? JSON.parse(s.home_cards_json) : s.home_cards_json
    if (s.semester_start) s.semester_start = fmtDate(s.semester_start)
    delete s.periods_json
    delete s.home_cards_json
    res.json(s)
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /api/courses/settings 保存设置
router.put('/settings', async (req, res) => {
  const { semester_name, semester_start, periods, theme, weekend_enabled, home_cards } = req.body
  try {
    await pool.query(
      `INSERT INTO user_settings (user_id, semester_name, semester_start, periods_json, theme, weekend_enabled, home_cards_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         semester_name = VALUES(semester_name),
         semester_start = VALUES(semester_start),
         periods_json = VALUES(periods_json),
         theme = VALUES(theme),
         weekend_enabled = VALUES(weekend_enabled),
         home_cards_json = VALUES(home_cards_json)`,
      [req.userId, semester_name || '', semester_start || null,
       JSON.stringify(periods || null), theme || 'light', weekend_enabled ? 1 : 0,
       JSON.stringify(home_cards || null)])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// ===== 课程 =====

// GET /api/courses
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM courses WHERE user_id = ? ORDER BY day_of_week, period_index', [req.userId])
    res.json(rows)
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// POST /api/courses
router.post('/', async (req, res) => {
  const { name, day_of_week, period_index, location, week_type, color } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: '课程名称必填' })
  try {
    const [r] = await pool.query(
      'INSERT INTO courses (user_id, name, day_of_week, period_index, location, week_type, color) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.userId, name.trim(), day_of_week, period_index, location || '', week_type || 'every', color || '#4f46e5'])
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [r.insertId])
    res.status(201).json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// PUT /api/courses/:id
router.put('/:id', async (req, res) => {
  const { name, day_of_week, period_index, location, week_type, color } = req.body
  try {
    await pool.query(
      `UPDATE courses SET name = COALESCE(?, name), day_of_week = COALESCE(?, day_of_week),
       period_index = COALESCE(?, period_index), location = COALESCE(?, location),
       week_type = COALESCE(?, week_type), color = COALESCE(?, color)
       WHERE id = ? AND user_id = ?`,
      [name, day_of_week, period_index, location, week_type, color, req.params.id, req.userId])
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json(rows[0])
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

// DELETE /api/courses/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM courses WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: '服务器错误' }) }
})

module.exports = router
