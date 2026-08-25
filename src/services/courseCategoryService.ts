import { nanoid } from 'nanoid'
import { db } from '../db/database'
import { COURSE_COLORS, DEFAULT_CATEGORY_DEFS } from '../constants'
import type { CourseCategory, CourseCategoryStatus } from '../types/courseCategory'

export interface CategoryInput {
  name: string
  icon: string
  color: string
}

// 默认类型数据（纯函数构造；ensureDefaultCategories 与旧备份导入共用）
export function buildDefaultCategories(): CourseCategory[] {
  const now = new Date().toISOString()
  return DEFAULT_CATEGORY_DEFS.map((d, i) => ({
    id: d.id,
    name: d.name,
    icon: d.icon,
    color: COURSE_COLORS[i % COURSE_COLORS.length].key,
    sortOrder: i,
    isDefault: true,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }))
}

// 首次启动/迁移后：类型表为空时写入建议默认类型（程序建议，用户可增删改）
export async function ensureDefaultCategories(): Promise<void> {
  const count = await db.courseCategories.count()
  if (count > 0) return
  await db.courseCategories.bulkAdd(buildDefaultCategories())
}

export class DuplicateCategoryNameError extends Error {}

export async function addCategory(input: CategoryInput): Promise<CourseCategory> {
  const name = input.name.trim()
  if (!name) throw new Error('请输入类型名称')
  const exists = await db.courseCategories.where('name').equals(name).first()
  if (exists) throw new DuplicateCategoryNameError('已存在同名课程类型')
  const last = await db.courseCategories.orderBy('sortOrder').last()
  const now = new Date().toISOString()
  const category: CourseCategory = {
    id: nanoid(),
    name,
    icon: input.icon,
    color: input.color,
    sortOrder: (last?.sortOrder ?? -1) + 1,
    isDefault: false,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }
  await db.courseCategories.add(category)
  return category
}

// 重命名类型 → 通过 categoryId 关联的所有课程自动显示新名称
export async function updateCategory(id: string, input: CategoryInput): Promise<void> {
  const name = input.name.trim()
  if (!name) throw new Error('请输入类型名称')
  const dup = await db.courseCategories.where('name').equals(name).first()
  if (dup && dup.id !== id) throw new DuplicateCategoryNameError('已存在同名课程类型')
  await db.courseCategories.update(id, { ...input, name, updatedAt: new Date().toISOString() })
}

// 删除保护：被课程使用的类型拒绝物理删除（UI 提供「停用」）
export class CategoryInUseError extends Error {}

export async function deleteCategory(id: string): Promise<void> {
  const used = await db.courses.where('categoryId').equals(id).count()
  if (used > 0) throw new CategoryInUseError('该课程类型正在被使用，无法删除')
  await db.courseCategories.delete(id)
}

// 停用/重新启用：停用后旧课程保留原类型，新增课程不再显示
export async function setCategoryStatus(id: string, status: CourseCategoryStatus): Promise<void> {
  await db.courseCategories.update(id, { status, updatedAt: new Date().toISOString() })
}

// 排序：与相邻项交换 sortOrder
export async function moveCategory(id: string, direction: 'up' | 'down'): Promise<void> {
  const list = await db.courseCategories.orderBy('sortOrder').toArray()
  const idx = list.findIndex((c) => c.id === id)
  if (idx === -1) return
  const otherIdx = direction === 'up' ? idx - 1 : idx + 1
  if (otherIdx < 0 || otherIdx >= list.length) return
  const a = list[idx]
  const b = list[otherIdx]
  await db.transaction('rw', db.courseCategories, async () => {
    await db.courseCategories.update(a.id, { sortOrder: b.sortOrder })
    await db.courseCategories.update(b.id, { sortOrder: a.sortOrder })
  })
}
