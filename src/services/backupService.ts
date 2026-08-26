import { z } from 'zod'
import { db } from '../db/database'
import { BACKUP_APP_NAME, BACKUP_VERSION, type BackupData } from '../types/backup'
import type { Course } from '../types/course'
import { OLD_CATEGORY_KEY_TO_ID } from '../constants'
import { deriveStatus } from './courseService'
import { buildDefaultCategories } from './courseCategoryService'
import { todayStr } from '../utils/date'
import { SETTING_KEYS } from '../types/setting'

// —— zod 结构校验（导入安全的第一道防线，Phase 0 §5.6）——

const idSchema = z.string().min(1)
const nonEmptyStringSchema = z.string().trim().min(1)
const dateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}, '日期格式无效')
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间格式无效')
const timestampSchema = z.string().refine(
  (value) => /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value)),
  '时间戳格式无效',
)

const childSchema = z
  .object({
    id: idSchema,
    name: nonEmptyStringSchema,
    avatar: z.string().optional(),
    birthday: dateSchema.optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    note: z.string().optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

const weeklySlotSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema.optional(),
  })
  .strict()

const courseCategorySchema = z
  .object({
    id: idSchema,
    name: nonEmptyStringSchema,
    icon: z.string(),
    color: z.string(),
    sortOrder: z.number().int(),
    isDefault: z.boolean(),
    status: z.enum(['active', 'inactive']),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

const courseBase = {
  id: idSchema,
  childId: idSchema,
  name: nonEmptyStringSchema,
  teacher: z.string().optional(),
  institution: z.string().optional(),
  totalLessons: z.number().int().positive(),
  usedLessons: z.number().nonnegative(),
  price: z.number().nonnegative().optional(),
  startDate: dateSchema.optional(),
  expireDate: dateSchema.optional(),
  defaultDuration: z.number().positive().optional(),
  color: z.string().optional(),
  weeklySchedule: z.array(weeklySlotSchema).optional(),
  note: z.string().optional(),
  status: z.enum(['active', 'completed', 'expired', 'inactive']),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}

function hasValidCourseDateRange(course: { startDate?: string; expireDate?: string }): boolean {
  return !course.startDate || !course.expireDate || course.startDate <= course.expireDate
}

const courseSchemaV2 = z
  .object({ ...courseBase, categoryId: idSchema })
  .strict()
  .refine(hasValidCourseDateRange, { message: '课程开始日期不能晚于到期日期' })

// v1 遗留：category 为枚举 key
const courseSchemaV1 = z
  .object({ ...courseBase, category: z.string() })
  .strict()
  .refine(hasValidCourseDateRange, { message: '课程开始日期不能晚于到期日期' })

const classRecordSchema = z
  .object({
    id: idSchema,
    childId: idSchema,
    courseId: idSchema,
    date: dateSchema,
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    lessonCount: z.number().positive(),
    status: z.enum(['completed', 'cancelled', 'makeup', 'absent']),
    note: z.string().optional(),
    source: z.enum(['initial', 'manual']).optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()

const settingSchema = z.object({ key: z.string(), value: z.unknown() }).strict()

export const backupSchemaV2 = z
  .object({
    app: z.literal(BACKUP_APP_NAME),
    version: z.number().int().positive(),
    exportedAt: timestampSchema,
    children: z.array(childSchema),
    courses: z.array(courseSchemaV2),
    classRecords: z.array(classRecordSchema),
    courseCategories: z.array(courseCategorySchema),
    settings: z.array(settingSchema),
  })
  .strict()

const backupSchemaV1 = z
  .object({
    app: z.literal(BACKUP_APP_NAME),
    version: z.literal(1),
    exportedAt: timestampSchema,
    children: z.array(childSchema),
    courses: z.array(courseSchemaV1),
    classRecords: z.array(classRecordSchema),
    settings: z.array(settingSchema),
  })
  .strict()

export interface ImportResult {
  ok: boolean
  error?: string // 校验失败原因（此时当前数据零改动）
  skippedItems?: number // 被跳过的孤儿课程或无效关联记录数
}

export interface BackupSummary {
  version: number
  exportedAt: string
  children: number
  courses: number
  classRecords: number
}

function formatZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 3)
    .map((i) => `${i.path.join('.') || '数据'}：${i.message}`)
    .join('；')
}

export function inspectBackup(
  json: unknown,
): { ok: true; summary: BackupSummary } | { ok: false; error: string } {
  const probeVersion =
    typeof json === 'object' && json !== null ? (json as { version?: unknown }).version : undefined
  const parsed = probeVersion === 1 ? backupSchemaV1.safeParse(json) : backupSchemaV2.safeParse(json)
  if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) }
  if (parsed.data.version > BACKUP_VERSION) {
    return { ok: false, error: `备份版本 ${parsed.data.version} 高于当前应用支持的版本，请升级应用` }
  }
  return {
    ok: true,
    summary: {
      version: parsed.data.version,
      exportedAt: parsed.data.exportedAt,
      children: parsed.data.children.length,
      courses: parsed.data.courses.length,
      classRecords: parsed.data.classRecords.length,
    },
  }
}

