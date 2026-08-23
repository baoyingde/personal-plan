import { useStore } from '../store/store'
import { todayStr, getDayOfWeek } from '../utils/date'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb } from './mockApi'

const getStore = () => useStore.getState()

describe('首页预览数据（第三版·后端存储）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('有待办时数据正确', async () => {
    await getStore().addMemo('首页测试待办')
    expect(getStore().data.memos).toHaveLength(1)
    expect(getStore().data.memos[0].text).toBe('首页测试待办')
  })

  it('学期设置后周次计算', async () => {
    await getStore().updateSettings({ semesterName: '测试学期', semesterStartDate: todayStr() })
    expect(getStore().data.settings.semesterName).toBe('测试学期')
    expect(getStore().data.settings.semesterStartDate).toBe(todayStr())
  })

  it('有课程时数据正确', async () => {
    const todayDow = getDayOfWeek(todayStr())
    await getStore().addCourse({ name: '今日课程测试', dayOfWeek: todayDow, periodIndex: 0, location: '教室A', weekType: 'every', color: '#4f46e5' })
    expect(getStore().data.courses).toHaveLength(1)
    expect(getStore().data.courses[0].name).toBe('今日课程测试')
  })

  it('有饮食记录时数据正确', async () => {
    await getStore().addFoodItem(todayStr(), 'lunch', { id: 'home-test-1', name: '测试食物', amount: '', calories: 500 })
    const record = getStore().data.dietRecords.find(r => r.date === todayStr())
    expect(record).toBeDefined()
    expect(record!.meals.lunch[0].calories).toBe(500)
  })

  it('有锻炼安排时数据正确', async () => {
    const todayDow = getDayOfWeek(todayStr())
    await getStore().addExerciseEntry({ dayOfWeek: todayDow, name: '今日锻炼', detail: '跑步30分钟' })
    const todayExercises = getStore().data.exerciseEntries.filter(e => e.dayOfWeek === todayDow)
    expect(todayExercises).toHaveLength(1)
    expect(todayExercises[0].name).toBe('今日锻炼')
  })

  it('有娱乐活动时数据正确', async () => {
    await getStore().addEntertainment({ title: '今日娱乐', date: todayStr(), type: 'other', notes: '', done: false })
    const todayEnts = getStore().data.entertainments.filter(e => e.date === todayStr())
    expect(todayEnts).toHaveLength(1)
    expect(todayEnts[0].title).toBe('今日娱乐')
  })
})
