import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { addChild } from './childService'
import { addCourse } from './courseService'
import { recordLesson } from './classRecordService'
import { backupSchemaV2, clearAllData, exportAll, importBackup } from './backupService'
import { todayStr } from '../utils/date'

const timestamp = '2026-08-24T08:00:00.000Z'

async function clearDb() {
  await db.transaction(
    'rw',
    db.children,
    db.courses,
    db.classRecords,
    db.courseCategories,
    db.settings,
    async () => {
      await Promise.all([
        db.children.clear(),
        db.courses.clear(),
        db.classRecords.clear(),
        db.courseCategories.clear(),
        db.settings.clear(),
      ])
    },
  )
}

beforeEach(clearDb)

describe('数据备份/恢复（需求场景 13-16）', () => {
  it('导出 → 清空 → 导入 → 数据完整恢复且课时一致', async () => {
    const child = await addChild({ name: '小雨' })
    const course = await addCourse({
      childId: child.id,
      name: '少儿英语',
      categoryId: 'cat-english',
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
    expect(backup.version).toBe(2)
    expect(backup.children).toHaveLength(1)
    expect(backup.courses).toHaveLength(1)
    expect(backup.classRecords).toHaveLength(2) // 初始记录 + 记课
    expect(backup.courses[0].categoryId).toBe('cat-english')

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
    expect(restored!.categoryId).toBe('cat-english')
  })

  it('备份中无课程类型 → 导入时自动补默认类型（7 个）', async () => {
    const child = await addChild({ name: '小雨' })
    await addCourse({
      childId: child.id,
      name: '围棋课',
      categoryId: 'cat-other',
      totalLessons: 20,
      usedLessons: 0,
    })
    const backup = await exportAll() // 测试环境类型表为空 → courseCategories: []
    expect(backup.courseCategories).toHaveLength(0)
    await clearAllData()
    const result = await importBackup(backup)
    expect(result.ok).toBe(true)
    expect(await db.courseCategories.count()).toBe(7)
  })

  it('兼容 v1 旧备份：category 枚举 key → categoryId 迁移', async () => {
    const v1 = {
      app: 'tongke',
      version: 1,
      exportedAt: timestamp,
      children: [{ id: 'ch1', name: '小雨', createdAt: timestamp, updatedAt: timestamp }],
      courses: [
        {
          id: 'co1',
          childId: 'ch1',
          name: '英语课',
          category: 'english',
          totalLessons: 50,
          usedLessons: 0,
          status: 'active',
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      classRecords: [],
      settings: [],
    }
    const result = await importBackup(v1)
    expect(result.ok).toBe(true)
    const course = (await db.courses.toArray())[0]
    expect(course.categoryId).toBe('cat-english')
    expect(await db.courseCategories.count()).toBe(7) // 自动补默认类型
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
      exportedAt: timestamp,
      children: [],
      courses: [],
      classRecords: [],
      courseCategories: [],
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
      exportedAt: timestamp,
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
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      settings: [],
    }
    const result = await importBackup(backup)
    expect(result.ok).toBe(true)
    expect(result.skippedItems).toBe(1)
    expect(await db.classRecords.count()).toBe(0)
  })

  it('schema 拒绝错误枚举值与缺失字段', () => {
    const base = {
      app: 'tongke',
      version: 2,
      exportedAt: timestamp,
      children: [],
      courses: [],
      courseCategories: [],
      settings: [],
    }
    expect(
      backupSchemaV2.safeParse({ ...base, app: 'other', classRecords: [] }).success,
    ).toBe(false)
    expect(
      backupSchemaV2.safeParse({
        ...base,
        classRecords: [{ id: 'r', childId: 'c', courseId: 'k', date: '2026-08-24', lessonCount: 1, status: 'wat' }],
      }).success,
    ).toBe(false)
    expect(
      backupSchemaV2.safeParse({
        ...base,
        classRecords: [{ id: 'r', childId: 'c', courseId: 'k', date: 'bad-date', lessonCount: 1, status: 'completed' }],
      }).success,
    ).toBe(false)
    // v2 课程必须使用 categoryId（不允许旧 category 字段）
    expect(
      backupSchemaV2.safeParse({
        ...base,
        classRecords: [],
        courses: [
          {
            id: 'co',
            childId: 'ch',
            name: 'x',
            category: 'english',
            totalLessons: 10,
            usedLessons: 0,
            status: 'active',
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('导入时按有效记录重算课时与结课状态', async () => {
    const child = await addChild({ name: '小雨' })
    const course = await addCourse({
      childId: child.id,
      name: '游泳课',
      categoryId: 'cat-sports',
      totalLessons: 2,
      usedLessons: 0,
    })
    await recordLesson({ childId: child.id, courseId: course.id, date: todayStr(), startTime: '10:00' })
    await recordLesson({ childId: child.id, courseId: course.id, date: todayStr(), startTime: '11:00' })
    const backup = await exportAll()
    backup.courses[0]!.usedLessons = 0
    backup.courses[0]!.status = 'active'

    const result = await importBackup(backup)

    expect(result.ok).toBe(true)
    expect((await db.courses.get(course.id))!.usedLessons).toBe(2)
    expect((await db.courses.get(course.id))!.status).toBe('completed')
  })

  it('导入时跳过孤儿课程与跨孩子记录', async () => {
    const firstChild = await addChild({ name: '小雨' })
    const secondChild = await addChild({ name: '小安' })
    const course = await addCourse({
      childId: firstChild.id,
      name: '英语课',
      categoryId: 'cat-english',
      totalLessons: 10,
      usedLessons: 0,
    })
    const backup = await exportAll()
    backup.courses.push({ ...course, id: 'orphan-course', childId: 'missing-child' })
    backup.classRecords.push({
      id: 'wrong-owner-record',
      childId: secondChild.id,
      courseId: course.id,
      date: todayStr(),
      lessonCount: 1,
      status: 'completed',
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    const result = await importBackup(backup)

    expect(result.ok).toBe(true)
    expect(result.skippedItems).toBe(2)
    expect(await db.courses.get('orphan-course')).toBeUndefined()
    expect(await db.classRecords.get('wrong-owner-record')).toBeUndefined()
  })

  it('事务写入失败时保留原有数据', async () => {
    const child = await addChild({ name: '原有孩子' })
    const backup = await exportAll()
    backup.children.push({ ...backup.children[0]!, name: '重复主键' })

    const result = await importBackup(backup)

    expect(result.ok).toBe(false)
    expect(await db.children.get(child.id)).toBeTruthy()
    expect(await db.children.count()).toBe(1)
  })
})
