// 用户认证路由：注册 / 登录 / 获取当前用户
// 密码安全：bcrypt 哈希存储，绝不明文

const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db/pool')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

// POST /api/auth/register 注册
router.post('/register', async (req, res) => {
  const { username, password, nickname } = req.body

  // 1. 基础校验
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少 6 位' })
  }

  try {
    // 2. 检查用户名是否已存在
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
    if (existing.length > 0) {
      return res.status(409).json({ error: '用户名已被注册' })
    }

    // 3. 生成密码哈希（bcrypt 自动加盐）
    const hash = await bcrypt.hash(password, 10)

    // 4. 插入用户
    const [result] = await pool.query(
      'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
      [username, hash, nickname || username]
    )

    // 5. 返回成功（不含密码）
    res.status(201).json({ id: result.insertId, username, nickname: nickname || username })
  } catch (err) {
    console.error('注册失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// POST /api/auth/login 登录
router.post('/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }

  try {
    // 1. 查用户
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
    if (rows.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }
    const user = rows[0]

    // 2. 比对密码哈希
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    // 2.5 检查账号是否被禁用
    if (user.status === 0) {
      return res.status(403).json({ error: '该账号已被禁用，请联系管理员' })
    }

    // 3. 签发 JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    )

    res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname } })
  } catch (err) {
    console.error('登录失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

// GET /api/auth/me 获取当前登录用户（用于前端刷新后恢复登录态）
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, nickname FROM users WHERE id = ?', [req.userId])
    if (rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' })
    }
    res.json(rows[0])
  } catch (err) {
    console.error('获取用户失败:', err)
    res.status(500).json({ error: '服务器错误' })
  }
})

module.exports = router
