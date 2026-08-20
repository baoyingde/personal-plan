import { useStore } from '../store/store'
import { todayStr } from '../utils/date'
import { getFreshAppData } from './helpers'

const getStore = () => useStore.getState()

describe('饮食计划模块', () => {
  beforeEach(() => {
    useStore.setState({ data: getFreshAppData(), loading: false })
  })

  it('添加食物记录', () => {
    const store = getStore()
    const today = todayStr()
    
    store.addFoodItem(today, 'breakfast', {
      id: 'b1',
      name: '面包',
      amount: '2片',
      calories: 150,
    })
    
    store.addFoodItem(today, 'lunch', {
      id: 'l1',
      name: '米饭',
      amount: '1碗',
      calories: 200,
    })
    
    const record = getStore().data.dietRecords.find(r => r.date === today)
    expect(record).toBeDefined()
    expect(record!.meals.breakfast).toHaveLength(1)
    expect(record!.meals.lunch).toHaveLength(1)
    expect(record!.meals.dinner).toHaveLength(0)
  })

  it('热量统计正确', () => {
    const store = getStore()
    const today = todayStr()
    
    store.addFoodItem(today, 'breakfast', { id: '1', name: '面包', amount: '', calories: 150 })
    store.addFoodItem(today, 'lunch', { id: '2', name: '米饭', amount: '', calories: 300 })
    store.addFoodItem(today, 'dinner', { id: '3', name: '面条', amount: '', calories: 400 })
    
    const record = getStore().data.dietRecords.find(r => r.date === today)
    const total = [...record!.meals.breakfast, ...record!.meals.lunch, ...record!.meals.dinner]
      .reduce((s, i) => s + i.calories, 0)
    
    expect(total).toBe(850)
  })

  it('删除食物记录', () => {
    const store = getStore()
    const today = todayStr()
    
    store.addFoodItem(today, 'lunch', { id: 'del1', name: '要删的', amount: '', calories: 100 })
    expect(getStore().data.dietRecords[0].meals.lunch).toHaveLength(1)
    
    store.deleteFoodItem(today, 'lunch', 'del1')
    expect(getStore().data.dietRecords[0].meals.lunch).toHaveLength(0)
  })

  it('更新食物信息', () => {
    const store = getStore()
    const today = todayStr()
    
    store.addFoodItem(today, 'lunch', { id: 'upd1', name: '原名', amount: '1份', calories: 100 })
    store.updateFoodItem(today, 'lunch', 'upd1', { name: '新名', calories: 200 })
    
    const item = getStore().data.dietRecords[0].meals.lunch[0]
    expect(item.name).toBe('新名')
    expect(item.calories).toBe(200)
  })

  it('常用食物预设', () => {
    const store = getStore()
    store.addFoodPreset({ name: '苹果', unit: '1个', defaultCalories: 80 })
    store.addFoodPreset({ name: '牛奶', unit: '1杯', defaultCalories: 120 })
    
    expect(getStore().data.foodPresets).toHaveLength(2)
    expect(getStore().data.foodPresets[0].name).toBe('苹果')
  })

  it('删除常用食物预设', () => {
    const store = getStore()
    store.addFoodPreset({ name: '临时', unit: '', defaultCalories: 0 })
    const presetId = getStore().data.foodPresets[0].id
    
    store.deleteFoodPreset(presetId)
    expect(getStore().data.foodPresets).toHaveLength(0)
  })

  it('不同日期的记录独立', () => {
    const store = getStore()
    store.addFoodItem('2025-09-01', 'lunch', { id: '1', name: 'A', amount: '', calories: 100 })
    store.addFoodItem('2025-09-02', 'lunch', { id: '2', name: 'B', amount: '', calories: 200 })
    
    expect(getStore().data.dietRecords).toHaveLength(2)
    expect(getStore().data.dietRecords[0].date).toBe('2025-09-01')
    expect(getStore().data.dietRecords[1].date).toBe('2025-09-02')
  })
})
