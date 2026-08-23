import { useEffect, useState } from 'react'
import { useStore } from './store/store'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import LoginPage from './views/LoginPage'
import HomeView from './views/HomeView'
import StudyView from './views/StudyView'
import ExerciseView from './views/ExerciseView'
import DietView from './views/DietView'
import EntertainmentView from './views/EntertainmentView'
import TimetableView from './views/TimetableView'
import MusicView from './views/MusicView'
import MemoView from './views/MemoView'
import SettingsView from './views/SettingsView'
import { getToken, authApi } from './api/client'

export default function App() {
  const { loading, init, currentView, data } = useStore()
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  // 启动：先验证登录态，再加载数据
  useEffect(() => {
    (async () => {
      if (getToken()) {
        try {
          await authApi.me() // token 有效
          await init()
          setLoggedIn(true)
        } catch {
          setLoggedIn(false) // token 无效
        }
      } else {
        setLoggedIn(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 监听登出事件（token 过期时由 api client 触发）
  useEffect(() => {
    const onLogout = () => setLoggedIn(false)
    window.addEventListener('lp:logout', onLogout)
    return () => window.removeEventListener('lp:logout', onLogout)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', data.settings.theme)
  }, [data.settings.theme])

  // 未登录 → 登录页
  if (loggedIn === false) {
    return <LoginPage onLogin={async () => { await init(); setLoggedIn(true) }} />
  }

  // 登录校验中 / 数据加载中
  if (loggedIn === null || loading) {
    return <div className="loading">加载中…</div>
  }

  const viewMap: Record<string, JSX.Element> = {
    home: <HomeView />,
    study: <StudyView />,
    exercise: <ExerciseView />,
    diet: <DietView />,
    entertainment: <EntertainmentView />,
    timetable: <TimetableView />,
    music: <MusicView />,
    memo: <MemoView />,
    settings: <SettingsView />,
  }

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="content" data-testid="content">
          {viewMap[currentView] ?? <div>未知页面</div>}
        </div>
      </div>
    </div>
  )
}
