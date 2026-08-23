// 全链路验证（纯 fetch，无 spawn；需后端已在运行）
const BASE = 'http://localhost:3001/api'
let passed = 0
let failed = 0
const ok = (c, l) => { if (c) { passed++; console.log('  PASS', l) } else { failed++; console.log('  FAIL', l) } }
const api = async (method, path, body, token) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = 'Bearer ' + token
  const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return { status: r.status, data: await r.json().catch(() => null) }
}

async function main() {
  console.log('=== 第三版全链路验证（真实 MySQL）===')
  const uname = 's' + Date.now().toString().slice(-6)
  let r = await api('POST', '/auth/register', { username: uname, password: '123456', nickname: '同学' })
  ok(r.status === 201, '注册新用户')
  r = await api('POST', '/auth/register', { username: uname, password: '123456' })
  ok(r.status === 409, '重复注册被拒')
  r = await api('POST', '/auth/login', { username: uname, password: '123456' })
  ok(r.status === 200 && r.data.token, '登录获取JWT')
  const token = r.data.token
  r = await api('POST', '/auth/login', { username: uname, password: 'wrong' })
  ok(r.status === 401, '错误密码被拒')
  r = await api('GET', '/auth/me', null, token)
  ok(r.status === 200 && r.data.username === uname, '获取当前用户')
  r = await api('GET', '/memos')
  ok(r.status === 401, '无token被拒')

  r = await api('POST', '/memos', { text: '交作业' }, token)
  ok(r.status === 201, '新增备忘')
  const memoId = r.data.id
  r = await api('GET', '/memos', null, token)
  ok(r.status === 200 && r.data.length === 1, '查询备忘')
  r = await api('PUT', `/memos/${memoId}`, { done: true }, token)
  ok(r.status === 200, '标记完成')
  r = await api('DELETE', `/memos/${memoId}`, null, token)
  ok(r.status === 200, '删除备忘')

  r = await api('POST', '/study/subjects', { name: '高数', color: '#4f46e5' }, token)
  ok(r.status === 201, '新增学科')
  const sid = r.data.id
  r = await api('POST', '/study/tasks', { subject_id: sid, title: '习题', subtasks: [{ text: 'q1', done: false }] }, token)
  ok(r.status === 201 && Array.isArray(r.data.subtasks), '新增任务含子任务')

  r = await api('POST', '/exercise/entries', { day_of_week: 1, name: '跑步', detail: '30分' }, token)
  ok(r.status === 201, '锻炼条目')
  r = await api('POST', '/exercise/completions', { date: '2026-09-07' }, token)
  ok(r.status === 201, '锻炼打卡')
  r = await api('GET', '/exercise/completions', null, token)
  ok(r.status === 200 && r.data.includes('2026-09-07'), '查询打卡')

  r = await api('POST', '/diet/records', { date: '2026-09-07', meal: 'lunch', name: '米饭', calories: 200 }, token)
  ok(r.status === 201, '饮食记录')
  r = await api('GET', '/diet/records?date=2026-09-07', null, token)
  ok(r.status === 200 && r.data.length === 1, '按日期查饮食')
  r = await api('POST', '/diet/presets', { name: '苹果', unit: '1个', default_calories: 80 }, token)
  ok(r.status === 201, '常用食物')

  r = await api('POST', '/entertainments', { title: '看电影', date: '2026-09-12', type: 'movie' }, token)
  ok(r.status === 201, '娱乐活动')
  r = await api('PUT', `/entertainments/${r.data.id}`, { done: true }, token)
  ok(r.status === 200, '完成活动')

  r = await api('POST', '/courses', { name: '线代', day_of_week: 3, period_index: 0 }, token)
  ok(r.status === 201, '新增课程')
  r = await api('PUT', '/courses/settings', { semester_name: '2026秋', theme: 'dark', periods: [{ name: '第1节', startTime: '08:00', endTime: '08:45' }] }, token)
  ok(r.status === 200, '保存设置')
  r = await api('GET', '/courses/settings', null, token)
  ok(r.status === 200 && r.data.semester_name === '2026秋' && Array.isArray(r.data.periods), '读取设置')

  const uname2 = 't' + Date.now().toString().slice(-6)
  await api('POST', '/auth/register', { username: uname2, password: '123456' })
  const lg2 = await api('POST', '/auth/login', { username: uname2, password: '123456' })
  r = await api('GET', '/memos', null, lg2.data.token)
  ok(r.status === 200 && r.data.length === 0, '多用户隔离')

  console.log(`=== 结果: ${passed} 通过, ${failed} 失败 ===`)
  process.exit(failed === 0 ? 0 : 1)
}
main().catch(e => { console.log('崩溃:', e.message); process.exit(1) })
