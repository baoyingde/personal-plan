// 后台管理 API 验证脚本
// 用法：先启动后端 (node src/index.js)，再运行 node test/admin-verify.js
// 环境变量 ADMIN_USER / ADMIN_PASS 可指定管理员账号（默认 tzjsb / 需在 .env 或环境变量提供）

const BASE = 'http://localhost:3001/api'
let passed = 0
let failed = 0
const ok = (c, l) => { if (c) { passed++; console.log('  PASS', l) } else { failed++; console.log('  FAIL', l) } }
const api = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  const data = await r.json().catch(() => null)
  return { status: r.status, data }
}

async function main() {
  console.log('=== 后台管理 API 验证 ===')

  // 0. 普通用户登录（先注册一个普通用户）
  const uname = 'norm' + Date.now().toString().slice(-6)
  await api('POST', '/auth/register', { username: uname, password: '123456' })
  const normLogin = await api('POST', '/auth/login', { username: uname, password: '123456' })
  const normToken = normLogin.data.token

  // 1. 普通用户访问 admin 接口 → 应 403
  console.log('1. 权限校验')
  let r = await api('GET', '/admin/stats', null, normToken)
  ok(r.status === 403, `普通用户访问 admin 被拒 (${r.status})`)
  r = await api('GET', '/admin/users', null, normToken)
  ok(r.status === 403, `普通用户访问用户列表被拒 (${r.status})`)

  // 2. 无 token 访问 → 应 401
  r = await api('GET', '/admin/stats')
  ok(r.status === 401, `无 token 被拒 (${r.status})`)

  // 3. 管理员登录
  console.log('2. 管理员登录')
  const adminUser = process.env.ADMIN_USER || 'tzjsb'
  const adminPass = process.env.ADMIN_PASS || ''
  r = await api('POST', '/admin/login', { username: adminUser, password: adminPass })
  if (r.status === 401 || r.status === 403) {
    console.log(`  ⚠️ 管理员 ${adminUser} 登录失败（${r.status}）：${r.data && r.data.error}`)
    console.log('  → 请用环境变量提供密码: ADMIN_PASS=xxxx node test/admin-verify.js')
    console.log(`=== 结果: ${passed} 通过, ${failed} 失败 ===`)
    process.exit(1)
  }
  ok(r.status === 200 && r.data.token, `管理员登录成功`)
  const token = r.data.token

  // 4. 统计
  console.log('3. 仪表盘统计')
  r = await api('GET', '/admin/stats', null, token)
  ok(r.status === 200 && typeof r.data.userCount === 'number', `获取统计 (${r.status})`)
  if (r.status === 200) console.log(`    用户总数=${r.data.userCount} 今日注册=${r.data.todayReg} 禁用=${r.data.disabledCount}`)

  // 5. 用户列表
  console.log('4. 用户列表')
  r = await api('GET', '/admin/users?page=1&pageSize=5', null, token)
  ok(r.status === 200 && Array.isArray(r.data.users), `获取用户列表 (${r.status})`)
  if (r.status === 200) console.log(`    总数=${r.data.total} 本页=${r.data.users.length}`)

  // 6. 搜索
  r = await api('GET', `/admin/users?keyword=${uname}`, null, token)
  ok(r.status === 200 && r.data.total >= 1, `搜索用户 ${uname}`)

  // 7. 用户详情
  console.log('5. 用户详情（只读数据）')
  const targetId = normLogin.data.user.id
  r = await api(`GET`, `/admin/users/${targetId}`, null, token)
  ok(r.status === 200 && r.data.user && r.data.data, `获取用户详情 (${r.status})`)

  // 8. 禁用/启用
  console.log('6. 禁用/启用')
  r = await api(`PUT`, `/admin/users/${targetId}/status`, { status: 0 }, token)
  ok(r.status === 200, `禁用用户 (${r.status})`)
  // 被禁用用户登录应失败
  const normLogin2 = await api('POST', '/auth/login', { username: uname, password: '123456' })
  ok(normLogin2.status === 401 || normLogin2.status === 403, `被禁用用户无法登录 (${normLogin2.status})`)
  r = await api(`PUT`, `/admin/users/${targetId}/status`, { status: 1 }, token)
  ok(r.status === 200, `重新启用用户 (${r.status})`)

  // 9. 重置密码
  console.log('7. 重置密码')
  r = await api(`PUT`, `/admin/users/${targetId}/password`, { new_password: '654321' }, token)
  ok(r.status === 200, `重置密码 (${r.status})`)
  const normLogin3 = await api('POST', '/auth/login', { username: uname, password: '654321' })
  ok(normLogin3.status === 200, `新密码可登录`)

  // 10. 操作日志
  console.log('8. 操作日志')
  r = await api('GET', '/admin/logs', null, token)
  ok(r.status === 200 && Array.isArray(r.data.logs) && r.data.logs.length >= 2, `日志已记录 (${r.status})`)
  if (r.status === 200) {
    console.log(`    日志条数=${r.data.total}`)
    r.data.logs.slice(0, 3).forEach(l => console.log(`    [${l.action}] ${l.admin_name} -> ${l.target_name || ''}`))
  }

  // 11. 删除用户
  console.log('9. 删除用户')
  const uname2 = 'del' + Date.now().toString().slice(-6)
  await api('POST', '/auth/register', { username: uname2, password: '123456' })
  const delLogin = await api('POST', '/auth/login', { username: uname2, password: '123456' })
  const delId = delLogin.data.user.id
  r = await api('DELETE', `/admin/users/${delId}`, null, token)
  ok(r.status === 200, `删除用户 (${r.status})`)
  r = await api('GET', `/admin/users/${delId}`, null, token)
  ok(r.status === 404, `删除后查不到该用户 (${r.status})`)

  console.log(`=== 结果: ${passed} 通过, ${failed} 失败 ===`)
  process.exit(failed === 0 ? 0 : 1)
}
main().catch(e => { console.log('崩溃:', e.message); process.exit(1) })
