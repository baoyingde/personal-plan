// 前端 API 客户端：封装所有后端接口调用
// 统一处理：baseURL、token 注入、401 跳登录

const API_BASE = 'http://localhost:3001/api'

// 获取 token（存 localStorage）
export function getToken(): string | null {
  return localStorage.getItem('lp_token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('lp_token', token)
  else localStorage.removeItem('lp_token')
}

export function getUserId(): number | null {
  const s = localStorage.getItem('lp_user')
  if (!s) return null
  try { return JSON.parse(s).id } catch { return null }
}

export function setUser(user: unknown) {
  if (user) localStorage.setItem('lp_user', JSON.stringify(user))
  else localStorage.removeItem('lp_user')
}

// 通用请求
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await resp.json().catch(() => null)

  if (resp.status === 401) {
    // 登录过期：清除本地状态，跳登录
    setToken(null)
    setUser(null)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lp:logout'))
    }
    throw new Error('登录已过期，请重新登录')
  }

  if (!resp.ok) {
    throw new Error((data && data.error) || `请求失败 (${resp.status})`)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),
}

// ===== 认证 =====
export const authApi = {
  register: (username: string, password: string, nickname?: string) =>
    api.post('/auth/register', { username, password, nickname }),
  login: async (username: string, password: string) => {
    const data = await api.post<{ token: string; user: unknown }>('/auth/login', { username, password })
    setToken(data.token)
    setUser(data.user)
    return data
  },
  me: () => api.get('/auth/me'),
}

// ===== 备忘录 =====
export const memoApi = {
  list: () => api.get('/memos'),
  create: (text: string, due_date?: string | null) => api.post('/memos', { text, due_date }),
  update: (id: number, patch: Record<string, unknown>) => api.put(`/memos/${id}`, patch),
  remove: (id: number) => api.del(`/memos/${id}`),
}

// ===== 学习计划 =====
export const studyApi = {
  subjects: {
    list: () => api.get('/study/subjects'),
    create: (name: string, color: string) => api.post('/study/subjects', { name, color }),
    update: (id: number, patch: Record<string, unknown>) => api.put(`/study/subjects/${id}`, patch),
    remove: (id: number) => api.del(`/study/subjects/${id}`),
  },
  tasks: {
    list: () => api.get('/study/tasks'),
    create: (task: Record<string, unknown>) => api.post('/study/tasks', task),
    update: (id: number, patch: Record<string, unknown>) => api.put(`/study/tasks/${id}`, patch),
    remove: (id: number) => api.del(`/study/tasks/${id}`),
  },
}

// ===== 锻炼 =====
export const exerciseApi = {
  entries: {
    list: () => api.get('/exercise/entries'),
    create: (e: Record<string, unknown>) => api.post('/exercise/entries', e),
    update: (id: number, patch: Record<string, unknown>) => api.put(`/exercise/entries/${id}`, patch),
    remove: (id: number) => api.del(`/exercise/entries/${id}`),
  },
  completions: {
    list: () => api.get('/exercise/completions'),
    add: (date: string) => api.post('/exercise/completions', { date }),
    remove: (date: string) => api.del(`/exercise/completions/${date}`),
  },
}

// ===== 饮食 =====
export const dietApi = {
  records: {
    list: (date?: string) => api.get(`/diet/records${date ? `?date=${date}` : ''}`),
    create: (r: Record<string, unknown>) => api.post('/diet/records', r),
    update: (id: number, patch: Record<string, unknown>) => api.put(`/diet/records/${id}`, patch),
    remove: (id: number) => api.del(`/diet/records/${id}`),
  },
  presets: {
    list: () => api.get('/diet/presets'),
    create: (p: Record<string, unknown>) => api.post('/diet/presets', p),
    remove: (id: number) => api.del(`/diet/presets/${id}`),
  },
}

// ===== 娱乐 =====
export const entApi = {
  list: (date?: string) => api.get(`/entertainments${date ? `?date=${date}` : ''}`),
  create: (e: Record<string, unknown>) => api.post('/entertainments', e),
  update: (id: number, patch: Record<string, unknown>) => api.put(`/entertainments/${id}`, patch),
  remove: (id: number) => api.del(`/entertainments/${id}`),
}

// ===== 课表 =====
export const courseApi = {
  list: () => api.get('/courses'),
  create: (c: Record<string, unknown>) => api.post('/courses', c),
  update: (id: number, patch: Record<string, unknown>) => api.put(`/courses/${id}`, patch),
  remove: (id: number) => api.del(`/courses/${id}`),
  settings: {
    get: () => api.get('/courses/settings'),
    save: (s: Record<string, unknown>) => api.put('/courses/settings', s),
  },
}

// ===== 在线音乐 =====
export const musicApi = {
  search: (keyword: string, limit = 20) =>
    api.get<Array<{ id: number; name: string; artist: string; album: string; duration: number }>>(`/music/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`),
  playUrl: (id: number) => api.get<{ url: string; id: number }>(`/music/play?id=${id}`),
}

// ===== 后台管理 =====
// 管理员 token 单独存（与用户 token 分开）
export function getAdminToken(): string | null {
  return localStorage.getItem('lp_admin_token')
}
export function setAdminToken(token: string | null) {
  if (token) localStorage.setItem('lp_admin_token', token)
  else localStorage.removeItem('lp_admin_token')
}

async function adminRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAdminToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const resp = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await resp.json().catch(() => null)

  if (resp.status === 401 || resp.status === 403) {
    setAdminToken(null)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('lp:admin-logout'))
    }
    throw new Error((data && data.error) || '无权限')
  }
  if (!resp.ok) {
    throw new Error((data && data.error) || `请求失败 (${resp.status})`)
  }
  return data as T
}

export const adminApi = {
  login: async (username: string, password: string) => {
    const data = await api.post<{ token: string; admin: unknown }>('/admin/login', { username, password })
    setAdminToken(data.token)
    return data
  },
  stats: () => adminRequest<{
    userCount: number; todayReg: number; adminCount: number; disabledCount: number;
    dataCounts: Record<string, number>; trend: Array<{ date: string; count: number }>
  }>('GET', '/admin/stats'),
  users: (params: { keyword?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params.keyword) q.set('keyword', params.keyword)
    if (params.page) q.set('page', String(params.page))
    if (params.pageSize) q.set('pageSize', String(params.pageSize))
    return adminRequest<{
      total: number; page: number; pageSize: number;
      users: Array<{ id: number; username: string; nickname: string; role: string; status: number; created_at: string; dataCounts: Record<string, number> }>
    }>('GET', `/admin/users?${q}`)
  },
  userDetail: (id: number) => adminRequest<any>('GET', `/admin/users/${id}`),
  setStatus: (id: number, status: number) => adminRequest<{ ok: boolean }>('PUT', `/admin/users/${id}/status`, { status }),
  resetPassword: (id: number, new_password: string) => adminRequest<{ ok: boolean }>('PUT', `/admin/users/${id}/password`, { new_password }),
  remove: (id: number) => adminRequest<{ ok: boolean }>('DELETE', `/admin/users/${id}`),
  logs: (page = 1, pageSize = 20) => adminRequest<{ total: number; logs: Array<{ id: number; admin_name: string; action: string; target_name: string; detail: string; created_at: string }> }>('GET', `/admin/logs?page=${page}&pageSize=${pageSize}`),
}
