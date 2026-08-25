import { HashRouter, Route, Routes } from 'react-router-dom'
import TabLayout from './components/layout/TabLayout'
import HomePage from './pages/HomePage'
import CourseListPage from './pages/courses/CourseListPage'
import CourseNewPage from './pages/courses/CourseNewPage'
import CourseEditPage from './pages/courses/CourseEditPage'
import CourseDetailPage from './pages/courses/CourseDetailPage'
import RecordListPage from './pages/records/RecordListPage'
import StatsPage from './pages/StatsPage'
import SettingsPage from './pages/settings/SettingsPage'
import ChildrenPage from './pages/settings/ChildrenPage'
import CategoriesPage from './pages/settings/CategoriesPage'
import BackupPage from './pages/settings/BackupPage'
import AboutPage from './pages/settings/AboutPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* 五大 Tab：带底部导航 */}
        <Route element={<TabLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CourseListPage />} />
          <Route path="/records" element={<RecordListPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        {/* 子页面：无底部 Tab，带返回头部 */}
        <Route path="/courses/new" element={<CourseNewPage />} />
        <Route path="/courses/:id/edit" element={<CourseEditPage />} />
        <Route path="/courses/:id" element={<CourseDetailPage />} />
        <Route path="/settings/children" element={<ChildrenPage />} />
        <Route path="/settings/categories" element={<CategoriesPage />} />
        <Route path="/settings/backup" element={<BackupPage />} />
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </HashRouter>
  )
}
