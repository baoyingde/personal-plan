import '@testing-library/jest-dom'
import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'
import { mockFetch, resetMockDb } from './mockApi'

const getStore = () => useStore.getState()

describe('第三版：手动保存', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false, lastSavedAt: null, dirty: false })
  })

  it('saveNow 更新 lastSavedAt', async () => {
    const store = getStore()
    expect(store.lastSavedAt).toBeNull()
    await store.saveNow()
    expect(getStore().lastSavedAt).not.toBeNull()
  })
})

describe('第三版：父子任务级联', () => {
  beforeEach(async () => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
    // 先创建学科（走 mock API）
    await getStore().addSubject('数学', '#4f46e5')
  })

  it('勾选父任务时所有子任务一起完成', async () => {
    const subjectId = getStore().data.subjects[0].id
    await getStore().addStudyTask({
      title: '总任务', subjectId, notes: '',
      subtasks: [{ text: '子任务1', done: false }, { text: '子任务2', done: false }],
    })
    const taskId = getStore().data.studyTasks[0].id

    await getStore().toggleStudyTask(taskId)

    const task = getStore().data.studyTasks[0]
    expect(task.status).toBe('done')
    expect(task.subtasks.every(s => s.done)).toBe(true)
  })

  it('取消勾选父任务时所有子任务一起取消', async () => {
    const subjectId = getStore().data.subjects[0].id
    await getStore().addStudyTask({
      title: '总任务', subjectId, notes: '',
      subtasks: [{ text: '子任务1', done: true }, { text: '子任务2', done: true }],
    })
    const taskId = getStore().data.studyTasks[0].id

    await getStore().toggleStudyTask(taskId)
    expect(getStore().data.studyTasks[0].status).toBe('done')

    await getStore().toggleStudyTask(taskId)
    const task = getStore().data.studyTasks[0]
    expect(task.status).toBe('todo')
    expect(task.subtasks.every(s => !s.done)).toBe(true)
  })

  it('所有子任务完成后自动完成父任务', async () => {
    const subjectId = getStore().data.subjects[0].id
    await getStore().addStudyTask({
      title: '背单词', subjectId, notes: '',
      subtasks: [{ text: '第1单元', done: false }, { text: '第2单元', done: false }],
    })
    const taskId = getStore().data.studyTasks[0].id

    await getStore().toggleSubtask(taskId, 0)
    expect(getStore().data.studyTasks[0].status).toBe('todo')
    await getStore().toggleSubtask(taskId, 1)
    expect(getStore().data.studyTasks[0].status).toBe('done')
    expect(getStore().data.studyTasks[0].completedAt).toBeDefined()
  })

  it('取消子任务后父任务回到未完成', async () => {
    const subjectId = getStore().data.subjects[0].id
    await getStore().addStudyTask({
      title: '实验', subjectId, notes: '',
      subtasks: [{ text: 'a', done: true }, { text: 'b', done: true }],
    })
    const taskId = getStore().data.studyTasks[0].id

    await getStore().toggleStudyTask(taskId)
    expect(getStore().data.studyTasks[0].status).toBe('done')
    await getStore().toggleSubtask(taskId, 0)
    expect(getStore().data.studyTasks[0].status).toBe('todo')
  })

  it('无子任务的任务勾选不受影响', async () => {
    const subjectId = getStore().data.subjects[0].id
    await getStore().addStudyTask({ title: '简单任务', subjectId, notes: '', subtasks: [] })
    const taskId = getStore().data.studyTasks[0].id
    await getStore().toggleStudyTask(taskId)
    expect(getStore().data.studyTasks[0].status).toBe('done')
    expect(getStore().data.studyTasks[0].completedAt).toBeDefined()
  })
})

describe('第三版：锻炼完成打卡', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('标记某天锻炼完成', async () => {
    const store = getStore()
    expect(store.isExerciseDateCompleted('2025-09-01')).toBe(false)
    await store.toggleExerciseCompletedDate('2025-09-01')
    expect(getStore().isExerciseDateCompleted('2025-09-01')).toBe(true)
    expect(getStore().data.exerciseCompletedDates).toContain('2025-09-01')
  })

  it('再次点击取消完成标记', async () => {
    const store = getStore()
    await store.toggleExerciseCompletedDate('2025-09-01')
    await store.toggleExerciseCompletedDate('2025-09-01')
    expect(getStore().data.exerciseCompletedDates).not.toContain('2025-09-01')
  })

  it('多天打卡互不影响', async () => {
    const store = getStore()
    await store.toggleExerciseCompletedDate('2025-09-01')
    await store.toggleExerciseCompletedDate('2025-09-02')
    expect(getStore().data.exerciseCompletedDates).toHaveLength(2)
  })
})

describe('第三版：登录与数据加载', () => {
  beforeEach(() => {
    resetMockDb()
    mockFetch()
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('init 从后端加载数据', async () => {
    // 预置 mock 数据
    const { seedMock } = require('./mockApi')
    seedMock('/api/memos', [{ id: 1, text: '来自服务器的备忘', done: 0, pinned: 0, sort_order: 1, created_at: '2026-09-01' }])
    useStore.setState({ data: getFreshAppData(), loading: true })
    await getStore().init()
    const memos = getStore().data.memos
    expect(memos.length).toBeGreaterThan(0)
    expect(memos[0].text).toBe('来自服务器的备忘')
  })
})
