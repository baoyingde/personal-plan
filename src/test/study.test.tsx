import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'

const getStore = () => useStore.getState()

describe('学习计划模块', () => {
  beforeEach(() => {
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('添加学科', () => {
    const store = getStore()
    store.addSubject('数学', '#4f46e5')
    store.addSubject('英语', '#22c55e')
    
    expect(getStore().data.subjects).toHaveLength(2)
    expect(getStore().data.subjects[0].name).toBe('数学')
    expect(getStore().data.subjects[1].name).toBe('英语')
  })

  it('添加任务', () => {
    const store = getStore()
    store.addSubject('物理', '#ef4444')
    const subjectId = getStore().data.subjects[0].id
    
    store.addStudyTask({
      title: '做习题',
      subjectId,
      deadline: '2025-09-01',
      notes: '第一章',
      subtasks: [{ text: '第1题', done: false }, { text: '第2题', done: false }],
    })
    
    expect(getStore().data.studyTasks).toHaveLength(1)
    expect(getStore().data.studyTasks[0].title).toBe('做习题')
  })

  it('任务进度由子任务计算', () => {
    const store = getStore()
    store.addSubject('化学', '#f59e0b')
    const subjectId = getStore().data.subjects[0].id
    
    store.addStudyTask({
      title: '实验报告',
      subjectId,
      notes: '',
      subtasks: [
        { text: '写引言', done: true },
        { text: '写方法', done: false },
        { text: '写结论', done: false },
      ],
    })
    
    const task = getStore().data.studyTasks[0]
    const progress = task.subtasks.filter(s => s.done).length / task.subtasks.length
    expect(progress).toBeCloseTo(1/3)
  })

  it('切换任务完成状态', () => {
    const store = getStore()
    store.addSubject('历史', '#8b5cf6')
    const subjectId = getStore().data.subjects[0].id
    
    store.addStudyTask({
      title: '复习',
      subjectId,
      notes: '',
      subtasks: [],
    })
    
    const taskId = getStore().data.studyTasks[0].id
    store.toggleStudyTask(taskId)
    
    expect(getStore().data.studyTasks[0].status).toBe('done')
    expect(getStore().data.studyTasks[0].completedAt).toBeDefined()
    
    store.toggleStudyTask(taskId)
    expect(getStore().data.studyTasks[0].status).toBe('todo')
  })

  it('删除学科同时删除相关任务', () => {
    const store = getStore()
    store.addSubject('临时', '#999')
    const subjectId = getStore().data.subjects[0].id
    
    store.addStudyTask({
      title: '临时任务',
      subjectId,
      notes: '',
      subtasks: [],
    })
    
    expect(getStore().data.studyTasks).toHaveLength(1)
    
    store.deleteSubject(subjectId)
    
    expect(getStore().data.subjects).toHaveLength(0)
    expect(getStore().data.studyTasks).toHaveLength(0)
  })

  it('切换子任务完成状态', () => {
    const store = getStore()
    store.addSubject('英语', '#06b6d4')
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
    
    expect(getStore().data.studyTasks[0].subtasks[0].done).toBe(true)
    expect(getStore().data.studyTasks[0].subtasks[1].done).toBe(false)
  })

  it('删除任务', () => {
    const store = getStore()
    store.addSubject('地理', '#14b8a6')
    const subjectId = getStore().data.subjects[0].id
    
    store.addStudyTask({
      title: '要删的任务',
      subjectId,
      notes: '',
      subtasks: [],
    })
    
    const taskId = getStore().data.studyTasks[0].id
    store.deleteStudyTask(taskId)
    
    expect(getStore().data.studyTasks).toHaveLength(0)
  })
})
