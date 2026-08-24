// 孩子
export type Gender = 'male' | 'female' | 'other'

export interface Child {
  id: string
  name: string
  avatar?: string // 预设 emoji 头像，见 constants/childAvatars
  birthday?: string // YYYY-MM-DD
  gender?: Gender
  note?: string
  createdAt: string // ISO 8601
  updatedAt: string
}
