// 后台管理路由：管理员登录 + 用户管理 + 数据只读查看 + 统计
// 所有接口都过 requireAdmin（除登录本身）

const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')
const { requireAdmin } = require('../middleware/auth')
const { fmtDate } = require('../utils/date')

const router = express.Router()

// ===== 记录操作日志 =====
async function logAction(adminId, adminName, action, targetId, targetName, detail) {
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, admin_name, action, target_id, target_name, detail) VALUES (?, ?, ?, ?, ?, ?)',
      [adminId, adminName, action, targetId || null, targetName || null, detail || null]
    )
  } catch (err) {
    console.error('写操作日志失败:', err.message)
  }
}

// ===== 管理员登录（无需 requireAdmin） =====
// POST /api/admin/login { username, password }
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' })

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
    if (rows.length === 0) return res.status(401).json({ error: '用户名或密码错误' })
    const user = rows[0]

    // 必须是管理员
    if (user.role !== 'admin') return res.status(403).json({ error: '该账号不是管理员' })
    // 必须是启用状态
    if (user.status !== 1) return res.status(403).json({ error: '该账号已被禁用' })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: '用户名或密码错误' })

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    )
    res.json({ token, admin: { id: user.id, username: user.username, nickname: user.nickname } })
  } catch (err) {
    console.error('管理员登录失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// 以下接口都需要管理员身份
router.use(requireAdmin)

// ===== 统计（仪表盘） =====
// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [userCount] = await pool.query('SELECT COUNT(*) AS c FROM users')
    const [todayReg] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE DATE(created_at) = CURDATE()")
    const [adminCount] = await pool.query("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")
    const [disabledCount] = await pool.query('SELECT COUNT(*) AS c FROM users WHERE status = 0')

    // 各模块数据量
    const tables = ['subjects', 'study_tasks', 'exercise_entries', 'exercise_completions', 'diet_records', 'food_presets', 'entertainments', 'courses', 'memos']
    const dataCounts = {}
    for (const t of tables) {
      const [r] = await pool.query(`SELECT COUNT(*) AS c FROM ${t}`)
      dataCounts[t] = r[0].c
    }

    // 近 7 天注册趋势
    const [trend] = await pool.query(
      `SELECT DATE(created_at) AS d, COUNT(*) AS c FROM users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at) ORDER BY d`
    )

    res.json({
      userCount: userCount[0].c,
      todayReg: todayReg[0].c,
      adminCount: adminCount[0].c,
      disabledCount: disabledCount[0].c,
      dataCounts,
      trend: trend.map(r => ({ date: fmtDate(r.d), count: r.c })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ===== 用户列表 =====
// GET /api/admin/users?keyword=&page=&pageSize=
router.get('/users', async (req, res) => {
  const keyword = (req.query.keyword || '').trim()
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize || 20)))
  try {
    let where = 'WHERE 1=1'
    const params = []
    if (keyword) {
      where += ' AND (username LIKE ? OR nickname LIKE ?)'
      params.push(`%${keyword}%`, `%${keyword}%`)
    }

    const [totalRows] = await pool.query(`SELECT COUNT(*) AS c FROM users ${where}`, params)
    const total = totalRows[0].c

    const [rows] = await pool.query(
      `SELECT id, username, nickname, role, status, created_at FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, (page - 1) * pageSize]
    )

    // 每个用户的数据量统计
    const tableCounts = {}
    for (const r of rows) {
      const uid = r.id
      if (!tableCounts[uid]) {
        tableCounts[uid] = {}
        const tables = ['subjects', 'study_tasks', 'exercise_entries', 'diet_records', 'entertainments', 'courses', 'memos']
        for (const t of tables) {
          const [cnt] = await pool.query(`SELECT COUNT(*) AS c FROM ${t} WHERE user_id = ?`, [uid])
          tableCounts[uid][t] = cnt[0].c
        }
      }
    }

    res.json({
      total,
      page,
      pageSize,
      users: rows.map(r => ({
        ...r,
        created_at: r.created_at ? fmtDate(r.created_at) : null,
        dataCounts: tableCounts[r.id] || {},
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ===== 用户详情 + 业务数据只读查看 =====
// GET /api/admin/users/:id
router.get('/users/:id', async (req, res) => {
  const uid = Number(req.params.id)
  try {
    const [userRows] = await pool.query('SELECT id, username, nickname, role, status, created_at FROM users WHERE id = ?', [uid])
    if (userRows.length === 0) return res.status(404).json({ error: '用户不存在' })
    const user = userRows[0]
    user.created_at = user.created_at ? fmtDate(user.created_at) : null

    // 各模块数据（只读）
    const [subjects] = await pool.query('SELECT * FROM subjects WHERE user_id = ?', [uid])
    const [studyTasks] = await pool.query('SELECT * FROM study_tasks WHERE user_id = ?', [uid])
    const [exerciseEntries] = await pool.query('SELECT * FROM exercise_entries WHERE user_id = ?', [uid])
    const [dietRecords] = await pool.query('SELECT * FROM diet_records WHERE user_id = ? ORDER BY date DESC LIMIT 50', [uid])
    const [entertainments] = await pool.query('SELECT * FROM entertainments WHERE user_id = ?', [uid])
    const [courses] = await pool.query('SELECT * FROM courses WHERE user_id = ?', [uid])
    const [memos] = await pool.query('SELECT * FROM memos WHERE user_id = ? ORDER BY id DESC', [uid])

    res.json({
      user,
      data: {
        subjects,
        studyTasks: studyTasks.map(t => ({ ...t, subtasks: typeof t.subtasks === 'string' ? JSON.parse(t.subtasks) : t.subtasks })),
        exerciseEntries,
        dietRecords: dietRecords.map(r => ({ ...r, date: fmtDate(r.date) })),
        entertainments: entertainments.map(e => ({ ...e, date: fmtDate(e.date) })),
        courses,
        memos: memos.map(m => ({ ...m, due_date: m.due_date ? fmtDate(m.due_date) : null })),
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ===== 禁用/启用用户 =====
// PUT /api/admin/users/:id/status { status: 0|1 }
router.put('/users/:id/status', async (req, res) => {
  const uid = Number(req.params.id)
  const status = req.body.status ? 1 : 0
  try {
    // 不能禁用管理员自己
    if (uid === req.userId) return res.status(400).json({ error: '不能修改自己的状态' })

    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [uid])
    if (rows.length === 0) return res.status(404).json({ error: '用户不存在' })
    // 不能禁用其他管理员
    const [target] = await pool.query('SELECT role FROM users WHERE id = ?', [uid])
    if (target[0].role === 'admin') return res.status(400).json({ error: '不能禁用管理员账号' })

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status, uid])
    await logAction(req.userId, req.userName || '', status ? 'enable_user' : 'disable_user', uid, rows[0].username)
    res.json({ ok: true, status })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ===== 重置密码 =====
// PUT /api/admin/users/:id/password { new_password }
router.put('/users/:id/password', async (req, res) => {
  const uid = Number(req.params.id)
  const { new_password } = req.body
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ error: '新密码至少 6 位' })
  }
  try {
    const [rows] = await pool.query('SELECT id, username FROM users WHERE id = ?', [uid])
    if (rows.length === 0) return res.status(404).json({ error: '用户不存在' })
    const hash = await bcrypt.hash(new_password, 10)
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, uid])
    await logAction(req.userId, req.userName || '', 'reset_password', uid, rows[0].username)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ===== 删除用户（级联删除其所有数据） =====
// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  const uid = Number(req.params.id)
  try {
    if (uid === req.userId) return res.status(400).json({ error: '不能删除自己' })

    const [rows] = await pool.query('SELECT id, username, role FROM users WHERE id = ?', [uid])
    if (rows.length === 0) return res.status(404).json({ error: '用户不存在' })
    if (rows[0].role === 'admin') return res.status(400).json({ error: '不能删除管理员账号' })

    // 记录被删用户信息（删除前）
    const targetName = rows[0].username

    // 级联删除：外键 ON DELETE CASCADE 会自动删业务数据，但需确认外键已建
    await pool.query('DELETE FROM users WHERE id = ?', [uid])
    await logAction(req.userId, req.userName || '', 'delete_user', uid, targetName)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ===== 操作日志列表 =====
// GET /api/admin/logs?page=&pageSize=
router.get('/logs', async (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)))
  try {
    const [totalRows] = await pool.query('SELECT COUNT(*) AS c FROM admin_logs')
    const [rows] = await pool.query(
      'SELECT * FROM admin_logs ORDER BY id DESC LIMIT ? OFFSET ?',
      [pageSize, (page - 1) * pageSize]
    )
    res.json({ total: totalRows[0].c, page, pageSize, logs: rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '服务器错误' })
  }
})

module.exports = router
