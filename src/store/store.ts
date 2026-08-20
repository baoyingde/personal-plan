import { create } from 'zustand'
import type {
  AppData, Settings, Subject, StudyTask, ExerciseEntry,
  DietRecord, FoodItem, FoodPreset, Entertainment, Course,
  Memo, ViewId, WeekType, TaskStatus, Subtask, EntertainmentType,
} from '../types'
import { DEFAULT_APP_DATA, DEFAULT_SETTINGS } from './defaults'
import { loadAppData, saveAppData } from './db'

interface AppState {
  data: AppData
  currentView: ViewId
  loading: boolean
  lastSavedAt: number | null
  dirty: boolean

  // Actions
  init: () => Promise<void>
  setCurrentView: (view: ViewId) => void
  updateSettings: (patch: Partial<Settings>) => void
  saveNow: () => Promise<void>

  // Subjects
  addSubject: (name: string, color: string) => void
  updateSubject: (id: string, patch: Partial<Pick<Subject, 'name' | 'color'>>) => void
  deleteSubject: (id: string) => void

  // Study Tasks
  addStudyTask: (task: Omit<StudyTask, 'id' | 'createdAt' | 'status'>) => void
  updateStudyTask: (id: string, patch: Partial<StudyTask>) => void
  deleteStudyTask: (id: string) => void
  toggleStudyTask: (id: string) => void
  toggleSubtask: (taskId: string, subtaskIndex: number) => void

  // Exercise
  addExerciseEntry: (entry: Omit<ExerciseEntry, 'id'>) => void
  updateExerciseEntry: (id: string, patch: Partial<ExerciseEntry>) => void
  deleteExerciseEntry: (id: string) => void
  reorderExerciseEntries: (dayOfWeek: number, ids: string[]) => void
  toggleExerciseCompletedDate: (date: string) => void
  isExerciseDateCompleted: (date: string) => boolean

  // Diet
  upsertDietRecord: (record: DietRecord) => void
  addFoodItem: (date: string, meal: keyof DietRecord['meals'], item: FoodItem) => void
  updateFoodItem: (date: string, meal: keyof DietRecord['meals'], itemId: string, patch: Partial<FoodItem>) => void
  deleteFoodItem: (date: string, meal: keyof DietRecord['meals'], itemId: string) => void

  // Food presets
  addFoodPreset: (preset: Omit<FoodPreset, 'id'>) => void
  deleteFoodPreset: (id: string) => void

  // Entertainment
  addEntertainment: (ent: Omit<Entertainment, 'id'>) => void
  updateEntertainment: (id: string, patch: Partial<Entertainment>) => void
  deleteEntertainment: (id: string) => void
  toggleEntertainment: (id: string) => void

  // Courses
  addCourse: (course: Omit<Course, 'id'>) => void
  updateCourse: (id: string, patch: Partial<Course>) => void
  deleteCourse: (id: string) => void

  // Memos
  addMemo: (text: string, dueDate?: string) => void
  updateMemo: (id: string, patch: Partial<Memo>) => void
  deleteMemo: (id: string) => void
  toggleMemo: (id: string) => void

  // Backup
  importData: (data: AppData) => void
  getDataForExport: () => AppData
}

let uid = 0
function genId(): string {
  return Date.now().toString(36) + (++uid).toString(36)
}

async function persist(data: AppData): Promise<void> {
  await saveAppData(data)
}

