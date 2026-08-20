import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../App'

describe('App 布局与导航', () => {
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

  it('点击不同导航项都能切换', async () => {
    render(<App />)
    await waitForApp()
    const views = ['exercise', 'diet', 'entertainment', 'timetable', 'music', 'memo', 'settings'] as const
    for (const view of views) {
      fireEvent.click(screen.getByTestId(`nav-${view}`))
      expect(screen.getByTestId(`nav-${view}`)).toHaveClass('active')
    }
  })

  it('顶栏显示今天日期', async () => {
    render(<App />)
    await waitForApp()
    const topbar = screen.getByTestId('topbar')
    const today = new Date()
    const month = today.getMonth() + 1
    const day = today.getDate()
    expect(topbar.textContent).toContain(`${month}月${day}日`)
  })
})
