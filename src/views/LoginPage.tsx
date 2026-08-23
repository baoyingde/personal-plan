import { useState } from 'react'
import { authApi } from '../api/client'

interface LoginPageProps {
  onLogin: () => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await authApi.login(username.trim(), password)
      } else {
        await authApi.register(username.trim(), password, nickname.trim() || undefined)
        await authApi.login(username.trim(), password)
      }
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">🎯</div>
        <h1 className="login-title">生活规划</h1>
        <p className="login-sub">数据现在保存在云端服务器，登录后多设备同步</p>

        <div className="login-tabs">
          <button
            className={`login-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => { setMode('login'); setError('') }}
          >
            登录
          </button>
          <button
            className={`login-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => { setMode('register'); setError('') }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">用户名</label>
            <input
              className="input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="输入用户名"
              autoComplete="username"
            />
          </div>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">昵称（可选）</label>
              <input
                className="input"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="显示名称"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">密码</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? '至少 6 位' : '输入密码'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
          </button>
        </form>
      </div>
    </div>
  )
}
