// 生活规划 App 第三版后端入口
// Express 服务器：组装所有路由 + 中间件

require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const adminRoutes = require('./routes/admin')
const memoRoutes = require('./routes/memos')
const studyRoutes = require('./routes/study')
const exerciseRoutes = require('./routes/exercise')
const dietRoutes = require('./routes/diet')
const entertainmentRoutes = require('./routes/entertainments')
const courseRoutes = require('./routes/courses')
const musicRoutes = require('./routes/music')

const app = express()

// 中间件
app.use(cors())                 // 允许前端跨域访问
app.use(express.json())         // 解析 JSON 请求体

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/memos', memoRoutes)
app.use('/api/study', studyRoutes)
app.use('/api/exercise', exerciseRoutes)
app.use('/api/diet', dietRoutes)
app.use('/api/entertainments', entertainmentRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/music', musicRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'life-planner-server', version: '3.1.0' })
})

// 托管前端静态文件（dist 目录由 vite build 生成）
const path = require('path')
const distPath = path.join(__dirname, '..', '..', 'dist')
app.use(express.static(distPath))

// 非 API 路由全部返回 index.html（SPA 前端路由由前端接管）
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

// 错误处理
app.use((err, req, res, next) => {
  console.error('未捕获错误:', err)
  res.status(500).json({ error: '服务器内部错误' })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`✅ 生活规划后端已启动: http://localhost:${PORT}`)
  console.log(`   健康检查: http://localhost:${PORT}/api/health`)
})
