import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastProvider } from './hooks/useToast'
import { ActiveChildProvider } from './hooks/useActiveChild'
import { CourseCategoryProvider } from './hooks/useCourseCategories'
import { refreshCourseStatus } from './services/courseService'
import { ensureDefaultCategories } from './services/courseCategoryService'
import './index.css'

// 启动时：推进课程状态（active → expired，单向转移）；类型表为空时写入建议默认类型
void refreshCourseStatus().catch(() => {})
void ensureDefaultCategories().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ActiveChildProvider>
        <CourseCategoryProvider>
          <App />
        </CourseCategoryProvider>
      </ActiveChildProvider>
    </ToastProvider>
  </StrictMode>,
)