// —— 导出 ——

export async function exportAll(): Promise<BackupData> {
  return db.transaction(
    'r',
    db.children,
    db.courses,
    db.classRecords,
    db.courseCategories,
    db.settings,
    async () => {
      const [children, courses, classRecords, courseCategories, settings] = await Promise.all([
        db.children.toArray(),
        db.courses.toArray(),
        db.classRecords.toArray(),
        db.courseCategories.toArray(),
        db.settings.toArray(),
      ])
      return {
        app: BACKUP_APP_NAME,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        children,
        courses,
        classRecords,
        courseCategories,
        settings,
      }
    },
  )
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

export async function markBackupCompleted(): Promise<void> {
  await db.settings.put({ key: SETTING_KEYS.lastBackupAt, value: new Date().toISOString() })
}

// —— 导入 ——

export async function importBackup(json: unknown): Promise<ImportResult> {
  // ① 内存校验（兼容 v1/v2）：失败时当前数据库零改动
  let data: BackupData
  const probeVersion =
    typeof json === 'object' && json !== null ? (json as { version?: unknown }).version : undefined

  if (probeVersion === 1) {
    // v1 旧备份 → 迁移：category → categoryId，补充默认课程类型
    const parsed = backupSchemaV1.safeParse(json)
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) }
    data = {
      app: BACKUP_APP_NAME,
      version: BACKUP_VERSION,
      exportedAt: parsed.data.exportedAt,
      children: parsed.data.children,
      courses: parsed.data.courses.map((c) => {
        const { category, ...rest } = c
        void category
        // weekday 已被 zod 校验为 0-6 整数，断言为字面量联合类型是安全的
        return { ...rest, categoryId: OLD_CATEGORY_KEY_TO_ID[category] ?? 'cat-other' } as Course
      }),
      classRecords: parsed.data.classRecords,
      courseCategories: buildDefaultCategories(),
      settings: parsed.data.settings,
    }
  } else {
    const parsed = backupSchemaV2.safeParse(json)
    if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) }
    if (parsed.data.version > BACKUP_VERSION) {
      return { ok: false, error: `备份版本 ${parsed.data.version} 高于当前应用支持的版本，请升级应用` }
    }
    data = {
      ...parsed.data,
      // weekday 已被 zod 校验为 0-6 整数，断言为字面量联合类型是安全的
      courses: parsed.data.courses as Course[],
    }
  }

  // ② 课程类型兜底：备份中没有类型时补默认；课程指向不存在的类型时归入「其他」
  if (data.courseCategories.length === 0) {
    data.courseCategories = buildDefaultCategories()
  }
  const categoryIds = new Set(data.courseCategories.map((c) => c.id))
  const fallbackCategoryId =
    data.courseCategories.find((c) => c.isDefault && c.name === '其他')?.id ??
    data.courseCategories[0]?.id ??
    'cat-other'
  const childIds = new Set(data.children.map((c) => c.id))
  const fixedCourses = data.courses
    .filter((course) => childIds.has(course.childId))
    .map((course) =>
      categoryIds.has(course.categoryId) ? course : { ...course, categoryId: fallbackCategoryId },
    )

  // ③ 引用完整性：孤儿课程和记录警告并跳过，记录必须属于课程对应的孩子
  const courseById = new Map(fixedCourses.map((course) => [course.id, course]))
  const validRecords = data.classRecords.filter(
    (record) => courseById.get(record.courseId)?.childId === record.childId,
  )
  const skippedItems = data.courses.length - fixedCourses.length + data.classRecords.length - validRecords.length

  const usedLessonsByCourse = new Map<string, number>()
  for (const record of validRecords) {
    if (record.status !== 'completed' && record.status !== 'makeup') continue
    usedLessonsByCourse.set(
      record.courseId,
      (usedLessonsByCourse.get(record.courseId) ?? 0) + record.lessonCount,
    )
  }
  const now = new Date().toISOString()
  const today = todayStr()
  const finalCourses = fixedCourses.map((course) => {
    const recalculated = {
      ...course,
      usedLessons: usedLessonsByCourse.get(course.id) ?? 0,
      updatedAt: now,
    }
    return {
      ...recalculated,
      status: course.status === 'inactive' ? 'inactive' : deriveStatus(recalculated, today),
    } as Course
  })

  // ④ 单事务「清空 + 写入」：任何异常自动回滚，不破坏当前数据
  try {
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
        await db.children.bulkAdd(data.children)
        // weekday 已被 zod 校验为 0-6 整数，此处断言为字面量联合类型是安全的
        await db.courses.bulkAdd(finalCourses)
        await db.classRecords.bulkAdd(validRecords)
        await db.courseCategories.bulkAdd(data.courseCategories)
        await db.settings.bulkAdd(data.settings)
      },
    )
  } catch {
    return { ok: false, error: '导入失败，当前数据未受影响' }
  }

  return { ok: true, skippedItems: skippedItems > 0 ? skippedItems : undefined }
}

// —— 清空 ——

export async function clearAllData(): Promise<void> {
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
