import { useStore } from '../store/store'
import { todayStr, semesterWeek, isOddWeek, getDayOfWeek } from '../utils/date'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb } from './mockApi'

const getStore = () => useStore.getState()

describe('数据层与后端持久化（第三版）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('初始状态为空数据', () => {
    const state = getStore()
    expect(state.data.subjects).toEqual([])
    expect(state.data.studyTasks).toEqual([])
    expect(state.data.courses).toEqual([])
    expect(state.data.memos).toEqual([])
  })

  it('添加学科后数据持久化（发往后端）', async () => {
    await getStore().addSubject('数学', '#4f46e5')
    const updated = getStore()
    expect(updated.data.subjects).toHaveLength(1)
    expect(updated.data.subjects[0].name).toBe('数学')
    expect(updated.data.subjects[0].color).toBe('#4f46e5')
  })

  it('添加任务后数据持久化', async () => {
    await getStore().addSubject('物理', '#ef4444')
    const subjectId = getStore().data.subjects[0].id
    await getStore().addStudyTask({ title: '复习力学', subjectId, notes: '', subtasks: [{ text: '看课本', done: false }] })
    const updated = getStore()
    expect(updated.data.studyTasks).toHaveLength(1)
    expect(updated.data.studyTasks[0].title).toBe('复习力学')
    expect(updated.data.studyTasks[0].status).toBe('todo')
  })

  it('添加备忘录后数据持久化', async () => {
    await getStore().addMemo('买牛奶')
    await getStore().addMemo('交作业', '2025-09-01')
    const updated = getStore()
    expect(updated.data.memos).toHaveLength(2)
    expect(updated.data.memos[0].text).toBe('买牛奶')
    expect(updated.data.memos[0].done).toBe(false)
    expect(updated.data.memos[1].dueDate).toBe('2025-09-01')
  })

  it('切换备忘录完成状态', async () => {
    await getStore().addMemo('测试')
    const memoId = getStore().data.memos[0].id
    await getStore().toggleMemo(memoId)
    expect(getStore().data.memos[0].done).toBe(true)
    await getStore().toggleMemo(memoId)
    expect(getStore().data.memos[0].done).toBe(false)
  })

  it('删除备忘录', async () => {
    await getStore().addMemo('要删的')
    const memoId = getStore().data.memos[0].id
    await getStore().deleteMemo(memoId)
    expect(getStore().data.memos).toHaveLength(0)
  })

  it('添加课程后数据持久化', async () => {
    await getStore().addCourse({ name: '高等数学', dayOfWeek: 1, periodIndex: 0, location: 'A101', weekType: 'every', color: '#4f46e5' })
    const updated = getStore()
    expect(updated.data.courses).toHaveLength(1)
    expect(updated.data.courses[0].name).toBe('高等数学')
    expect(updated.data.courses[0].weekType).toBe('every')
  })

  it('添加锻炼条目', async () => {
    await getStore().addExerciseEntry({ dayOfWeek: 1, name: '胸部训练', detail: '卧推 4×10', timeRange: '18:00-19:00' })
    const updated = getStore()
    expect(updated.data.exerciseEntries).toHaveLength(1)
    expect(updated.data.exerciseEntries[0].name).toBe('胸部训练')
  })

  it('添加饮食记录', async () => {
    await getStore().addFoodItem(todayStr(), 'lunch', { id: 'test-1', name: '米饭', amount: '1碗', calories: 200 })
    const updated = getStore()
    expect(updated.data.dietRecords).toHaveLength(1)
    expect(updated.data.dietRecords[0].meals.lunch).toHaveLength(1)
    expect(updated.data.dietRecords[0].meals.lunch[0].calories).toBe(200)
  })

  it('添加娱乐活动', async () => {
    await getStore().addEntertainment({
      title: '看电影', date: '2025-09-01', startTime: '19:00', endTime: '21:00',
      location: '万达影城', type: 'movie', notes: '', done: false,
    })
    const updated = getStore()
    expect(updated.data.entertainments).toHaveLength(1)
    expect(updated.data.entertainments[0].title).toBe('看电影')
  })
})

describe('日期工具函数', () => {
  it('todayStr 返回今天日期', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('semesterWeek 计算周次', () => {
    const today = todayStr()
    expect(semesterWeek(today, today)).toBe(1)
  })

  it('getDayOfWeek 返回正确星期', () => {
    const dow = getDayOfWeek(todayStr())
    expect(dow).toBeGreaterThanOrEqual(1)
    expect(dow).toBeLessThanOrEqual(7)
  })
})
