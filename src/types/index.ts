export interface Period {
  name: string
  startTime: string
  endTime: string
}

export interface Settings {
  semesterName: string
  semesterStartDate: string
  periods: Period[]
  theme: 'light' | 'dark'
  homeCards: {
    study: boolean
    timetable: boolean
    memo: boolean
    exercise: boolean
    entertainment: boolean
    diet: boolean
  }
  weekendEnabled: boolean
}

export interface Subject {
  id: string
  name: string
  color: string
}

export interface Subtask {
  text: string
  done: boolean
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface StudyTask {
  id: string
  subjectId: string
  title: string
  deadline?: string
  notes: string
  status: TaskStatus
  subtasks: Subtask[]
  createdAt: string
  completedAt?: string
}

export interface ExerciseEntry {
  id: string
  dayOfWeek: number // 1-7 (Mon-Sun)
  name: string
  detail: string
  timeRange?: string
}

export interface FoodItem {
  id: string
  name: string
  amount: string
  calories: number
  protein?: number
  carbs?: number
  fat?: number
}

export interface DietRecord {
  date: string // YYYY-MM-DD
  meals: {
    breakfast: FoodItem[]
    lunch: FoodItem[]
    dinner: FoodItem[]
    snack: FoodItem[]
  }
}

export interface FoodPreset {
  id: string
  name: string
  unit: string
  defaultCalories: number
}

export type EntertainmentType = 'outing' | 'gathering' | 'sport' | 'game' | 'movie' | 'other'

export interface Entertainment {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  location?: string
  type: EntertainmentType
  notes: string
  done: boolean
}

export type WeekType = 'every' | 'odd' | 'even'

export interface Course {
  id: string
  name: string
  dayOfWeek: number // 1-7
  periodIndex: number // 0-based
  location: string
  weekType: WeekType
  color: string
}

export interface Memo {
  id: string
  text: string
  done: boolean
  pinned: boolean
  dueDate?: string
  order: number
  createdAt: string
}

export interface AppData {
  version: 1
  settings: Settings
  subjects: Subject[]
  studyTasks: StudyTask[]
  exerciseEntries: ExerciseEntry[]
  exerciseCompletedDates: string[] // YYYY-MM-DD 已完成锻炼的日期
  dietRecords: DietRecord[]
  foodPresets: FoodPreset[]
  entertainments: Entertainment[]
  courses: Course[]
  memos: Memo[]
}

export type ViewId =
  | 'home'
  | 'study'
  | 'exercise'
  | 'diet'
  | 'entertainment'
  | 'timetable'
  | 'music'
  | 'memo'
  | 'settings'
