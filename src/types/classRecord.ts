// 上课记录 —— 历史事实，课程停用/删除不影响其留存
export type ClassRecordStatus = 'completed' | 'cancelled' | 'makeup' | 'absent'

export interface ClassRecord {
  id: string
  childId: string
  courseId: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  lessonCount: number // 默认 1
  status: ClassRecordStatus
  note?: string
  createdAt: string
  updatedAt: string
}

// 计入课时的状态（与统计口径一致：completed + makeup）
export function isCountedStatus(status: ClassRecordStatus): boolean {
  return status === 'completed' || status === 'makeup'
}
