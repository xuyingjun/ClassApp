import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader'
import CourseForm from '../../components/course/CourseForm'
import Loading from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import { useCourse } from '../../hooks/useCourses'
import { useToast } from '../../hooks/useToast'

export default function CourseEditPage() {
  const { id } = useParams()
  const course = useCourse(id)
  const navigate = useNavigate()
  const toast = useToast()

  if (course === undefined) return <Loading />
  if (!course) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg">
        <PageHeader title="编辑课程" />
        <EmptyState emoji="🔍" title="课程不存在" />
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <PageHeader title="编辑课程" />
      <CourseForm
        childId={course.childId}
        initial={course}
        onSaved={() => {
          toast.showToast('已保存', 'success')
          navigate(-1)
        }}
      />
    </div>
  )
}
