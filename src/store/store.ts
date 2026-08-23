// 第三版：zustand store —— 数据源从 IndexedDB 切换到后端 API
// 保持所有 action 签名与第二版一致（视图组件基本无需改动）
// 每个动作：调后端 API → 成功后更新内存 state → 页面自动重渲染

import { create } from 'zustand'
import type {
  AppData, Settings, Subject, StudyTask, ExerciseEntry,
  DietRecord, FoodItem, FoodPreset, Entertainment, Course,
  Memo, ViewId, TaskStatus,
} from '../types'
import { DEFAULT_APP_DATA } from './defaults'
import { memoApi, studyApi, exerciseApi, dietApi, entApi, courseApi } from '../api/client'

// ===== 字段映射（后端 snake_case ↔ 前端 camelCase） =====

function mapSubject(row: any): Subject {
  return { id: String(row.id), name: row.name, color: row.color }
}

function mapTask(row: any): StudyTask {
  return {
    id: String(row.id),
    subjectId: row.subject_id ? String(row.subject_id) : '',
    title: row.title,
    deadline: row.deadline ? row.deadline.slice(0, 10) : undefined,
    notes: row.notes || '',
    status: row.status as TaskStatus,
    subtasks: Array.isArray(row.subtasks) ? row.subtasks : [],
    createdAt: row.created_at || '',
    completedAt: row.completed_at || undefined,
  }
}

function mapExercise(row: any): ExerciseEntry {
  return {
    id: String(row.id),
    dayOfWeek: row.day_of_week,
    name: row.name,
    detail: row.detail || '',
    timeRange: row.time_range || undefined,
  }
}

function mapFood(row: any): FoodItem {
  return {
    id: String(row.id),
    name: row.name,
    amount: row.amount || '',
    calories: Number(row.calories) || 0,
    protein: row.protein != null ? Number(row.protein) : undefined,
    carbs: row.carbs != null ? Number(row.carbs) : undefined,
    fat: row.fat != null ? Number(row.fat) : undefined,
  }
}

function mapPreset(row: any): FoodPreset {
  return { id: String(row.id), name: row.name, unit: row.unit || '', defaultCalories: Number(row.default_calories) || 0 }
}

function mapEnt(row: any): Entertainment {
  return {
    id: String(row.id),
    title: row.title,
    date: row.date.slice(0, 10),
    startTime: row.start_time || undefined,
    endTime: row.end_time || undefined,
    location: row.location || undefined,
    type: row.type,
    notes: row.notes || '',
    done: Boolean(row.done),
  }
}

function mapCourse(row: any): Course {
  return {
    id: String(row.id),
    name: row.name,
    dayOfWeek: row.day_of_week,
    periodIndex: row.period_index,
    location: row.location || '',
    weekType: row.week_type,
    color: row.color,
  }
}

function mapMemo(row: any): Memo {
  return {
    id: String(row.id),
    text: row.text,
    done: Boolean(row.done),
    pinned: Boolean(row.pinned),
    dueDate: row.due_date ? row.due_date.slice(0, 10) : undefined,
    order: row.sort_order || 0,
    createdAt: row.created_at || '',
  }
}

