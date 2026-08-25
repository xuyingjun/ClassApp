import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/database'
import { addChild } from './childService'
import { addCourse } from './courseService'
import {
  addCategory,
  deleteCategory,
  ensureDefaultCategories,
  moveCategory,
  setCategoryStatus,
  updateCategory,
  DuplicateCategoryNameError,
  CategoryInUseError,
} from './courseCategoryService'

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

describe('courseCategoryService（自定义课程类型）', () => {
  it('类型表为空时写入 7 个建议默认类型（幂等）', async () => {
    await ensureDefaultCategories()
    expect(await db.courseCategories.count()).toBe(7)
    await ensureDefaultCategories() // 再次调用不重复写入
    expect(await db.courseCategories.count()).toBe(7)
    const list = await db.courseCategories.orderBy('sortOrder').toArray()
    expect(list[0].name).toBe('英语')
    expect(list[6].name).toBe('其他')
    expect(list.every((c) => c.isDefault && c.status === 'active')).toBe(true)
  })

  it('新增自定义类型：追加到末尾并校验重名', async () => {
    await ensureDefaultCategories()
    const cat = await addCategory({ name: '围棋', icon: '♟️', color: 'blue' })
    expect(cat.sortOrder).toBe(7)
    expect(cat.isDefault).toBe(false)
    await expect(addCategory({ name: '围棋', icon: 'x', color: 'blue' })).rejects.toBeInstanceOf(
      DuplicateCategoryNameError,
    )
  })

  it('重命名类型 → 关联课程自动显示新名称（categoryId 关联）', async () => {
    await ensureDefaultCategories()
    const child = await addChild({ name: '小雨' })
    const course = await addCourse({
      childId: child.id,
      name: '音乐课',
      categoryId: 'cat-other',
      totalLessons: 10,
      usedLessons: 0,
    })
    await updateCategory('cat-other', { name: '音乐类', icon: '🎵', color: 'purple' })
    const cat = await db.courseCategories.get('cat-other')
    expect(cat!.name).toBe('音乐类') // 课程按 id 关联，名称变更自动生效
    expect(course.categoryId).toBe('cat-other') // 课程本身不变
  })

  it('使用中的类型拒绝删除；未使用的可删除', async () => {
    await ensureDefaultCategories()
    const child = await addChild({ name: '小雨' })
    await addCourse({
      childId: child.id,
      name: '舞蹈课',
      categoryId: 'cat-dance',
      totalLessons: 10,
      usedLessons: 0,
    })
    await expect(deleteCategory('cat-dance')).rejects.toBeInstanceOf(CategoryInUseError)
    // 未使用的类型可物理删除
    await deleteCategory('cat-writing')
    expect(await db.courseCategories.get('cat-writing')).toBeUndefined()
    expect(await db.courseCategories.count()).toBe(6)
  })

  it('停用后旧课程保留原类型；重新启用恢复', async () => {
    await ensureDefaultCategories()
    const child = await addChild({ name: '小雨' })
    await addCourse({
      childId: child.id,
      name: '钢琴课',
      categoryId: 'cat-piano',
      totalLessons: 10,
      usedLessons: 0,
    })
    await setCategoryStatus('cat-piano', 'inactive')
    expect((await db.courseCategories.get('cat-piano'))!.status).toBe('inactive')
    const course = (await db.courses.toArray())[0]
    expect(course.categoryId).toBe('cat-piano') // 旧课程仍关联该类型
    await setCategoryStatus('cat-piano', 'active')
    expect((await db.courseCategories.get('cat-piano'))!.status).toBe('active')
  })

  it('排序：上移/下移与相邻项交换', async () => {
    await ensureDefaultCategories()
    const order = () => db.courseCategories.orderBy('sortOrder').toArray()
    expect((await order()).map((c) => c.id)).toEqual([
      'cat-english',
      'cat-piano',
      'cat-dance',
      'cat-art',
      'cat-wushu',
      'cat-writing',
      'cat-other',
    ])
    await moveCategory('cat-writing', 'up') // 写字 ↔ 武术
    expect((await order()).map((c) => c.id)).toEqual([
      'cat-english',
      'cat-piano',
      'cat-dance',
      'cat-art',
      'cat-writing',
      'cat-wushu',
      'cat-other',
    ])
    await moveCategory('cat-english', 'up') // 已在首位，无变化
    expect((await order())[0].id).toBe('cat-english')
  })
})
