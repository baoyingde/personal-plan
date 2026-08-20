import { useState } from 'react'
import { useStore } from '../store/store'
import { todayStr, isPast } from '../utils/date'
import Modal from '../components/layout/Modal'
import ConfirmDialog from '../components/layout/ConfirmDialog'

export default function MemoView() {
  const { data, addMemo, updateMemo, deleteMemo, toggleMemo } = useStore()
  const [newText, setNewText] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editDue, setEditDue] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [addDue, setAddDue] = useState('')

  const memos = data.memos
  const pending = memos.filter(m => !m.done).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return a.order - b.order
  })
  const done = memos.filter(m => m.done).sort((a, b) => b.order - a.order)

  const handleAdd = () => {
    if (!newText.trim()) return
    addMemo(newText.trim(), addDue || undefined)
    setNewText('')
    setAddDue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  const startEdit = (id: string) => {
    const m = memos.find(m => m.id === id)
    if (!m) return
    setEditId(id)
    setEditText(m.text)
    setEditDue(m.dueDate || '')
  }

  const handleSaveEdit = () => {
    if (!editId || !editText.trim()) return
    updateMemo(editId, { text: editText.trim(), dueDate: editDue || undefined })
    setEditId(null)
  }

  const handleDelete = () => {
    if (deleteId) {
      deleteMemo(deleteId)
      setDeleteId(null)
    }
  }

  const renderMemoItem = (m: typeof memos[0]) => (
    <div key={m.id} style={{
      padding: '10px 12px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      <input type="checkbox" checked={m.done} onChange={() => toggleMemo(m.id)} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
      <div style={{ flex: 1 }}>
        <span className={m.done ? 'line-through' : ''} style={{ fontSize: 14 }}>
          {m.pinned && <span style={{ marginRight: 4 }}>📌</span>}
          {m.text}
        </span>
        {m.dueDate && (
          <span className={`badge ${isPast(m.dueDate) && !m.done ? 'badge-danger' : 'badge-warning'}`} style={{ marginLeft: 8 }}>
            {m.dueDate}
          </span>
        )}
      </div>
      <div className="flex gap-8">
        {!m.done && (
          <button className="btn btn-ghost btn-sm" onClick={() => updateMemo(m.id, { pinned: !m.pinned })}>
            {m.pinned ? '取消置顶' : '置顶'}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(m.id)}>编辑</button>
        <button className="btn btn-ghost btn-sm text-danger" onClick={() => setDeleteId(m.id)}>删除</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="card mb-16">
        <div className="card-body flex gap-8">
          <input
            className="input"
            placeholder="快速添加待办…（回车确认）"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
          />
          <input
            className="input"
            type="date"
            value={addDue}
            onChange={e => setAddDue(e.target.value)}
            style={{ width: 150 }}
          />
          <button className="btn btn-primary" onClick={handleAdd}>添加</button>
        </div>
      </div>

      <div className="card mb-16">
        <div className="card-header">未完成（{pending.length}）</div>
        {pending.length === 0 ? (
          <div className="card-body text-sm text-secondary">没有待办事项 ✨</div>
        ) : (
          pending.map(renderMemoItem)
        )}
      </div>

      <div className="card">
        <div className="card-header">已完成（{done.length}）</div>
        {done.length === 0 ? (
          <div className="card-body text-sm text-secondary">暂无</div>
        ) : (
          done.map(renderMemoItem)
        )}
      </div>

      {/* Edit modal */}
      <Modal
        open={!!editId}
        title="编辑待办"
        onClose={() => setEditId(null)}
        footer={
          <>
            <button className="btn" onClick={() => setEditId(null)}>取消</button>
            <button className="btn btn-primary" onClick={handleSaveEdit}>保存</button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">内容</label>
          <input className="input" value={editText} onChange={e => setEditText(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">截止日期（可选）</label>
          <input className="input" type="date" value={editDue} onChange={e => setEditDue(e.target.value)} />
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="删除待办"
        message="确定要删除这条待办吗？"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger
        confirmText="删除"
      />
    </div>
  )
}
