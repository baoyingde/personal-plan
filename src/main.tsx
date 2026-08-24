import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminApp from './views/AdminApp'
import './styles/global.css'
import './styles/admin.css'

// 通过 URL 参数 ?admin 进入后台管理端（如 http://localhost:5173/?admin）
const isAdmin = new URLSearchParams(window.location.search).has('admin')

const root = document.getElementById('root')!

if (isAdmin) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AdminApp />
    </React.StrictMode>,
  )
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}
