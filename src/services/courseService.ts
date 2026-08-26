import { nanoid } from 'nanoid'
import { db } from '../db/database'
import { isCountedStatus } from '../types/classRecord'
import type { Course, CourseStatus, WeeklySlot } from '../types/course'
import { todayStr } from '../utils/date'

export interface CourseInput {
  childId: string
  name: string
  categoryId: string // 关联 CourseCategory，不直接保存名称
  teacher?: string
  institution?: string
  totalLessons: number
  usedLessons: number
  price?: number
  startDate?: string
  expireDate?: string
  defaultDuration?: number
  color?: string
  weeklySchedule?: WeeklySlot[]
  note?: string
}

export type UpdateCourseInput = Omit<Partial<CourseInput>, 'childId' | 'usedLessons'>

// 状态推导（不存储）：用完→已结课；到期→已过期；否则进行中
export function deriveStatus(
  course: Pick<Course, 'totalLessons' | 'usedLessons' | 'expireDate'>,
  today: string,
): CourseStatus {
  if (course.usedLessons >= course.totalLessons) return 'completed'
  if (course.expireDate && course.expireDate < today) return 'expired'
  return 'active'
}

// 新增课程。已用课时 > 0 时生成一条「初始课时」记录，
// 保证 usedLessons 永远可由 ClassRecord 推导（数据一致性，Phase 0 §5.2）
export async function addCourse(input: CourseInput): Promise<Course> {
  const now = new Date().toISOString()
  const course: Course = { id: nanoid(), status: 'active', createdAt: now, updatedAt: now, ...input }
  course.status = deriveStatus(course, todayStr())
  await db.transaction('rw', db.courses, db.classRecords, async () => {
    await db.courses.add(course)
    if (input.usedLessons > 0) {
      await db.classRecords.add({
        id: nanoid(),
        childId: input.childId,
        courseId: course.id,
          // 历史已用课时不能落在未来；未来开课时记在今天，避免生成未来上课记录
          date: input.startDate && input.startDate <= todayStr() ? input.startDate : todayStr(),
        lessonCount: input.usedLessons,
        status: 'completed',
        source: 'initial',
        note: '创建课程时录入的已用课时',
        createdAt: now,
        updatedAt: now,
      })
    }
  })
  return course
}

export async function updateCourse(id: string, input: UpdateCourseInput): Promise<void> {
  const current = await db.courses.get(id)
  if (!current) return
  const merged: Course = { ...current, ...input, updatedAt: new Date().toISOString() }
  // 停用状态由用户显式控制；其余状态按最新数据重新推导
  if (current.status !== 'inactive') {
    merged.status = deriveStatus(merged, todayStr())
  }
  await db.courses.put(merged)
}

// 删除保护（Phase 0 §5.5）：有上课记录时拒绝物理删除
export class CourseHasRecordsError extends Error {}

export async function deleteCoursePhysical(id: string): Promise<void> {
  const count = await db.classRecords.where('courseId').equals(id).count()
  if (count > 0) throw new CourseHasRecordsError('该课程已有上课记录，建议停用课程')
  await db.courses.delete(id)
}

export async function inactivateCourse(id: string): Promise<void> {
  await db.courses.update(id, { status: 'inactive', updatedAt: new Date().toISOString() })
}

// 重新启用：按当前数据重新推导状态
export async function reactivateCourse(id: string): Promise<void> {
  const course = await db.courses.get(id)
  if (!course) return
  await db.courses.update(id, {
    status: deriveStatus(course, todayStr()),
    updatedAt: new Date().toISOString(),
  })
}

// —— 数据一致性核心 ——
// 重算已用课时（唯一事实来源 = ClassRecord）。
// 记录写路径须在包含 classRecords/courses 的事务内调用；数据修复/导入后可独立调用。
export async function recalculateCourseUsage(courseId: string): Promise<void> {
  const records = await db.classRecords.where('courseId').equals(courseId).toArray()
  const used = records
    .filter((r) => isCountedStatus(r.status))
    .reduce((sum, r) => sum + r.lessonCount, 0)
  await db.courses.update(courseId, { usedLessons: used, updatedAt: new Date().toISOString() })
}

export async function recalculateAllCourseUsage(): Promise<void> {
  await db.transaction('rw', db.classRecords, db.courses, async () => {
    const courses = await db.courses.toArray()
    const now = new Date().toISOString()
    const today = todayStr()
    for (const course of courses) {
      const records = await db.classRecords.where('courseId').equals(course.id).toArray()
      const usedLessons = records
        .filter((record) => isCountedStatus(record.status))
        .reduce((sum, record) => sum + record.lessonCount, 0)
      await db.courses.update(course.id, {
        usedLessons,
        status:
          course.status === 'inactive'
            ? 'inactive'
            : deriveStatus({ ...course, usedLessons }, today),
        updatedAt: now,
      })
    }
  })
}

// 记录变更后同步课程：重算课时 + 推进/回退结课状态（停用课程不动）
export async function afterRecordChange(courseId: string): Promise<void> {
  await recalculateCourseUsage(courseId)
  const course = await db.courses.get(courseId)
  if (!course || course.status === 'inactive') return
  const desired = deriveStatus(course, todayStr())
  if (course.status !== desired) {
    await db.courses.update(courseId, { status: desired })
  }
}

// 启动时按课时与有效期同步所有非停用课程状态
export async function refreshCourseStatus(): Promise<void> {
  const today = todayStr()
  await db.transaction('rw', db.courses, async () => {
    const courses = await db.courses.toArray()
    for (const course of courses) {
      if (course.status === 'inactive') continue
      const status = deriveStatus(course, today)
      if (course.status !== status) {
        await db.courses.update(course.id, { status })
      }
    }
  })
}
