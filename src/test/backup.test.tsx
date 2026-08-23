import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb, seedMock } from './mockApi'

const getStore = () => useStore.getState()

describe('第三版：后端数据存储（替代原本地备份）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('添加的数据会发送到后端（mock 服务器）', async () => {
    await getStore().addMemo('存到服务器的备忘')
    // 数据已进入前端状态
    expect(getStore().data.memos.length).toBeGreaterThan(0)
    expect(getStore().data.memos[0].text).toBe('存到服务器的备忘')
  })

  it('登录接口返回 token 并保存', async () => {
    const { authApi } = require('../api/client')
    const result = await authApi.login('testuser', '123456')
    expect(result.token).toBe('mock-token')
    expect(localStorage.getItem('lp_token')).toBe('mock-token')
  })

  it('注册接口创建用户', async () => {
    const { authApi } = require('../api/client')
    const result = await authApi.register('newuser', '123456', '新人')
    expect(result.username).toBe('newuser')
  })

  it('init 从后端加载全部数据', async () => {
    seedMock('/api/memos', [{ id: 1, text: '服务器备忘', done: 0, pinned: 0, sort_order: 1, created_at: '2026-09-01' }])
    seedMock('/api/study/subjects', [{ id: 1, name: '数学', color: '#4f46e5' }])
    useStore.setState({ data: getFreshAppData(), loading: true })
    await getStore().init()
    expect(getStore().data.memos.length).toBe(1)
    expect(getStore().data.subjects.length).toBe(1)
    expect(getStore().data.subjects[0].name).toBe('数学')
  })

  it('设置保存到后端', async () => {
    await getStore().updateSettings({ semesterName: '服务器学期' })
    expect(getStore().data.settings.semesterName).toBe('服务器学期')
  })
})
