import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

// 某孩子的全部课程（实时响应 IndexedDB 变化；childId 为空时返回空数组）
export function useCourses(childId: string | undefined) {
  return useLiveQuery(
    () => (childId ? db.courses.where('childId').equals(childId).sortBy('updatedAt') : []),
    [childId],
  )
}

// 单门课程（实时）；id 为空 → undefined（加载中）；不存在 → null
export function useCourse(id: string | undefined) {
  return useLiveQuery(() => (id ? db.courses.get(id) : undefined), [id])
}
