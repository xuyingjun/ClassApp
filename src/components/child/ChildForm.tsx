import { useState, type FormEvent } from 'react'
import { CHILD_AVATARS } from '../../constants'
import { useToast } from '../../hooks/useToast'
import { addChild, updateChild, type ChildInput } from '../../services/childService'
import type { Child, Gender } from '../../types/child'
import Button from '../ui/Button'

interface ChildFormProps {
  initial?: Child
  onSaved: () => void
}

const GENDER_LABELS: Record<Gender, string> = { male: '男', female: '女', other: '其他' }

// 孩子表单（新增/编辑共用，移动端 BottomSheet 内使用）
export default function ChildForm({ initial, onSaved }: ChildFormProps) {
  const toast = useToast()
  const [name, setName] = useState(initial?.name ?? '')
  const [avatar, setAvatar] = useState(initial?.avatar ?? CHILD_AVATARS[0])
  const [gender, setGender] = useState<Gender | undefined>(initial?.gender)
  const [birthday, setBirthday] = useState(initial?.birthday ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.showToast('请输入孩子姓名', 'error')
      return
    }
    const input: ChildInput = {
      name: trimmed,
      avatar,
      gender,
      birthday: birthday || undefined,
      note: note || undefined,
    }
    setBusy(true)
    try {
      if (initial) await updateChild(initial.id, input)
      else await addChild(input)
      onSaved()
    } catch {
      toast.showToast('保存失败，请重试', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium">
          姓名 <span className="text-danger">*</span>
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="孩子的小名或姓名"
          maxLength={20}
          className="mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base outline-none focus:border-primary"
        />
      </label>

      <div>
        <span className="text-sm font-medium">头像</span>
        <div className="no-scrollbar mt-1.5 flex gap-2 overflow-x-auto pb-1">
          {CHILD_AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAvatar(a)}
              aria-label={`头像 ${a}`}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl transition ${
                avatar === a ? 'bg-primary-soft ring-2 ring-primary' : 'bg-neutral-100'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium">性别</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(Object.keys(GENDER_LABELS) as Gender[]).map((g) => (
            <button
              type="button"
              key={g}
              onClick={() => setGender(gender === g ? undefined : g)}
              className={`h-11 rounded-xl text-sm font-medium transition ${
                gender === g
                  ? 'bg-primary-soft text-primary ring-1 ring-primary'
                  : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              {GENDER_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium">生日</span>
        <input
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          className="mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base outline-none focus:border-primary"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium">备注</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="选填"
          className="mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-base outline-none focus:border-primary"
        />
      </label>

      <Button type="submit" className="w-full" loading={busy}>
        {initial ? '保存' : '添加'}
      </Button>
    </form>
  )
}
