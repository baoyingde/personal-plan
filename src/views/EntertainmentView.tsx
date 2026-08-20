import { useState } from 'react'
import { useStore } from '../store/store'
import { todayStr, formatDate, getMonthDays, parseDate, dateAdd, isPast } from '../utils/date'
import Modal from '../components/layout/Modal'
import ConfirmDialog from '../components/layout/ConfirmDialog'
import type { Entertainment, EntertainmentType } from '../types'

const TYPE_LABELS: Record<EntertainmentType, string> = {
  outing: '外出', gathering: '聚会', sport: '运动', game: '游戏', movie: '影视', other: '其他',
}

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

export default function EntertainmentView() {
  const { data, addEntertainment, updateEntertainment, deleteEntertainment, toggleEntertainment } = useStore()
  const today = todayStr()
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState(today)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // form
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState<EntertainmentType>('other')
  const [notes, setNotes] = useState('')

  const days = getMonthDays(viewYear, viewMonth)
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const blanks = Array.from({ length: firstDow === 0 ? 6 : firstDow - 1 }, (_, i) => i) // Mon=0

  const eventsByDate = (d: string) => data.entertainments.filter(e => e.date === d)
  const hasEvent = (d: string) => eventsByDate(d).length > 0

  const upcoming = data.entertainments
    .filter(e => !e.done && e.date >= today)
    .sort((a, b) => (a.date + (a.startTime || '') < b.date + (b.startTime || '') ? -1 : 1))
    .slice(0, 5)

  const selectedEvents = eventsByDate(selectedDate).sort((a, b) => (a.startTime || '99:99') < (b.startTime || '99:99') ? -1 : 1)

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) } else setViewMonth(m => m - 1) }
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) } else setViewMonth(m => m + 1) }

  const resetForm = () => {
    setTitle(''); setDate(selectedDate); setStartTime(''); setEndTime('')
    setLocation(''); setType('other'); setNotes('')
  }

  const openAdd = () => { resetForm(); setEditId(null); setShowForm(true) }

  const openEdit = (ent: Entertainment) => {
    setEditId(ent.id); setTitle(ent.title); setDate(ent.date)
    setStartTime(ent.startTime || ''); setEndTime(ent.endTime || '')
    setLocation(ent.location || ''); setType(ent.type); setNotes(ent.notes)
    setShowForm(true)
  }

  const handleSave = () => {
    if (!title.trim()) return
    const ent: Omit<Entertainment, 'id'> = {
      title: title.trim(), date, startTime: startTime || undefined,
      endTime: endTime || undefined, location: location.trim() || undefined,
      type, notes: notes.trim(), done: false,
    }
    if (editId) {
      updateEntertainment(editId, { ...ent, id: editId })
      setEditId(null)
    } else {
      addEntertainment(ent)
    }
    setShowForm(false)
    setSelectedDate(date)
  }

  const handleDelete = () => {
    if (deleteId) { deleteEntertainment(deleteId); setDeleteId(null) }
  }

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* 左侧日历 + 即将到来 */}
      <div style={{ width: 320 }}>
        <div className="card mb-16">
          <div className="card-header flex justify-between items-center">
            <button className="btn btn-ghost btn-sm" onClick={prevMonth}>◀</button>
            <span>{viewYear}年{viewMonth + 1}月</span>
            <button className="btn btn-ghost btn-sm" onClick={nextMonth}>▶</button>
          </div>
          <div className="card-body">
            <div className="calendar">
              {WEEKDAY_NAMES.map(d => <div key={d} className="calendar-header">{d}</div>)}
              {blanks.map((_, i) => <div key={`blank-${i}`} />)}
              {days.map(d => {
                const ds = formatDate(d)
                const isT = ds === today
                const hasE = hasEvent(ds)
                return (
                  <div
                    key={ds}
                    className={`calendar-day${isT ? ' today' : ''}${ds === selectedDate ? '' : ''}${hasE ? ' has-event' : ''}`}
                    onClick={() => setSelectedDate(ds)}
                    style={ds === selectedDate && !isT ? { border: '2px solid var(--accent)', borderRadius: 6 } : undefined}
                  >
                    {d.getDate()}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">即将到来</div>
          <div className="card-body">
            {upcoming.length === 0 ? (
              <div className="text-sm text-secondary">暂无活动</div>
            ) : upcoming.map(e => (
              <div key={e.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <div className="fw-600">{e.title}</div>
                <div className="text-secondary">{e.date}{e.startTime ? ` ${e.startTime}` : ''} {e.location && `· ${e.location}`}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧选中日期的活动 */}
      <div style={{ flex: 1 }}>
        <div className="flex items-center justify-between mb-16">
          <span className="fw-600" style={{ fontSize: 16 }}>{selectedDate} 的活动</span>
          <button className="btn btn-primary" onClick={openAdd}>+ 新增活动</button>
        </div>
        {selectedEvents.length === 0 ? (
          <div className="card"><div className="card-body empty">这天没有活动</div></div>
        ) : (
          selectedEvents.map(e => (
            <div key={e.id} className="card mb-8" style={{ opacity: e.done ? 0.6 : 1 }}>
              <div className="card-body">
                <div className="flex items-center gap-8 mb-8">
                  <input type="checkbox" checked={e.done} onChange={() => toggleEntertainment(e.id)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                  <span className={`fw-600 ${e.done ? 'line-through' : ''}`}>{e.title}</span>
                  <span className="badge badge-accent">{TYPE_LABELS[e.type]}</span>
                  <div style={{ marginLeft: 'auto' }} className="flex gap-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>编辑</button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteId(e.id)}>删除</button>
                  </div>
                </div>
                <div className="text-sm text-secondary" style={{ paddingLeft: 24 }}>
                  {e.startTime && <span>{e.startTime}{e.endTime ? ` - ${e.endTime}` : ''}</span>}
                  {e.location && <span> · {e.location}</span>}
                  {e.notes && <div style={{ marginTop: 4 }}>{e.notes}</div>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        open={showForm}
        title={editId ? '编辑活动' : '新增活动'}
        onClose={() => setShowForm(false)}
        footer={<>
          <button className="btn" onClick={() => setShowForm(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>{editId ? '保存' : '添加'}</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">标题</label>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">日期</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="flex gap-8">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">开始时间</label>
            <input className="input" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">结束时间</label>
            <input className="input" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">地点</label>
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">类型</label>
          <select className="select w-full" value={type} onChange={e => setType(e.target.value as EntertainmentType)}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea className="textarea" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="删除活动" message="确定要删除这个活动吗？" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger confirmText="删除" />
    </div>
  )
}
