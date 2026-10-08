import { describe, expect, it } from 'vitest'
import { buildScheduledItems } from './schedule'
import type { Course } from '../types/course'
import type { ClassRecord } from '../types/classRecord'

// 2026-10-08 是周四（weekday=4）
const DATE_THU = '2026-10-08'
// 2026-10-11 是周日（weekday=0）
const DATE_SUN = '2026-10-11'

const baseCourse: Course = {
  id: 'c1',
  childId: 'k1',
  name: '英语',
  categoryId: 'cat1',
  totalLessons: 10,
  usedLessons: 0,
  status: 'active',
  weeklySchedule: [
    { weekday: 4, startTime: '18:00', endTime: '19:00' }, // 周四
    { weekday: 0, startTime: '10:00' }, // 周日
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const makeCourse = (patch: Partial<Course>): Course => ({ ...baseCourse, ...patch })

const makeRecord = (patch: Partial<ClassRecord>): ClassRecord => ({
  id: 'r1',
  childId: 'k1',
  courseId: 'c1',
  date: DATE_THU,
  startTime: '18:00',
  endTime: '19:00',
  lessonCount: 1,
  status: 'completed',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...patch,
})

describe('utils/schedule buildScheduledItems', () => {
  it('按 weekday 匹配周课表 slot', () => {
    const items = buildScheduledItems([baseCourse], [], DATE_THU)
    expect(items).toHaveLength(1)
    expect(items[0].startTime).toBe('18:00')
    expect(items[0].endTime).toBe('19:00')
    expect(items[0].record).toBeUndefined()
  })

  it('不同 weekday 不匹配', () => {
    expect(buildScheduledItems([baseCourse], [], DATE_SUN)[0].startTime).toBe('10:00')
  })

  it('同 courseId+startTime 关联当日 record', () => {
    const rec = makeRecord({})
    const items = buildScheduledItems([baseCourse], [rec], DATE_THU)
    expect(items).toHaveLength(1)
    expect(items[0].record).toBe(rec)
  })

  it('onlyActive=true（默认）过滤非 active 课程', () => {
    const stopped = makeCourse({ id: 'c2', status: 'inactive' })
    expect(buildScheduledItems([stopped], [], DATE_THU)).toHaveLength(0)
  })

  it('onlyActive=false 含已停用但当时排过的课', () => {
    const stopped = makeCourse({ id: 'c2', status: 'inactive' })
    const items = buildScheduledItems([stopped], [], DATE_THU, { onlyActive: false })
    expect(items).toHaveLength(1)
    expect(items[0].course.id).toBe('c2')
  })

  it('onlyActive=false 仍遵守 startDate / expireDate 边界', () => {
    const expired = makeCourse({
      id: 'c3',
      status: 'inactive',
      expireDate: '2026-09-30',
    })
    expect(buildScheduledItems([expired], [], DATE_THU, { onlyActive: false })).toHaveLength(0)
  })

  it('orphan：当日有 record 但无对应 slot（手动补录）作为追加项', () => {
    const orphan = makeRecord({ id: 'r2', startTime: '09:00', endTime: '09:30' })
    const items = buildScheduledItems([baseCourse], [orphan], DATE_THU)
    expect(items).toHaveLength(2) // 1 个 slot + 1 个 orphan
    expect(items.map((i) => i.startTime).sort()).toEqual(['09:00', '18:00'])
  })

  it('按 startTime 升序排序（无时间项排末尾）', () => {
    const orphan = makeRecord({ id: 'r2', startTime: '09:00' })
    const items = buildScheduledItems([baseCourse], [orphan], DATE_THU)
    expect(items.map((i) => i.startTime)).toEqual(['09:00', '18:00'])
  })

  it('已关联 slot 的 record 不重复作为 orphan', () => {
    const rec = makeRecord({})
    const items = buildScheduledItems([baseCourse], [rec], DATE_THU)
    expect(items).toHaveLength(1)
  })
})
