import type { Settings, AppData } from '../types'

export const DEFAULT_PERIODS = [
  { name: '第1-2节', startTime: '08:00', endTime: '09:40' },
  { name: '第3-4节', startTime: '10:00', endTime: '11:40' },
  { name: '第5-6节', startTime: '14:00', endTime: '15:40' },
  { name: '第7-8节', startTime: '16:00', endTime: '17:40' },
  { name: '第9-10节', startTime: '19:00', endTime: '20:40' },
]

export const DEFAULT_SETTINGS: Settings = {
  semesterName: '',
  semesterStartDate: '',
  periods: DEFAULT_PERIODS,
  theme: 'light',
  homeCards: {
    study: true,
    timetable: true,
    memo: true,
    exercise: true,
    entertainment: true,
    diet: true,
  },
  weekendEnabled: false,
}

export const DEFAULT_APP_DATA: AppData = {
  version: 1,
  settings: DEFAULT_SETTINGS,
  subjects: [],
  studyTasks: [],
  exerciseEntries: [],
  exerciseCompletedDates: [],
  dietRecords: [],
  foodPresets: [],
  entertainments: [],
  courses: [],
  memos: [],
}
