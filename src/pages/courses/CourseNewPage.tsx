import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader'
import CourseForm from '../../components/course/CourseForm'
import { useActiveChild } from '../../hooks/useActiveChild'
import { useToast } from '../../hooks/useToast'

export default function CourseNewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { activeChild } = useActiveChild()

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
          navigate('/courses')
        }}
      />
    </div>
  )
}
