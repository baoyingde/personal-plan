import { useState } from 'react'
import { useStore } from '../store/store'
import { todayStr, formatDate, getMonthDays, getDayOfWeek, dateAdd } from '../utils/date'
import Modal from '../components/layout/Modal'
import ConfirmDialog from '../components/layout/ConfirmDialog'
import type { ExerciseEntry } from '../types'

const DAY_NAMES = ['一', '二', '三', '四', '五', '六', '日']
const WEEKDAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

export default function ExerciseView() {
  const {
    data, addExerciseEntry, updateExerciseEntry, deleteExerciseEntry,
    toggleExerciseCompletedDate, isExerciseDateCompleted,
  } = useStore()
  const today = todayStr()
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState(today)
  const [editEntry, setEditEntry] = useState<Partial<ExerciseEntry> & { dayOfWeek: number } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')
  const [timeRange, setTimeRange] = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  const days = getMonthDays(viewYear, viewMonth)
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  // 周一为第一列
  const blanks = Array.from({ length: firstDow === 0 ? 6 : firstDow - 1 }, (_, i) => i)

  const getByDay = (day: number) => data.exerciseEntries.filter(e => e.dayOfWeek === day)

  const selectedDow = getDayOfWeek(selectedDate)
  const selectedEntries = getByDay(selectedDow)
  const selectedCompleted = isExerciseDateCompleted(selectedDate)

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1)
  }
  const goToday = () => {
    setSelectedDate(today)
    const d = new Date()
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const openAdd = (dayOfWeek: number) => {
    setEditId(null)
    setName('')
    setDetail('')
    setTimeRange('')
    setEditEntry({ dayOfWeek })
  }

  const openEdit = (entry: ExerciseEntry) => {
    setEditId(entry.id)
    setName(entry.name)
    setDetail(entry.detail)
    setTimeRange(entry.timeRange || '')
    setEditEntry({ ...entry })
  }

  const handleSave = () => {
    if (!name.trim() || !editEntry) return
    if (editId) {
      updateExerciseEntry(editId, { name: name.trim(), detail: detail.trim(), timeRange: timeRange || undefined })
    } else {
      addExerciseEntry({ dayOfWeek: editEntry.dayOfWeek, name: name.trim(), detail: detail.trim(), timeRange: timeRange || undefined })
    }
    setEditEntry(null)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteExerciseEntry(deleteId)
      setDeleteId(null)
    }
  }

  const monthLabel = `${viewYear}年${viewMonth + 1}月`

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* 左侧月历 */}
      <div style={{ width: 460, flexShrink: 0 }}>
        <div className="card mb-16">
          <div className="card-header flex justify-between items-center">
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◀</button>
            <span className="fw-600">{monthLabel}</span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>▶</button>
          </div>
          <div className="card-body">
            <div className="calendar exercise-calendar">
              {DAY_NAMES.map(d => <div key={d} className="calendar-header">{d}</div>)}
              {blanks.map((_, i) => <div key={`blank-${i}`} />)}
              {days.map(d => {
                const ds = formatDate(d)
                const dow = getDayOfWeek(ds)
                const entries = getByDay(dow)
                const isT = ds === today
                const isSel = ds === selectedDate
                const completed = isExerciseDateCompleted(ds)
                return (
                  <div
                    key={ds}
                    className={`exercise-day${isT ? ' today' : ''}${isSel ? ' selected' : ''}${completed ? ' completed' : ''}${entries.length === 0 ? ' empty' : ''}`}
                    onClick={() => setSelectedDate(ds)}
                    data-testid={`exercise-day-${ds}`}
                  >
                    <div className="exercise-day-num">{d.getDate()}</div>
                    {entries.length > 0 && (
                      <div className="exercise-day-list">
                        {entries.slice(0, 3).map(e => (
                          <div key={e.id} className="exercise-day-item" title={e.detail}>
                            {e.name}
                          </div>
                        ))}
                        {entries.length > 3 && <div className="exercise-day-more">+{entries.length - 3}</div>}
                      </div>
                    )}
                    {completed && <div className="exercise-day-check">✓</div>}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="card-footer flex items-center gap-12">
            <button className="btn btn-sm" onClick={goToday}>回到今天</button>
            <span className="text-sm text-secondary">点击日期查看/添加锻炼安排</span>
          </div>
        </div>
      </div>

      {/* 右侧选中日期详情 */}
      <div style={{ flex: 1 }}>
        <div className="card mb-16">
          <div className="card-header flex justify-between items-center">
            <span>
              {selectedDate}（{WEEKDAY_NAMES[selectedDow]}）
              {selectedDate === today && <span className="badge badge-accent" style={{ marginLeft: 8 }}>今天</span>}
            </span>
            <div className="flex gap-8">
              <button
                className={`btn btn-sm${selectedCompleted ? ' btn-primary' : ''}`}
                onClick={() => toggleExerciseCompletedDate(selectedDate)}
                data-testid="toggle-exercise-complete"
              >
                {selectedCompleted ? '✓ 已完成' : '标记完成'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => openAdd(selectedDow)}>+ 添加锻炼</button>
            </div>
          </div>
          <div className="card-body">
            {selectedEntries.length === 0 ? (
              <div className="empty">
                <div style={{ fontSize: 32, marginBottom: 8 }}>💪</div>
                这一天没有安排锻炼，点击「+ 添加锻炼」开始制定计划吧
              </div>
            ) : (
              selectedEntries.map(entry => (
                <div key={entry.id} className="exercise-entry-item">
                  <div className="flex items-center gap-8" style={{ flex: 1 }}>
                    <span className="exercise-entry-dot" />
                    <div>
                      <div className="fw-600">{entry.name}</div>
                      {(entry.detail || entry.timeRange) && (
                        <div className="text-sm text-secondary">
                          {entry.detail}
                          {entry.detail && entry.timeRange && ' · '}
                          {entry.timeRange}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(entry)}>编辑</button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteId(entry.id)}>删除</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 本周概览 */}
        <div className="card">
          <div className="card-header">本周锻炼概览</div>
          <div className="card-body">
            <div className="flex gap-8" style={{ overflowX: 'auto' }}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = dateAdd(today, i - 3)
                const dow = getDayOfWeek(d)
                const count = getByDay(dow).length
                const done = isExerciseDateCompleted(d)
                return (
                  <div key={d} className={`weekday-pill${d === today ? ' today' : ''}${done ? ' done' : ''}`} onClick={() => { setSelectedDate(d); const dt = new Date(d + 'T00:00:00'); setViewYear(dt.getFullYear()); setViewMonth(dt.getMonth()) }}>
                    <div className="text-sm">{d.slice(5)}</div>
                    <div className="text-secondary" style={{ fontSize: 11 }}>{WEEKDAY_NAMES[dow].slice(2)}</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {count > 0 ? `${count}项` : '—'}
                      {done && <span className="text-success" style={{ marginLeft: 4 }}>✓</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 添加/编辑弹窗 */}
      <Modal
        open={!!editEntry}
        title={editId ? '编辑锻炼' : '添加锻炼'}
        onClose={() => setEditEntry(null)}
        footer={<>
          <button className="btn" onClick={() => setEditEntry(null)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>{editId ? '保存' : '添加'}</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">名称</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="如：胸部 · 卧推" />
        </div>
        <div className="form-group">
          <label className="form-label">说明（动作/组数/时长）</label>
          <input className="input" value={detail} onChange={e => setDetail(e.target.value)} placeholder="如：4组×10次 / 跑步30分钟" />
        </div>
        <div className="form-group">
          <label className="form-label">时间段（可选）</label>
          <input className="input" value={timeRange} onChange={e => setTimeRange(e.target.value)} placeholder="如：18:00-19:00" />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="删除锻炼安排" message="确定要删除这条锻炼安排吗？" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger confirmText="删除" />
    </div>
  )
}
