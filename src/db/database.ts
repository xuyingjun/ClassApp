import Dexie, { type EntityTable } from 'dexie'
import type { Child } from '../types/child'
import type { Course } from '../types/course'
import type { ClassRecord } from '../types/classRecord'
import type { Setting } from '../types/setting'

// 童课数据库
// 数据迁移策略（Phase 0 §4）：永不修改 version(1)，未来变更一律新增 version(n) + upgrade
class TongKeDB extends Dexie {
  children!: EntityTable<Child, 'id'>
  courses!: EntityTable<Course, 'id'>
  classRecords!: EntityTable<ClassRecord, 'id'>
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
  }
}

export const db = new TongKeDB()
