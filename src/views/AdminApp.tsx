import { useState, useEffect, useCallback } from 'react'
import { adminApi, getAdminToken, setAdminToken } from '../api/client'
import '../styles/admin.css'

type AdminTab = 'dashboard' | 'users' | 'logs'

interface UserRow {
  id: number
  username: string
  nickname: string
  role: string
  status: number
  created_at: string
  dataCounts: Record<string, number>
}

export default function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<AdminTab>('dashboard')

  // 登录状态
  useEffect(() => {
    const t = getAdminToken()
    if (t) {
      // 用 stats 验证 token 有效性
      adminApi.stats().then(() => setLoggedIn(true)).catch(() => setLoggedIn(false)).finally(() => setChecking(false))
    } else {
      setChecking(false)
    }
    const onLogout = () => setLoggedIn(false)
    window.addEventListener('lp:admin-logout', onLogout)
    return () => window.removeEventListener('lp:admin-logout', onLogout)
  }, [])

  const handleLogout = () => {
    setAdminToken(null)
    setLoggedIn(false)
  }

  if (checking) return <div className="admin-loading">加载中…</div>

  if (!loggedIn) {
    return <AdminLogin onSuccess={() => setLoggedIn(true)} />
  }

  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div className="admin-logo">🛠 管理后台</div>
        <nav>
          <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>📊 仪表盘</button>
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>👥 用户管理</button>
          <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}>📜 操作日志</button>
        </nav>
        <div className="admin-sidebar-bottom">
          <button onClick={handleLogout}>退出登录</button>
        </div>
      </aside>
      <main className="admin-main">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'users' && <UserList />}
        {tab === 'logs' && <AdminLogs />}
      </main>
    </div>
  )
}

// ===== 登录 =====
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminApi.login(username.trim(), password)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-page">
      <form className="admin-login-card" onSubmit={submit}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🛠</div>
        <h1>后台管理</h1>
        <p className="admin-login-sub">生活规划 App 管理控制台</p>
        <div className="form-group">
          <label className="form-label">管理员账号</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" />
        </div>
        <div className="form-group">
          <label className="form-label">密码</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" />
        </div>
        {error && <div className="login-error">{error}</div>}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  )
}