// ===== 类型定义 =====

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
  addSubject: (name: string, color: string) => Promise<void>
  updateSubject: (id: string, patch: Partial<Pick<Subject, 'name' | 'color'>>) => Promise<void>
  deleteSubject: (id: string) => Promise<void>

  // Study Tasks
  addStudyTask: (task: Omit<StudyTask, 'id' | 'createdAt' | 'status'>) => Promise<void>
  updateStudyTask: (id: string, patch: Partial<StudyTask>) => Promise<void>
  deleteStudyTask: (id: string) => Promise<void>
  toggleStudyTask: (id: string) => Promise<void>
  toggleSubtask: (taskId: string, subtaskIndex: number) => Promise<void>

  // Exercise
  addExerciseEntry: (entry: Omit<ExerciseEntry, 'id'>) => Promise<void>
  updateExerciseEntry: (id: string, patch: Partial<ExerciseEntry>) => Promise<void>
  deleteExerciseEntry: (id: string) => Promise<void>
  reorderExerciseEntries: (dayOfWeek: number, ids: string[]) => void
  toggleExerciseCompletedDate: (date: string) => Promise<void>
  isExerciseDateCompleted: (date: string) => boolean

  // Diet
  addFoodItem: (date: string, meal: keyof DietRecord['meals'], item: FoodItem) => Promise<void>
  updateFoodItem: (date: string, meal: keyof DietRecord['meals'], itemId: string, patch: Partial<FoodItem>) => Promise<void>
  deleteFoodItem: (date: string, meal: keyof DietRecord['meals'], itemId: string) => Promise<void>

  // Food presets
  addFoodPreset: (preset: Omit<FoodPreset, 'id'>) => Promise<void>
  deleteFoodPreset: (id: string) => Promise<void>

  // Entertainment
  addEntertainment: (ent: Omit<Entertainment, 'id'>) => Promise<void>
  updateEntertainment: (id: string, patch: Partial<Entertainment>) => Promise<void>
  deleteEntertainment: (id: string) => Promise<void>
  toggleEntertainment: (id: string) => Promise<void>

  // Courses
  addCourse: (course: Omit<Course, 'id'>) => Promise<void>
  updateCourse: (id: string, patch: Partial<Course>) => Promise<void>
  deleteCourse: (id: string) => Promise<void>

  // Memos
  addMemo: (text: string, dueDate?: string) => Promise<void>
  updateMemo: (id: string, patch: Partial<Memo>) => Promise<void>
  deleteMemo: (id: string) => Promise<void>
  toggleMemo: (id: string) => Promise<void>
}

// ===== 内部工具 =====

function updateIn<T extends { id: string }>(list: T[], updated: T): T[] {
  return list.map(x => x.id === updated.id ? updated : x)
}

