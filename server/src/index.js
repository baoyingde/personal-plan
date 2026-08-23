// 生活规划 App 第三版后端入口
// Express 服务器：组装所有路由 + 中间件

require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
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
app.use('/api/memos', memoRoutes)
app.use('/api/study', studyRoutes)
app.use('/api/exercise', exerciseRoutes)
app.use('/api/diet', dietRoutes)
app.use('/api/entertainments', entertainmentRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/music', musicRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'life-planner-server', version: '3.0.0' })
})

// 404 兜底
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path })
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
