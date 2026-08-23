// server.cjs —— 第一个 Node.js HTTP 服务器（第 2 版：带路由）
// 用 Node 内置 http 模块；.cjs 后缀 = CommonJS，避免被项目的 "type":"module" 影响

const http = require('http')

const server = http.createServer((req, res) => {
  const { url, method } = req   // 解构出请求的路径和方式
  console.log(`收到请求: ${method} ${url}`)

  // 设置 JSON 响应头（后端接口标准做法）
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })

  // 简单路由：根据 URL 返回不同内容
  if (url === '/api/hello') {
    res.end(JSON.stringify({ message: '你好，生活规划 App 后端！' }))
  } else if (url === '/api/time') {
    res.end(JSON.stringify({ time: new Date().toISOString() }))
  } else {
    res.end(JSON.stringify({ error: '未找到该接口', path: url }))
  }
})

const PORT = 3000
server.listen(PORT, () => {
  console.log(`服务器已启动: http://localhost:${PORT}`)
})