// ===== 仪表盘 =====
function Dashboard() {
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminApi.stats().then(setStats).catch(e => setError(e.message))
  }, [])

  if (error) return <div className="admin-card">加载失败：{error}</div>
  if (!stats) return <div className="admin-loading">加载中…</div>

  const dataLabels: Record<string, string> = {
    subjects: '学科', study_tasks: '学习任务', exercise_entries: '锻炼条目',
    exercise_completions: '锻炼打卡', diet_records: '饮食记录', food_presets: '常用食物',
    entertainments: '娱乐活动', courses: '课程', memos: '备忘录',
  }

  return (
    <div>
      <h2 className="admin-title">仪表盘</h2>
      <div className="admin-stats-grid">
        <div className="admin-stat-card"><div className="admin-stat-num">{stats.userCount}</div><div>用户总数</div></div>
        <div className="admin-stat-card"><div className="admin-stat-num">{stats.todayReg}</div><div>今日注册</div></div>
        <div className="admin-stat-card"><div className="admin-stat-num">{stats.adminCount}</div><div>管理员</div></div>
        <div className="admin-stat-card"><div className="admin-stat-num" style={{ color: stats.disabledCount > 0 ? 'var(--danger)' : undefined }}>{stats.disabledCount}</div><div>已禁用</div></div>
      </div>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h3>各模块数据量</h3>
        <div className="admin-data-bars">
          {Object.entries(stats.dataCounts).map(([k, v]) => (
            <div key={k} className="admin-data-bar">
              <span className="admin-data-label">{dataLabels[k] || k}</span>
              <div className="admin-data-track"><div className="admin-data-fill" style={{ width: `${Math.min(100, (Number(v) / Math.max(...Object.values(stats.dataCounts as Record<string, number>), 1)) * 100)}%` }} /></div>
              <span className="admin-data-val">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card" style={{ marginTop: 16 }}>
        <h3>近 7 天注册趋势</h3>
        <div className="admin-trend">
          {stats.trend.map((t: { date: string; count: number }) => (
            <div key={t.date} className="admin-trend-item">
              <div className="admin-trend-bar" style={{ height: `${Math.max(4, t.count * 30)}px` }} />
              <span className="admin-trend-label">{t.date.slice(5)}</span>
              <span className="admin-trend-val">{t.count}</span>
            </div>
          ))}
          {stats.trend.length === 0 && <div className="text-secondary">近 7 天无新注册</div>}
        </div>
      </div>
    </div>
  )
}

// ===== 用户列表 =====
function UserList() {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<{ total: number; users: UserRow[] } | null>(null)
  const [error, setError] = useState('')
  const [detailUser, setDetailUser] = useState<any>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: string; user: UserRow } | null>(null)
  const [newPass, setNewPass] = useState('')
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await adminApi.users({ keyword: keyword || undefined, page, pageSize: 10 })
      setData(r)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [keyword, page])

  useEffect(() => { load() }, [load])

  const pageCount = data ? Math.max(1, Math.ceil(data.total / 10)) : 1

  const execConfirm = async () => {
    if (!confirmAction) return
    try {
      if (confirmAction.type === 'disable') await adminApi.setStatus(confirmAction.user.id, 0)
      else if (confirmAction.type === 'enable') await adminApi.setStatus(confirmAction.user.id, 1)
      else if (confirmAction.type === 'delete') await adminApi.remove(confirmAction.user.id)
      else if (confirmAction.type === 'grant_admin') await adminApi.setRole(confirmAction.user.id, 'admin')
      else if (confirmAction.type === 'revoke_admin') await adminApi.setRole(confirmAction.user.id, 'user')
      setConfirmAction(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    }
  }

  const execReset = async () => {
    if (!resetTarget || !newPass) return
    try {
      await adminApi.resetPassword(resetTarget.id, newPass)
      setResetTarget(null)
      setNewPass('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '重置失败')
    }
  }

  return (
    <div>
      <h2 className="admin-title">用户管理</h2>
      <div className="admin-toolbar">
        <input className="input" style={{ width: 240 }} placeholder="搜索用户名/昵称" value={keyword}
          onChange={e => { setKeyword(e.target.value); setPage(1) }} />
        <button className="btn" onClick={load}>搜索</button>
        <span className="text-secondary" style={{ marginLeft: 'auto' }}>共 {data?.total ?? 0} 个用户</span>
      </div>

      {error && <div className="login-error">{error}</div>}

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>用户名</th><th>昵称</th><th>角色</th><th>状态</th><th>注册日期</th><th>数据量</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.nickname || '-'}</td>
                <td>{u.role === 'admin' ? <span className="badge badge-accent">管理员</span> : <span className="badge">用户</span>}</td>
                <td>{u.status === 1 ? <span className="badge badge-success">正常</span> : <span className="badge badge-danger">禁用</span>}</td>
                <td>{u.created_at || '-'}</td>
                <td className="text-secondary">{Object.values(u.dataCounts).reduce((a, b) => a + b, 0)}</td>
                <td>
                  <div className="admin-actions">
                    <button className="btn btn-sm" onClick={() => adminApi.userDetail(u.id).then(setDetailUser)}>详情</button>
                    {u.role === 'admin'
                      ? <button className="btn btn-sm" onClick={() => setConfirmAction({ type: 'revoke_admin', user: u })}>取消管理员</button>
                      : <button className="btn btn-sm btn-primary" onClick={() => setConfirmAction({ type: 'grant_admin', user: u })}>设为管理员</button>}
                    {u.role !== 'admin' && (
                      <>
                        {u.status === 1
                          ? <button className="btn btn-sm" onClick={() => setConfirmAction({ type: 'disable', user: u })}>禁用</button>
                          : <button className="btn btn-sm btn-primary" onClick={() => setConfirmAction({ type: 'enable', user: u })}>启用</button>}
                        <button className="btn btn-sm" onClick={() => setResetTarget(u)}>重置密码</button>
                        <button className="btn btn-sm btn-danger" onClick={() => setConfirmAction({ type: 'delete', user: u })}>删除</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {data && data.users.length === 0 && (
              <tr><td colSpan={8} className="text-center text-secondary" style={{ padding: 24 }}>没有匹配的用户</td></tr>
            )}
          </tbody>
        </table>
        <div className="admin-pagination">
          <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
          <span>{page} / {pageCount}</span>
          <button className="btn btn-sm" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>下一页</button>
        </div>
      </div>

      {/* 用户详情弹窗 */}
      {detailUser && (
        <div className="modal-overlay" onClick={() => setDetailUser(null)}>
          <div className="modal" style={{ width: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>用户详情：{detailUser.user.username}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailUser(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="text-secondary mb-16">
                ID: {detailUser.user.id} ｜ 昵称: {detailUser.user.nickname || '-'} ｜ 角色: {detailUser.user.role} ｜ 注册: {detailUser.user.created_at}
              </p>
              <h4>业务数据（只读）</h4>
              {(['studyTasks', 'memos', 'courses', 'exerciseEntries', 'entertainments'] as const).map(key => {
                const list = detailUser.data[key] || []
                return (
                  <div key={key} className="admin-detail-block">
                    <strong>{key}</strong>（{list.length} 条）
                    {list.length > 0 && (
                      <ul className="admin-detail-list">
                        {list.slice(0, 5).map((item: any, i: number) => (
                          <li key={i}>{item.title || item.text || item.name || item.username || JSON.stringify(item).slice(0, 60)}</li>
                        ))}
                        {list.length > 5 && <li className="text-secondary">…还有 {list.length - 5} 条</li>}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 确认操作弹窗 */}
      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span>确认操作</span></div>
            <div className="modal-body">
              <p>
                {confirmAction.type === 'disable' && `确定要禁用用户「${confirmAction.user.username}」吗？禁用后该用户无法登录。`}
                {confirmAction.type === 'enable' && `确定要重新启用用户「${confirmAction.user.username}」吗？`}
                {confirmAction.type === 'delete' && `确定要删除用户「${confirmAction.user.username}」吗？将同时删除其全部业务数据，此操作不可恢复！`}
                {confirmAction.type === 'grant_admin' && `确定要将「${confirmAction.user.username}」设为管理员吗？该用户将获得后台管理权限。`}
                {confirmAction.type === 'revoke_admin' && `确定要取消「${confirmAction.user.username}」的管理员权限吗？该用户将变为普通用户。`}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setConfirmAction(null)}>取消</button>
              <button className={`btn ${confirmAction.type === 'delete' ? 'btn-danger' : 'btn-primary'}`} onClick={execConfirm}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span>重置密码：{resetTarget.username}</span></div>
            <div className="modal-body">
              <label className="form-label">新密码（至少 6 位）</label>
              <input className="input" type="text" value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setResetTarget(null)}>取消</button>
              <button className="btn btn-primary" onClick={execReset} disabled={newPass.length < 6}>确认重置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ===== 操作日志 =====
function AdminLogs() {
  const [logs, setLogs] = useState<Array<{ id: number; admin_name: string; action: string; target_name: string; detail: string; created_at: string }>>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const actionLabels: Record<string, string> = {
    delete_user: '删除用户', disable_user: '禁用用户', enable_user: '启用用户',
    reset_password: '重置密码', grant_admin: '设为管理员', revoke_admin: '取消管理员',
  }

  useEffect(() => {
    adminApi.logs(page, 20).then(r => { setLogs(r.logs); setTotal(r.total) }).catch(() => {})
  }, [page])

  return (
    <div>
      <h2 className="admin-title">操作日志</h2>
      <div className="admin-card">
        <table className="admin-table">
          <thead><tr><th>时间</th><th>操作人</th><th>操作</th><th>目标</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td className="text-secondary">{l.created_at}</td>
                <td>{l.admin_name}</td>
                <td>{actionLabels[l.action] || l.action}</td>
                <td>{l.target_name || '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="text-center text-secondary" style={{ padding: 24 }}>暂无日志</td></tr>}
          </tbody>
        </table>
        <div className="admin-pagination">
          <span>共 {total} 条</span>
          {page > 1 && <button className="btn btn-sm" onClick={() => setPage(p => p - 1)}>上一页</button>}
          {logs.length === 20 && <button className="btn btn-sm" onClick={() => setPage(p => p + 1)}>下一页</button>}
        </div>
      </div>
    </div>
  )
}
