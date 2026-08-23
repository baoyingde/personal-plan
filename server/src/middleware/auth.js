// JWT 认证中间件
// 作用：解析请求头里的 token，验证身份，把 userId 挂到 req 上
// 用法：router.use(authMiddleware) 或 router.get('/memos', authMiddleware, handler)

const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录，请先登录' })
  }

  const token = authHeader.slice(7) // 去掉 "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

module.exports = authMiddleware
