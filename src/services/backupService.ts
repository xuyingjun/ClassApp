import { z } from 'zod'
import { db } from '../db/database'
import { BACKUP_APP_NAME, BACKUP_VERSION, type BackupData } from '../types/backup'
import type { Course } from '../types/course'
import { recalculateAllCourseUsage, refreshCourseStatus } from './courseService'
import { todayStr } from '../utils/date'

// —— zod 结构校验（导入安全的第一道防线，Phase 0 §5.6）——

const idSchema = z.string().min(1)
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/)

const childSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    avatar: z.string().optional(),
    birthday: dateSchema.optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    note: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

const weeklySlotSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema.optional(),
  })
  .strict()

const courseSchema = z
  .object({
    id: idSchema,
    childId: idSchema,
    name: z.string(),
    category: z.string(),
    teacher: z.string().optional(),
    institution: z.string().optional(),
    totalLessons: z.number(),
    usedLessons: z.number(),
    price: z.number().optional(),
    startDate: dateSchema.optional(),
    expireDate: dateSchema.optional(),
    defaultDuration: z.number().optional(),
    color: z.string().optional(),
    weeklySchedule: z.array(weeklySlotSchema).optional(),
    note: z.string().optional(),
    status: z.enum(['active', 'completed', 'expired', 'inactive']),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

const classRecordSchema = z
  .object({
    id: idSchema,
    childId: idSchema,
    courseId: idSchema,
    date: dateSchema,
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    lessonCount: z.number(),
    status: z.enum(['completed', 'cancelled', 'makeup', 'absent']),
    note: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

const settingSchema = z.object({ key: z.string(), value: z.unknown() }).strict()

export const backupSchema = z
  .object({
    app: z.literal(BACKUP_APP_NAME),
    version: z.number().int().positive(),
    exportedAt: z.string(),
    children: z.array(childSchema),
    courses: z.array(courseSchema),
    classRecords: z.array(classRecordSchema),
    settings: z.array(settingSchema),
  })
  .strict()

export interface ImportResult {
  ok: boolean
  error?: string // 校验失败原因（此时当前数据零改动）
  orphanRecords?: number // 被跳过的孤儿记录数
}

function formatZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || '数据'}：${i.message}`)
    .join('；')
}

// —— 导出 ——

export async function exportAll(): Promise<BackupData> {
  const [children, courses, classRecords, settings] = await Promise.all([
    db.children.toArray(),
    db.courses.toArray(),
    db.classRecords.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: BACKUP_APP_NAME,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    children,
    courses,
    classRecords,
    settings,
  }
}

// 下载 JSON 文件（iOS Safari 会弹出分享/存储面板）
export function downloadBackup(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tongke-backup-${todayStr()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// 复制到剪贴板（备用通道）
export async function copyBackupToClipboard(data: BackupData): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

// —— 导入 ——

export async function importBackup(json: unknown): Promise<ImportResult> {
  // ① 内存校验：失败时当前数据库零改动
  const parsed = backupSchema.safeParse(json)
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) }
  const data = parsed.data
  if (data.version > BACKUP_VERSION) {
    return { ok: false, error: `备份版本 ${data.version} 高于当前应用支持的版本，请升级应用` }
  }

  // ② 引用完整性：孤儿记录（指向不存在的课程/孩子）警告并跳过
  const childIds = new Set(data.children.map((c) => c.id))
  const courseIds = new Set(data.courses.map((c) => c.id))
  const validRecords = data.classRecords.filter(
    (r) => childIds.has(r.childId) && courseIds.has(r.courseId),
  )
  const orphanRecords = data.classRecords.length - validRecords.length

  // ③ 单事务「清空 + 写入」：任何异常自动回滚，不破坏当前数据
  try {
    await db.transaction('rw', db.children, db.courses, db.classRecords, db.settings, async () => {
      await Promise.all([
        db.children.clear(),
        db.courses.clear(),
        db.classRecords.clear(),
        db.settings.clear(),
      ])
      await db.children.bulkAdd(data.children)
      // weekday 已被 zod 校验为 0-6 整数，此处断言为字面量联合类型是安全的
      await db.courses.bulkAdd(data.courses as Course[])
      await db.classRecords.bulkAdd(validRecords)
      await db.settings.bulkAdd(data.settings)
    })
  } catch {
    return { ok: false, error: '导入失败，当前数据未受影响' }
  }

  // ④ 导入后全量重算 + 状态刷新，保证一致性
  await recalculateAllCourseUsage()
  await refreshCourseStatus()
  return { ok: true, orphanRecords: orphanRecords > 0 ? orphanRecords : undefined }
}

// —— 清空 ——

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.children, db.courses, db.classRecords, db.settings, async () => {
    await Promise.all([
      db.children.clear(),
      db.courses.clear(),
      db.classRecords.clear(),
      db.settings.clear(),
    ])
  })
}
