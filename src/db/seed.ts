// 开发用演示数据：1 个孩子 + 6 门课程 + 历史记录
// 仅在开发模式可用（「我的 → 关于」页面的「填充演示数据」按钮）
// usedLessons 由记录自动统计生成，保证与 ClassRecord 口径一致
import { nanoid } from 'nanoid'
import { db } from './database'
import { addDays, addMinutesToTime, todayStr } from '../utils/date'
import type { Child } from '../types/child'
import type { Course } from '../types/course'
import type { ClassRecord } from '../types/classRecord'

function ts(): string {
  return new Date().toISOString()
}

export async function seedDemoData(): Promise<void> {
  if (!import.meta.env.DEV) return

  const today = todayStr()
  const childId = nanoid()
  const child: Child = {
    id: childId,
    name: '小雨',
    avatar: '👧',
    birthday: '2018-05-20',
    gender: 'female',
    note: '演示数据，可在「我的 → 数据备份」中清空',
    createdAt: ts(),
    updatedAt: ts(),
  }

  const englishId = nanoid()
  const pianoId = nanoid()
  const codingId = nanoid()
  const artId = nanoid()
  const danceId = nanoid()
  const speechId = nanoid()

  // 生成一条记录（daysAgo=0 表示今天）
  const rec = (courseId: string, daysAgo: number, time: string, extra?: Partial<ClassRecord>): ClassRecord => {
    const date = daysAgo === 0 ? today : addDays(today, -daysAgo)
    const startTime = time
    const endTime = extra?.endTime ?? addMinutesToTime(time, 60)
    return {
      id: nanoid(),
      childId,
      courseId,
      date,
      startTime,
      endTime,
      lessonCount: 1,
      status: 'completed',
      createdAt: ts(),
      updatedAt: ts(),
      ...extra,
    }
  }

  // —— 上课记录（历史事实）——
  const records: ClassRecord[] = [
    // 少儿英语：12 次已完成（对应需求示例 50 节 / 已用 12）
    ...Array.from({ length: 12 }, (_, i) => rec(englishId, 3 + i * 7, '18:30')),
    // 钢琴：4 次
    ...Array.from({ length: 4 }, (_, i) => rec(pianoId, 5 + i * 7, '17:00')),
    // 少儿编程：34 次 ×1节 + 1 次补课 ×2节 = 36 节
    ...Array.from({ length: 34 }, (_, i) => rec(codingId, 10 + i * 7, '10:00', { endTime: '11:30' })),
    rec(codingId, 9, '10:00', { endTime: '11:30', status: 'makeup', lessonCount: 2 }),
    // 少儿绘画：20 次（最近一次在昨天）
    ...Array.from({ length: 20 }, (_, i) => rec(artId, 1 + i * 7, '15:00')),
    // 少儿舞蹈：今天 1 次已完成 + 历史记录（含取消/缺席各一次）
    rec(danceId, 0, '18:00'),
    rec(danceId, 4, '18:00'),
    rec(danceId, 6, '18:00', { status: 'cancelled' }),
    rec(danceId, 11, '18:00'),
    rec(danceId, 18, '18:00'),
    rec(danceId, 20, '18:00', { status: 'absent' }),
    rec(danceId, 25, '18:00'),
    rec(danceId, 32, '18:00'),
    rec(danceId, 39, '18:00'),
    rec(danceId, 46, '18:00'),
    // 少儿口才：已结课，4 次 ×3节 = 12 节
    ...Array.from({ length: 4 }, (_, i) => rec(speechId, 49 + i * 7, '19:00', { lessonCount: 3 })),
  ]

  // usedLessons 由记录推导，保证数据一致性
  const usedMap = new Map<string, number>()
  for (const r of records) {
    if (r.status === 'completed' || r.status === 'makeup') {
      usedMap.set(r.courseId, (usedMap.get(r.courseId) ?? 0) + r.lessonCount)
    }
  }
  const used = (id: string) => usedMap.get(id) ?? 0

  const courses: Course[] = [
    {
      id: englishId,
      childId,
      name: '少儿英语',
      category: 'english',
      teacher: '王老师',
      institution: '星火英语',
      totalLessons: 50,
      usedLessons: used(englishId),
      price: 6800,
      startDate: addDays(today, -100),
      expireDate: addDays(today, 300),
      defaultDuration: 60,
      color: 'blue',
      weeklySchedule: [
        { weekday: 2, startTime: '18:30', endTime: '19:30' },
        { weekday: 4, startTime: '18:30', endTime: '19:30' },
      ],
      note: '',
      status: 'active',
      createdAt: ts(),
      updatedAt: ts(),
    },
    {
      id: pianoId,
      childId,
      name: '钢琴',
      category: 'piano',
      teacher: '刘老师',
      institution: '琴韵钢琴',
      totalLessons: 24,
      usedLessons: used(pianoId),
      price: 4800,
      startDate: addDays(today, -40),
      expireDate: addDays(today, 120),
      defaultDuration: 60,
      color: 'purple',
      weeklySchedule: [{ weekday: 3, startTime: '17:00', endTime: '18:00' }],
      note: '',
      status: 'active',
      createdAt: ts(),
      updatedAt: ts(),
    },
    {
      id: codingId,
      childId,
      name: '少儿编程',
      category: 'coding',
      teacher: '张老师',
      institution: '码趣编程',
      totalLessons: 40,
      usedLessons: used(codingId),
      price: 5200,
      startDate: addDays(today, -280),
      expireDate: addDays(today, 200),
      defaultDuration: 90,
      color: 'green',
      weeklySchedule: [{ weekday: 6, startTime: '10:00', endTime: '11:30' }],
      note: '',
      status: 'active',
      createdAt: ts(),
      updatedAt: ts(),
    },
    {
      id: artId,
      childId,
      name: '少儿绘画',
      category: 'art',
      teacher: '李老师',
      institution: '童画空间',
      totalLessons: 48,
      usedLessons: used(artId),
      price: 3600,
      startDate: addDays(today, -150),
      expireDate: addDays(today, 12), // → 触发到期提醒
      defaultDuration: 90,
      color: 'pink',
      weeklySchedule: [{ weekday: 0, startTime: '15:00', endTime: '16:30' }],
      note: '',
      status: 'active',
      createdAt: ts(),
      updatedAt: ts(),
    },
    {
      id: danceId,
      childId,
      name: '少儿舞蹈',
      category: 'dance',
      teacher: '陈老师',
      institution: '舞之灵',
      totalLessons: 20,
      usedLessons: used(danceId),
      price: 2400,
      startDate: addDays(today, -60),
      expireDate: addDays(today, 150),
      defaultDuration: 60,
      color: 'orange',
      weeklySchedule: [
        { weekday: 1, startTime: '18:00', endTime: '19:00' },
        { weekday: 5, startTime: '18:00', endTime: '19:00' },
      ],
      note: '',
      status: 'active',
      createdAt: ts(),
      updatedAt: ts(),
    },
    {
      id: speechId,
      childId,
      name: '少儿口才',
      category: 'other',
      teacher: '周老师',
      institution: '口才星',
      totalLessons: 12,
      usedLessons: used(speechId),
      price: 1200,
      startDate: addDays(today, -80),
      expireDate: addDays(today, 60),
      defaultDuration: 60,
      color: 'teal',
      weeklySchedule: undefined,
      note: '已结课示例',
      status: 'completed',
      createdAt: ts(),
      updatedAt: ts(),
    },
  ]

  await db.transaction('rw', db.children, db.courses, db.classRecords, async () => {
    await db.children.clear()
    await db.courses.clear()
    await db.classRecords.clear()
    await db.children.add(child)
    await db.courses.bulkAdd(courses)
    await db.classRecords.bulkAdd(records)
  })
}