export const useStore = create<AppState>((set, get) => ({
  data: { ...DEFAULT_APP_DATA },
  currentView: 'home',
  loading: true,
  lastSavedAt: null,
  dirty: false,

  init: async () => {
    const data = await loadAppData()
    set({ data, loading: false, lastSavedAt: Date.now() })
  },

  setCurrentView: (view) => set({ currentView: view }),

  saveNow: async () => {
    const { data } = get()
    await persist(data)
    set({ lastSavedAt: Date.now(), dirty: false })
  },

  updateSettings: (patch) => {
    const { data } = get()
    const newData = {
      ...data,
      settings: { ...data.settings, ...patch },
    }
    set({ data: newData })
    persist(newData)
  },

  addSubject: (name, color) => {
    const { data } = get()
    const subject: Subject = { id: genId(), name, color }
    const newData = { ...data, subjects: [...data.subjects, subject] }
    set({ data: newData })
    persist(newData)
  },

  updateSubject: (id, patch) => {
    const { data } = get()
    const newData = {
      ...data,
      subjects: data.subjects.map(s => s.id === id ? { ...s, ...patch } : s),
    }
    set({ data: newData })
    persist(newData)
  },

  deleteSubject: (id) => {
    const { data } = get()
    const newData = {
      ...data,
      subjects: data.subjects.filter(s => s.id !== id),
      studyTasks: data.studyTasks.filter(t => t.subjectId !== id),
    }
    set({ data: newData })
    persist(newData)
  },

  addStudyTask: (task) => {
    const { data } = get()
    const newTask: StudyTask = {
      ...task,
      id: genId(),
      status: 'todo',
      createdAt: new Date().toISOString(),
    }
    const newData = { ...data, studyTasks: [...data.studyTasks, newTask] }
    set({ data: newData })
    persist(newData)
  },

  updateStudyTask: (id, patch) => {
    const { data } = get()
    const newData = {
      ...data,
      studyTasks: data.studyTasks.map(t => t.id === id ? { ...t, ...patch } : t),
    }
    set({ data: newData })
    persist(newData)
  },

  deleteStudyTask: (id) => {
    const { data } = get()
    const newData = { ...data, studyTasks: data.studyTasks.filter(t => t.id !== id) }
    set({ data: newData })
    persist(newData)
  },

  toggleStudyTask: (id) => {
    const { data } = get()
    const newData = {
      ...data,
      studyTasks: data.studyTasks.map(t => {
        if (t.id !== id) return t
        const newStatus: TaskStatus = t.status === 'done' ? 'todo' : 'done'
        // 父任务勾选/取消时，子任务联动
        const newSubtasks = t.subtasks.map(s => ({ ...s, done: newStatus === 'done' }))
        return {
          ...t,
          status: newStatus,
          subtasks: newSubtasks,
          completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
        }
      }),
    }
    set({ data: newData })
    persist(newData)
  },

  toggleSubtask: (taskId, subtaskIndex) => {
    const { data } = get()
    const newData = {
      ...data,
      studyTasks: data.studyTasks.map(t => {
        if (t.id !== taskId) return t
        const newSubtasks = t.subtasks.map((s, i) =>
          i === subtaskIndex ? { ...s, done: !s.done } : s
        )
        // 子任务全部完成时自动完成父任务；否则父任务回到未完成
        const allDone = newSubtasks.length > 0 && newSubtasks.every(s => s.done)
        const newStatus: TaskStatus = allDone ? 'done' : 'todo'
        return {
          ...t,
          subtasks: newSubtasks,
          status: newStatus,
          completedAt: allDone ? new Date().toISOString() : undefined,
        }
      }),
    }
    set({ data: newData })
    persist(newData)
  },

  addExerciseEntry: (entry) => {
    const { data } = get()
    const newEntry: ExerciseEntry = { ...entry, id: genId() }
    const newData = { ...data, exerciseEntries: [...data.exerciseEntries, newEntry] }
    set({ data: newData })
    persist(newData)
  },

  updateExerciseEntry: (id, patch) => {
    const { data } = get()
    const newData = {
      ...data,
      exerciseEntries: data.exerciseEntries.map(e => e.id === id ? { ...e, ...patch } : e),
    }
    set({ data: newData })
    persist(newData)
  },

  deleteExerciseEntry: (id) => {
    const { data } = get()
    const newData = { ...data, exerciseEntries: data.exerciseEntries.filter(e => e.id !== id) }
    set({ data: newData })
    persist(newData)
  },

  reorderExerciseEntries: (dayOfWeek, ids) => {
    const { data } = get()
    const others = data.exerciseEntries.filter(e => e.dayOfWeek !== dayOfWeek)
    const reordered = ids.map(id => data.exerciseEntries.find(e => e.id === id)!).filter(Boolean)
    const newData = { ...data, exerciseEntries: [...others, ...reordered] }
    set({ data: newData })
    persist(newData)
  },

  toggleExerciseCompletedDate: (date) => {
    const { data } = get()
    const completed = data.exerciseCompletedDates ?? []
    const newDates = completed.includes(date)
      ? completed.filter(d => d !== date)
      : [...completed, date]
    const newData = { ...data, exerciseCompletedDates: newDates }
    set({ data: newData })
    persist(newData)
  },

  isExerciseDateCompleted: (date) => {
    return (get().data.exerciseCompletedDates ?? []).includes(date)
  },

  upsertDietRecord: (record) => {
    const { data } = get()
    const exists = data.dietRecords.findIndex(r => r.date === record.date)
    let newRecords: DietRecord[]
    if (exists >= 0) {
      newRecords = data.dietRecords.map((r, i) => i === exists ? record : r)
    } else {
      newRecords = [...data.dietRecords, record]
    }
    const newData = { ...data, dietRecords: newRecords }
    set({ data: newData })
    persist(newData)
  },

  addFoodItem: (date, meal, item) => {
    const { data } = get()
    let record = data.dietRecords.find(r => r.date === date)
    if (!record) {
      record = {
        date,
        meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
      }
    }
    const newRecord: DietRecord = {
      ...record,
      meals: {
        ...record.meals,
        [meal]: [...record.meals[meal], item],
      },
    }
    const { upsertDietRecord } = get()
    upsertDietRecord(newRecord)
  },

  updateFoodItem: (date, meal, itemId, patch) => {
    const { data } = get()
    const record = data.dietRecords.find(r => r.date === date)
    if (!record) return
    const newRecord: DietRecord = {
      ...record,
      meals: {
        ...record.meals,
        [meal]: record.meals[meal].map(item =>
          item.id === itemId ? { ...item, ...patch } : item
        ),
      },
    }
    const { upsertDietRecord } = get()
    upsertDietRecord(newRecord)
  },

  deleteFoodItem: (date, meal, itemId) => {
    const { data } = get()
    const record = data.dietRecords.find(r => r.date === date)
    if (!record) return
    const newRecord: DietRecord = {
      ...record,
      meals: {
        ...record.meals,
        [meal]: record.meals[meal].filter(item => item.id !== itemId),
      },
    }
    const { upsertDietRecord } = get()
    upsertDietRecord(newRecord)
  },

  addFoodPreset: (preset) => {
    const { data } = get()
    const newPreset: FoodPreset = { ...preset, id: genId() }
    const newData = { ...data, foodPresets: [...data.foodPresets, newPreset] }
    set({ data: newData })
    persist(newData)
  },

  deleteFoodPreset: (id) => {
    const { data } = get()
    const newData = { ...data, foodPresets: data.foodPresets.filter(p => p.id !== id) }
    set({ data: newData })
    persist(newData)
  },

  addEntertainment: (ent) => {
    const { data } = get()
    const newEnt: Entertainment = { ...ent, id: genId() }
    const newData = { ...data, entertainments: [...data.entertainments, newEnt] }
    set({ data: newData })
    persist(newData)
  },

  updateEntertainment: (id, patch) => {
    const { data } = get()
    const newData = {
      ...data,
      entertainments: data.entertainments.map(e => e.id === id ? { ...e, ...patch } : e),
    }
    set({ data: newData })
    persist(newData)
  },

  deleteEntertainment: (id) => {
    const { data } = get()
    const newData = { ...data, entertainments: data.entertainments.filter(e => e.id !== id) }
    set({ data: newData })
    persist(newData)
  },

  toggleEntertainment: (id) => {
    const { data } = get()
    const newData = {
      ...data,
      entertainments: data.entertainments.map(e =>
        e.id === id ? { ...e, done: !e.done } : e
      ),
    }
    set({ data: newData })
    persist(newData)
  },

  addCourse: (course) => {
    const { data } = get()
    const newCourse: Course = { ...course, id: genId() }
    const newData = { ...data, courses: [...data.courses, newCourse] }
    set({ data: newData })
    persist(newData)
  },

  updateCourse: (id, patch) => {
    const { data } = get()
    const newData = {
      ...data,
      courses: data.courses.map(c => c.id === id ? { ...c, ...patch } : c),
    }
    set({ data: newData })
    persist(newData)
  },

  deleteCourse: (id) => {
    const { data } = get()
    const newData = { ...data, courses: data.courses.filter(c => c.id !== id) }
    set({ data: newData })
    persist(newData)
  },

  addMemo: (text, dueDate?) => {
    const { data } = get()
    const maxOrder = data.memos.reduce((max, m) => Math.max(max, m.order), 0)
    const newMemo: Memo = {
      id: genId(),
      text,
      done: false,
      pinned: false,
      dueDate,
      order: maxOrder + 1,
      createdAt: new Date().toISOString(),
    }
    const newData = { ...data, memos: [...data.memos, newMemo] }
    set({ data: newData })
    persist(newData)
  },

  updateMemo: (id, patch) => {
    const { data } = get()
    const newData = {
      ...data,
      memos: data.memos.map(m => m.id === id ? { ...m, ...patch } : m),
    }
    set({ data: newData })
    persist(newData)
  },

  deleteMemo: (id) => {
    const { data } = get()
    const newData = { ...data, memos: data.memos.filter(m => m.id !== id) }
    set({ data: newData })
    persist(newData)
  },

  toggleMemo: (id) => {
    const { data } = get()
    const newData = {
      ...data,
      memos: data.memos.map(m => m.id === id ? { ...m, done: !m.done } : m),
    }
    set({ data: newData })
    persist(newData)
  },

  importData: (imported) => {
    const newData: AppData = { ...imported, version: 1 }
    set({ data: newData })
    persist(newData)
  },

  getDataForExport: () => {
    const { data } = get()
    return { ...data, version: 1 }
  },
}))
