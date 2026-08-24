import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Loading from '../../components/ui/Loading'
import EmptyState from '../../components/ui/EmptyState'
import BottomSheet from '../../components/ui/BottomSheet'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ProgressBar from '../../components/ui/ProgressBar'
import { db } from '../../db/database'
import { useCourse } from '../../hooks/useCourses'
import { useToast } from '../../hooks/useToast'
import {
  deleteCoursePhysical,
  inactivateCourse,
  reactivateCourse,
  updateCourse,
  type UpdateCourseInput,
} from '../../services/courseService'
import { remainingLessons, type Course } from '../../types/course'
import { COURSE_STATUS_META, WEEKDAY_LABELS, categoryEmoji, categoryLabel, courseColorValue } from '../../constants'
import { formatTimeRange } from '../../utils/date'

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 text-sm text-neutral-400">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium">{children}</span>
    </div>
  )
}

// 加课/续费小表单
function RenewForm({ course, onSaved }: { course: Course; onSaved: () => void }) {
  const toast = useToast()
  const [addLessons, setAddLessons] = useState('')
  const [price, setPrice] = useState('')
  const [expireDate, setExpireDate] = useState('')
  const [busy, setBusy] = useState(false)

  const inputCls =
    'mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base outline-none focus:border-primary'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const n = Number(addLessons)
    if (!Number.isInteger(n) || n < 1 || n > 999) {
      toast.showToast('请输入要增加的课时数', 'error')
      return
    }
    const patch: UpdateCourseInput = { totalLessons: course.totalLessons + n }
    if (price.trim()) patch.price = Number(price)
    if (expireDate) patch.expireDate = expireDate
    setBusy(true)
    try {
      await updateCourse(course.id, patch)
      onSaved()
    } catch {
      toast.showToast('保存失败，请重试', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">
          增加课时 <span className="text-danger">*</span>
        </span>
        <input
          value={addLessons}
          onChange={(e) => setAddLessons(e.target.value)}
          inputMode="numeric"
          placeholder="如：20"
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium">新价格（元，选填）</span>
        <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="保持原价" className={inputCls} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">新到期日期（选填）</span>
        <input type="date" value={expireDate} onChange={(e) => setExpireDate(e.target.value)} className={inputCls} />
      </label>
      <Button type="submit" className="w-full" loading={busy}>
        确认加课
      </Button>
    </form>
  )
}

export default function CourseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const course = useCourse(id)
  const recordCount = useLiveQuery(
    async () => (id ? await db.classRecords.where('courseId').equals(id).count() : null),
    [id],
  )
  const [renewOpen, setRenewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)

  if (course === undefined) return <Loading />
  if (!course) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg">
        <PageHeader title="课程详情" />
        <EmptyState emoji="🔍" title="课程不存在" />
      </div>
    )
  }

  const hasRecords = (recordCount ?? 0) > 0
  const remaining = remainingLessons(course)
  const color = courseColorValue(course.color)
  const unitPrice =
    course.totalLessons > 0 && course.price !== undefined
      ? Math.round(course.price / course.totalLessons)
      : undefined
  const spent = unitPrice !== undefined ? unitPrice * course.usedLessons : undefined

  const handleDelete = async () => {
    setActionBusy(true)
    try {
      if (hasRecords) {
        await inactivateCourse(course.id)
        toast.showToast('已停用课程（历史记录已保留）', 'success')
      } else {
        await deleteCoursePhysical(course.id)
        toast.showToast('已删除', 'success')
        navigate('/courses', { replace: true })
        return
      }
      setDeleteOpen(false)
    } catch {
      toast.showToast('操作失败，请重试', 'error')
    } finally {
      setActionBusy(false)
    }
  }

  const handleToggleActive = async () => {
    setActionBusy(true)
    try {
      if (course.status === 'inactive') {
        await reactivateCourse(course.id)
        toast.showToast('已重新启用', 'success')
      } else {
        await inactivateCourse(course.id)
        toast.showToast('已停用课程', 'success')
      }
    } catch {
      toast.showToast('操作失败，请重试', 'error')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <PageHeader title="课程详情" />
      <div className="space-y-3 p-4">
        {/* 课程信息 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
              style={{ backgroundColor: `${color}1A` }}
            >
              {categoryEmoji(course.category)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-lg font-bold">{course.name}</h2>
                {course.status !== 'active' && (
                  <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">
                    {COURSE_STATUS_META[course.status].label}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-neutral-400">
                {categoryLabel(course.category)}
                {course.teacher ? ` · ${course.teacher}` : ''}
              </div>
            </div>
          </div>
          {course.note && <p className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm leading-6 text-neutral-600">{course.note}</p>}
        </div>

        {/* 课时 */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-neutral-400">剩余课时</span>
            <span className="text-sm text-neutral-400 tabular-nums">
              已用 {course.usedLessons} / {course.totalLessons} 节
            </span>
          </div>
          <div className="mt-1 text-4xl font-bold text-primary tabular-nums">{remaining} 节</div>
          <ProgressBar className="mt-3 h-2" value={course.totalLessons > 0 ? course.usedLessons / course.totalLessons : 0} color={color} />
        </div>

        {/* 明细 */}
        <div className="divide-y divide-neutral-100 rounded-2xl bg-white px-4 py-1 shadow-sm">
          {course.institution && <InfoRow label="培训机构">{course.institution}</InfoRow>}
          {course.price !== undefined && <InfoRow label="课程价格">¥ {course.price}</InfoRow>}
          {unitPrice !== undefined && <InfoRow label="单节价格">约 ¥ {unitPrice}</InfoRow>}
          {spent !== undefined && <InfoRow label="已消费金额">约 ¥ {spent}</InfoRow>}
          {course.defaultDuration && <InfoRow label="每节课时长">{course.defaultDuration} 分钟</InfoRow>}
          <InfoRow label="有效期">
            {[course.startDate, course.expireDate].filter(Boolean).join(' ～ ') || '未设置'}
          </InfoRow>
          <InfoRow label="上课记录">{typeof recordCount === 'number' ? recordCount : 0} 条</InfoRow>
        </div>

        {/* 周课表 */}
        {course.weeklySchedule && course.weeklySchedule.length > 0 && (
          <div className="divide-y divide-neutral-100 rounded-2xl bg-white px-4 py-1 shadow-sm">
            {course.weeklySchedule.map((slot, i) => (
              <InfoRow key={i} label={`每${WEEKDAY_LABELS[slot.weekday]}`}>
                {formatTimeRange(slot.startTime, slot.endTime) || '时间未设置'}
              </InfoRow>
            ))}
          </div>
        )}

        {/* 操作 */}
        <div className="space-y-3 pt-1">
          <Button className="w-full" onClick={() => setRenewOpen(true)}>
            ＋ 加课 / 续费
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => navigate(`/courses/${course.id}/edit`)}>
            编辑课程
          </Button>
          <Button className="w-full" variant="secondary" loading={actionBusy} onClick={() => void handleToggleActive()}>
            {course.status === 'inactive' ? '重新启用' : '停用课程'}
          </Button>
          <Button className="w-full" variant="dangerGhost" onClick={() => setDeleteOpen(true)}>
            删除课程
          </Button>
        </div>
        <div className="pb-4" />
      </div>

      <BottomSheet open={renewOpen} title="加课 / 续费" onClose={() => setRenewOpen(false)}>
        <RenewForm
          course={course}
          onSaved={() => {
            setRenewOpen(false)
            toast.showToast('已更新课程', 'success')
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        open={deleteOpen}
        title={hasRecords ? '该课程已有上课记录' : '删除课程'}
        message={
          hasRecords
            ? '不能直接删除。建议停用课程，历史记录会完整保留。'
            : `确定删除「${course.name}」吗？删除后无法恢复。`
        }
        confirmLabel={hasRecords ? '停用课程' : '删除'}
        confirmVariant={hasRecords ? 'primary' : 'danger'}
        busy={actionBusy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
