import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader'
import CourseForm from '../../components/course/CourseForm'
import { useActiveChild } from '../../hooks/useActiveChild'
import { useCourses } from '../../hooks/useCourses'
import { useToast } from '../../hooks/useToast'

export default function CourseNewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { activeChild } = useActiveChild()
  const courses = useCourses(activeChild?.id)
  // 记录打开页面时是否还没有任何课程（首次使用流程：添加第一门课程后进入首页）
  const wasFirstCourseRef = useRef<boolean | null>(null)
  if (wasFirstCourseRef.current === null && courses !== undefined) {
    wasFirstCourseRef.current = courses.length === 0
  }

  if (!activeChild) {
    navigate('/courses', { replace: true })
    return null
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <PageHeader title="新增课程" />
      <CourseForm
        childId={activeChild.id}
        onSaved={() => {
          toast.showToast('已添加课程', 'success')
          navigate(wasFirstCourseRef.current ? '/' : '/courses')
        }}
      />
    </div>
  )
}
