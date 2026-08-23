import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb } from './mockApi'

const getStore = () => useStore.getState()

describe('锻炼计划模块（第三版·后端存储）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('添加锻炼条目', async () => {
    await getStore().addExerciseEntry({ dayOfWeek: 1, name: '胸部训练', detail: '卧推 4×10', timeRange: '18:00-19:00' })
    expect(getStore().data.exerciseEntries).toHaveLength(1)
    expect(getStore().data.exerciseEntries[0].name).toBe('胸部训练')
  })

  it('按星期筛选锻炼条目', async () => {
    await getStore().addExerciseEntry({ dayOfWeek: 1, name: '周一练', detail: '' })
    await getStore().addExerciseEntry({ dayOfWeek: 3, name: '周三练', detail: '' })
    await getStore().addExerciseEntry({ dayOfWeek: 1, name: '周一练2', detail: '' })
    const mon = getStore().data.exerciseEntries.filter(e => e.dayOfWeek === 1)
    expect(mon).toHaveLength(2)
    const wed = getStore().data.exerciseEntries.filter(e => e.dayOfWeek === 3)
    expect(wed).toHaveLength(1)
  })

  it('更新锻炼条目', async () => {
    await getStore().addExerciseEntry({ dayOfWeek: 1, name: '原名', detail: '' })
    const entryId = getStore().data.exerciseEntries[0].id
    await getStore().updateExerciseEntry(entryId, { name: '新名', detail: '新说明' })
    expect(getStore().data.exerciseEntries[0].name).toBe('新名')
    expect(getStore().data.exerciseEntries[0].detail).toBe('新说明')
  })

  it('删除锻炼条目', async () => {
    await getStore().addExerciseEntry({ dayOfWeek: 1, name: '要删的', detail: '' })
    const entryId = getStore().data.exerciseEntries[0].id
    await getStore().deleteExerciseEntry(entryId)
    expect(getStore().data.exerciseEntries).toHaveLength(0)
  })

  it('7天都有锻炼安排', async () => {
    for (let d = 1; d <= 7; d++) {
      await getStore().addExerciseEntry({ dayOfWeek: d, name: `周${d}`, detail: '' })
    }
    expect(getStore().data.exerciseEntries).toHaveLength(7)
  })
})
