import Dexie, { type EntityTable } from 'dexie'
import type { Child } from '../types/child'
import type { Course } from '../types/course'
import type { ClassRecord } from '../types/classRecord'
import type { CourseCategory } from '../types/courseCategory'
import type { Setting } from '../types/setting'
import { OLD_CATEGORY_KEY_TO_ID } from '../constants'

// v1 遗留课程结构（category 为枚举 key，v2 迁移后改为 categoryId）
type LegacyCourse = Omit<Course, 'categoryId'> & { category?: string; categoryId?: string }

// 童课数据库
// 数据迁移策略（Phase 0 §4）：永不修改旧版本，变更一律新增 version(n) + upgrade
class TongKeDB extends Dexie {
  children!: EntityTable<Child, 'id'>
  courses!: EntityTable<Course, 'id'>
  classRecords!: EntityTable<ClassRecord, 'id'>
  courseCategories!: EntityTable<CourseCategory, 'id'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('tongke')
    this.version(1).stores({
      children: '&id, createdAt, updatedAt',
      courses: '&id, childId, status, [childId+status], updatedAt',
      classRecords:
        '&id, childId, courseId, date, status, [childId+date], [courseId+date], [childId+courseId+date+startTime]',
      settings: '&key',
    })
    this.version(2)
      .stores({
        children: '&id, createdAt, updatedAt',
        courses: '&id, childId, categoryId, status, [childId+status], updatedAt',
        classRecords:
          '&id, childId, courseId, date, status, [childId+date], [courseId+date], [childId+courseId+date+startTime]',
        courseCategories: '&id, name, status, sortOrder',
        settings: '&key',
      })
      .upgrade(async (tx) => {
        // v1 → v2：course.category（旧枚举 key）→ categoryId（关联 CourseCategory 表）
        // 默认类型由启动时的 ensureDefaultCategories() 写入
        const table = tx.table<LegacyCourse, string>('courses')
        const rows = await table.toArray()
        for (const row of rows) {
          const categoryId = OLD_CATEGORY_KEY_TO_ID[row.category ?? ''] ?? 'cat-other'
          const { category, ...rest } = row
          void category
          await table.put({ ...rest, categoryId })
        }
      })
  }
}

export const db = new TongKeDB()
