import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb } from './mockApi'

const getStore = () => useStore.getState()

describe('娱乐计划模块（第三版·后端存储）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('添加娱乐活动', async () => {
    await getStore().addEntertainment({
      title: '看电影', date: '2025-09-01', startTime: '19:00', endTime: '21:00',
      location: '万达影城', type: 'movie', notes: '复仇者联盟', done: false,
    })
    expect(getStore().data.entertainments).toHaveLength(1)
    expect(getStore().data.entertainments[0].title).toBe('看电影')
  })

  it('标记活动完成', async () => {
    await getStore().addEntertainment({ title: '聚会', date: '2025-09-01', type: 'gathering', notes: '', done: false })
    const entId = getStore().data.entertainments[0].id
    await getStore().toggleEntertainment(entId)
    expect(getStore().data.entertainments[0].done).toBe(true)
  })

  it('更新活动信息', async () => {
    await getStore().addEntertainment({ title: '原名', date: '2025-09-01', type: 'other', notes: '', done: false })
    const entId = getStore().data.entertainments[0].id
    await getStore().updateEntertainment(entId, { title: '新名', location: '新地点' })
    expect(getStore().data.entertainments[0].title).toBe('新名')
    expect(getStore().data.entertainments[0].location).toBe('新地点')
  })

  it('删除活动', async () => {
    await getStore().addEntertainment({ title: '要删的', date: '2025-09-01', type: 'other', notes: '', done: false })
    const entId = getStore().data.entertainments[0].id
    await getStore().deleteEntertainment(entId)
    expect(getStore().data.entertainments).toHaveLength(0)
  })

  it('按日期筛选活动', async () => {
    await getStore().addEntertainment({ title: 'A', date: '2025-09-01', type: 'other', notes: '', done: false })
    await getStore().addEntertainment({ title: 'B', date: '2025-09-02', type: 'other', notes: '', done: false })
    await getStore().addEntertainment({ title: 'C', date: '2025-09-01', type: 'other', notes: '', done: false })
    const sep1 = getStore().data.entertainments.filter(e => e.date === '2025-09-01')
    expect(sep1).toHaveLength(2)
  })

  it('不同类型活动', async () => {
    await getStore().addEntertainment({ title: '外出', date: '2025-09-01', type: 'outing', notes: '', done: false })
    await getStore().addEntertainment({ title: '运动', date: '2025-09-01', type: 'sport', notes: '', done: false })
    await getStore().addEntertainment({ title: '游戏', date: '2025-09-01', type: 'game', notes: '', done: false })
    expect(getStore().data.entertainments).toHaveLength(3)
    expect(getStore().data.entertainments.map(e => e.type)).toEqual(['outing', 'sport', 'game'])
  })
})
