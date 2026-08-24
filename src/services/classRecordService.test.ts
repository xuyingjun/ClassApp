import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { addChild } from './childService'
import {
  addCourse,
  deleteCoursePhysical,
  inactivateCourse,
  CourseHasRecordsError,
} from './courseService'
import {
  addClassRecord,
  deleteClassRecord,
  recordLesson,
  updateClassRecord,
  DuplicateRecordError,
} from './classRecordService'
import { todayStr } from '../utils/date'

async function clearDb() {
  await db.transaction('rw', db.children, db.courses, db.classRecords, db.settings, async () => {
    await Promise.all([
      db.children.clear(),
      db.courses.clear(),
      db.classRecords.clear(),
      db.settings.clear(),
    ])
  })
}

beforeEach(clearDb)

async function setupCourse(total = 50, used = 0) {
  const child = await addChild({ name: '小雨' })
  const course = await addCourse({
    childId: child.id,
    name: '少儿英语',
    category: 'english',
    totalLessons: total,
    usedLessons: used,
  })
  return { child, course }
}

describe('一键记课与课时一致性（需求场景 3-10）', () => {
  it('场景 3-5：新增 50 节课程 → 记一节课 → 剩 49', async () => {
    const { course } = await setupCourse(50, 0)
    await recordLesson({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      startTime: '18:30',
      endTime: '19:30',
    })
    const updated = await db.courses.get(course.id)
    expect(updated!.usedLessons).toBe(1)
    expect(updated!.totalLessons - updated!.usedLessons).toBe(49)
  })

  it('场景 6-7：同时段连续记课被拒绝，不产生第二条记录', async () => {
    const { course } = await setupCourse(50, 0)
    await recordLesson({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      startTime: '18:30',
    })
    await expect(
      recordLesson({
        childId: course.childId,
        courseId: course.id,
        date: todayStr(),
        startTime: '18:30',
      }),
    ).rejects.toBeInstanceOf(DuplicateRecordError)
    const updated = await db.courses.get(course.id)
    expect(updated!.usedLessons).toBe(1)
    expect(await db.classRecords.where('courseId').equals(course.id).count()).toBe(1)
  })

  it('不同时段同一课程可多次记录（如一天两节）', async () => {
    const { course } = await setupCourse(50, 0)
    await recordLesson({ childId: course.childId, courseId: course.id, date: todayStr(), startTime: '10:00' })
    await recordLesson({ childId: course.childId, courseId: course.id, date: todayStr(), startTime: '14:00' })
    expect((await db.courses.get(course.id))!.usedLessons).toBe(2)
  })

  it('场景 8：手动补录（无时间不查重）', async () => {
    const { course } = await setupCourse(50, 0)
    await addClassRecord({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      status: 'completed',
    })
    await addClassRecord({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      status: 'completed',
    })
    expect((await db.courses.get(course.id))!.usedLessons).toBe(2)
  })

  it('场景 9-10：删除记录后课程课时自动恢复', async () => {
    const { course } = await setupCourse(50, 0)
    const rec = await recordLesson({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      startTime: '18:30',
    })
    expect((await db.courses.get(course.id))!.usedLessons).toBe(1)
    await deleteClassRecord(rec.id)
    expect((await db.courses.get(course.id))!.usedLessons).toBe(0)
  })

  it('创建时录入已用课时 → 生成初始记录，后续记录可推导不翻倍', async () => {
    const { course } = await setupCourse(50, 12)
    const records = await db.classRecords.where('courseId').equals(course.id).toArray()
    expect(records).toHaveLength(1)
    expect(records[0].lessonCount).toBe(12)
    expect(records[0].note).toContain('录入的已用课时')
    // 记一节课后 = 13，不会因重算丢失已用 12
    await recordLesson({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      startTime: '18:30',
    })
    expect((await db.courses.get(course.id))!.usedLessons).toBe(13)
  })

  it('取消/缺席不计入课时，补课计入', async () => {
    const { course } = await setupCourse(50, 0)
    await addClassRecord({ childId: course.childId, courseId: course.id, date: todayStr(), status: 'cancelled' })
    await addClassRecord({ childId: course.childId, courseId: course.id, date: todayStr(), status: 'absent' })
    await addClassRecord({ childId: course.childId, courseId: course.id, date: todayStr(), status: 'makeup', lessonCount: 2 })
    expect((await db.courses.get(course.id))!.usedLessons).toBe(2)
  })

  it('修改记录课时数 → 课程课时同步调整', async () => {
    const { course } = await setupCourse(50, 0)
    const rec = await recordLesson({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      startTime: '18:30',
    })
    await updateClassRecord(rec.id, {
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      startTime: '18:30',
      lessonCount: 2,
      status: 'completed',
    })
    expect((await db.courses.get(course.id))!.usedLessons).toBe(2)
  })

  it('课程上满自动结课；删除记录回退进行中', async () => {
    const { course } = await setupCourse(3, 0)
    for (const time of ['10:00', '11:00', '12:00']) {
      await recordLesson({ childId: course.childId, courseId: course.id, date: todayStr(), startTime: time })
    }
    expect((await db.courses.get(course.id))!.status).toBe('completed')
    const records = await db.classRecords.where('courseId').equals(course.id).toArray()
    await deleteClassRecord(records[0].id)
    expect((await db.courses.get(course.id))!.status).toBe('active')
  })

  it('删除保护：有记录的课程拒绝物理删除，可停用', async () => {
    const { course } = await setupCourse(50, 0)
    await recordLesson({
      childId: course.childId,
      courseId: course.id,
      date: todayStr(),
      startTime: '18:30',
    })
    await expect(deleteCoursePhysical(course.id)).rejects.toBeInstanceOf(CourseHasRecordsError)
    await inactivateCourse(course.id)
    expect((await db.courses.get(course.id))!.status).toBe('inactive')
  })

  it('无记录的课程可物理删除', async () => {
    const { course } = await setupCourse(50, 0)
    await deleteCoursePhysical(course.id)
    expect(await db.courses.get(course.id)).toBeUndefined()
  })
})
