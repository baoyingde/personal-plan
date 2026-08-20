import { useEffect } from 'react'
import { useStore } from './store/store'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'
import HomeView from './views/HomeView'
import StudyView from './views/StudyView'
import ExerciseView from './views/ExerciseView'
import DietView from './views/DietView'
import EntertainmentView from './views/EntertainmentView'
import TimetableView from './views/TimetableView'
import MusicView from './views/MusicView'
import MemoView from './views/MemoView'
import SettingsView from './views/SettingsView'

export default function App() {
  const { loading, init, currentView, data } = useStore()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', data.settings.theme)
  }, [data.settings.theme])

  if (loading) {
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
