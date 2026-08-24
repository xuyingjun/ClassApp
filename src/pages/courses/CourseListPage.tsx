import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveChild } from '../../hooks/useActiveChild'
import { useCourses } from '../../hooks/useCourses'
import CourseCard from '../../components/course/CourseCard'
import SegmentedControl from '../../components/ui/SegmentedControl'
import Loading from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

type CourseTab = 'active' | 'archived'

// 课程列表：进行中 / 已归档（结课、过期、停用）
export default function CourseListPage() {
  const { activeChild } = useActiveChild()
  const courses = useCourses(activeChild?.id)
  const navigate = useNavigate()
  const [tab, setTab] = useState<CourseTab>('active')

  const { activeList, archivedList } = useMemo(() => {
    const list = courses ?? []
    return {
      activeList: list.filter((c) => c.status === 'active'),
      archivedList: list.filter((c) => c.status !== 'active'),
    }
  }, [courses])

  if (!activeChild || courses === undefined) return <Loading />

  const shown = tab === 'active' ? activeList : archivedList

  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">课程</h1>
        <Button className="min-h-11 px-4 text-sm" onClick={() => navigate('/courses/new')}>
          ＋ 新增
        </Button>
      </div>

      <SegmentedControl
        className="mt-3"
        options={[
          { value: 'active', label: `进行中 ${activeList.length}` },
          { value: 'archived', label: `已归档 ${archivedList.length}` },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-3 space-y-3">
        {shown.length === 0 ? (
          tab === 'active' && activeList.length === 0 && courses.length === 0 ? (
            <EmptyState
              emoji="📖"
              title="还没有添加课程"
              description="添加第一门课程，开始记录上课"
              action={<Button onClick={() => navigate('/courses/new')}>添加第一门课程</Button>}
            />
          ) : (
            <EmptyState emoji="🗂️" title="这里暂时没有课程" />
          )
        ) : (
          shown.map((c) => <CourseCard key={c.id} course={c} />)
        )}
      </div>
    </div>
  )
}
