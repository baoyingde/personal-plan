import { useStore } from '../store/store'
import { validateImportData } from '../utils/backup'
import type { AppData } from '../types'
import { getFreshAppData } from './helpers'

const getStore = () => useStore.getState()

describe('备份与恢复', () => {
  beforeEach(() => {
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('导出数据包含所有实体', () => {
    const store = getStore()
    store.addSubject('测试学科', '#999')
    store.addMemo('测试备忘')
    store.addCourse({ name: '测试课程', dayOfWeek: 1, periodIndex: 0, location: '', weekType: 'every', color: '#999' })
    
    const exported = store.getDataForExport()
    
    expect(exported.version).toBe(1)
    expect(exported.subjects).toHaveLength(1)
    expect(exported.memos).toHaveLength(1)
    expect(exported.courses).toHaveLength(1)
    expect(exported.settings).toBeDefined()
  })

  it('导入数据覆盖当前数据', () => {
    const store = getStore()
    store.addMemo('原始数据')
    expect(getStore().data.memos).toHaveLength(1)
    
    const importData: AppData = {
      ...getFreshAppData(),
      memos: [{
        id: 'imported-1',
        text: '导入的备忘',
        done: false,
        pinned: false,
        order: 1,
        createdAt: new Date().toISOString(),
      }],
    }
    
    store.importData(importData)
    
    expect(getStore().data.memos).toHaveLength(1)
    expect(getStore().data.memos[0].text).toBe('导入的备忘')
  })

  it('验证导入数据格式', () => {
    const fresh = getFreshAppData()
    const valid = JSON.stringify(fresh)
    expect(validateImportData(valid)).not.toBeNull()
    
    expect(validateImportData('not json')).toBeNull()
    
    expect(validateImportData(JSON.stringify({ ...fresh, version: 2 }))).toBeNull()
    
    expect(validateImportData(JSON.stringify({ version: 1 }))).toBeNull()
    
    expect(validateImportData(JSON.stringify({ ...fresh, subjects: 'not array' }))).toBeNull()
  })

  it('导入后设置被保留', () => {
    const store = getStore()
    const fresh = getFreshAppData()
    const importData: AppData = {
      ...fresh,
      settings: {
        ...fresh.settings,
        semesterName: '导入的学期',
        theme: 'dark',
      },
    }
    
    store.importData(importData)
    
    expect(getStore().data.settings.semesterName).toBe('导入的学期')
    expect(getStore().data.settings.theme).toBe('dark')
  })

  it('导出数据可被重新导入', () => {
    const store = getStore()
    store.addSubject('可导出学科', '#4f46e5')
    store.addMemo('可导出备忘')
    
    const exported = store.getDataForExport()
    const json = JSON.stringify(exported)
    
    const validated = validateImportData(json)
    expect(validated).not.toBeNull()
    
    store.importData(validated!)
    
    expect(getStore().data.subjects).toHaveLength(1)
    expect(getStore().data.memos).toHaveLength(1)
  })
})
