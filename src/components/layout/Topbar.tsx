import { useState } from 'react'
import { useStore } from '../../store/store'
import { todayStr, formatChineseDate, weekLabel } from '../../utils/date'

const VIEW_TITLES: Record<string, string> = {
  home: '首页预览',
  study: '学习计划',
  exercise: '锻炼计划',
  diet: '饮食计划',
  entertainment: '娱乐计划',
  timetable: '学期课表',
  music: '音乐播放',
  memo: '备忘录',
  settings: '数据与设置',
}

export default function Topbar() {
  const { currentView, data, saveNow, lastSavedAt } = useStore()
  const [savedFlash, setSavedFlash] = useState(false)
  const today = todayStr()
  const { semesterStartDate } = data.settings

  const handleSave = async () => {
    await saveNow()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  const fmtTime = (ts: number | null) => {
    if (!ts) return ''
    const d = new Date(ts)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <header className="topbar" data-testid="topbar">
      <div className="topbar-title">{VIEW_TITLES[currentView] ?? ''}</div>
      <div className="topbar-info">
        <span>{formatChineseDate(today)}</span>
        {semesterStartDate && <span>{weekLabel(today, semesterStartDate)}</span>}
        <span className="topbar-save" data-testid="save-status">
          {savedFlash
            ? '✓ 已保存'
            : lastSavedAt
              ? `上次保存 ${fmtTime(lastSavedAt)}`
              : '尚未保存'}
        </span>
        <button
          className="btn btn-primary btn-sm topbar-save-btn"
          data-testid="save-button"
          onClick={handleSave}
        >
          💾 保存
        </button>
      </div>
    </header>
  )
}
