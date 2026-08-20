import { useStore } from '../../store/store'
import type { ViewId } from '../../types'

const NAV_ITEMS: { id: ViewId; label: string; icon: string }[] = [
  { id: 'home', label: '首页预览', icon: '🏠' },
  { id: 'study', label: '学习计划', icon: '📚' },
  { id: 'exercise', label: '锻炼计划', icon: '💪' },
  { id: 'diet', label: '饮食计划', icon: '🍎' },
  { id: 'entertainment', label: '娱乐计划', icon: '🎮' },
  { id: 'timetable', label: '学期课表', icon: '📅' },
  { id: 'music', label: '音乐播放', icon: '🎵' },
  { id: 'memo', label: '备忘录', icon: '📝' },
  { id: 'settings', label: '数据与设置', icon: '⚙️' },
]

export default function Sidebar() {
  const { currentView, setCurrentView } = useStore()

  return (
    <nav className="sidebar" data-testid="sidebar">
      <div className="sidebar-logo">生活规划</div>
      <div className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item${currentView === item.id ? ' active' : ''}`}
            onClick={() => setCurrentView(item.id)}
            data-testid={`nav-${item.id}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </nav>
  )
}
