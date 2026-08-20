import { useState } from 'react'
import { useStore } from '../store/store'
import { todayStr, getDayOfWeek, semesterWeek, isOddWeek, mondayOf, dateAdd } from '../utils/date'
import Modal from '../components/layout/Modal'
import ConfirmDialog from '../components/layout/ConfirmDialog'
import type { Course, WeekType } from '../types'

const DAY_NAMES = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DEFAULT_COLORS = ['#4f46e5', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1']

export default function TimetableView() {
  const { data, addCourse, updateCourse, deleteCourse, updateSettings } = useStore()
  const { settings, courses } = data
  const today = todayStr()
  const todayDow = getDayOfWeek(today)

  const [weekOffset, setWeekOffset] = useState(0) // 0=this week
  const [editCell, setEditCell] = useState<{ dayOfWeek: number; periodIndex: number } | null>(null)
  const [editCourseId, setEditCourseId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  // course form
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [weekType, setWeekType] = useState<WeekType>('every')
  const [color, setColor] = useState(DEFAULT_COLORS[0])
  const [formDay, setFormDay] = useState(1)
  const [formPeriod, setFormPeriod] = useState(0)

  // setup form
  const [semName, setSemName] = useState(settings.semesterName)
  const [semStart, setSemStart] = useState(settings.semesterStartDate)
  const [weekendOn, setWeekendOn] = useState(settings.weekendEnabled)

  const viewDate = dateAdd(today, weekOffset * 7)
  const currentWeek = semesterWeek(viewDate, settings.semesterStartDate)
  const odd = isOddWeek(viewDate, settings.semesterStartDate)
  const viewMonday = mondayOf(viewDate)

  const days = settings.weekendEnabled ? [1, 2, 3, 4, 5, 6, 7] : [1, 2, 3, 4, 5]
  const periods = settings.periods

  const getCellCourses = (dayOfWeek: number, periodIndex: number) => {
    return courses.filter(c => c.dayOfWeek === dayOfWeek && c.periodIndex === periodIndex)
  }

  const shouldShowCourse = (c: Course) => {
    if (c.weekType === 'every') return true
    if (c.weekType === 'odd') return odd
    return !odd
  }

  const openAdd = (dayOfWeek: number, periodIndex: number) => {
    setEditCourseId(null)
    setFormDay(dayOfWeek); setFormPeriod(periodIndex)
    setName(''); setLocation(''); setWeekType('every'); setColor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)])
    setEditCell({ dayOfWeek, periodIndex })
  }

  const openEdit = (c: Course) => {
    setEditCourseId(c.id)
    setFormDay(c.dayOfWeek); setFormPeriod(c.periodIndex)
    setName(c.name); setLocation(c.location); setWeekType(c.weekType); setColor(c.color)
    setEditCell({ dayOfWeek: c.dayOfWeek, periodIndex: c.periodIndex })
  }

  const handleSave = () => {
    if (!name.trim()) return
    if (editCourseId) {
      updateCourse(editCourseId, {
        name: name.trim(), location: location.trim(), weekType, color,
        dayOfWeek: formDay, periodIndex: formPeriod,
      })
      setEditCourseId(null)
    } else {
      addCourse({
        name: name.trim(), dayOfWeek: formDay, periodIndex: formPeriod,
        location: location.trim(), weekType, color,
      })
    }
    setEditCell(null)
  }

  const handleDelete = () => {
    if (deleteId) { deleteCourse(deleteId); setDeleteId(null) }
  }

  const handleSaveSetup = () => {
    if (!semStart) return
    updateSettings({ semesterName: semName.trim(), semesterStartDate: semStart, weekendEnabled: weekendOn })
    setShowSetup(false)
  }

  const weekLabel = currentWeek <= 0 ? '未开学' : `第 ${currentWeek} 周 · ${odd ? '单周' : '双周'}`

  return (
    <div>
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-16">
        <div className="flex items-center gap-16">
          <button className="btn btn-sm" onClick={() => setWeekOffset(w => w - 1)}>◀ 上一周</button>
          <span className="fw-600" style={{ minWidth: 180, textAlign: 'center' }}>
            {viewMonday} ～ {dateAdd(viewMonday, 6)} ({weekLabel})
          </span>
          <button className="btn btn-sm" onClick={() => setWeekOffset(w => w + 1)}>下一周 ▶</button>
          {weekOffset !== 0 && <button className="btn btn-sm" onClick={() => setWeekOffset(0)}>回到本周</button>}
        </div>
        <button className="btn" onClick={() => {
          setSemName(settings.semesterName); setSemStart(settings.semesterStartDate); setWeekendOn(settings.weekendEnabled)
          setShowSetup(true)
        }}>学期设置</button>
      </div>

      {/* 课表网格 */}
      {!settings.semesterStartDate ? (
        <div className="card">
          <div className="card-body empty">
            请先设置学期开始日期
            <button className="btn btn-primary" style={{ marginLeft: 12 }} onClick={() => {
              setSemName(''); setSemStart(''); setWeekendOn(false); setShowSetup(true)
            }}>设置学期</button>
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: 80, padding: '8px 6px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>节次</th>
                {days.map(d => (
                  <th key={d} style={{
                    padding: '8px 6px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'center',
                    color: d === todayDow && weekOffset === 0 ? 'var(--accent)' : undefined,
                    fontWeight: d === todayDow && weekOffset === 0 ? 700 : 600,
                  }}>
                    {DAY_NAMES[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period, pi) => (
                <tr key={pi}>
                  <td style={{
                    padding: '6px 8px', borderBottom: '1px solid var(--border)', background: 'var(--bg)',
                    fontSize: 12, textAlign: 'center', whiteSpace: 'nowrap',
                  }}>
                    <div className="fw-600">{period.name}</div>
                    <div className="text-secondary" style={{ fontSize: 10 }}>{period.startTime}-{period.endTime}</div>
                  </td>
                  {days.map(d => {
                    const cellCourses = getCellCourses(d, pi)
                    const isTodayCol = d === todayDow && weekOffset === 0
                    return (
                      <td key={d} style={{
                        padding: 4,
                        borderBottom: '1px solid var(--border)',
                        borderLeft: '1px solid var(--border)',
                        background: isTodayCol ? 'var(--accent-light)' : 'var(--bg-card)',
                        minWidth: 100,
                        verticalAlign: 'top',
                      }}>
                        {cellCourses.filter(shouldShowCourse).map(c => (
                          <div key={c.id} style={{
                            padding: '4px 6px',
                            borderRadius: 4,
                            background: c.color + '22',
                            borderLeft: `3px solid ${c.color}`,
                            marginBottom: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                          }} onClick={() => openEdit(c)}>
                            <div className="fw-600" style={{ color: c.color }}>{c.name}</div>
                            {c.location && <div className="text-secondary" style={{ fontSize: 10 }}>{c.location}</div>}
                            {c.weekType !== 'every' && (
                              <span className="badge" style={{ background: c.color + '33', color: c.color, fontSize: 9, padding: '1px 4px' }}>
                                {c.weekType === 'odd' ? '单' : '双'}
                              </span>
                            )}
                          </div>
                        ))}
                        {cellCourses.filter(shouldShowCourse).length === 0 && (
                          <button className="btn btn-ghost btn-sm w-full" style={{ fontSize: 10, padding: 2 }} onClick={() => openAdd(d, pi)}>+</button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 非本周课程（置灰提示） */}
      {courses.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {courses.filter(c => !shouldShowCourse(c)).length > 0 && (
            <div className="text-sm text-secondary">
              非本周课程（{odd ? '双周' : '单周'}）：
              {courses.filter(c => !shouldShowCourse(c)).map(c => (
                <span key={c.id} style={{ marginLeft: 8, opacity: 0.5 }}>{c.name}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 新增/编辑课程弹窗 */}
      <Modal
        open={!!editCell}
        title={editCourseId ? '编辑课程' : '新增课程'}
        onClose={() => setEditCell(null)}
        footer={<>
          {editCourseId && (
            <button className="btn btn-danger" style={{ marginRight: 'auto' }} onClick={() => { setDeleteId(editCourseId); setEditCell(null) }}>删除</button>
          )}
          <button className="btn" onClick={() => setEditCell(null)}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>{editCourseId ? '保存' : '添加'}</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">课程名称</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="flex gap-8">
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">星期</label>
            <select className="select w-full" value={formDay} onChange={e => setFormDay(Number(e.target.value))}>
              {DAY_NAMES.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">节次</label>
            <select className="select w-full" value={formPeriod} onChange={e => setFormPeriod(Number(e.target.value))}>
              {periods.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">地点</label>
          <input className="input" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">周次</label>
          <select className="select w-full" value={weekType} onChange={e => setWeekType(e.target.value as WeekType)}>
            <option value="every">每周</option>
            <option value="odd">单周</option>
            <option value="even">双周</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">颜色</label>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {DEFAULT_COLORS.map(c => (
              <div key={c} onClick={() => setColor(c)} style={{
                width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                border: color === c ? '2px solid var(--text)' : '2px solid transparent',
              }} />
            ))}
          </div>
        </div>
      </Modal>

      {/* 学期设置弹窗 */}
      <Modal
        open={showSetup}
        title="学期设置"
        onClose={() => setShowSetup(false)}
        footer={<>
          <button className="btn" onClick={() => setShowSetup(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleSaveSetup}>保存</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">学期名称</label>
          <input className="input" value={semName} onChange={e => setSemName(e.target.value)} placeholder="如：2025-2026 第一学期" />
        </div>
        <div className="form-group">
          <label className="form-label">开学日期（须为周一）</label>
          <input className="input" type="date" value={semStart} onChange={e => setSemStart(e.target.value)} />
          {semStart && new Date(semStart + 'T00:00:00').getDay() !== 1 && (
            <div className="text-sm text-danger" style={{ marginTop: 4 }}>⚠ 请选择周一作为开学日期</div>
          )}
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={weekendOn} onChange={e => setWeekendOn(e.target.checked)} />
          课表显示周末（周六、周日）
        </label>
      </Modal>

      <ConfirmDialog open={!!deleteId} title="删除课程" message="确定要删除这门课程吗？" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger confirmText="删除" />
    </div>
  )
}
