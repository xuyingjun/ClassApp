import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveChild } from '../../hooks/useActiveChild'
import { useCourses } from '../../hooks/useCourses'
import { useClassRecords } from '../../hooks/useClassRecords'
import { useToast } from '../../hooks/useToast'
import { remainingLessons } from '../../types/course'
import { isCountedStatus } from '../../types/classRecord'
import { RECORD_STATUS_META } from '../../constants'
import { formatDisplay, monthRange, todayStr } from '../../utils/date'
import BottomSheet from '../../components/ui/BottomSheet'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

export default function SettingsPage() {
  const { childList, activeChild, selectChild } = useActiveChild()
  const courses = useCourses(activeChild?.id)
  const records = useClassRecords(activeChild?.id)
  const toast = useToast()
  const [switchOpen, setSheetOpen] = useState(false)
  const [pendingTool, setPendingTool] = useState<'csv' | 'report' | null>(null)

  const today = todayStr()
  const [monthStart, monthEnd] = monthRange(today)

  // 统计数据
  const activeCourses = useMemo(
    () => (courses ?? []).filter((c) => c.status === 'active'),
    [courses],
  )

  const monthCount = useMemo(() => {
    let count = 0
    for (const r of records ?? []) {
      if (!isCountedStatus(r.status)) continue
      if (r.date >= monthStart && r.date <= monthEnd) count += r.lessonCount
    }
    return count
  }, [records, monthStart, monthEnd])

  const totalCount = useMemo(() => {
    let count = 0
    for (const r of records ?? []) {
      if (!isCountedStatus(r.status)) continue
      count += r.lessonCount
    }
    return count
  }, [records])

  // 导出 CSV 文件
  const handleExportCSV = () => {
    if (!activeChild) {
      toast.showToast('请先选择孩子', 'error')
      return
    }
    if (!records || records.length === 0) {
      toast.showToast('暂无上课记录可导出', 'error')
      return
    }

    const courseMap = new Map((courses ?? []).map((c) => [c.id, c.name]))

    // CSV Header
    const headers = ['日期', '时间', '孩子', '课程', '课时数', '状态', '备注']
    const rows = records.map((r) => {
      const timeStr = r.startTime ? (r.endTime ? `${r.startTime}-${r.endTime}` : r.startTime) : ''
      const statusLabel = RECORD_STATUS_META[r.status]?.label ?? r.status
      const courseName = courseMap.get(r.courseId) ?? '未知课程'
      const cleanNote = (r.note ?? '').replace(/"/g, '""')
      return [
        `"${r.date}"`,
        `"${timeStr}"`,
        `"${activeChild.name}"`,
        `"${courseName}"`,
        `"${r.lessonCount}"`,
        `"${statusLabel}"`,
        `"${cleanNote}"`,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tongke-records-${activeChild.name}-${today}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    toast.showToast('已导出 CSV 表格文件', 'success')
  }

  // 生成微信家庭打卡简报并复制
  const handleCopyReport = async () => {
    if (!activeChild) {
      toast.showToast('请先选择孩子', 'error')
      return
    }

    const yearMonthStr = today.slice(0, 7).replace('-', '年') + '月'
    const courseSummary = activeCourses
      .map((c) => `  • ${c.name}：剩 ${remainingLessons(c)} 节`)
      .join('\n')

    const text = [
      `📊【童课 · 月度消课简报】`,
      `孩子：${activeChild.name}`,
      `时间：${yearMonthStr}`,
      `-------------------`,
      `• 本月消课：${monthCount} 节`,
      `• 累计消课：${totalCount} 节`,
      `-------------------`,
      `进行中课程 (${activeCourses.length} 门)：`,
      courseSummary || '  暂无进行中课程',
      `-------------------`,
      `生成自：童课 App`,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      toast.showToast('简报已复制！可直接发送至微信群', 'success')
    } catch {
      toast.showToast('复制失败，请重试', 'error')
    }
  }

  const multiChild = (childList?.length ?? 0) > 1

  const confirmToolAction = () => {
    const action = pendingTool
    setPendingTool(null)
    if (action === 'csv') handleExportCSV()
    else if (action === 'report') void handleCopyReport()
  }

  return (
    <div className="space-y-4 p-4 pb-8">
      <h1 className="text-xl font-bold">我的</h1>

      {/* 顶部：孩子个人档案概览卡片 */}
      {activeChild && (
        <div className="rounded-2xl bg-gradient-to-br from-primary to-amber-600 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl backdrop-blur-sm">
                {activeChild.avatar ?? '👧'}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{activeChild.name}</h2>
                  {(activeChild.gender || activeChild.birthday) && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] backdrop-blur-sm opacity-90">
                      {[
                        activeChild.birthday,
                        activeChild.gender === 'male'
                          ? '男'
                          : activeChild.gender === 'female'
                            ? '女'
                            : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs opacity-85">
                  {formatDisplay(today, false)}
                </div>
              </div>
            </div>
            {multiChild && (
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 rounded-xl bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm active:bg-white/30"
              >
                切换
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-center">
            <div>
              <div className="text-[11px] opacity-80">进行中课程</div>
              <div className="mt-0.5 text-base font-bold tabular-nums">
                {activeCourses.length} 门
              </div>
            </div>
            <div>
              <div className="text-[11px] opacity-80">本月消课</div>
              <div className="mt-0.5 text-base font-bold tabular-nums">
                {monthCount} 节
              </div>
            </div>
            <div>
              <div className="text-[11px] opacity-80">累计消课</div>
              <div className="mt-0.5 text-base font-bold tabular-nums">
                {totalCount} 节
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 分组一：业务基础管理 */}
      <section className="space-y-1.5">
        <h2 className="px-1 text-xs font-semibold text-neutral-400">基础管理</h2>
        <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
          <Link
            to="/settings/children"
            className="flex min-h-14 items-center justify-between px-4 py-3 active:bg-neutral-50"
          >
            <span className="flex items-center gap-3 text-[15px] font-medium">
              <span className="text-lg">👧</span>
              <span>孩子管理</span>
            </span>
            <span className="text-xs text-neutral-400">
              {childList ? `${childList.length} 个孩子` : '加载中'}
            </span>
          </Link>
          <Link
            to="/settings/categories"
            className="flex min-h-14 items-center justify-between px-4 py-3 active:bg-neutral-50"
          >
            <span className="flex items-center gap-3 text-[15px] font-medium">
              <span className="text-lg">🏷️</span>
              <span>课程类型</span>
            </span>
            <span className="text-xs text-neutral-400">自定义类别与图标</span>
          </Link>
        </div>
      </section>

      {/* 分组二：实用工具与报表 */}
      <section className="space-y-1.5">
        <h2 className="px-1 text-xs font-semibold text-neutral-400">实用工具</h2>
        <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setPendingTool('csv')}
            className="flex min-h-14 w-full items-center justify-between px-4 py-3 text-left active:bg-neutral-50"
          >
            <span className="flex items-center gap-3 text-[15px] font-medium">
              <span className="text-lg">🧾</span>
              <span>导出 CSV 电子表格</span>
            </span>
            <span className="text-xs text-neutral-400">Excel 可查看完整明细</span>
          </button>

          <button
            type="button"
            onClick={() => setPendingTool('report')}
            className="flex min-h-14 w-full items-center justify-between px-4 py-3 text-left active:bg-neutral-50"
          >
            <span className="flex items-center gap-3 text-[15px] font-medium">
              <span className="text-lg">📋</span>
              <span>复制家庭月度简报</span>
            </span>
            <span className="text-xs text-neutral-400">一键发送微信家庭群</span>
          </button>
        </div>
      </section>

      {/* 分组三：数据与系统 */}
      <section className="space-y-1.5">
        <h2 className="px-1 text-xs font-semibold text-neutral-400">数据与系统</h2>
        <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
          <Link
            to="/settings/backup"
            className="flex min-h-14 items-center justify-between px-4 py-3 active:bg-neutral-50"
          >
            <span className="flex items-center gap-3 text-[15px] font-medium">
              <span className="text-lg">💾</span>
              <span>数据备份与恢复</span>
            </span>
            <span className="text-xs text-neutral-400">导出 / 恢复 / 清空</span>
          </Link>
          <Link
            to="/settings/about"
            className="flex min-h-14 items-center justify-between px-4 py-3 active:bg-neutral-50"
          >
            <span className="flex items-center gap-3 text-[15px] font-medium">
              <span className="text-lg">ℹ️</span>
              <span>关于童课</span>
            </span>
            <span className="text-xs text-neutral-400">版本与资源更新</span>
          </Link>
        </div>
      </section>

      {/* 切换孩子弹窗 */}
      <BottomSheet open={switchOpen} title="切换孩子" onClose={() => setSheetOpen(false)}>
        <div className="space-y-1">
          {childList?.map((child) => (
            <button
              key={child.id}
              type="button"
              onClick={() => {
                void selectChild(child.id)
                setSheetOpen(false)
              }}
              className="flex min-h-12 w-full items-center justify-between rounded-xl px-2 active:bg-neutral-50"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-xl">
                  {child.avatar ?? '👧'}
                </span>
                <span className="text-[15px] font-medium">{child.name}</span>
              </span>
              {child.id === activeChild?.id && <span className="text-lg text-primary">✓</span>}
            </button>
          ))}
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={pendingTool !== null}
        title={pendingTool === 'csv' ? '导出上课记录' : '复制月度简报'}
        message={
          pendingTool === 'csv'
            ? `确认导出「${activeChild?.name ?? ''}」的全部上课记录为 CSV 文件吗？`
            : `确认生成并复制「${activeChild?.name ?? ''}」的本月消课简报吗？`
        }
        confirmLabel={pendingTool === 'csv' ? '确认导出' : '确认复制'}
        confirmVariant="primary"
        onCancel={() => setPendingTool(null)}
        onConfirm={confirmToolAction}
      />
    </div>
  )
}
