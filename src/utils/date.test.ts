import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMinutesToTime,
  diffDays,
  formatDisplay,
  formatShort,
  getWeekday,
  isValidDateStr,
  monthGrid,
  monthRange,
  parseDateSafe,
  todayStr,
  weekRange,
} from './date'

describe('utils/date（字符串运算，Safari 兼容）', () => {
  it('todayStr 为合法 YYYY-MM-DD', () => {
    expect(isValidDateStr(todayStr())).toBe(true)
  })

  it('addDays 跨月/跨年', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('weekRange 周一起始，周日归属本周', () => {
    expect(weekRange('2026-08-24')).toEqual(['2026-08-24', '2026-08-30']) // 周一
    expect(weekRange('2026-08-23')).toEqual(['2026-08-17', '2026-08-23']) // 周日
  })

  it('diffDays 与方向', () => {
    expect(diffDays('2026-08-24', '2026-09-05')).toBe(12)
    expect(diffDays('2026-09-05', '2026-08-24')).toBe(-12)
  })

  it('monthRange 含大小月与闰月', () => {
    expect(monthRange('2026-08-15')).toEqual(['2026-08-01', '2026-08-31'])
    expect(monthRange('2026-02-10')).toEqual(['2026-02-01', '2026-02-28'])
  })

  it('monthGrid 返回 42 天且周一起始', () => {
    const grid = monthGrid(2026, 8)
    expect(grid).toHaveLength(42)
    expect(getWeekday(grid[0])).toBe(1) // 第一个格子是周一
    expect(grid).toContain('2026-08-01')
    expect(grid).toContain('2026-08-31')
  })

  it('addMinutesToTime 跨小时与跨天回绕', () => {
    expect(addMinutesToTime('18:30', 60)).toBe('19:30')
    expect(addMinutesToTime('23:50', 20)).toBe('00:10')
  })

  it('formatDisplay / formatShort', () => {
    expect(formatDisplay('2026-08-24')).toBe('2026年8月24日 周一')
    expect(formatShort('2026-08-24')).toBe('8月24日')
  })

  it('parseDateSafe 手动拆分解析（无 new Date(string)）', () => {
    const dt = parseDateSafe('2026-08-24')
    expect(dt.getFullYear()).toBe(2026)
    expect(dt.getMonth()).toBe(7)
    expect(dt.getDate()).toBe(24)
  })

  it('isValidDateStr 拒绝非法日期', () => {
    expect(isValidDateStr('2026-02-30')).toBe(false)
    expect(isValidDateStr('2026-13-01')).toBe(false)
    expect(isValidDateStr('2026/08/24')).toBe(false)
    expect(isValidDateStr('')).toBe(false)
  })
})
