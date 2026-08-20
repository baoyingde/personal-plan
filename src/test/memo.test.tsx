import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'

const getStore = () => useStore.getState()

describe('备忘录模块', () => {
  beforeEach(() => {
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('添加备忘录', () => {
    const store = getStore()
    store.addMemo('买菜')
    
    expect(getStore().data.memos).toHaveLength(1)
    expect(getStore().data.memos[0].text).toBe('买菜')
  })

  it('勾选待办后完成', () => {
    const store = getStore()
    store.addMemo('测试待办')
    const memoId = getStore().data.memos[0].id
    
    store.toggleMemo(memoId)
    expect(getStore().data.memos[0].done).toBe(true)
  })

  it('置顶功能', () => {
    const store = getStore()
    store.addMemo('普通')
    store.addMemo('重要的')
    const memoId = getStore().data.memos[1].id
    store.updateMemo(memoId, { pinned: true })
    
    expect(getStore().data.memos[1].pinned).toBe(true)
  })

  it('带截止日期的待办', () => {
    const store = getStore()
    store.addMemo('交报告', '2025-09-01')
    
    expect(getStore().data.memos[0].dueDate).toBe('2025-09-01')
  })

  it('删除待办', () => {
    const store = getStore()
    store.addMemo('要删的')
    const memoId = getStore().data.memos[0].id
    
    store.deleteMemo(memoId)
    expect(getStore().data.memos).toHaveLength(0)
  })

  it('编辑待办文本', () => {
    const store = getStore()
    store.addMemo('原文')
    const memoId = getStore().data.memos[0].id
    
    store.updateMemo(memoId, { text: '修改后' })
    expect(getStore().data.memos[0].text).toBe('修改后')
  })
})
