import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'

// 某孩子的全部上课记录，按日期升序（实时响应 IndexedDB 变化）
export function useClassRecords(childId: string | undefined) {
  return useLiveQuery(
    () => (childId ? db.classRecords.where('childId').equals(childId).sortBy('date') : []),
    [childId],
  )
}
