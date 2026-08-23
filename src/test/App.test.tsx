import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../App'
import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb } from './mockApi'

describe('App 布局与导航（第三版·登录后）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    // 预置登录态
    localStorage.setItem('lp_token', 'mock-token')
    localStorage.setItem('lp_user', JSON.stringify({ id: 1, username: 'test' }))
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  afterEach(() => {
    localStorage.clear()
  })

  const waitForApp = async () => {
    await waitFor(() => {
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })
  }

  it('渲染左侧导航栏', async () => {
    render(<App />)
    await waitForApp()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('渲染顶栏', async () => {
    render(<App />)
    await waitForApp()
    expect(screen.getByTestId('topbar')).toBeInTheDocument()
  })

  it('渲染内容区', async () => {
    render(<App />)
    await waitForApp()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })

  it('导航包含全部 9 个入口', async () => {
    render(<App />)
    await waitForApp()
    expect(screen.getByTestId('nav-home')).toBeInTheDocument()
    expect(screen.getByTestId('nav-study')).toBeInTheDocument()
    expect(screen.getByTestId('nav-exercise')).toBeInTheDocument()
    expect(screen.getByTestId('nav-diet')).toBeInTheDocument()
    expect(screen.getByTestId('nav-entertainment')).toBeInTheDocument()
    expect(screen.getByTestId('nav-timetable')).toBeInTheDocument()
    expect(screen.getByTestId('nav-music')).toBeInTheDocument()
    expect(screen.getByTestId('nav-memo')).toBeInTheDocument()
    expect(screen.getByTestId('nav-settings')).toBeInTheDocument()
  })

  it('默认显示首页', async () => {
    render(<App />)
    await waitForApp()
    expect(screen.getByTestId('nav-home')).toHaveClass('active')
  })

  it('点击导航项切换页面', async () => {
    render(<App />)
    await waitForApp()
    fireEvent.click(screen.getByTestId('nav-study'))
    expect(screen.getByTestId('nav-study')).toHaveClass('active')
    expect(screen.getByTestId('nav-home')).not.toHaveClass('active')
  })

  it('未登录时显示登录页', async () => {
    localStorage.clear()
    render(<App />)
    await waitFor(() => {
      expect(screen.getAllByText('登录').length).toBeGreaterThan(0)
      expect(screen.getByPlaceholderText('输入用户名')).toBeInTheDocument()
    })
  })
})
