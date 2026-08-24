import { describe, expect, it } from 'vitest'
import { computeStats } from './statistics'
import type { ClassRecord, ClassRecordStatus } from '../types/classRecord'

let seq = 0
function makeRecord(date: string, lessonCount = 1, status: ClassRecordStatus = 'completed'): ClassRecord {
  return {
    id: `r${++seq}`,
    childId: 'c1',
    courseId: 'k1',
    date,
    lessonCount,
    status,
    createdAt: '',
    updatedAt: '',
  }
}

describe('computeStats（统计口径：completed + makeup）', () => {
  it('本周/本月/累计 分层统计（场景 11-12）', () => {
    const today = '2026-08-24' // 周一
    const records = [
      makeRecord('2026-08-24', 1, 'completed'), // 今天 → 周+月+总
      makeRecord('2026-08-25', 2, 'completed'), // 周二 → 周+月+总
      makeRecord('2026-08-17', 1, 'completed'), // 上周一 → 月+总
      makeRecord('2026-08-10', 1, 'cancelled'), // 取消不计入
      makeRecord('2026-07-30', 3, 'completed'), // 上月 → 仅总
      makeRecord('2026-08-26', 2, 'makeup'), // 补课计入 → 周+月+总
      makeRecord('2026-08-20', 1, 'absent'), // 缺席不计入
    ]
    const stats = computeStats(records, today)
    expect(stats.week).toBe(1 + 2 + 2)
    expect(stats.month).toBe(1 + 2 + 1 + 2)
    expect(stats.total).toBe(1 + 2 + 1 + 3 + 2)
  })

  it('空记录全为 0', () => {
    expect(computeStats([], '2026-08-24')).toEqual({ week: 0, month: 0, total: 0 })
  })

  it('跨月边界：月末周日归属正确', () => {
    // 2026-08-31 是周一；2026-08-30 周日属于 8 月且属于上一周
    const stats = computeStats(
      [makeRecord('2026-08-31', 1), makeRecord('2026-08-30', 1), makeRecord('2026-09-01', 1)],
      '2026-08-31',
    )
    expect(stats.month).toBe(2) // 8-30 与 8-31 在 8 月
    expect(stats.week).toBe(2) // 8-31 与 9-01 在同一周（周一起始）
    expect(stats.total).toBe(3)
  })
})
