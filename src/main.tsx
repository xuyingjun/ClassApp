import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastProvider } from './hooks/useToast'
import { ActiveChildProvider } from './hooks/useActiveChild'
import { refreshCourseStatus } from './services/courseService'
import './index.css'

// 启动时推进课程状态（active → expired，单向转移）
void refreshCourseStatus().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ActiveChildProvider>
        <App />
      </ActiveChildProvider>
    </ToastProvider>
  </StrictMode>,
)
