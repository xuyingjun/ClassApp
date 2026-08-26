import { nanoid } from 'nanoid'
import { db } from '../db/database'
import { isCountedStatus } from '../types/classRecord'
import type { ClassRecord, ClassRecordStatus } from '../types/classRecord'
import { afterRecordChange } from './courseService'

export class DuplicateRecordError extends Error {}
export class InvalidRecordCourseError extends Error {}

export interface ClassRecordInput {
  childId: string
  courseId: string
  date: string
  startTime?: string
  endTime?: string
  lessonCount?: number
  status: ClassRecordStatus
  note?: string
}

async function assertCourseOwnership(input: Pick<ClassRecordInput, 'childId' | 'courseId'>): Promise<void> {
  const course = await db.courses.get(input.courseId)
  if (!course || course.childId !== input.childId) {
    throw new InvalidRecordCourseError('课程不存在或不属于当前孩子')
  }
}

// 查重（DB 层防线，Phase 0 §5.1）：
// 同 孩子+课程+日期+时间 且已计入（completed/makeup）→ 拒绝；
// 无开始时间不查重（历史补录不阻塞）；编辑时排除自身
async function assertNoDuplicate(
  input: Pick<ClassRecordInput, 'childId' | 'courseId' | 'date' | 'startTime' | 'status'>,
  excludeId?: string,
): Promise<void> {
  const { childId, courseId, date, startTime, status } = input
  if (!startTime || !isCountedStatus(status)) return
  let query = db.classRecords
    .where('[childId+courseId+date+startTime]')
    .equals([childId, courseId, date, startTime])
  if (excludeId) query = query.filter((r) => r.id !== excludeId)
  const dup = await query.filter((r) => isCountedStatus(r.status)).first()
  if (dup) throw new DuplicateRecordError('该时段已经记录过了')
}

// 一键记课（首页）：status 固定 completed，lessonCount 默认 1
export function recordLesson(
  input: Omit<ClassRecordInput, 'status'>,
): Promise<ClassRecord> {
  return addClassRecord({ ...input, status: 'completed' })
}

// 新增记录（一键记课 / 手动补录）：
// 事务内 查重 → 插入 → 重算课时 + 同步结课状态（原子性）
export async function addClassRecord(input: ClassRecordInput): Promise<ClassRecord> {
  return db.transaction('rw', db.classRecords, db.courses, async () => {
    await assertCourseOwnership(input)
    await assertNoDuplicate(input)
    const now = new Date().toISOString()
    const record: ClassRecord = {
      id: nanoid(),
      childId: input.childId,
      courseId: input.courseId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      lessonCount: input.lessonCount ?? 1,
      status: input.status,
      source: 'manual',
      note: input.note,
      createdAt: now,
      updatedAt: now,
    }
    await db.classRecords.add(record)
    await afterRecordChange(record.courseId)
    return record
  })
}

// 修改记录：事务内 查重（排除自身）→ 更新 → 重算（原课程 + 换课后新课程）
export async function updateClassRecord(id: string, input: ClassRecordInput): Promise<void> {
  await db.transaction('rw', db.classRecords, db.courses, async () => {
    const old = await db.classRecords.get(id)
    if (!old) return
    await assertCourseOwnership(input)
    await assertNoDuplicate(input, id)
    await db.classRecords.update(id, { ...input, updatedAt: new Date().toISOString() })
    await afterRecordChange(old.courseId)
    if (input.courseId !== old.courseId) await afterRecordChange(input.courseId)
  })
}

// 删除记录：事务内 删除 → 重算（课时自动恢复）
export async function deleteClassRecord(id: string): Promise<void> {
  await db.transaction('rw', db.classRecords, db.courses, async () => {
    const old = await db.classRecords.get(id)
    if (!old) return
    await db.classRecords.delete(id)
    await afterRecordChange(old.courseId)
  })
}
