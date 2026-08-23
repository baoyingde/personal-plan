// 第三版全链路实测脚本（真实 MySQL）
// 用法: 先启动后端 (node src/index.js)，再运行 node test/e2e.js

const BASE = 'http://localhost:3001/api'
let passed = 0
let failed = 0

function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅', label) }
  else { failed++; console.log('  ❌', label) }
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const resp = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await resp.json().catch(() => null)
  return { status: resp.status, data }
}

async function main() {
  console.log('=== 第三版全链路实测（真实 MySQL）===\n')

  // 1. 注册
  console.log('1. 用户系统')
  const uname = 'student' + Date.now().toString().slice(-6)
  let r = await api('POST', '/auth/register', { username: uname, password: '123456', nickname: '同学' })
  ok(r.status === 201, `注册新用户 ${uname} (${r.status})`)
  r = await api('POST', '/auth/register', { username: uname, password: '123456' })
  ok(r.status === 409, `重复注册被拒 (${r.status})`)

  r = await api('POST', '/auth/login', { username: uname, password: '123456' })
  ok(r.status === 200 && r.data.token, `登录成功，获得 JWT`)
  const token = r.data.token
  r = await api('POST', '/auth/login', { username: uname, password: 'wrong' })
  ok(r.status === 401, `错误密码被拒 (${r.status})`)
  r = await api('GET', '/auth/me', null, token)
  ok(r.status === 200 && r.data.username === uname, `获取当前用户信息`)

  // 2. 认证保护
  console.log('2. 认证保护')
  r = await api('GET', '/memos')
  ok(r.status === 401, `无 token 访问业务接口被拒 (${r.status})`)

  // 3. 备忘录
  console.log('3. 备忘录')
  r = await api('POST', '/memos', { text: '交高数作业' }, token)
  ok(r.status === 201 && r.data.text === '交高数作业', `新增备忘 (${r.status})`)
  const memoId = r.data.id
  r = await api('GET', '/memos', null, token)
  ok(r.status === 200 && r.data.length === 1, `查询备忘列表`)
  r = await api('PUT', `/memos/${memoId}`, { done: true }, token)
  ok(r.status === 200 && r.data.done === 1, `标记完成`)
  r = await api('DELETE', `/memos/${memoId}`, null, token)
  ok(r.status === 200, `删除备忘`)

  // 4. 学习计划
  console.log('4. 学习计划')
  r = await api('POST', '/study/subjects', { name: '高等数学', color: '#4f46e5' }, token)
  ok(r.status === 201, `新增学科 (${r.status})`)
  const subjectId = r.data.id
  r = await api('POST', '/study/tasks', { subject_id: subjectId, title: '第三章习题', subtasks: [{ text: '第1题', done: false }, { text: '第2题', done: false }] }, token)
  ok(r.status === 201 && Array.isArray(r.data.subtasks) && r.data.subtasks.length === 2, `新增任务含子任务`)
  const taskId = r.data.id
  r = await api('GET', '/study/tasks', null, token)
  ok(r.status === 200 && r.data.length === 1, `查询任务`)
  r = await api('PUT', `/study/tasks/${taskId}`, { status: 'done', subtasks: [{ text: '第1题', done: true }, { text: '第2题', done: true }] }, token)
  ok(r.status === 200 && r.data.status === 'done', `完成任务`)

  // 5. 锻炼
  console.log('5. 锻炼计划')
  r = await api('POST', '/exercise/entries', { day_of_week: 1, name: '胸部训练', detail: '卧推 4x10' }, token)
  ok(r.status === 201, `新增锻炼条目 (${r.status})`)
  r = await api('POST', '/exercise/completions', { date: '2026-09-07' }, token)
  ok(r.status === 201, `锻炼打卡`)
  r = await api('GET', '/exercise/completions', null, token)
  ok(r.status === 200 && r.data.includes('2026-09-07'), `查询打卡记录`)

  // 6. 饮食
  console.log('6. 饮食计划')
  r = await api('POST', '/diet/records', { date: '2026-09-07', meal: 'lunch', name: '米饭', amount: '1碗', calories: 200 }, token)
  ok(r.status === 201, `新增饮食记录 (${r.status})`)
  r = await api('GET', '/diet/records?date=2026-09-07', null, token)
  ok(r.status === 200 && r.data.length === 1, `按日期查询饮食`)
  r = await api('POST', '/diet/presets', { name: '苹果', unit: '1个', default_calories: 80 }, token)
  ok(r.status === 201, `新增常用食物 (${r.status})`)

  // 7. 娱乐
  console.log('7. 娱乐计划')
  r = await api('POST', '/entertainments', { title: '看电影', date: '2026-09-12', type: 'movie', location: '万达' }, token)
  ok(r.status === 201, `新增娱乐活动 (${r.status})`)
  r = await api('PUT', `/entertainments/${r.data.id}`, { done: true }, token)
  ok(r.status === 200, `标记活动完成`)

  // 8. 课表
  console.log('8. 学期课表')
  r = await api('POST', '/courses', { name: '线性代数', day_of_week: 3, period_index: 0, week_type: 'every' }, token)
  ok(r.status === 201, `新增课程 (${r.status})`)
  r = await api('PUT', '/courses/settings', { semester_name: '2026-2027 第一学期', theme: 'dark', periods: [{ name: '第1节', startTime: '08:00', endTime: '08:45' }] }, token)
  ok(r.status === 200, `保存学期设置`)
  r = await api('GET', '/courses/settings', null, token)
  ok(r.status === 200 && r.data.semester_name === '2026-2027 第一学期' && Array.isArray(r.data.periods), `读取设置（节次为数组）`)

  // 9. 多用户隔离
  console.log('9. 多用户数据隔离')
  const uname2 = 'teacher' + Date.now().toString().slice(-6)
  await api('POST', '/auth/register', { username: uname2, password: '123456' })
  const r2 = await api('POST', '/auth/login', { username: uname2, password: '123456' })
  const token2 = r2.data.token
  r = await api('GET', '/memos', null, token2)
  ok(r.status === 200 && r.data.length === 0, `新用户看不到别人的数据`)
  r = await api('GET', '/study/tasks', null, token2)
  ok(r.status === 200 && r.data.length === 0, `新用户的学习任务为空`)

  console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`)
  process.exit(failed === 0 ? 0 : 1)
}

// 自动启动后端（如已在运行可跳过）
// 说明：沙箱环境禁止 child_process.spawn，请在外部先启动后端：
//   node src/index.js
// 然后运行: node test/e2e.js
async function ensureServer() {
  try {
    const r = await fetch('http://localhost:3001/api/health')
    if (r.ok) return
  } catch { /* server not running */ }
  console.log('❌ 后端未启动。请先运行: cd server && node src/index.js')
  process.exit(1)
}

(async () => {
  await ensureServer()
  try { await main() } catch (e) { console.log('测试崩溃:', e.message) }
  process.exit(failed === 0 ? 0 : 1)
})()
