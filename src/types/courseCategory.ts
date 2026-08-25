// 课程类型 —— 独立数据实体（用户可自定义增删改）
export type CourseCategoryStatus = 'active' | 'inactive'

export interface CourseCategory {
  id: string
  name: string
  icon: string // emoji
  color: string // 色板 key，见 constants/courseColors
  sortOrder: number // 显示顺序（升序）
  isDefault: boolean // 系统建议的默认类型（用户仍可改/删）
  status: CourseCategoryStatus // 'inactive' = 停用：旧课程保留原类型，新增课程不再显示
  createdAt: string
  updatedAt: string
}
