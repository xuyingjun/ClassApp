// 上课记录 —— 历史事实，课程停用/删除不影响其留存
export type ClassRecordStatus = 'completed' | 'cancelled' | 'makeup' | 'absent'
export type ClassRecordSource = 'initial' | 'manual'

export interface ClassRecord {
  id: string
  childId: string
  courseId: string
  date: string // YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  lessonCount: number // 默认 1
  status: ClassRecordStatus
  source?: ClassRecordSource
  note?: string
  createdAt: string
  updatedAt: string
}

// 计入课时的状态（与统计口径一致：completed + makeup）
export function isCountedStatus(status: ClassRecordStatus): boolean {
  return status === 'completed' || status === 'makeup'
}

export function isInitialRecord(record: Pick<ClassRecord, 'source' | 'note'>): boolean {
  return record.source === 'initial' || record.note === '创建课程时录入的已用课时'
}
