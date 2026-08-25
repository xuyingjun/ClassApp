import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import type { CourseCategory } from '../types/courseCategory'

interface CourseCategoryContextValue {
  categories: CourseCategory[] | undefined // 全部（含停用），sortOrder 升序；undefined = 加载中
  categoryMap: Map<string, CourseCategory>
  activeCategories: CourseCategory[] // 仅启用（新增课程的可选项）
  categoryName: (id?: string) => string
  categoryIcon: (id?: string) => string
  categoryColorKey: (id?: string) => string
}

const CourseCategoryContext = createContext<CourseCategoryContextValue | null>(null)

export function CourseCategoryProvider({ children }: { children: ReactNode }) {
  const categories = useLiveQuery(() => db.courseCategories.orderBy('sortOrder').toArray(), [])

  const value = useMemo<CourseCategoryContextValue>(() => {
    const list = categories ?? []
    const find = (id?: string) => (id ? list.find((c) => c.id === id) : undefined)
    return {
      categories,
      categoryMap: new Map(list.map((c) => [c.id, c])),
      activeCategories: list.filter((c) => c.status === 'active'),
      categoryName: (id) => find(id)?.name ?? '未分类',
      categoryIcon: (id) => find(id)?.icon ?? '📖',
      categoryColorKey: (id) => find(id)?.color ?? 'orange',
    }
  }, [categories])

  return <CourseCategoryContext.Provider value={value}>{children}</CourseCategoryContext.Provider>
}

export function useCourseCategories(): CourseCategoryContextValue {
  const ctx = useContext(CourseCategoryContext)
  if (!ctx) throw new Error('useCourseCategories 必须在 CourseCategoryProvider 内使用')
  return ctx
}
