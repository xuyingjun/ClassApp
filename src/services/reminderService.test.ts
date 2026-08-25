import { describe, expect, it } from 'vitest'
import { computeReminders } from './reminderService'
import { addDays } from '../utils/date'
import type { Course } from '../types/course'

const today = '2026-08-24'
let seq = 0

function course(partial: Partial<Course>): Course {
  return {
    id: `c${++seq}`,
    childId: 'child',
    name: partial.name ?? '课程',
    categoryId: 'cat-other',
    totalLessons: 20,
    usedLessons: 5,
    status: 'active',
    createdAt: '',
    updatedAt: '',
    ...partial,
  }
}

describe('computeReminders（到期 + 低课时）', () => {
  it('低课时提醒：剩余 ≤ 5', () => {
    const result = computeReminders([course({ name: '编程', totalLessons: 40, usedLessons: 36 })], today)
    expect(result).toHaveLength(1)
    expect(result[0].lowLessons).toBe(true)
    expect(result[0].message).toContain('剩余 4 节')
  })

  it('到期提醒：≤ 15 天', () => {
    const result = computeReminders(
      [course({ name: '绘画', expireDate: addDays(today, 12) })],
      today,
    )
    expect(result).toHaveLength(1)
    expect(result[0].message).toContain('还有 12 天到期')
  })

  it('已过期提醒（状态仍为 active 时按日期推导）', () => {
    const result = computeReminders(
      [course({ name: '口才', expireDate: addDays(today, -3) })],
      today,
    )
    expect(result).toHaveLength(1)
    expect(result[0].message).toContain('已过期')
  })

  it('同时低课时 + 快到期 → 合并为一条', () => {
    const result = computeReminders(
      [course({ name: '英语', totalLessons: 10, usedLessons: 8, expireDate: addDays(today, 5) })],
      today,
    )
    expect(result).toHaveLength(1)
    expect(result[0].message).toContain('剩余 2 节')
    expect(result[0].message).toContain('还有 5 天到期')
  })

  it('停用/结课课程不提醒；无到期日不触发到期', () => {
    const result = computeReminders(
      [
        course({ name: 'A', status: 'inactive', totalLessons: 5, usedLessons: 5 }),
        course({ name: 'B', status: 'completed' }),
        course({ name: 'C', totalLessons: 40, usedLessons: 36 }), // 低课时但无到期日
      ],
      today,
    )
    expect(result).toHaveLength(1)
    expect(result[0].message).toContain('C')
  })

  it('排序：已过期优先于快到期优先于低课时', () => {
    const result = computeReminders(
      [
        course({ name: '低课时', totalLessons: 8, usedLessons: 5, expireDate: addDays(today, 100) }),
        course({ name: '快到期', expireDate: addDays(today, 7) }),
        course({ name: '已过期', expireDate: addDays(today, -1) }),
      ],
      today,
    )
    expect(result.map((r) => r.message)).toEqual([
      expect.stringContaining('已过期'),
      expect.stringContaining('快到期'),
      expect.stringContaining('低课时'),
    ])
  })
})
