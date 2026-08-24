import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdminApp from '../views/AdminApp'
import { adminApi, getAdminToken } from '../api/client'
import { mockFetch, resetMockDb } from './mockApi'

describe('后台管理（第四版新功能）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('未登录时显示管理员登录页', async () => {
    render(<AdminApp />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument()
      expect(screen.getByText('后台管理')).toBeInTheDocument()
    })
  })

  it('管理员登录后保存 token 并进入仪表盘', async () => {
    render(<AdminApp />)
    await waitFor(() => expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('用户名'), { target: { value: 'tzjsb' } })
    fireEvent.change(screen.getByPlaceholderText('密码'), { target: { value: 'admin123456' } })
    fireEvent.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(getAdminToken()).toBe('mock-admin-token')
      expect(screen.getByText('仪表盘')).toBeInTheDocument()
    })
  })

  it('adminApi.login 调用管理员登录接口', async () => {
    const result = await adminApi.login('tzjsb', 'admin123456')
    expect(result.token).toBe('mock-admin-token')
    expect(getAdminToken()).toBe('mock-admin-token')
  })

  it('adminApi.stats 获取统计', async () => {
    localStorage.setItem('lp_admin_token', 'mock-admin-token')
    const stats = await adminApi.stats()
    expect(stats.userCount).toBe(10)
    expect(stats.todayReg).toBe(2)
  })

  it('adminApi.users 获取用户列表', async () => {
    localStorage.setItem('lp_admin_token', 'mock-admin-token')
    const r = await adminApi.users({ page: 1, pageSize: 10 })
    expect(r.total).toBe(1)
    expect(r.users[0].username).toBe('tzjsb')
    expect(r.users[0].role).toBe('admin')
  })

  it('adminApi 重置密码与禁用用户', async () => {
    localStorage.setItem('lp_admin_token', 'mock-admin-token')
    const r1 = await adminApi.setStatus(2, 0)
    expect(r1.ok).toBe(true)
    const r2 = await adminApi.resetPassword(2, 'newpass1')
    expect(r2.ok).toBe(true)
  })

  it('adminApi.logs 获取操作日志', async () => {
    localStorage.setItem('lp_admin_token', 'mock-admin-token')
    const r = await adminApi.logs()
    expect(r.total).toBe(2)
    expect(r.logs[0].admin_name).toBe('tzjsb')
  })
})
