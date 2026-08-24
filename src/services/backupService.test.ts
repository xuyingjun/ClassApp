import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { addChild } from './childService'
import { addCourse } from './courseService'
import { recordLesson } from './classRecordService'
import { backupSchema, clearAllData, exportAll, importBackup } from './backupService'
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

describe('数据备份/恢复（需求场景 13-16）', () => {
  it('导出 → 清空 → 导入 → 数据完整恢复且课时一致', async () => {
    const child = await addChild({ name: '小雨' })
    const course = await addCourse({
      childId: child.id,
      name: '少儿英语',
      category: 'english',
      totalLessons: 50,
      usedLessons: 12,
    })
    await recordLesson({
      childId: child.id,
      courseId: course.id,
      date: todayStr(),
      startTime: '18:30',
    })

    const backup = await exportAll()
    expect(backup.app).toBe('tongke')
    expect(backup.version).toBe(1)
    expect(backup.children).toHaveLength(1)
    expect(backup.courses).toHaveLength(1)
    expect(backup.classRecords).toHaveLength(2) // 初始记录 + 记课

    await clearAllData()
    expect(await db.children.count()).toBe(0)
    expect(await db.courses.count()).toBe(0)

    const result = await importBackup(backup)
    expect(result.ok).toBe(true)
    expect(await db.children.count()).toBe(1)
    expect(await db.courses.count()).toBe(1)
    const restored = (await db.courses.toArray())[0]
    // 导入后按记录重算：12 初始 + 1 记课 = 13，与记录之和恒等
    expect(restored!.usedLessons).toBe(13)
  })

  it('非法数据结构 → 拒绝导入，当前数据零改动', async () => {
    const child = await addChild({ name: '小雨' })
    const bad = {
      app: 'tongke',
      version: 1,
      exportedAt: 'x',
      children: [{ id: 'a', name: 123 }], // name 应为字符串
      courses: [],
      classRecords: [],
      settings: [],
    }
    const result = await importBackup(bad)
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
    // 现有数据未受影响
    expect((await db.children.toArray()).some((c) => c.id === child.id)).toBe(true)
  })

  it('备份版本高于应用支持版本 → 拒绝导入', async () => {
    const future = {
      app: 'tongke',
      version: 99,
      exportedAt: '',
      children: [],
      courses: [],
      classRecords: [],
      settings: [],
    }
    const result = await importBackup(future)
    expect(result.ok).toBe(false)
    expect(result.error).toContain('版本')
  })

  it('孤儿记录（指向不存在的课程/孩子）被跳过并提示', async () => {
    const backup = {
      app: 'tongke',
      version: 1,
      exportedAt: '',
      children: [],
      courses: [],
      classRecords: [
        {
          id: 'r1',
          childId: 'ghost',
          courseId: 'ghost',
          date: '2026-08-24',
          lessonCount: 1,
          status: 'completed',
          createdAt: '',
          updatedAt: '',
        },
      ],
      settings: [],
    }
    const result = await importBackup(backup)
    expect(result.ok).toBe(true)
    expect(result.orphanRecords).toBe(1)
    expect(await db.classRecords.count()).toBe(0)
  })

  it('schema 拒绝错误枚举值与缺失字段', () => {
    const base = { app: 'tongke', version: 1, exportedAt: '', children: [], courses: [], settings: [] }
    expect(
      backupSchema.safeParse({ ...base, app: 'other', classRecords: [] }).success,
    ).toBe(false)
    expect(
      backupSchema.safeParse({
        ...base,
        classRecords: [{ id: 'r', childId: 'c', courseId: 'k', date: '2026-08-24', lessonCount: 1, status: 'wat' }],
      }).success,
    ).toBe(false)
    expect(
      backupSchema.safeParse({ ...base, classRecords: [{ id: 'r', childId: 'c', courseId: 'k', date: 'bad-date', lessonCount: 1, status: 'completed' }] }).success,
    ).toBe(false)
  })
})
