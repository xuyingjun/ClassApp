import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { COURSE_COLORS, DEFAULT_DURATION_MINUTES } from '../../constants'
import { useToast } from '../../hooks/useToast'
import { useCourseCategories } from '../../hooks/useCourseCategories'
import { addCourse, updateCourse } from '../../services/courseService'
import type { Course, WeeklySlot } from '../../types/course'
import Button from '../ui/Button'

interface CourseFormProps {
  childId: string
  initial?: Course
  onSaved: () => void
}

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'] as const

const toInt = (s: string): number | undefined => {
  const n = Number(s)
  return Number.isInteger(n) ? n : undefined
}

// 课程表单（新增/编辑共用，整页展示）
export default function CourseForm({ childId, initial, onSaved }: CourseFormProps) {
  const toast = useToast()
  const { categories, activeCategories } = useCourseCategories()
  const [name, setName] = useState(initial?.name ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [teacher, setTeacher] = useState(initial?.teacher ?? '')
  const [institution, setInstitution] = useState(initial?.institution ?? '')
  const [totalLessons, setTotalLessons] = useState(initial ? String(initial.totalLessons) : '')
  const [usedLessons, setUsedLessons] = useState(initial ? String(initial.usedLessons) : '0')
  const [price, setPrice] = useState(initial?.price !== undefined ? String(initial.price) : '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [expireDate, setExpireDate] = useState(initial?.expireDate ?? '')
  const [defaultDuration, setDefaultDuration] = useState(
    initial?.defaultDuration !== undefined ? String(initial.defaultDuration) : String(DEFAULT_DURATION_MINUTES),
  )
  const [color, setColor] = useState(initial?.color ?? COURSE_COLORS[0].key)
  const [slots, setSlots] = useState<WeeklySlot[]>(initial?.weeklySchedule ?? [])
  const [note, setNote] = useState(initial?.note ?? '')
  const [busy, setBusy] = useState(false)

  // 可选项 = 启用类型（编辑时若原类型已停用，仍保留在列表中供选择）
  const categoryOptions = useMemo(() => {
    if (!initial) return activeCategories
    const current = categories?.find((c) => c.id === initial.categoryId)
    if (current && current.status === 'inactive' && !activeCategories.some((c) => c.id === current.id)) {
      return [current, ...activeCategories]
    }
    return activeCategories
  }, [initial, categories, activeCategories])

  // 类型加载完成后自动选中第一个启用类型
  useEffect(() => {
    if (!categoryId && activeCategories.length > 0) {
      setCategoryId(activeCategories[0].id)
    }
  }, [categoryId, activeCategories])

  const addSlot = () => setSlots([...slots, { weekday: 1, startTime: '' }])
  const patchSlot = (index: number, patch: Partial<WeeklySlot>) =>
    setSlots(slots.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  const removeSlot = (index: number) => setSlots(slots.filter((_, i) => i !== index))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      toast.showToast('请输入课程名称', 'error')
      return
    }
    const total = toInt(totalLessons)
    if (total === undefined || total < 1 || total > 999) {
      toast.showToast('总课时需为 1-999 的整数', 'error')
      return
    }
    const used = toInt(usedLessons) ?? 0
    if (used < 0 || used > total) {
      toast.showToast('已用课时需在 0 到总课时之间', 'error')
      return
    }
    if (startDate && expireDate && expireDate < startDate) {
      toast.showToast('到期日期不能早于开始日期', 'error')
      return
    }
    // 过滤掉未填写时间的课表时段
    const validSlots = slots.filter((s) => s.startTime)

    // 提交时校验类型仍可选（防止历史数据指向已删除的类型）
    const finalCategoryId = categoryOptions.some((c) => c.id === categoryId)
      ? categoryId
      : activeCategories[0]?.id
    if (!finalCategoryId) {
      toast.showToast('请先到「我的 → 课程类型」添加课程类型', 'error')
      return
    }

    const input = {
      name: trimmedName,
      categoryId: finalCategoryId,
      teacher: teacher.trim() || undefined,
      institution: institution.trim() || undefined,
      totalLessons: total,
      price: price.trim() ? Number(price) : undefined,
      startDate: startDate || undefined,
      expireDate: expireDate || undefined,
      defaultDuration: toInt(defaultDuration) ?? DEFAULT_DURATION_MINUTES,
      color,
      weeklySchedule: validSlots.length > 0 ? validSlots : undefined,
      note: note.trim() || undefined,
    }

    setBusy(true)
    try {
      if (initial) await updateCourse(initial.id, input)
      else await addCourse({ childId, ...input, usedLessons: used })
      onSaved()
    } catch {
      toast.showToast('保存失败，请重试', 'error')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'mt-1.5 h-12 w-full rounded-xl border border-neutral-200 bg-white px-3.5 text-base outline-none focus:border-primary'

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-4">
      <label className="block">
        <span className="text-sm font-medium">
          课程名称 <span className="text-danger">*</span>
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如：少儿英语"
          maxLength={30}
          className={inputCls}
        />
      </label>

      <div>
        <span className="text-sm font-medium">课程类型</span>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {categoryOptions.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCategoryId(c.id)}
              className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-xs transition ${
                categoryId === c.id
                  ? 'bg-primary-soft text-primary ring-1 ring-primary'
                  : 'bg-neutral-100 text-neutral-500'
              }`}
            >
              <span className="text-lg">{c.icon}</span>
              <span className="truncate">
                {c.name}
                {c.status === 'inactive' ? '（已停用）' : ''}
              </span>
            </button>
          ))}
        </div>
        {categoryOptions.length === 0 && (
          <p className="mt-1.5 text-xs text-neutral-400">暂无可用类型，请先到「我的 → 课程类型」添加</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">老师</span>
          <input
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            placeholder="如：王老师"
            maxLength={20}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">培训机构</span>
          <input
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="选填"
            maxLength={40}
            className={inputCls}
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">
            总课时 <span className="text-danger">*</span>
          </span>
          <input
            value={totalLessons}
            onChange={(e) => setTotalLessons(e.target.value)}
            inputMode="numeric"
            placeholder="如：50"
            className={inputCls}
          />
        </label>
        {initial ? (
          <div className="block">
            <span className="text-sm font-medium">已用课时</span>
            <div className="mt-1.5 flex h-12 items-center rounded-xl bg-neutral-100 px-3.5 text-base font-medium tabular-nums">
              {initial.usedLessons} 节
            </div>
            <span className="mt-1 block text-xs text-neutral-400">由上课记录自动统计，不可手动修改</span>
          </div>
        ) : (
          <label className="block">
            <span className="text-sm font-medium">已用课时</span>
            <input
              value={usedLessons}
              onChange={(e) => setUsedLessons(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-neutral-400">
              大于 0 时会生成一条初始记录，可在记录页修改
            </span>
          </label>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium">价格（元）</span>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputMode="numeric"
          placeholder="如：6800"
          className={inputCls}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">开始日期</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">到期日期</span>
          <input
            type="date"
            value={expireDate}
            onChange={(e) => setExpireDate(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium">每节课时长（分钟）</span>
        <input
          value={defaultDuration}
          onChange={(e) => setDefaultDuration(e.target.value)}
          inputMode="numeric"
          className={inputCls}
        />
      </label>

      <div>
        <span className="text-sm font-medium">课程颜色</span>
        <div className="mt-1.5 flex gap-3">
          {COURSE_COLORS.map((c) => (
            <button
              type="button"
              key={c.key}
              onClick={() => setColor(c.key)}
              aria-label={`颜色 ${c.key}`}
              className={`h-10 w-10 rounded-full transition ${color === c.key ? 'ring-2 ring-neutral-400 ring-offset-2' : ''}`}
              style={{ backgroundColor: c.value }}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium">每周上课时间（选填）</span>
        <div className="mt-1.5 space-y-2">
          {slots.map((slot, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex shrink-0 rounded-xl bg-neutral-100 p-1">
                {WEEKDAY_SHORT.map((w, wd) => (
                  <button
                    type="button"
                    key={w}
                    onClick={() => patchSlot(i, { weekday: wd as WeeklySlot['weekday'] })}
                    className={`h-9 w-9 rounded-lg text-xs font-medium transition ${
                      slot.weekday === wd ? 'bg-white text-primary shadow-sm' : 'text-neutral-500'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => patchSlot(i, { startTime: e.target.value })}
                className="h-12 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-base outline-none focus:border-primary"
              />
              <span className="text-neutral-400">至</span>
              <input
                type="time"
                value={slot.endTime ?? ''}
                onChange={(e) => patchSlot(i, { endTime: e.target.value || undefined })}
                className="h-12 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-base outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => removeSlot(i)}
                aria-label="删除时段"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-neutral-400 active:text-danger"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addSlot}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-500 active:bg-neutral-50"
          >
            ＋ 添加上课时段
          </button>
        </div>
        <p className="mt-1.5 text-xs text-neutral-400">设置后，首页会在对应星期显示「今日课程」</p>
      </div>

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
        {initial ? '保存修改' : '添加课程'}
      </Button>
      <div className="pb-4" />
    </form>
  )
}
