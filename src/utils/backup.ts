import type { AppData } from '../types'
import { DEFAULT_APP_DATA } from '../store/defaults'

export function exportToFile(data: AppData): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `life-planner-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function validateImportData(json: string): AppData | null {
  try {
    const data = JSON.parse(json)
    if (!data || data.version !== 1) return null
    if (!Array.isArray(data.subjects)) return null
    if (!Array.isArray(data.studyTasks)) return null
    if (!Array.isArray(data.exerciseEntries)) return null
    if (!Array.isArray(data.dietRecords)) return null
    if (!Array.isArray(data.entertainments)) return null
    if (!Array.isArray(data.courses)) return null
    if (!Array.isArray(data.memos)) return null
    if (!data.settings || typeof data.settings !== 'object') return null
    if (!Array.isArray(data.foodPresets)) return null
    // 兼容 v1 旧备份：缺少的新字段补默认值
    if (!Array.isArray(data.exerciseCompletedDates)) {
      data.exerciseCompletedDates = []
    }
    return data as AppData
  } catch {
    return null
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
