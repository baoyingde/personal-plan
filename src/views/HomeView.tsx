import { useStore } from '../store/store'
import { todayStr, isToday, isPast, semesterWeek, getDayOfWeek, isOddWeek } from '../utils/date'

export default function HomeView() {
  const { data, toggleStudyTask, toggleMemo, setCurrentView } = useStore()
  const { settings, studyTasks, courses, memos, exerciseEntries, entertainments, dietRecords, subjects } = data
  const today = todayStr()
  const todayDow = getDayOfWeek(today)

  const currentWeek = semesterWeek(today, settings.semesterStartDate)
  const odd = isOddWeek(today, settings.semesterStartDate)

  const todayTasks = studyTasks.filter(t =>
    t.status !== 'done' && t.deadline && (t.deadline === today || isPast(t.deadline))
  ).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))

  const todayCourses = courses.filter(c => {
    if (c.dayOfWeek !== todayDow) return false
    if (c.weekType === 'every') return true
    if (c.weekType === 'odd') return odd
    if (c.weekType === 'even') return !odd
    return false
  }).sort((a, b) => a.periodIndex - b.periodIndex)

  const pendingMemos = memos.filter(m => !m.done).sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return a.order - b.order
  })

  const todayExercises = exerciseEntries.filter(e => e.dayOfWeek === todayDow)

  const todayEntertainments = entertainments.filter(e => e.date === today && !e.done)

  const todayDiet = dietRecords.find(r => r.date === today)
  const totalCalories = todayDiet
    ? [...todayDiet.meals.breakfast, ...todayDiet.meals.lunch, ...todayDiet.meals.dinner, ...todayDiet.meals.snack]
        .reduce((sum, item) => sum + item.calories, 0)
    : 0

  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name ?? '未分类'
  const getSubjectColor = (id: string) => subjects.find(s => s.id === id)?.color ?? '#999'

  const hour = new Date().getHours()
  const greeting = hour < 5 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好'
  const pendingCount = pendingMemos.length
  const overdueCount = studyTasks.filter(t => t.status !== 'done' && t.deadline && isPast(t.deadline)).length

  return (
    <div>
      {/* 问候区 */}
      <div className="home-hero mb-16">
        <div className="home-hero-title">
          {greeting} 👋
          {settings.semesterName && <span className="home-hero-sem">{settings.semesterName}</span>}
        </div>
        <div className="home-hero-sub">
          <span>{today}</span>
          {currentWeek > 0 && <span className="badge badge-accent">第 {currentWeek} 周 · {odd ? '单周' : '双周'}</span>}
          <span className="badge badge-warning">{pendingCount} 条待办</span>
          {overdueCount > 0 && <span className="badge badge-danger">{overdueCount} 条逾期</span>}
        </div>
      </div>

      <div className="home-grid">
        {/* 学习任务 */}
        <div className="card">
          <div className="card-header">
            <span>📚 今天的学习任务</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentView('study')}>查看全部</button>
          </div>
          <div className="card-body">
            {todayTasks.length === 0 ? (
              <div className="text-sm text-secondary">今天没有到期的任务 ✨</div>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={task.status === 'done'} onChange={() => toggleStudyTask(task.id)} />
                    <span className={task.status === 'done' ? 'line-through' : ''}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: getSubjectColor(task.subjectId), marginRight: 6 }} />
                      {task.title}
                    </span>
                    <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>{task.deadline}</span>
                  </label>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 今日课表 */}
        <div className="card">
          <div className="card-header">
            <span>📅 今日课表</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentView('timetable')}>查看全部</button>
          </div>
          <div className="card-body">
            {todayCourses.length === 0 ? (
              <div className="text-sm text-secondary">今天没有课 ✨</div>
            ) : (
              todayCourses.map(c => {
                const period = settings.periods[c.periodIndex]
                return (
                  <div key={c.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-8">
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                      <span className="fw-600">{c.name}</span>
                      <span className="badge badge-accent">{c.weekType === 'odd' ? '单周' : c.weekType === 'even' ? '双周' : '每周'}</span>
                    </div>
                    <div className="text-sm text-secondary">
                      {period ? `${period.startTime}-${period.endTime}` : `第${c.periodIndex + 1}节`} {c.location && `· ${c.location}`}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 未完成备忘 */}
        <div className="card">
          <div className="card-header">
            <span>📝 未完成备忘</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentView('memo')}>查看全部</button>
          </div>
          <div className="card-body">
            {pendingMemos.length === 0 ? (
              <div className="text-sm text-secondary">没有待办事项 ✨</div>
            ) : (
              pendingMemos.slice(0, 5).map(m => (
                <div key={m.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={false} onChange={() => toggleMemo(m.id)} />
                    <span className={m.dueDate && isPast(m.dueDate) ? 'text-danger' : ''}>
                      {m.pinned ? '📌 ' : ''}{m.text}
                    </span>
                    {m.dueDate && (
                      <span className={`badge ${isPast(m.dueDate) ? 'badge-danger' : 'badge-warning'}`} style={{ marginLeft: 'auto' }}>
                        {m.dueDate}
                      </span>
                    )}
                  </label>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="home-grid">
        {/* 今天锻炼 */}
        <div className="card">
          <div className="card-header">
            <span>💪 今天锻炼</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentView('exercise')}>查看全部</button>
          </div>
          <div className="card-body">
            {todayExercises.length === 0 ? (
              <div className="text-sm text-secondary">今天没有安排锻炼</div>
            ) : (
              todayExercises.map(e => (
                <div key={e.id} style={{ padding: '4px 0', fontSize: 13 }}>
                  <span className="fw-600">{e.name}</span>
                  {e.detail && <span className="text-secondary"> · {e.detail}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 今天娱乐 */}
        <div className="card">
          <div className="card-header">
            <span>🎮 今天娱乐</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentView('entertainment')}>查看全部</button>
          </div>
          <div className="card-body">
            {todayEntertainments.length === 0 ? (
              <div className="text-sm text-secondary">今天没有娱乐安排</div>
            ) : (
              todayEntertainments.map(e => (
                <div key={e.id} style={{ padding: '4px 0', fontSize: 13 }}>
                  <span className="fw-600">{e.title}</span>
                  {e.startTime && <span className="text-secondary"> · {e.startTime}</span>}
                  {e.location && <span className="text-secondary"> · {e.location}</span>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 今日饮食 */}
        <div className="card">
          <div className="card-header">
            <span>🍎 今日饮食</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentView('diet')}>查看全部</button>
          </div>
          <div className="card-body">
            {totalCalories === 0 ? (
              <div className="text-sm text-secondary">今天还没有记录饮食</div>
            ) : (
              <div>
                <div className="home-stat">{totalCalories}</div>
                <div className="home-stat-label">千卡</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
