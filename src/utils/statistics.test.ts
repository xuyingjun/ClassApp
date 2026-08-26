import { describe, expect, it } from 'vitest'
import { computeStats, computeStatsByCategory } from './statistics'
import type { ClassRecord, ClassRecordStatus } from '../types/classRecord'

let seq = 0
function makeRecord(
  date: string,
  lessonCount = 1,
  status: ClassRecordStatus = 'completed',
  courseId = 'k1',
  source?: ClassRecord['source'],
): ClassRecord {
  return {
    id: `r${++seq}`,
    childId: 'c1',
    courseId,
    date,
    lessonCount,
    status,
    source,
    createdAt: '',
    updatedAt: '',
  }
}

describe('computeStats（统计口径：completed + makeup）', () => {
  it('本周/本月/年度/累计 分层统计（场景 11-12）', () => {
    const today = '2026-08-24' // 周一
    const records = [
      makeRecord('2026-08-24', 1, 'completed'), // 今天 → 周+月+年+总
      makeRecord('2026-08-25', 2, 'completed'), // 周二 → 周+月+年+总
      makeRecord('2026-08-17', 1, 'completed'), // 上周一 → 月+年+总
      makeRecord('2026-08-10', 1, 'cancelled'), // 取消不计入
      makeRecord('2026-07-30', 3, 'completed'), // 上月 → 年+总
      makeRecord('2026-08-26', 2, 'makeup'), // 补课计入 → 周+月+年+总
      makeRecord('2026-08-20', 1, 'absent'), // 缺席不计入
      makeRecord('2025-12-31', 5, 'completed'), // 去年 → 仅总
    ]
    const stats = computeStats(records, today)
    expect(stats.week).toBe(1 + 2 + 2)
    expect(stats.month).toBe(1 + 2 + 1 + 2)
    expect(stats.year).toBe(1 + 2 + 1 + 3 + 2)
    expect(stats.total).toBe(1 + 2 + 1 + 3 + 2 + 5)
  })

  it('空记录全为 0', () => {
    expect(computeStats([], '2026-08-24')).toEqual({ week: 0, month: 0, year: 0, total: 0 })
  })

  it('初始汇总课时只计入累计，不计入周期', () => {
    const stats = computeStats(
      [makeRecord('2026-08-24', 12, 'completed', 'k1', 'initial')],
      '2026-08-24',
    )
    expect(stats).toEqual({ week: 0, month: 0, year: 0, total: 12 })
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

describe('computeStatsByCategory（按课程类型统计）', () => {
  it('按类型聚合 本周/本月/年度/累计', () => {
    const today = '2026-08-24' // 周一
    const courseCategoryMap = new Map([
      ['k1', 'cat-english'],
      ['k2', 'cat-piano'],
      ['k3', 'cat-english'],
    ])
    const records = [
      makeRecord('2026-08-24', 1, 'completed', 'k1'), // 英语 本周
      makeRecord('2026-08-25', 2, 'completed', 'k3'), // 英语 本周
      makeRecord('2026-08-17', 1, 'completed', 'k2'), // 钢琴 本月
      makeRecord('2026-08-24', 1, 'cancelled', 'k1'), // 取消不计入
      makeRecord('2026-07-30', 4, 'completed', 'k1'), // 英语 年度
      makeRecord('2025-12-31', 2, 'completed', 'k2'), // 钢琴 仅累计
      makeRecord('2026-08-24', 1, 'completed', 'k-ghost'), // 课程不存在 → 跳过
    ]
    const result = computeStatsByCategory(records, courseCategoryMap, today)
    const english = result.get('cat-english')!
    const piano = result.get('cat-piano')!
    expect(english.week).toBe(3)
    expect(english.month).toBe(3)
    expect(english.year).toBe(7)
    expect(english.total).toBe(7)
    expect(piano.week).toBe(0)
    expect(piano.month).toBe(1)
    expect(piano.year).toBe(1)
    expect(piano.total).toBe(3)
    expect(result.has('k-ghost')).toBe(false)
  })

  it('分类初始汇总只计入累计', () => {
    const result = computeStatsByCategory(
      [makeRecord('2026-08-24', 12, 'completed', 'k1', 'initial')],
      new Map([['k1', 'cat-english']]),
      '2026-08-24',
    )
    expect(result.get('cat-english')).toEqual({ week: 0, month: 0, year: 0, total: 12 })
  })

  it('无计入记录时返回空 Map', () => {
    const result = computeStatsByCategory([], new Map(), '2026-08-24')
    expect(result.size).toBe(0)
  })
})
