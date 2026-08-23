// 备忘录路由（CRUD 模板，其他模块参照此模式）

const express = require('express')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/auth')
const { fmtDate } = require('../utils/date')

const router = express.Router()
router.use(authMiddleware) // 以下所有接口都需要登录

// 统一格式化返回的备忘行（DATE 列转字符串）
function fmtMemo(row) {
  if (row.due_date) row.due_date = fmtDate(row.due_date)
  return row
}

// GET /api/memos 查当前用户所有备忘
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM memos WHERE user_id = ? ORDER BY pinned DESC, sort_order ASC',
      [req.userId]
    )
    res.json(rows.map(fmtMemo))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/memos 新增备忘
router.post('/', async (req, res) => {
  const { text, due_date } = req.body
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '内容不能为空' })
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO memos (user_id, text, due_date) VALUES (?, ?, ?)',
      [req.userId, text.trim(), due_date || null]
    )
    // 返回刚插入的完整记录
    const [rows] = await pool.query('SELECT * FROM memos WHERE id = ?', [result.insertId])
    res.status(201).json(fmtMemo(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// PUT /api/memos/:id 更新（勾选完成/编辑/置顶）
router.put('/:id', async (req, res) => {
  const { text, done, pinned, due_date } = req.body
  try {
    await pool.query(
      `UPDATE memos SET
         text = COALESCE(?, text),
         done = COALESCE(?, done),
         pinned = COALESCE(?, pinned),
         due_date = COALESCE(?, due_date)
       WHERE id = ? AND user_id = ?`,
      [text, done, pinned, due_date, req.params.id, req.userId]
    )
    const [rows] = await pool.query('SELECT * FROM memos WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json(fmtMemo(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// DELETE /api/memos/:id 删除
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM memos WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

module.exports = router
