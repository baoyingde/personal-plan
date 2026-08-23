import { useStore } from '../store/store'
import { todayStr, semesterWeek, isOddWeek } from '../utils/date'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb } from './mockApi'

const getStore = () => useStore.getState()

describe('学期课表模块（第三版·后端存储）', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    const fresh = getFreshAppData()
    fresh.settings.semesterName = '2025-2026 第一学期'
    fresh.settings.semesterStartDate = todayStr()
    useStore.setState({ data: fresh, loading: false })
  })

  it('设置学期后周次计算正确', () => {
    const today = todayStr()
    expect(semesterWeek(today, today)).toBe(1)
    expect(isOddWeek(today, today)).toBe(true)
  })

  it('添加课程', async () => {
    await getStore().addCourse({ name: '高等数学', dayOfWeek: 1, periodIndex: 0, location: 'A101', weekType: 'every', color: '#4f46e5' })
    expect(getStore().data.courses).toHaveLength(1)
    expect(getStore().data.courses[0].name).toBe('高等数学')
  })

  it('单周课程只在单周显示', async () => {
    await getStore().addCourse({ name: '单周课', dayOfWeek: 1, periodIndex: 0, location: '', weekType: 'odd', color: '#ef4444' })
    await getStore().addCourse({ name: '双周课', dayOfWeek: 2, periodIndex: 0, location: '', weekType: 'even', color: '#22c55e' })

    const odd = isOddWeek(todayStr(), getStore().data.settings.semesterStartDate)
    const visible = getStore().data.courses.filter(c => {
      if (c.weekType === 'every') return true
      if (c.weekType === 'odd') return odd
      return !odd
    })
    expect(visible).toHaveLength(1)
  })

  it('删除课程', async () => {
    await getStore().addCourse({ name: '要删的课', dayOfWeek: 1, periodIndex: 0, location: '', weekType: 'every', color: '#999' })
    const courseId = getStore().data.courses[0].id
    await getStore().deleteCourse(courseId)
    expect(getStore().data.courses).toHaveLength(0)
  })

  it('更新课程信息', async () => {
    await getStore().addCourse({ name: '原名', dayOfWeek: 1, periodIndex: 0, location: '', weekType: 'every', color: '#999' })
    const courseId = getStore().data.courses[0].id
    await getStore().updateCourse(courseId, { name: '新名', location: 'B202' })
    expect(getStore().data.courses[0].name).toBe('新名')
    expect(getStore().data.courses[0].location).toBe('B202')
  })
})
