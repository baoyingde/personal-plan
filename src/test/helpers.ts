import { DEFAULT_APP_DATA } from '../store/defaults'
import type { AppData } from '../types'

export function getFreshAppData(): AppData {
  return JSON.parse(JSON.stringify(DEFAULT_APP_DATA))
}
