import { nanoid } from 'nanoid'
import { db } from '../db/database'
import type { Child } from '../types/child'

export interface ChildInput {
  name: string
  avatar?: string
  birthday?: string
  gender?: Child['gender']
  note?: string
}

export async function addChild(input: ChildInput): Promise<Child> {
  const now = new Date().toISOString()
  const child: Child = { id: nanoid(), createdAt: now, updatedAt: now, ...input }
  await db.children.add(child)
  return child
}

export async function updateChild(id: string, input: ChildInput): Promise<void> {
  await db.children.update(id, { ...input, updatedAt: new Date().toISOString() })
}

// 删除保护（Phase 0 §5.5）：存在关联课程时拒绝删除
export class ChildHasCoursesError extends Error {}

export async function deleteChild(id: string): Promise<void> {
  const courseCount = await db.courses.where('childId').equals(id).count()
  if (courseCount > 0) {
    throw new ChildHasCoursesError('该孩子已有课程，请先在课程中处理')
  }
  await db.transaction('rw', db.children, db.classRecords, async () => {
    await db.children.delete(id)
    await db.classRecords.where('childId').equals(id).delete()
  })
}
