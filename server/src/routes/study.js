// 学习计划路由：学科（subjects）+ 任务（study_tasks）
// 子任务以 JSON 数组存在 subtasks 字段

const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/auth')
const { fmtDate } = require('../utils/date')

const router = express.Router()
router.use(authMiddleware)

// 格式化任务行（DATE 列 + JSON 字段）
function fmtTask(row) {
  if (row.deadline) row.deadline = fmtDate(row.deadline)
  row.subtasks = parseJsonField(row.subtasks)
  return row
}

// ========== 学科 ==========

// GET /api/study/subjects
router.get('/subjects', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM subjects WHERE user_id = ? ORDER BY id', [req.userId])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/study/subjects
router.post('/subjects', async (req, res) => {
  const { name, color } = req.body
  if (!name || !name.trim()) return res.status(400).json({ error: '学科名称不能为空' })
  try {
    const [r] = await pool.query('INSERT INTO subjects (user_id, name, color) VALUES (?, ?, ?)',
      [req.userId, name.trim(), color || '#4f46e5'])
    const [rows] = await pool.query('SELECT * FROM subjects WHERE id = ?', [r.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// PUT /api/study/subjects/:id
router.put('/subjects/:id', async (req, res) => {
  const { name, color } = req.body
  try {
    await pool.query('UPDATE subjects SET name = ?, color = ? WHERE id = ? AND user_id = ?',
      [name, color, req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// DELETE /api/study/subjects/:id（同时删除该学科下的任务）
router.delete('/subjects/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM subjects WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ========== 任务 ==========

// GET /api/study/tasks
// JSON 字段解析辅助：mysql2 可能已自动解析 JSON 列，需防御
function parseJsonField(v) {
  if (v == null) return []
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return [] }
  }
  return v // 已是对象
}

router.get('/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM study_tasks WHERE user_id = ? ORDER BY created_at DESC', [req.userId])
    res.json(rows.map(fmtTask))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/study/tasks
router.post('/tasks', async (req, res) => {
  const { subject_id, title, deadline, notes, subtasks, status } = req.body
  if (!title || !title.trim()) return res.status(400).json({ error: '任务标题不能为空' })
  try {
    const [r] = await pool.query(
      'INSERT INTO study_tasks (user_id, subject_id, title, deadline, notes, status, subtasks) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.userId, subject_id || null, title.trim(), deadline || null, notes || '', status || 'todo',
       JSON.stringify(subtasks || [])]
    )
    const [rows] = await pool.query('SELECT * FROM study_tasks WHERE id = ?', [r.insertId])
    res.status(201).json(fmtTask(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// PUT /api/study/tasks/:id
router.put('/tasks/:id', async (req, res) => {
  const { subject_id, title, deadline, notes, subtasks, status, completed_at } = req.body
  try {
    await pool.query(
      `UPDATE study_tasks SET
         subject_id = COALESCE(?, subject_id),
         title = COALESCE(?, title),
         deadline = COALESCE(?, deadline),
         notes = COALESCE(?, notes),
         subtasks = COALESCE(?, subtasks),
         status = COALESCE(?, status),
         completed_at = COALESCE(?, completed_at)
       WHERE id = ? AND user_id = ?`,
      [subject_id, title, deadline, notes,
       subtasks ? JSON.stringify(subtasks) : null,
       status, completed_at, req.params.id, req.userId]
    )
    const [rows] = await pool.query('SELECT * FROM study_tasks WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json(fmtTask(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// DELETE /api/study/tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM study_tasks WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

module.exports = router
