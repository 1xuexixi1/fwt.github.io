import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ensurePersist } from './storage/backgroundStore'

// 启动时申请持久化存储（可降低系统清理 localStorage/IndexedDB 的概率）
try {
  ensurePersist().then((persisted) => {
    console.log('持久化存储申请结果:', persisted)
  })
} catch (e) {
  console.warn('持久化申请调用失败:', e)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)



