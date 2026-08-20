import { useState } from 'react'
import { useStore } from '../store/store'
import { todayStr, dateAdd } from '../utils/date'
import Modal from '../components/layout/Modal'
import ConfirmDialog from '../components/layout/ConfirmDialog'
import type { FoodItem, DietRecord } from '../types'

type MealKey = keyof DietRecord['meals']
const MEAL_LABELS: [MealKey, string][] = [
  ['breakfast', '早餐'], ['lunch', '午餐'], ['dinner', '晚餐'], ['snack', '加餐'],
]

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

export default function DietView() {
  const { data, addFoodItem, updateFoodItem, deleteFoodItem, addFoodPreset, deleteFoodPreset } = useStore()
  const [date, setDate] = useState(todayStr())
  const [addMeal, setAddMeal] = useState<MealKey | null>(null)
  const [editItem, setEditItem] = useState<{ meal: MealKey; item: FoodItem } | null>(null)
  const [deleteItem, setDeleteItem] = useState<{ meal: MealKey; itemId: string } | null>(null)
  const [showPresets, setShowPresets] = useState(false)
  const [presetMeal, setPresetMeal] = useState<MealKey>('lunch')

  // form
  const [foodName, setFoodName] = useState('')
  const [foodAmount, setFoodAmount] = useState('')
  const [foodCalories, setFoodCalories] = useState('')
  const [foodProtein, setFoodProtein] = useState('')
  const [foodCarbs, setFoodCarbs] = useState('')
  const [foodFat, setFoodFat] = useState('')
  const [saveAsPreset, setSaveAsPreset] = useState(false)

  const record = data.dietRecords.find(r => r.date === date)
  const today = todayStr()

  const getDayTotal = (r: DietRecord | undefined) => {
    if (!r) return 0
    return [...r.meals.breakfast, ...r.meals.lunch, ...r.meals.dinner, ...r.meals.snack]
      .reduce((sum, item) => sum + item.calories, 0)
  }

  // 7 day trend
  const last7 = Array.from({ length: 7 }, (_, i) => dateAdd(today, -6 + i))
  const trend = last7.map(d => ({ date: d, calories: getDayTotal(data.dietRecords.find(r => r.date === d)) }))
  const maxCal = Math.max(...trend.map(t => t.calories), 1)

  const resetForm = () => {
    setFoodName(''); setFoodAmount(''); setFoodCalories('')
    setFoodProtein(''); setFoodCarbs(''); setFoodFat(''); setSaveAsPreset(false)
  }

  const openAdd = (meal: MealKey) => {
    resetForm(); setAddMeal(meal)
  }

  const openEdit = (meal: MealKey, item: FoodItem) => {
    setEditItem({ meal, item })
    setFoodName(item.name); setFoodAmount(item.amount); setFoodCalories(String(item.calories))
    setFoodProtein(item.protein ? String(item.protein) : '')
    setFoodCarbs(item.carbs ? String(item.carbs) : '')
    setFoodFat(item.fat ? String(item.fat) : '')
  }

  const handleSave = () => {
    if (!foodName.trim() || !foodCalories) return
    const item: FoodItem = {
      id: editItem ? editItem.item.id : genId(),
      name: foodName.trim(),
      amount: foodAmount.trim() || '份',
      calories: Number(foodCalories) || 0,
      protein: foodProtein ? Number(foodProtein) : undefined,
      carbs: foodCarbs ? Number(foodCarbs) : undefined,
      fat: foodFat ? Number(foodFat) : undefined,
    }
    if (editItem) {
      updateFoodItem(date, editItem.meal, editItem.item.id, item)
      setEditItem(null)
    } else if (addMeal) {
      addFoodItem(date, addMeal, item)
      if (saveAsPreset && foodName.trim()) {
        addFoodPreset({ name: foodName.trim(), unit: foodAmount.trim() || '份', defaultCalories: Number(foodCalories) || 0 })
      }
      setAddMeal(null)
    }
    resetForm()
  }

  const handleDelete = () => {
    if (deleteItem) {
      deleteFoodItem(date, deleteItem.meal, deleteItem.itemId)
      setDeleteItem(null)
    }
  }

  const usePreset = (preset: typeof data.foodPresets[0], meal: MealKey) => {
    const item: FoodItem = {
      id: genId(),
      name: preset.name,
      amount: preset.unit,
      calories: preset.defaultCalories,
    }
    addFoodItem(date, meal, item)
    setShowPresets(false)
  }

  return (
    <div>
      {/* 日期切换 */}
      <div className="flex items-center gap-16 mb-16">
        <button className="btn btn-sm" onClick={() => setDate(d => dateAdd(d, -1))}>◀</button>
        <span className="fw-600" style={{ minWidth: 120, textAlign: 'center' }}>{date}{date === today ? ' (今天)' : ''}</span>
        <button className="btn btn-sm" onClick={() => setDate(d => dateAdd(d, 1))}>▶</button>
        <button className="btn btn-sm" onClick={() => setDate(today)}>回到今天</button>
        <div style={{ marginLeft: 'auto' }} className="flex items-center gap-8">
          <span className="text-sm text-secondary">今日热量：</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{getDayTotal(record)}</span>
          <span className="text-sm text-secondary">千卡</span>
        </div>
      </div>

      {/* 四餐段 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {MEAL_LABELS.map(([key, label]) => {
          const items = record?.meals[key] ?? []
          const mealCal = items.reduce((s, i) => s + i.calories, 0)
          return (
            <div key={key} className="card">
              <div className="card-header flex justify-between items-center">
                <span>{label}（{mealCal} 千卡）</span>
                <div className="flex gap-8">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setPresetMeal(key); setShowPresets(true) }}>常用</button>
                  <button className="btn btn-primary btn-sm" onClick={() => openAdd(key)}>+ 添加</button>
                </div>
              </div>
              <div className="card-body">
                {items.length === 0 ? (
                  <div className="text-sm text-secondary">暂无记录</div>
                ) : (
                  items.map(item => (
                    <div key={item.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', fontSize: 13 }}>
                      <span style={{ flex: 1 }}>{item.name} <span className="text-secondary">({item.amount})</span></span>
                      <span style={{ width: 70, textAlign: 'right', fontWeight: 600 }}>{item.calories} kcal</span>
                      {item.protein != null && <span className="text-secondary" style={{ width: 60, textAlign: 'right', fontSize: 11 }}>P:{item.protein}g</span>}
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }} onClick={() => openEdit(key, item)}>✎</button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteItem({ meal: key, itemId: item.id })}>✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 7天趋势 */}
      <div className="card">
        <div className="card-header">近 7 天热量趋势</div>
        <div className="card-body flex items-end gap-8" style={{ height: 120 }}>
          {trend.map(t => (
            <div key={t.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
              <div className="text-sm" style={{ marginBottom: 4, fontWeight: 600, fontSize: 11 }}>{t.calories || ''}</div>
              <div style={{
                width: '70%',
                height: `${Math.max((t.calories / maxCal) * 80, t.calories ? 4 : 0)}px`,
                background: t.date === today ? 'var(--accent)' : 'var(--accent-light)',
                borderRadius: 4,
              }} />
              <div className="text-secondary" style={{ fontSize: 10, marginTop: 4 }}>{t.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 添加/编辑食物弹窗 */}
      <Modal
        open={!!addMeal || !!editItem}
        title={editItem ? '编辑食物' : '添加食物'}
        onClose={() => { setAddMeal(null); setEditItem(null); resetForm() }}
        footer={<>
          <button className="btn" onClick={() => { setAddMeal(null); setEditItem(null); resetForm() }}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>{editItem ? '保存' : '添加'}</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">食物名称</label>
          <input className="input" value={foodName} onChange={e => setFoodName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">份量</label>
          <input className="input" value={foodAmount} onChange={e => setFoodAmount(e.target.value)} placeholder="如：1碗、200g" />
        </div>
        <div className="form-group">
          <label className="form-label">热量（千卡）*</label>
          <input className="input" type="number" value={foodCalories} onChange={e => setFoodCalories(e.target.value)} />
        </div>
        <div className="flex gap-8">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">蛋白质(g)</label>
            <input className="input" type="number" value={foodProtein} onChange={e => setFoodProtein(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">碳水(g)</label>
            <input className="input" type="number" value={foodCarbs} onChange={e => setFoodCarbs(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">脂肪(g)</label>
            <input className="input" type="number" value={foodFat} onChange={e => setFoodFat(e.target.value)} />
          </div>
        </div>
        {!editItem && (
          <label className="checkbox-label">
            <input type="checkbox" checked={saveAsPreset} onChange={e => setSaveAsPreset(e.target.checked)} />
            存为常用食物
          </label>
        )}
      </Modal>

      {/* 常用食物弹窗 */}
      <Modal
        open={showPresets}
        title="常用食物"
        onClose={() => setShowPresets(false)}
        footer={<button className="btn" onClick={() => setShowPresets(false)}>关闭</button>}
      >
        {data.foodPresets.length === 0 ? (
          <div className="text-sm text-secondary">暂无常用食物，添加食物时勾选「存为常用」即可保存。</div>
        ) : (
          data.foodPresets.map(p => (
            <div key={p.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
              <span style={{ flex: 1 }}>{p.name} ({p.unit})</span>
              <span className="fw-600" style={{ marginRight: 12 }}>{p.defaultCalories} kcal</span>
              <button className="btn btn-primary btn-sm" onClick={() => usePreset(p, presetMeal)}>选用</button>
              <button className="btn btn-ghost btn-sm text-danger" onClick={() => deleteFoodPreset(p.id)}>删</button>
            </div>
          ))
        )}
      </Modal>

      {/* 删除确认 */}
      <ConfirmDialog open={!!deleteItem} title="删除食物" message="确定要删除这条食物记录吗？" onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} danger confirmText="删除" />
    </div>
  )
}
