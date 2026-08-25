import { useState } from 'react'
import { useStore } from '../store/store'
import { setToken, setUser, authApi } from '../api/client'

export default function SettingsView() {
  const { data, updateSettings } = useStore()
  const { settings } = data

  // Period editing
  const [editPeriods, setEditPeriods] = useState(false)
  const [periods, setPeriods] = useState(settings.periods)

  // 修改密码
  const [showChangePw, setShowChangePw] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwOk, setPwOk] = useState('')

  const handleChangePw = async () => {
    setPwError('')
    setPwOk('')
    if (!oldPw || !newPw) { setPwError('请填写完整'); return }
    if (newPw.length < 6) { setPwError('新密码至少 6 位'); return }
    if (newPw !== newPw2) { setPwError('两次输入的新密码不一致'); return }
    if (oldPw === newPw) { setPwError('新密码不能和旧密码相同'); return }
    try {
      await authApi.changePassword(oldPw, newPw)
      setPwOk('密码修改成功！下次登录请使用新密码')
      setOldPw(''); setNewPw(''); setNewPw2('')
      setShowChangePw(false)
    } catch (e) {
      setPwError(e instanceof Error ? e.message : '修改失败')
    }
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    window.dispatchEvent(new CustomEvent('lp:logout'))
  }

  const handleSavePeriods = () => {
    updateSettings({ periods })
    setEditPeriods(false)
  }

  // 当前登录用户信息
  let currentUser: { username?: string; nickname?: string } | null = null
  try {
    const s = localStorage.getItem('lp_user')
    if (s) currentUser = JSON.parse(s)
  } catch { /* ignore */ }

  return (
    <div style={{ maxWidth: 600 }}>
      {/* 账号信息 */}
      <div className="card mb-16">
        <div className="card-header">👤 账号信息</div>
        <div className="card-body">
          <p className="text-sm text-secondary mb-16">
            第三版起，你的数据保存在服务器数据库中，登录后即可使用，多设备数据一致。
          </p>
          <div className="flex items-center gap-8 mb-16">
            <span style={{ fontSize: 40 }}>🫡</span>
            <div>
              <div className="fw-600">{currentUser?.nickname || currentUser?.username || '已登录'}</div>
              <div className="text-sm text-secondary">用户名：{currentUser?.username}</div>
            </div>
          </div>
          <div className="flex gap-8">
            <button className="btn" onClick={handleLogout}>退出登录</button>
            <button className="btn btn-primary" onClick={() => setShowChangePw(true)}>修改密码</button>
          </div>
          {pwOk && <div style={{ color: 'var(--success)', fontSize: 13, marginTop: 8 }}>{pwOk}</div>}
        </div>
      </div>

      {/* 修改密码弹窗 */}
      {showChangePw && (
        <div className="modal-overlay" onClick={() => setShowChangePw(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><span>修改密码</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowChangePw(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">旧密码</label>
                <input className="input" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">新密码（至少 6 位）</label>
                <input className="input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">确认新密码</label>
                <input className="input" type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} />
              </div>
              {pwError && <div style={{ color: 'var(--danger)', fontSize: 13 }}>{pwError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowChangePw(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleChangePw}>确认修改</button>
            </div>
          </div>
        </div>
      )}

      {/* 学期设置 */}
      <div className="card mb-16">
        <div className="card-header">📅 学期设置</div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">学期名称</label>
            <input className="input" value={settings.semesterName} onChange={e => updateSettings({ semesterName: e.target.value })} placeholder="如：2025-2026 第一学期" />
          </div>
          <div className="form-group">
            <label className="form-label">开学日期（周一）</label>
            <input className="input" type="date" value={settings.semesterStartDate} onChange={e => updateSettings({ semesterStartDate: e.target.value })} />
          </div>
          <label className="checkbox-label mt-8">
            <input type="checkbox" checked={settings.weekendEnabled} onChange={e => updateSettings({ weekendEnabled: e.target.checked })} />
            课表显示周末
          </label>
        </div>
      </div>

      {/* 节次时间 */}
      <div className="card mb-16">
        <div className="card-header flex justify-between items-center">
          <span>⏰ 节次时间</span>
          <button className="btn btn-sm" onClick={() => { setPeriods(settings.periods); setEditPeriods(!editPeriods) }}>
            {editPeriods ? '取消' : '编辑'}
          </button>
        </div>
        <div className="card-body">
          {editPeriods ? (
            <>
              {periods.map((p, i) => (
                <div key={i} className="flex items-center gap-8 mb-8">
                  <input className="input" value={p.name} onChange={e => {
                    const next = [...periods]; next[i] = { ...next[i], name: e.target.value }; setPeriods(next)
                  }} style={{ width: 100 }} />
                  <input className="input" type="time" value={p.startTime} onChange={e => {
                    const next = [...periods]; next[i] = { ...next[i], startTime: e.target.value }; setPeriods(next)
                  }} style={{ width: 100 }} />
                  <span>-</span>
                  <input className="input" type="time" value={p.endTime} onChange={e => {
                    const next = [...periods]; next[i] = { ...next[i], endTime: e.target.value }; setPeriods(next)
                  }} style={{ width: 100 }} />
                  <button className="btn btn-ghost btn-sm text-danger" onClick={() => {
                    const next = periods.filter((_, j) => j !== i); setPeriods(next)
                  }}>删除</button>
                </div>
              ))}
              <div className="flex gap-8 mt-8">
                <button className="btn btn-sm" onClick={() => setPeriods([...periods, { name: `第${periods.length * 2 + 1}-${periods.length * 2 + 2}节`, startTime: '', endTime: '' }])}>+ 添加节次</button>
                <button className="btn btn-primary btn-sm" onClick={handleSavePeriods}>保存</button>
              </div>
            </>
          ) : (
            <div>
              {settings.periods.map((p, i) => (
                <div key={i} className="flex items-center gap-8" style={{ padding: '4px 0', fontSize: 13 }}>
                  <span className="fw-600" style={{ width: 80 }}>{p.name}</span>
                  <span className="text-secondary">{p.startTime} - {p.endTime}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 首页卡片 */}
      <div className="card mb-16">
        <div className="card-header">🏠 首页卡片显示</div>
        <div className="card-body">
          {([
            ['study', '学习任务'], ['timetable', '今日课表'], ['memo', '未完成备忘'],
            ['exercise', '今天锻炼'], ['entertainment', '今天娱乐'], ['diet', '今日饮食'],
          ] as [keyof typeof settings.homeCards, string][]).map(([key, label]) => (
            <label key={key} className="checkbox-label" style={{ padding: '4px 0' }}>
              <input type="checkbox" checked={settings.homeCards[key]}
                onChange={e => updateSettings({ homeCards: { ...settings.homeCards, [key]: e.target.checked } })} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* 外观 */}
      <div className="card mb-16">
        <div className="card-header">🎨 外观</div>
        <div className="card-body">
          <label className="form-label">主题</label>
          <select className="select" value={settings.theme} onChange={e => updateSettings({ theme: e.target.value as 'light' | 'dark' })}>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
      </div>

      {/* 关于 */}
      <div className="card">
        <div className="card-header">ℹ️ 关于</div>
        <div className="card-body text-sm text-secondary">
          <div>生活规划 App v3.0</div>
          <div>第三版：数据存储于服务器数据库（MySQL），支持用户登录。</div>
          <div>音乐：在线搜索播放（试听用途）。</div>
        </div>
      </div>
    </div>
  )
}
