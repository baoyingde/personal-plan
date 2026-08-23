// 后端路由集成测试（不依赖真实 MySQL，用内存 mock 模拟数据库连接池）
// 运行: node server/test/run-tests.js

const http = require('http')
const path = require('path')

// ---- 简易内存数据库 ----
const memDB = {
  users: [],
  memos: [],
  subjects: [],
  study_tasks: [],
  exercise_entries: [],
  exercise_completions: [],
  diet_records: [],
  food_presets: [],
  entertainments: [],
  courses: [],
  user_settings: [],
}
let seq = 1

// 模拟 mysql2/promise 连接池接口：query(sql, params)
const mockPool = {
  async query(sql, params = []) {
    const table = inferTable(sql)
    return handleQuery(table, sql, params)
  },
}

function inferTable(sql) {
  const s = sql.toLowerCase()
  if (s.includes('from users') || s.includes('into users') || s.includes('update users')) return 'users'
  if (s.includes('from memos') || s.includes('into memos') || s.includes('update memos')) return 'memos'
  if (s.includes('from subjects') || s.includes('into subjects') || s.includes('update subjects')) return 'subjects'
  if (s.includes('from study_tasks') || s.includes('into study_tasks') || s.includes('update study_tasks')) return 'study_tasks'
  if (s.includes('from exercise_entries') || s.includes('into exercise_entries') || s.includes('update exercise_entries')) return 'exercise_entries'
  if (s.includes('from exercise_completions') || s.includes('into exercise_completions') || s.includes('update exercise_completions')) return 'exercise_completions'
  if (s.includes('from diet_records') || s.includes('into diet_records') || s.includes('update diet_records')) return 'diet_records'
  if (s.includes('from food_presets') || s.includes('into food_presets') || s.includes('update food_presets')) return 'food_presets'
  if (s.includes('from entertainments') || s.includes('into entertainments') || s.includes('update entertainments')) return 'entertainments'
  if (s.includes('from courses') || s.includes('into courses') || s.includes('update courses')) return 'courses'
  if (s.includes('from user_settings') || s.includes('into user_settings') || s.includes('update user_settings')) return 'user_settings'
  return null
}

