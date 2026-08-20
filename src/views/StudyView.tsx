import { useState } from 'react'
import { useStore } from '../store/store'
import { todayStr, isPast, isToday } from '../utils/date'
import Modal from '../components/layout/Modal'
import ConfirmDialog from '../components/layout/ConfirmDialog'
import type { Subject, StudyTask, Subtask, TaskStatus } from '../types'

type Filter = 'all' | 'today' | 'overdue' | 'done'

const DEFAULT_COLORS = ['#4f46e5', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316']

export default function StudyView() {
  const { data, addSubject, updateSubject, deleteSubject, addStudyTask, updateStudyTask, deleteStudyTask, toggleStudyTask, toggleSubtask } = useStore()
  const [activeSubject, setActiveSubject] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)

  // Subject form
  const [subjName, setSubjName] = useState('')
  const [subjColor, setSubjColor] = useState(DEFAULT_COLORS[0])

  // Task form
  const [taskTitle, setTaskTitle] = useState('')
  const [taskSubject, setTaskSubject] = useState('')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [taskSubtasks, setTaskSubtasks] = useState<string[]>([])

  const { subjects, studyTasks } = data
  const today = todayStr()

  const filteredTasks = studyTasks.filter(t => {
    if (activeSubject && t.subjectId !== activeSubject) return false
    if (filter === 'today') return t.deadline === today
    if (filter === 'overdue') return t.status !== 'done' && t.deadline && isPast(t.deadline)
    if (filter === 'done') return t.status === 'done'
    return true
  }).sort((a, b) => {
    if (a.status !== b.status) return a.status === 'done' ? 1 : -1
    if (a.deadline && b.deadline) return a.deadline < b.deadline ? -1 : 1
    if (a.deadline) return -1
    return 1
  })

  const getSubject = (id: string) => subjects.find(s => s.id === id)

  const resetTaskForm = () => {
    setTaskTitle('')
    setTaskSubject(activeSubject || '')
    setTaskDeadline('')
    setTaskNotes('')
    setTaskSubtasks([])
  }

  const openAddTask = () => {
    resetTaskForm()
    setShowAddTask(true)
  }

  const openEditTask = (id: string) => {
    const t = studyTasks.find(t => t.id === id)
    if (!t) return
    setEditTaskId(id)
    setTaskTitle(t.title)
    setTaskSubject(t.subjectId)
    setTaskDeadline(t.deadline || '')
    setTaskNotes(t.notes)
    setTaskSubtasks(t.subtasks.map(s => s.text))
  }

  const handleSaveTask = () => {
    if (!taskTitle.trim()) return
    const subtasks: Subtask[] = taskSubtasks.filter(s => s.trim()).map(s => ({ text: s.trim(), done: false }))
    if (editTaskId) {
      const old = studyTasks.find(t => t.id === editTaskId)
      updateStudyTask(editTaskId, {
        title: taskTitle.trim(),
        subjectId: taskSubject || subjects[0]?.id || '',
        deadline: taskDeadline || undefined,
        notes: taskNotes.trim(),
        subtasks: old ? old.subtasks.map((s, i) => i < subtasks.length ? { ...s, text: subtasks[i].text } : s) : subtasks,
      })
      setEditTaskId(null)
    } else {
      addStudyTask({
        title: taskTitle.trim(),
        subjectId: taskSubject || subjects[0]?.id || '',
        deadline: taskDeadline || undefined,
        notes: taskNotes.trim(),
        subtasks,
      })
      setShowAddTask(false)
    }
  }

  const handleAddSubject = () => {
    if (!subjName.trim()) return
    addSubject(subjName.trim(), subjColor)
    setSubjName('')
    setShowAddSubject(false)
  }

  const handleDeleteSubject = () => {
    if (deleteSubjectId) {
      deleteSubject(deleteSubjectId)
      if (activeSubject === deleteSubjectId) setActiveSubject(null)
      setDeleteSubjectId(null)
    }
  }

  const handleDeleteTask = () => {
    if (deleteTaskId) {
      deleteStudyTask(deleteTaskId)
      setDeleteTaskId(null)
    }
  }

  const getProgress = (task: StudyTask) => {
    if (task.subtasks.length === 0) return task.status === 'done' ? 100 : 0
    const doneCount = task.subtasks.filter(s => s.done).length
    return Math.round((doneCount / task.subtasks.length) * 100)
  }

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* 左侧学科列表 */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <span>学科</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddSubject(true)}>+ 新增</button>
          </div>
          <div>
            <div
              className={`nav-item${activeSubject === null ? ' active' : ''}`}
              onClick={() => setActiveSubject(null)}
              style={{ color: activeSubject === null ? '#fff' : undefined }}
            >
              <span>全部学科</span>
            </div>
            {subjects.map(s => (
              <div
                key={s.id}
                className={`nav-item${activeSubject === s.id ? ' active' : ''}`}
                onClick={() => setActiveSubject(s.id)}
                style={{ color: activeSubject === s.id ? '#fff' : undefined, justifyContent: 'space-between' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  {s.name}
                </span>
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', fontSize: 11 }} onClick={(e) => { e.stopPropagation(); setDeleteSubjectId(s.id) }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右侧任务列表 */}
      <div style={{ flex: 1 }}>
        <div className="flex items-center justify-between mb-16">
          <div className="flex gap-8">
            {([['all', '全部'], ['today', '今天到期'], ['overdue', '已逾期'], ['done', '已完成']] as [Filter, string][]).map(([key, label]) => (
              <button key={key} className={`btn btn-sm${filter === key ? ' btn-primary' : ''}`} onClick={() => setFilter(key)}>{label}</button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={openAddTask}>+ 新增任务</button>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="card"><div className="card-body empty">暂无任务</div></div>
        ) : (
          filteredTasks.map(task => {
            const subj = getSubject(task.subjectId)
            const progress = getProgress(task)
            const isOverdue = task.status !== 'done' && task.deadline && isPast(task.deadline)
            return (
              <div key={task.id} className="card mb-8" style={{ borderColor: isOverdue ? 'var(--danger)' : undefined }}>
                <div className="card-body">
                  <div className="flex items-center gap-8 mb-8">
                    <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleStudyTask(task.id)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                    <span className={`fw-600 ${task.status === 'done' ? 'line-through' : ''}`}>{task.title}</span>
                    {subj && <span className="badge" style={{ background: subj.color + '22', color: subj.color }}>{subj.name}</span>}
                    {task.deadline && (
                      <span className={`badge ${isOverdue ? 'badge-danger' : isToday(task.deadline) ? 'badge-warning' : 'badge-accent'}`}>
                        {task.deadline}
                      </span>
                    )}
                    <div style={{ marginLeft: 'auto' }} className="flex gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditTask(task.id)}>编辑</button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteTaskId(task.id)}>删除</button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.2s' }} />
                  </div>

                  {/* Subtasks */}
                  {task.subtasks.length > 0 && (
                    <div style={{ paddingLeft: 24 }}>
                      {task.subtasks.map((s, i) => (
                        <label key={i} className="checkbox-label" style={{ padding: '3px 0', fontSize: 13 }}>
                          <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(task.id, i)} style={{ accentColor: 'var(--accent)' }} />
                          <span className={s.done ? 'line-through' : ''}>{s.text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {task.notes && <div className="text-sm text-secondary" style={{ paddingLeft: 24, marginTop: 4 }}>{task.notes}</div>}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 新增学科弹窗 */}
      <Modal
        open={showAddSubject}
        title="新增学科"
        onClose={() => setShowAddSubject(false)}
        footer={<>
          <button className="btn" onClick={() => setShowAddSubject(false)}>取消</button>
          <button className="btn btn-primary" onClick={handleAddSubject}>添加</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">学科名称</label>
          <input className="input" value={subjName} onChange={e => setSubjName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">颜色</label>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {DEFAULT_COLORS.map(c => (
              <div key={c} onClick={() => setSubjColor(c)} style={{
                width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                border: subjColor === c ? '2px solid var(--text)' : '2px solid transparent',
              }} />
            ))}
          </div>
        </div>
      </Modal>

      {/* 新增/编辑任务弹窗 */}
      <Modal
        open={showAddTask || !!editTaskId}
        title={editTaskId ? '编辑任务' : '新增任务'}
        onClose={() => { setShowAddTask(false); setEditTaskId(null) }}
        footer={<>
          <button className="btn" onClick={() => { setShowAddTask(false); setEditTaskId(null) }}>取消</button>
          <button className="btn btn-primary" onClick={handleSaveTask}>{editTaskId ? '保存' : '添加'}</button>
        </>}
      >
        <div className="form-group">
          <label className="form-label">标题</label>
          <input className="input" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">学科</label>
          <select className="select w-full" value={taskSubject} onChange={e => setTaskSubject(e.target.value)}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">截止日期（可选）</label>
          <input className="input" type="date" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">子任务（每行一个）</label>
          <textarea
            className="textarea"
            value={taskSubtasks.join('\n')}
            onChange={e => setTaskSubtasks(e.target.value.split('\n'))}
            placeholder="子任务1&#10;子任务2"
          />
        </div>
        <div className="form-group">
          <label className="form-label">备注</label>
          <textarea className="textarea" value={taskNotes} onChange={e => setTaskNotes(e.target.value)} />
        </div>
      </Modal>

      {/* 删除确认 */}
      <ConfirmDialog open={!!deleteSubjectId} title="删除学科" message="删除学科会同时删除该学科下的所有任务，确定吗？" onConfirm={handleDeleteSubject} onCancel={() => setDeleteSubjectId(null)} danger confirmText="删除" />
      <ConfirmDialog open={!!deleteTaskId} title="删除任务" message="确定要删除这个任务吗？" onConfirm={handleDeleteTask} onCancel={() => setDeleteTaskId(null)} danger confirmText="删除" />
    </div>
  )
}