// 汇总饮食记录（后端扁平行 → 前端按日期+餐段分组）
function groupDietRows(rows: any[]): DietRecord[] {
  const map = new Map<string, DietRecord>()
  for (const row of rows) {
    const date = row.date.slice(0, 10)
    let rec = map.get(date)
    if (!rec) {
      rec = { date, meals: { breakfast: [], lunch: [], dinner: [], snack: [] } }
      map.set(date, rec)
    }
    rec.meals[row.meal as keyof DietRecord['meals']]?.push(mapFood(row))
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export const useStore = create<AppState>((set, get) => ({
  data: { ...DEFAULT_APP_DATA },
  currentView: 'home',
  loading: true,
  lastSavedAt: null,
  dirty: false,

  // 启动：并行拉取所有数据
  init: async () => {
    try {
      const [
        subjects, tasks, exerciseRows, completions, dietRows, presets,
        entertainments, courses, memos, settings,
      ] = await Promise.all([
        studyApi.subjects.list(),
        studyApi.tasks.list(),
        exerciseApi.entries.list(),
        exerciseApi.completions.list(),
        dietApi.records.list(),
        dietApi.presets.list(),
        entApi.list(),
        courseApi.list(),
        memoApi.list(),
        courseApi.settings.get(),
      ])

      const settingsRow = settings as any

      const s: Settings = {
        semesterName: settingsRow?.semester_name || '',
        semesterStartDate: settingsRow?.semester_start ? settingsRow.semester_start.slice(0, 10) : '',
        periods: settingsRow?.periods || DEFAULT_APP_DATA.settings.periods,
        theme: (settingsRow?.theme as 'light' | 'dark') || 'light',
        weekendEnabled: Boolean(settingsRow?.weekend_enabled),
        homeCards: settingsRow?.home_cards || DEFAULT_APP_DATA.settings.homeCards,
      }

      const data: AppData = {
        version: 1,
        settings: s,
        subjects: (subjects as any[]).map(mapSubject),
        studyTasks: (tasks as any[]).map(mapTask),
        exerciseEntries: (exerciseRows as any[]).map(mapExercise),
        exerciseCompletedDates: (completions as string[]) || [],
        dietRecords: groupDietRows((dietRows as any[]) || []),
        foodPresets: (presets as any[]).map(mapPreset),
        entertainments: (entertainments as any[]).map(mapEnt),
        courses: (courses as any[]).map(mapCourse),
        memos: (memos as any[]).map(mapMemo),
      }
      set({ data, loading: false, lastSavedAt: Date.now() })
    } catch (err) {
      console.error('数据加载失败:', err)
      set({ loading: false })
      throw err
    }
  },

  setCurrentView: (view) => set({ currentView: view }),

  saveNow: async () => {
    set({ lastSavedAt: Date.now(), dirty: false })
  },

  updateSettings: async (patch) => {
    const { data } = get()
    const next = { ...data, settings: { ...data.settings, ...patch } }
    set({ data: next })
    await courseApi.settings.save({
      semester_name: next.settings.semesterName,
      semester_start: next.settings.semesterStartDate || null,
      periods: next.settings.periods,
      theme: next.settings.theme,
      weekend_enabled: next.settings.weekendEnabled,
      home_cards: next.settings.homeCards,
    })
  },

  // ===== 学科 =====
  addSubject: async (name, color) => {
    const row = await studyApi.subjects.create(name, color)
    const { data } = get()
    set({ data: { ...data, subjects: [...data.subjects, mapSubject(row)] } })
  },
  updateSubject: async (id, patch) => {
    await studyApi.subjects.update(Number(id), patch)
    const { data } = get()
    set({ data: { ...data, subjects: data.subjects.map(s => s.id === id ? { ...s, ...patch } : s) } })
  },
  deleteSubject: async (id) => {
    await studyApi.subjects.remove(Number(id))
    const { data } = get()
    set({
      data: {
        ...data,
        subjects: data.subjects.filter(s => s.id !== id),
        studyTasks: data.studyTasks.filter(t => t.subjectId !== id),
      },
    })
  },

  // ===== 学习任务 =====
  addStudyTask: async (task) => {
    const row = await studyApi.tasks.create({
      subject_id: task.subjectId ? Number(task.subjectId) : null,
      title: task.title,
      deadline: task.deadline || null,
      notes: task.notes,
      subtasks: task.subtasks,
      status: 'todo',
    })
    const { data } = get()
    set({ data: { ...data, studyTasks: [...data.studyTasks, mapTask(row)] } })
  },
  updateStudyTask: async (id, patch) => {
    const { data } = get()
    const old = data.studyTasks.find(t => t.id === id)
    if (!old) return
    await studyApi.tasks.update(Number(id), {
      subject_id: patch.subjectId !== undefined ? (patch.subjectId ? Number(patch.subjectId) : null) : undefined,
      title: patch.title,
      deadline: patch.deadline || null,
      notes: patch.notes,
      subtasks: patch.subtasks,
      status: patch.status,
    })
    set({ data: { ...data, studyTasks: updateIn(data.studyTasks, { ...old, ...patch }) } })
  },
  deleteStudyTask: async (id) => {
    await studyApi.tasks.remove(Number(id))
    const { data } = get()
    set({ data: { ...data, studyTasks: data.studyTasks.filter(t => t.id !== id) } })
  },
  toggleStudyTask: async (id) => {
    const { data } = get()
    const task = data.studyTasks.find(t => t.id === id)
    if (!task) return
    const done = task.status !== 'done'
    const subtasks = task.subtasks.map(s => ({ ...s, done }))
    await studyApi.tasks.update(Number(id), {
      status: done ? 'done' : 'todo',
      subtasks,
      completed_at: done ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    })
    set({
      data: {
        ...data,
        studyTasks: updateIn(data.studyTasks, {
          ...task, status: done ? 'done' : 'todo', subtasks,
          completedAt: done ? new Date().toISOString() : undefined,
        }),
      },
    })
  },
  toggleSubtask: async (taskId, subtaskIndex) => {
    const { data } = get()
    const task = data.studyTasks.find(t => t.id === taskId)
    if (!task) return
    const newSubtasks = task.subtasks.map((s, i) => i === subtaskIndex ? { ...s, done: !s.done } : s)
    const allDone = newSubtasks.length > 0 && newSubtasks.every(s => s.done)
    await studyApi.tasks.update(Number(taskId), {
      subtasks: newSubtasks,
      status: allDone ? 'done' : 'todo',
      completed_at: allDone ? new Date().toISOString().slice(0, 19).replace('T', ' ') : null,
    })
    set({
      data: {
        ...data,
        studyTasks: updateIn(data.studyTasks, {
          ...task, subtasks: newSubtasks,
          status: allDone ? 'done' : 'todo',
          completedAt: allDone ? new Date().toISOString() : undefined,
        }),
      },
    })
  },

  // ===== 锻炼 =====
  addExerciseEntry: async (entry) => {
    const row = await exerciseApi.entries.create({
      day_of_week: entry.dayOfWeek, name: entry.name, detail: entry.detail, time_range: entry.timeRange || null,
    })
    const { data } = get()
    set({ data: { ...data, exerciseEntries: [...data.exerciseEntries, mapExercise(row)] } })
  },
  updateExerciseEntry: async (id, patch) => {
    const { data } = get()
    const old = data.exerciseEntries.find(e => e.id === id)
    if (!old) return
    await exerciseApi.entries.update(Number(id), {
      name: patch.name, detail: patch.detail, time_range: patch.timeRange, day_of_week: patch.dayOfWeek,
    })
    set({ data: { ...data, exerciseEntries: updateIn(data.exerciseEntries, { ...old, ...patch }) } })
  },
  deleteExerciseEntry: async (id) => {
    await exerciseApi.entries.remove(Number(id))
    const { data } = get()
    set({ data: { ...data, exerciseEntries: data.exerciseEntries.filter(e => e.id !== id) } })
  },
  reorderExerciseEntries: (_dayOfWeek, _ids) => {
    // 排序为前端行为，第三版暂不持久化顺序
  },
  toggleExerciseCompletedDate: async (date) => {
    const { data } = get()
    const completed = data.exerciseCompletedDates ?? []
    const isDone = completed.includes(date)
    if (isDone) await exerciseApi.completions.remove(date)
    else await exerciseApi.completions.add(date)
    const newDates = isDone ? completed.filter(d => d !== date) : [...completed, date]
    set({ data: { ...data, exerciseCompletedDates: newDates } })
  },
  isExerciseDateCompleted: (date) => (get().data.exerciseCompletedDates ?? []).includes(date),

  // ===== 饮食 =====
  addFoodItem: async (date, meal, item) => {
    const row = await dietApi.records.create({
      date, meal, name: item.name, amount: item.amount, calories: item.calories,
      protein: item.protein, carbs: item.carbs, fat: item.fat,
    })
    const { data } = get()
    const records = data.dietRecords
    let rec = records.find(r => r.date === date)
    if (!rec) {
      rec = { date, meals: { breakfast: [], lunch: [], dinner: [], snack: [] } }
      records.push(rec)
    }
    rec.meals[meal].push(mapFood(row))
    set({ data: { ...data, dietRecords: [...records] } })
  },
  updateFoodItem: async (date, meal, itemId, patch) => {
    await dietApi.records.update(Number(itemId), {
      name: patch.name, amount: patch.amount, calories: patch.calories,
      protein: patch.protein, carbs: patch.carbs, fat: patch.fat,
    })
    const { data } = get()
    const records = data.dietRecords.map(r => {
      if (r.date !== date) return r
      const meals = { ...r.meals }
      meals[meal] = meals[meal].map(f => f.id === itemId ? { ...f, ...patch } : f)
      return { ...r, meals }
    })
    set({ data: { ...data, dietRecords: records } })
  },
  deleteFoodItem: async (date, meal, itemId) => {
    await dietApi.records.remove(Number(itemId))
    const { data } = get()
    const records = data.dietRecords.map(r => {
      if (r.date !== date) return r
      const meals = { ...r.meals }
      meals[meal] = meals[meal].filter(f => f.id !== itemId)
      return { ...r, meals }
    })
    set({ data: { ...data, dietRecords: records } })
  },
  addFoodPreset: async (preset) => {
    const row = await dietApi.presets.create({ name: preset.name, unit: preset.unit, default_calories: preset.defaultCalories })
    const { data } = get()
    set({ data: { ...data, foodPresets: [...data.foodPresets, mapPreset(row)] } })
  },
  deleteFoodPreset: async (id) => {
    await dietApi.presets.remove(Number(id))
    const { data } = get()
    set({ data: { ...data, foodPresets: data.foodPresets.filter(p => p.id !== id) } })
  },

  // ===== 娱乐 =====
  addEntertainment: async (ent) => {
    const row = await entApi.create({
      title: ent.title, date: ent.date, start_time: ent.startTime || null,
      end_time: ent.endTime || null, location: ent.location || null, type: ent.type,
      notes: ent.notes, done: ent.done,
    })
    const { data } = get()
    set({ data: { ...data, entertainments: [...data.entertainments, mapEnt(row)] } })
  },
  updateEntertainment: async (id, patch) => {
    const { data } = get()
    const old = data.entertainments.find(e => e.id === id)
    if (!old) return
    await entApi.update(Number(id), {
      title: patch.title, date: patch.date, start_time: patch.startTime || null,
      end_time: patch.endTime || null, location: patch.location || null,
      type: patch.type, notes: patch.notes, done: patch.done,
    })
    set({ data: { ...data, entertainments: updateIn(data.entertainments, { ...old, ...patch }) } })
  },
  deleteEntertainment: async (id) => {
    await entApi.remove(Number(id))
    const { data } = get()
    set({ data: { ...data, entertainments: data.entertainments.filter(e => e.id !== id) } })
  },
  toggleEntertainment: async (id) => {
    const { data } = get()
    const ent = data.entertainments.find(e => e.id === id)
    if (!ent) return
    await entApi.update(Number(id), { done: !ent.done })
    set({ data: { ...data, entertainments: updateIn(data.entertainments, { ...ent, done: !ent.done }) } })
  },

  // ===== 课表 =====
  addCourse: async (course) => {
    const row = await courseApi.create({
      name: course.name, day_of_week: course.dayOfWeek, period_index: course.periodIndex,
      location: course.location, week_type: course.weekType, color: course.color,
    })
    const { data } = get()
    set({ data: { ...data, courses: [...data.courses, mapCourse(row)] } })
  },
  updateCourse: async (id, patch) => {
    const { data } = get()
    const old = data.courses.find(c => c.id === id)
    if (!old) return
    await courseApi.update(Number(id), {
      name: patch.name, day_of_week: patch.dayOfWeek, period_index: patch.periodIndex,
      location: patch.location, week_type: patch.weekType, color: patch.color,
    })
    set({ data: { ...data, courses: updateIn(data.courses, { ...old, ...patch }) } })
  },
  deleteCourse: async (id) => {
    await courseApi.remove(Number(id))
    const { data } = get()
    set({ data: { ...data, courses: data.courses.filter(c => c.id !== id) } })
  },

  // ===== 备忘录 =====
  addMemo: async (text, dueDate?) => {
    const row = await memoApi.create(text, dueDate || null)
    const { data } = get()
    set({ data: { ...data, memos: [...data.memos, mapMemo(row)] } })
  },
  updateMemo: async (id, patch) => {
    const { data } = get()
    const old = data.memos.find(m => m.id === id)
    if (!old) return
    await memoApi.update(Number(id), {
      text: patch.text, done: patch.done, pinned: patch.pinned, due_date: patch.dueDate || null,
    })
    set({ data: { ...data, memos: updateIn(data.memos, { ...old, ...patch }) } })
  },
  deleteMemo: async (id) => {
    await memoApi.remove(Number(id))
    const { data } = get()
    set({ data: { ...data, memos: data.memos.filter(m => m.id !== id) } })
  },
  toggleMemo: async (id) => {
    const { data } = get()
    const memo = data.memos.find(m => m.id === id)
    if (!memo) return
    await memoApi.update(Number(id), { done: !memo.done })
    set({ data: { ...data, memos: updateIn(data.memos, { ...memo, done: !memo.done }) } })
  },
}))
