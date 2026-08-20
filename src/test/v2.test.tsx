import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { saveAppData, loadAppData } from '../store/db'
import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'

const getStore = () => useStore.getState()

describe('第二版新功能：手动保存', () => {
  beforeEach(() => {
    useStore.setState({ data: getFreshAppData(), loading: false, lastSavedAt: null, dirty: false })
  })

  it('saveNow 更新 lastSavedAt', async () => {
    const store = getStore()
    expect(store.lastSavedAt).toBeNull()
    await store.saveNow()
    expect(getStore().lastSavedAt).not.toBeNull()
  })

  it('saveNow 持久化当前数据到 IndexedDB', async () => {
    const store = getStore()
    store.addMemo('保存测试')
    await store.saveNow()

    // 重新加载应能读到已保存的数据
    await store.init()
    const memos = getStore().data.memos
    expect(memos.some(m => m.text === '保存测试')).toBe(true)
  })

  it('数据变更后 dirty 标记与 saveNow 清除', async () => {
    const store = getStore()
    store.addMemo('脏数据')
    // addMemo 本身自动保存，这里验证 saveNow 后 dirty 为 false
    await store.saveNow()
    expect(getStore().dirty).toBe(false)
  })
})

describe('第二版新功能：父子任务级联', () => {
  beforeEach(() => {
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('勾选父任务时所有子任务一起完成', () => {
    const store = getStore()
    store.addSubject('数学', '#4f46e5')
    const subjectId = getStore().data.subjects[0].id
    store.addStudyTask({
      title: '总任务',
      subjectId,
      notes: '',
      subtasks: [
        { text: '子任务1', done: false },
        { text: '子任务2', done: false },
      ],
    })
    const taskId = getStore().data.studyTasks[0].id

    store.toggleStudyTask(taskId)

    const task = getStore().data.studyTasks[0]
    expect(task.status).toBe('done')
    expect(task.subtasks.every(s => s.done)).toBe(true)
  })

  it('取消勾选父任务时所有子任务一起取消', () => {
    const store = getStore()
    store.addSubject('数学', '#4f46e5')
    const subjectId = getStore().data.subjects[0].id
    store.addStudyTask({
      title: '总任务',
      subjectId,
      notes: '',
      subtasks: [
        { text: '子任务1', done: true },
        { text: '子任务2', done: true },
      ],
    })
    const taskId = getStore().data.studyTasks[0].id
    // 先勾选父任务完成
    store.toggleStudyTask(taskId)
    expect(getStore().data.studyTasks[0].status).toBe('done')
    // 再取消
    store.toggleStudyTask(taskId)
    const task = getStore().data.studyTasks[0]
    expect(task.status).toBe('todo')
    expect(task.subtasks.every(s => !s.done)).toBe(true)
  })

  it('所有子任务完成后自动完成父任务', () => {
    const store = getStore()
    store.addSubject('英语', '#22c55e')
    const subjectId = getStore().data.subjects[0].id
    store.addStudyTask({
      title: '背单词',
      subjectId,
      notes: '',
      subtasks: [
        { text: '第1单元', done: false },
        { text: '第2单元', done: false },
      ],
    })
    const taskId = getStore().data.studyTasks[0].id

    store.toggleSubtask(taskId, 0)
    expect(getStore().data.studyTasks[0].status).toBe('todo')
    store.toggleSubtask(taskId, 1)
    expect(getStore().data.studyTasks[0].status).toBe('done')
    expect(getStore().data.studyTasks[0].completedAt).toBeDefined()
  })

  it('取消子任务后父任务回到未完成', () => {
    const store = getStore()
    store.addSubject('化学', '#f59e0b')
    const subjectId = getStore().data.subjects[0].id
    store.addStudyTask({
      title: '实验',
      subjectId,
      notes: '',
      subtasks: [
        { text: 'a', done: true },
        { text: 'b', done: true },
      ],
    })
    const taskId = getStore().data.studyTasks[0].id
    // 全部完成 -> 父任务自动完成
    expect(getStore().data.studyTasks[0].status).toBe('todo') // 初始通过 addStudyTask 是 todo
    // 手动把父任务置为 done 再取消一个子任务
    store.toggleStudyTask(taskId)
    expect(getStore().data.studyTasks[0].status).toBe('done')
    store.toggleSubtask(taskId, 0)
    expect(getStore().data.studyTasks[0].status).toBe('todo')
  })

  it('无子任务的任务勾选不受影响', () => {
    const store = getStore()
    store.addSubject('历史', '#8b5cf6')
    const subjectId = getStore().data.subjects[0].id
    store.addStudyTask({
      title: '简单任务',
      subjectId,
      notes: '',
      subtasks: [],
    })
    const taskId = getStore().data.studyTasks[0].id
    store.toggleStudyTask(taskId)
    expect(getStore().data.studyTasks[0].status).toBe('done')
    expect(getStore().data.studyTasks[0].completedAt).toBeDefined()
  })
})

describe('第二版新功能：锻炼完成打卡', () => {
  beforeEach(() => {
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('标记某天锻炼完成', () => {
    const store = getStore()
    expect(store.isExerciseDateCompleted('2025-09-01')).toBe(false)
    store.toggleExerciseCompletedDate('2025-09-01')
    expect(getStore().isExerciseDateCompleted('2025-09-01')).toBe(true)
    expect(getStore().data.exerciseCompletedDates).toContain('2025-09-01')
  })

  it('再次点击取消完成标记', () => {
    const store = getStore()
    store.toggleExerciseCompletedDate('2025-09-01')
    store.toggleExerciseCompletedDate('2025-09-01')
    expect(getStore().data.exerciseCompletedDates).not.toContain('2025-09-01')
  })

  it('多天打卡互不影响', () => {
    const store = getStore()
    store.toggleExerciseCompletedDate('2025-09-01')
    store.toggleExerciseCompletedDate('2025-09-02')
    expect(getStore().data.exerciseCompletedDates).toHaveLength(2)
  })
})

describe('v1 旧数据兼容（锻炼计划白屏修复）', () => {
  // 模拟浏览器里只存有 v1 版本的数据（没有 exerciseCompletedDates 字段）
  function makeV1Data() {
    const fresh = getFreshAppData()
    const { exerciseCompletedDates, ...v1 } = fresh as any
    return v1
  }

  it('loadAppData 加载旧数据时自动补齐 exerciseCompletedDates', async () => {
    const v1Data = makeV1Data()
    expect(v1Data.exerciseCompletedDates).toBeUndefined()
    await saveAppData(v1Data)
    const loaded = await loadAppData()
    expect(Array.isArray(loaded.exerciseCompletedDates)).toBe(true)
    expect(loaded.exerciseCompletedDates).toEqual([])
  })

  it('exerciseCompletedDates 缺失时打卡动作不崩溃', () => {
    const v1Data = makeV1Data()
    useStore.setState({ data: v1Data, loading: false })
    const store = getStore()
    expect(store.isExerciseDateCompleted('2025-09-01')).toBe(false)
    expect(() => store.toggleExerciseCompletedDate('2025-09-01')).not.toThrow()
    expect(getStore().data.exerciseCompletedDates).toContain('2025-09-01')
  })

  it('渲染锻炼计划页面不白屏（v1 数据场景）', async () => {
    // 写入 v1 旧数据，让 App 启动时从 IndexedDB 加载
    await saveAppData(makeV1Data())
    useStore.setState({ data: getFreshAppData(), loading: true })

    render(<App />)
    await waitFor(() => expect(screen.getByTestId('sidebar')).toBeInTheDocument())

    // 切到锻炼计划，应正常渲染日历而不是白屏
    fireEvent.click(screen.getByTestId('nav-exercise'))
    await waitFor(() => {
      expect(screen.getByTestId('toggle-exercise-complete')).toBeInTheDocument()
    })
    expect(screen.getByText(/年.*月/)).toBeInTheDocument()
  })
})
