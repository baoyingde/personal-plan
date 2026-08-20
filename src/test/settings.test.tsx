import { useStore } from '../store/store'
import { getFreshAppData } from './helpers'

const getStore = () => useStore.getState()

describe('设置模块', () => {
  beforeEach(() => {
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('更新学期名称', () => {
    const store = getStore()
    store.updateSettings({ semesterName: '新学期名称' })
    
    expect(getStore().data.settings.semesterName).toBe('新学期名称')
  })

  it('切换主题', () => {
    const store = getStore()
    store.updateSettings({ theme: 'dark' })
    
    expect(getStore().data.settings.theme).toBe('dark')
    
    store.updateSettings({ theme: 'light' })
    expect(getStore().data.settings.theme).toBe('light')
  })

  it('更新首页卡片设置', () => {
    const store = getStore()
    store.updateSettings({
      homeCards: {
        ...getStore().data.settings.homeCards,
        study: false,
        diet: false,
      },
    })
    
    expect(getStore().data.settings.homeCards.study).toBe(false)
    expect(getStore().data.settings.homeCards.diet).toBe(false)
    expect(getStore().data.settings.homeCards.timetable).toBe(true)
  })

  it('更新节次时间', () => {
    const store = getStore()
    store.updateSettings({
      periods: [
        { name: '第1节', startTime: '09:00', endTime: '09:45' },
      ],
    })
    
    expect(getStore().data.settings.periods).toHaveLength(1)
    expect(getStore().data.settings.periods[0].name).toBe('第1节')
  })

  it('周末课表开关', () => {
    const store = getStore()
    store.updateSettings({ weekendEnabled: true })
    
    expect(getStore().data.settings.weekendEnabled).toBe(true)
  })
})
