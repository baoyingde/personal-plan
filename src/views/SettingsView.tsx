import { useState, useRef } from 'react'
import { useStore } from '../store/store'
import { exportToFile, validateImportData, readFileAsText } from '../utils/backup'
import ConfirmDialog from '../components/layout/ConfirmDialog'

export default function SettingsView() {
  const { data, updateSettings, importData, getDataForExport } = useStore()
  const { settings } = data
  const fileRef = useRef<HTMLInputElement>(null)
  const [importConfirm, setImportConfirm] = useState(false)
  const [pendingImport, setPendingImport] = useState<any>(null)
  const [importError, setImportError] = useState('')

  // Period editing
  const [editPeriods, setEditPeriods] = useState(false)
  const [periods, setPeriods] = useState(settings.periods)

  const handleExport = () => {
    const dataToExport = getDataForExport()
    exportToFile(dataToExport)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    try {
      const json = await readFileAsText(file)
      const validated = validateImportData(json)
      if (!validated) {
        setImportError('文件格式不正确或结构不匹配，请检查是否为本应用导出的备份文件。')
        return
      }
      setPendingImport(validated)
      setImportConfirm(true)
    } catch {
      setImportError('读取文件失败')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) return
    // Auto-backup before import
    handleExport()
    importData(pendingImport)
    setPendingImport(null)
    setImportConfirm(false)
  }

  const handleSavePeriods = () => {
    updateSettings({ periods })
    setEditPeriods(false)
  }

  return (
    <div style={{ maxWidth: 600 }}>
      {/* 数据备份 */}
      <div className="card mb-16">
        <div className="card-header">💾 数据备份</div>
        <div className="card-body">
          <p className="text-sm text-secondary mb-16">导出全部数据到 JSON 文件；从文件导入恢复数据（导入前会自动备份当前数据）。</p>
          <div className="flex gap-8">
            <button className="btn btn-primary" onClick={handleExport}>导出全部数据</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>导入数据</button>
            <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
          {importError && <div className="text-sm text-danger mt-8">{importError}</div>}
        </div>
      </div>

      {/* 学期设置 */}
      <div className="card mb-16">
        <div className="card-header">📅 学期设置</div>
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">学期名称</label>
            <input className="input" value={settings.semesterName} onChange={e => updateSettings({ semesterName: e.target.value })} placeholder="如：2025-2026 第一学期" />
          </div>
          <div className="form-group">
            <label className="form-label">开学日期（周一）</label>
            <input className="input" type="date" value={settings.semesterStartDate} onChange={e => updateSettings({ semesterStartDate: e.target.value })} />
          </div>
          <label className="checkbox-label mt-8">
            <input type="checkbox" checked={settings.weekendEnabled} onChange={e => updateSettings({ weekendEnabled: e.target.checked })} />
            课表显示周末
          </label>
        </div>
      </div>

      {/* 节次时间 */}
      <div className="card mb-16">
        <div className="card-header flex justify-between items-center">
          <span>⏰ 节次时间</span>
          <button className="btn btn-sm" onClick={() => { setPeriods(settings.periods); setEditPeriods(!editPeriods) }}>
            {editPeriods ? '取消' : '编辑'}
          </button>
        </div>
        <div className="card-body">
          {editPeriods ? (
            <>
              {periods.map((p, i) => (
                <div key={i} className="flex items-center gap-8 mb-8">
                  <input className="input" value={p.name} onChange={e => {
                    const next = [...periods]; next[i] = { ...next[i], name: e.target.value }; setPeriods(next)
                  }} style={{ width: 100 }} />
                  <input className="input" type="time" value={p.startTime} onChange={e => {
                    const next = [...periods]; next[i] = { ...next[i], startTime: e.target.value }; setPeriods(next)
                  }} style={{ width: 100 }} />
                  <span>-</span>
                  <input className="input" type="time" value={p.endTime} onChange={e => {
                    const next = [...periods]; next[i] = { ...next[i], endTime: e.target.value }; setPeriods(next)
                  }} style={{ width: 100 }} />
                  <button className="btn btn-ghost btn-sm text-danger" onClick={() => {
                    const next = periods.filter((_, j) => j !== i); setPeriods(next)
                  }}>删除</button>
                </div>
              ))}
              <div className="flex gap-8 mt-8">
                <button className="btn btn-sm" onClick={() => setPeriods([...periods, { name: `第${periods.length * 2 + 1}-${periods.length * 2 + 2}节`, startTime: '', endTime: '' }])}>+ 添加节次</button>
                <button className="btn btn-primary btn-sm" onClick={handleSavePeriods}>保存</button>
              </div>
            </>
          ) : (
            <div>
              {settings.periods.map((p, i) => (
                <div key={i} className="flex items-center gap-8" style={{ padding: '4px 0', fontSize: 13 }}>
                  <span className="fw-600" style={{ width: 80 }}>{p.name}</span>
                  <span className="text-secondary">{p.startTime} - {p.endTime}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 首页卡片 */}
      <div className="card mb-16">
        <div className="card-header">🏠 首页卡片显示</div>
        <div className="card-body">
          {([
            ['study', '学习任务'], ['timetable', '今日课表'], ['memo', '未完成备忘'],
            ['exercise', '今天锻炼'], ['entertainment', '今天娱乐'], ['diet', '今日饮食'],
          ] as [keyof typeof settings.homeCards, string][]).map(([key, label]) => (
            <label key={key} className="checkbox-label" style={{ padding: '4px 0' }}>
              <input type="checkbox" checked={settings.homeCards[key]}
                onChange={e => updateSettings({ homeCards: { ...settings.homeCards, [key]: e.target.checked } })} />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* 外观 */}
      <div className="card mb-16">
        <div className="card-header">🎨 外观</div>
        <div className="card-body">
          <label className="form-label">主题</label>
          <select className="select" value={settings.theme} onChange={e => updateSettings({ theme: e.target.value as 'light' | 'dark' })}>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </div>
      </div>

      {/* 关于 */}
      <div className="card">
        <div className="card-header">ℹ️ 关于</div>
        <div className="card-body text-sm text-secondary">
          <div>生活规划 App v2.0</div>
          <div>本地运行，数据存在浏览器 IndexedDB 中，可在顶栏点击「保存」手动持久化。</div>
          <div>音乐使用 File System Access API 从本地文件夹直接读取。</div>
        </div>
      </div>

      {/* 导入确认 */}
      <ConfirmDialog
        open={importConfirm}
        title="导入数据"
        message="导入将覆盖当前所有数据。系统会在导入前自动备份当前数据。确定继续吗？"
        onConfirm={handleConfirmImport}
        onCancel={() => { setImportConfirm(false); setPendingImport(null) }}
        danger
        confirmText="确认导入"
      />
    </div>
  )
}
