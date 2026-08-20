import { openDB, type IDBPDatabase } from 'idb'
import type { AppData } from '../types'
import { DEFAULT_APP_DATA } from './defaults'

const DB_NAME = 'life-planner'
const DB_VERSION = 1
const STORE_APP = 'app'
const STORE_MUSIC = 'music'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_APP)) {
          db.createObjectStore(STORE_APP)
        }
        if (!db.objectStoreNames.contains(STORE_MUSIC)) {
          db.createObjectStore(STORE_MUSIC)
        }
      },
    })
  }
  return dbPromise
}

export async function loadAppData(): Promise<AppData> {
  const db = await getDB()
  const data = await db.get(STORE_APP, 'data')
  if (data && data.version === 1) {
    // 兼容 v1 旧数据：v2 新增的字段补齐默认值，避免 undefined 导致崩溃
    return {
      ...data,
      exerciseCompletedDates: Array.isArray(data.exerciseCompletedDates)
        ? data.exerciseCompletedDates
        : [],
    } as AppData
  }
  return { ...DEFAULT_APP_DATA }
}

export async function saveAppData(data: AppData): Promise<void> {
  const db = await getDB()
  await db.put(STORE_APP, data, 'data')
}

export async function getMusicFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await getDB()
  const handle = await db.get(STORE_MUSIC, 'folderHandle')
  return handle ?? null
}

export async function setMusicFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await getDB()
  await db.put(STORE_MUSIC, handle, 'folderHandle')
}

export async function clearMusicFolderHandle(): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_MUSIC, 'folderHandle')
}
