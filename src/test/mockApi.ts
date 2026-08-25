// 第三版测试工具：mock fetch，模拟后端 API
// 用法：调用 mockFetch() 后，所有 fetch 请求返回配置好的数据

// 内存数据库（模拟后端）：按路径返回数据
const db: Record<string, any[]> = {
  '/api/memos': [],
  '/api/study/subjects': [],
  '/api/study/tasks': [],
  '/api/exercise/entries': [],
  '/api/exercise/completions': [],
  '/api/diet/records': [],
  '/api/diet/presets': [],
  '/api/entertainments': [],
  '/api/courses': [],
  '/api/courses/settings': [null],
}

let nextId = 1

export function resetMockDb() {
  for (const k of Object.keys(db)) db[k] = []
  db['/api/courses/settings'] = [null]
  nextId = 1
}

export function mockFetch() {
  ;(globalThis as any).fetch = async (url: string, options: any = {}) => {
    const method = (options.method || 'GET').toUpperCase()
    const path = url.replace(/^http:\/\/localhost:3001/, '').split('?')[0]
    const body = options.body ? JSON.parse(options.body) : {}

    let status = 200
    let data: any = null

    if (method === 'GET') {
      if (path === '/api/auth/me') {
        data = { id: 1, username: 'test', nickname: '测试用户' }
      } else if (path.startsWith('/api/music/search')) {
        data = [{ id: 'mock_mid', name: '测试歌曲', artist: '测试歌手', album: '测试专辑', duration: 240000, mid: 'mock_mid' }]
      } else if (path.startsWith('/api/music/play')) {
        data = { url: 'https://example.com/test.mp3', id: 'mock_mid' }
      } else if (path === '/api/admin/stats') {
        data = { userCount: 10, todayReg: 2, adminCount: 1, disabledCount: 0, dataCounts: { memos: 5, courses: 3 }, trend: [] }
      } else if (path === '/api/admin/users' || path.startsWith('/api/admin/users?')) {
        data = { total: 1, page: 1, pageSize: 10, users: [{ id: 1, username: 'tzjsb', nickname: '', role: 'admin', status: 1, created_at: '2026-08-01', dataCounts: { memos: 2 } }] }
      } else if (path.startsWith('/api/admin/users/') && !path.endsWith('/status') && !path.endsWith('/password') && !path.endsWith('/role')) {
        data = { user: { id: 1, username: 'tzjsb', nickname: '', role: 'admin', status: 1, created_at: '2026-08-01' }, data: { studyTasks: [], memos: [], courses: [], exerciseEntries: [], entertainments: [] } }
      } else if (path === '/api/admin/logs') {
        data = { total: 2, logs: [{ id: 1, admin_name: 'tzjsb', action: 'delete_user', target_name: 'user1', created_at: '2026-08-01' }] }
      } else if (db[path] !== undefined) {
        data = db[path].filter(Boolean)
      } else {
        status = 404
        data = { error: 'not found' }
      }
    } else if (method === 'POST') {
      if (path === '/api/auth/register') {
        data = { id: nextId++, username: body.username, nickname: body.nickname || body.username }
      } else if (path === '/api/auth/login') {
        data = { token: 'mock-token', user: { id: 1, username: body.username } }
      } else if (path === '/api/admin/login') {
        data = { token: 'mock-admin-token', admin: { id: 11, username: body.username } }
      } else if (path === '/api/auth/change-password') {
        data = { ok: true, message: '密码修改成功' }
      } else if (db[path] !== undefined) {
        const record = { id: body.id !== undefined ? String(body.id) : nextId++, ...body }
        db[path].push(record)
        data = record
      } else {
        status = 404
        data = { error: 'not found' }
      }
    } else if (method === 'PUT') {
      // admin 接口：状态/密码/角色
      if (path.includes('/api/admin/users/') && (path.endsWith('/status') || path.endsWith('/password') || path.endsWith('/role'))) {
        data = { ok: true, role: body.role || 'user' }
      } else {
        const seg = path.split('/')
        const last = seg[seg.length - 1]
        const id = Number(last)
        const basePath = seg.slice(0, -1).join('/')
        if (Number.isNaN(id)) {
          // 非 id 结尾（如 /api/courses/settings），整体当 basePath 处理
          const list = db[path] || []
          list[0] = { ...(list[0] || {}), ...body }
          db[path] = list
          data = list[0]
        } else {
          const list = db[basePath] || []
          const idx = list.findIndex(r => r && r.id === id)
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...body }
            data = list[idx]
          } else {
            status = 404
            data = { error: 'not found' }
          }
        }
      }
    } else if (method === 'DELETE') {
      const seg = path.split('/')
      const last = seg[seg.length - 1]
      const id = Number(last)
      const basePath = seg.slice(0, -1).join('/')
      if (db[basePath] && !Number.isNaN(id)) {
        db[basePath] = db[basePath].filter(r => !r || r.id !== id)
        data = { ok: true }
      } else {
        // 处理 DELETE /api/exercise/completions/:date 这种非 id 路径
        const completions = db['/api/exercise/completions']
        db['/api/exercise/completions'] = completions.filter((r: any) => r !== last)
        data = { ok: true }
      }
    }

    return {
      ok: status < 400,
      status,
      json: async () => data,
    }
  }
}

// 手动添加测试数据到 mock 数据库
export function seedMock(key: string, records: any[]) {
  db[key] = records
}
