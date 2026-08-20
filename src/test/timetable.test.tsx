import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from '../App'
import { useStore } from '../store/store'
import { todayStr, semesterWeek, isOddWeek } from '../utils/date'
import { getFreshAppData } from './helpers'

const getStore = () => useStore.getState()

describe('学期课表模块', () => {
  beforeEach(() => {
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

  it('添加课程', () => {
    const store = getStore()
    store.addCourse({
      name: '高等数学',
      dayOfWeek: 1,
      periodIndex: 0,
      location: 'A101',
      weekType: 'every',
      color: '#4f46e5',
    })
    
    expect(getStore().data.courses).toHaveLength(1)
    expect(getStore().data.courses[0].name).toBe('高等数学')
  })

  it('单周课程只在单周显示', () => {
    const store = getStore()
    store.addCourse({
      name: '单周课',
      dayOfWeek: 1,
      periodIndex: 0,
      location: '',
      weekType: 'odd',
      color: '#ef4444',
    })
    
    store.addCourse({
      name: '双周课',
      dayOfWeek: 2,
      periodIndex: 0,
      location: '',
      weekType: 'even',
      color: '#22c55e',
    })
    
    const today = todayStr()
    const odd = isOddWeek(today, getStore().data.settings.semesterStartDate)
    
    const courses = getStore().data.courses
    const visibleCourses = courses.filter(c => {
      if (c.weekType === 'every') return true
      if (c.weekType === 'odd') return odd
      return !odd
    })
    
    expect(visibleCourses).toHaveLength(1)
  })

  it('删除课程', () => {
    const store = getStore()
    store.addCourse({
      name: '要删的课',
      dayOfWeek: 1,
      periodIndex: 0,
      location: '',
      weekType: 'every',
      color: '#999',
    })
    
    const courseId = getStore().data.courses[0].id
    store.deleteCourse(courseId)
    
    expect(getStore().data.courses).toHaveLength(0)
  })

  it('更新课程信息', () => {
    const store = getStore()
    store.addCourse({
      name: '原名',
      dayOfWeek: 1,
      periodIndex: 0,
      location: '',
      weekType: 'every',
      color: '#999',
    })
    
    const courseId = getStore().data.courses[0].id
    store.updateCourse(courseId, { name: '新名', location: 'B202' })
    
    const updated = getStore().data.courses[0]
    expect(updated.name).toBe('新名')
    expect(updated.location).toBe('B202')
  })
})
