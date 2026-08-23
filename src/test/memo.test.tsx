import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb } from './mockApi'

const getStore = () => useStore.getState()

describe('备忘录模块（第三版·后端存储）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('添加备忘录', async () => {
    await getStore().addMemo('买菜')
    expect(getStore().data.memos).toHaveLength(1)
    expect(getStore().data.memos[0].text).toBe('买菜')
  })

  it('勾选待办后完成', async () => {
    await getStore().addMemo('测试待办')
    const memoId = getStore().data.memos[0].id
    await getStore().toggleMemo(memoId)
    expect(getStore().data.memos[0].done).toBe(true)
  })

  it('置顶功能', async () => {
    await getStore().addMemo('普通')
    await getStore().addMemo('重要的')
    const memoId = getStore().data.memos[1].id
    await getStore().updateMemo(memoId, { pinned: true })
    expect(getStore().data.memos[1].pinned).toBe(true)
  })

  it('带截止日期的待办', async () => {
    await getStore().addMemo('交报告', '2025-09-01')
    expect(getStore().data.memos[0].dueDate).toBe('2025-09-01')
  })

  it('删除待办', async () => {
    await getStore().addMemo('要删的')
    const memoId = getStore().data.memos[0].id
    await getStore().deleteMemo(memoId)
    expect(getStore().data.memos).toHaveLength(0)
  })

  it('编辑待办文本', async () => {
    await getStore().addMemo('原文')
    const memoId = getStore().data.memos[0].id
    await getStore().updateMemo(memoId, { text: '修改后' })
    expect(getStore().data.memos[0].text).toBe('修改后')
  })
})