function handleQuery(table, sql, params) {
  const s = sql.toLowerCase().trim()
  const rows = memDB[table] || []

  if (s.startsWith('insert')) {
    // INSERT INTO ... VALUES (?,?,...)
    const m = s.match(/values\s*\(([\s\S]*?)\)/i)
    const placeholders = m ? m[1].split(',').length : params.length
    const record = {}
    const columns = sql.match(/\(([^)]+)\)\s*values/i)
    const colNames = columns ? columns[1].split(',').map(c => c.trim().replace(/`/g, '')) : []
    colNames.forEach((c, i) => { record[c] = params[i] })
    if (record.id === undefined) record.id = seq++
    // JSON 字段处理
    if (record.subtasks && typeof record.subtasks === 'string') record.subtasks = JSON.parse(record.subtasks)
    if (record.periods_json && typeof record.periods_json === 'string') record.periods_json = JSON.parse(record.periods_json)
    if (record.home_cards_json && typeof record.home_cards_json === 'string') record.home_cards_json = JSON.parse(record.home_cards_json)
    rows.push(record)
    return [{ insertId: record.id }]
  }

  if (s.startsWith('update')) {
    const idM = sql.match(/where\s+id\s*=\s*\?/i)
    const id = idM ? Number(params[params.length - 1]) : null
    const setPart = sql.match(/set\s+([\s\S]*?)\s+where/i)
    if (setPart && id) {
      const assignments = setPart[1].split(',').map(a => a.trim())
      const target = rows.find(r => r.id === id)
      if (target) {
        let p = 0
        for (const a of assignments) {
          const cm = a.match(/^(\w+)\s*=\s*coalesce\(\?,\s*\1\)|^(\w+)\s*=\s*\?/i)
          const col = cm ? (cm[1] || cm[2]) : null
          if (col && col !== 'id') {
            const val = params[p]
            if (val !== null && val !== undefined) target[col] = val
            p++
          }
        }
        // 处理 JSON 字段
        if (target.subtasks && typeof target.subtasks === 'string') target.subtasks = JSON.parse(target.subtasks)
      }
    }
    return [{}]
  }

  if (s.startsWith('delete')) {
    const last = params[params.length - 1]
    const idx = rows.findIndex(r => r.id === Number(last))
    if (idx >= 0) rows.splice(idx, 1)
    return [{}]
  }

  // SELECT
  if (s.includes('where id = ?') && params.length === 1) {
    return [rows.filter(r => r.id === Number(params[0]))]
  }
  if (s.includes('where username = ?')) {
    return [rows.filter(r => r.username === params[0])]
  }
  if (s.includes('where user_id = ?') || s.includes('where user_id = ? ')) {
    const uid = Number(params[0])
    return [rows.filter(r => r.user_id === uid)]
  }
  if (s.includes('where user_id = ? and date = ?')) {
    const uid = Number(params[0]); const date = params[1]
    return [rows.filter(r => r.user_id === uid && r.date === date)]
  }
  // 默认返回全部（user_settings 单行）
  return [rows]
}

// ---- 加载后端应用（注入 mock pool）----
// 直接 require 路由并用 express 组装，绕过 pool.js（用 mock）
process.env.JWT_SECRET = 'test-secret'
const express = require('express')
const cors = require('cors')

// 临时替换 pool 模块
const Module = require('module')
const origRequire = Module.prototype.require
Module.prototype.require = function (id) {
  if (id === './pool' || id === '../pool' || id === './db/pool' || id === '../db/pool' || id === '../../db/pool') {
    return mockPool
  }
  return origRequire.apply(this, arguments)
}

const authRoutes = require('./routes/auth')
const memoRoutes = require('./routes/memos')
const studyRoutes = require('./routes/study')
const exerciseRoutes = require('./routes/exercise')
const dietRoutes = require('./routes/diet')
const entertainmentRoutes = require('./routes/entertainments')
const courseRoutes = require('./routes/courses')

const app = express()
app.use(cors())
app.use(express.json())
app.use('/api/auth', authRoutes)
app.use('/api/memos', memoRoutes)
app.use('/api/study', studyRoutes)
app.use('/api/exercise', exerciseRoutes)
app.use('/api/diet', dietRoutes)
app.use('/api/entertainments', entertainmentRoutes)
app.use('/api/courses', courseRoutes)

// ---- 测试辅助 ----
let passed = 0
let failed = 0
const failures = []

function assert(cond, msg) {
  if (cond) { passed++; console.log('  ✅', msg) }
  else { failed++; failures.push(msg); console.log('  ❌', msg) }
}

function request(method, url, body, token) {
  return new Promise((resolve) => {
    const data = body ? JSON.stringify(body) : null
    const req = http.request({ host: '127.0.0.1', port: 3999, path: url, method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Length': data ? Buffer.byteLength(data) : 0 } }, res => {
      let chunk = ''
      res.on('data', d => chunk += d)
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(chunk) } catch { /* ignore */ }
        resolve({ status: res.statusCode, body: json })
      })
    })
    req.on('error', e => resolve({ status: 0, body: null, error: e.message }))
    if (data) req.write(data)
    req.end()
  })
}

// ---- 主流程 ----
async function main() {
  const server = app.listen(3999, async () => {
    console.log('=== 后端集成测试（mock 数据库）===\n')

    // 1. 注册
    console.log('1. 用户注册与登录')
    let r = await request('POST', '/api/auth/register', { username: 'student', password: '123456', nickname: '大学生' })
    assert(r.status === 201, `注册成功 (${r.status})`)
    r = await request('POST', '/api/auth/register', { username: 'student', password: '123456' })
    assert(r.status === 409, `重复用户名被拒绝 (${r.status})`)
    r = await request('POST', '/api/auth/login', { username: 'student', password: '123456' })
    assert(r.status === 200 && r.body.token, `登录成功并返回 token`)
    const token = r.body.token
    r = await request('POST', '/api/auth/login', { username: 'student', password: 'wrong' })
    assert(r.status === 401, `错误密码被拒绝 (${r.status})`)

    // 2. 无 token 访问业务接口
    console.log('2. 认证保护')
    r = await request('GET', '/api/memos')
    assert(r.status === 401, `无 token 访问被拒绝 (${r.status})`)

    // 3. 备忘录 CRUD
    console.log('3. 备忘录 CRUD')
    r = await request('POST', '/api/memos', { text: '交作业' }, token)
    assert(r.status === 201 && r.body.text === '交作业', `新增备忘 (${r.status})`)
    const memoId = r.body.id
    r = await request('GET', '/api/memos', null, token)
    assert(r.status === 200 && r.body.length === 1, `查询备忘列表 (${r.status})`)
    r = await request('PUT', `/api/memos/${memoId}`, { done: 1 }, token)
    assert(r.status === 200, `标记完成 (${r.status})`)
    r = await request('DELETE', `/api/memos/${memoId}`, null, token)
    assert(r.status === 200, `删除备忘 (${r.status})`)
    r = await request('GET', '/api/memos', null, token)
    assert(r.body.length === 0, `删除后为空`)

    // 4. 学习计划
    console.log('4. 学习计划（学科+任务）')
    r = await request('POST', '/api/study/subjects', { name: '数学', color: '#4f46e5' }, token)
    assert(r.status === 201, `新增学科 (${r.status})`)
    const subjectId = r.body.id
    r = await request('POST', '/api/study/tasks', { subject_id: subjectId, title: '做习题', subtasks: [{ text: '第1题', done: false }] }, token)
    assert(r.status === 201 && Array.isArray(r.body.subtasks), `新增任务（子任务为数组）`)
    r = await request('GET', '/api/study/tasks', null, token)
    assert(r.status === 200 && r.body.length === 1, `查询任务`)
    r = await request('PUT', `/api/study/tasks/${r.body[0].id}`, { status: 'done' }, token)
    assert(r.status === 200, `完成任务 (${r.status})`)

    // 5. 锻炼
    console.log('5. 锻炼计划')
    r = await request('POST', '/api/exercise/entries', { day_of_week: 1, name: '跑步', detail: '30分钟' }, token)
    assert(r.status === 201, `新增锻炼条目 (${r.status})`)
    r = await request('POST', '/api/exercise/completions', { date: '2026-09-01' }, token)
    assert(r.status === 201, `锻炼打卡 (${r.status})`)
    r = await request('GET', '/api/exercise/completions', null, token)
    assert(r.status === 200 && r.body.includes('2026-09-01'), `查询打卡记录`)

    // 6. 饮食
    console.log('6. 饮食计划')
    r = await request('POST', '/api/diet/records', { date: '2026-09-01', meal: 'lunch', name: '米饭', calories: 200 }, token)
    assert(r.status === 201, `新增饮食记录 (${r.status})`)
    r = await request('GET', '/api/diet/records?date=2026-09-01', null, token)
    assert(r.status === 200 && r.body.length === 1, `按日期查询饮食`)
    r = await request('POST', '/api/diet/presets', { name: '苹果', unit: '1个', default_calories: 80 }, token)
    assert(r.status === 201, `新增常用食物 (${r.status})`)

    // 7. 娱乐
    console.log('7. 娱乐计划')
    r = await request('POST', '/api/entertainments', { title: '看电影', date: '2026-09-05', type: 'movie' }, token)
    assert(r.status === 201, `新增娱乐活动 (${r.status})`)
    r = await request('PUT', `/api/entertainments/${r.body.id}`, { done: 1 }, token)
    assert(r.status === 200, `标记活动完成 (${r.status})`)

    // 8. 课表
    console.log('8. 学期课表')
    r = await request('POST', '/api/courses', { name: '高等数学', day_of_week: 1, period_index: 0, week_type: 'every' }, token)
    assert(r.status === 201, `新增课程 (${r.status})`)
    r = await request('PUT', '/api/courses/settings', { semester_name: '2026秋', theme: 'dark' }, token)
    assert(r.status === 200, `保存设置 (${r.status})`)
    r = await request('GET', '/api/courses/settings', null, token)
    assert(r.status === 200 && r.body.semester_name === '2026秋', `读取设置`)

    // 9. 多用户隔离
    console.log('9. 多用户数据隔离')
    const r2 = await request('POST', '/api/auth/register', { username: 'teacher', password: '123456' })
    const token2 = r2.status === 201 ? (await request('POST', '/api/auth/login', { username: 'teacher', password: '123456' })).body.token : null
    if (token2) {
      const r3 = await request('GET', '/api/memos', null, token2)
      assert(r3.status === 200 && r3.body.length === 0, `新用户看不到别人的备忘`)
    }

    console.log(`\n=== 结果: ${passed} 通过, ${failed} 失败 ===`)
    if (failures.length) { failures.forEach(f => console.log('失败项:', f)) }
    server.close()
    process.exit(failed === 0 ? 0 : 1)
  })
}

main().catch(e => { console.error('测试崩溃:', e); process.exit(1) })
