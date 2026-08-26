import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToast } from '../../hooks/useToast'
import {
  clearAllData,
  copyBackupToClipboard,
  downloadBackup,
  exportAll,
  importBackup,
  inspectBackup,
  markBackupCompleted,
} from '../../services/backupService'
import { recalculateAllCourseUsage } from '../../services/courseService'
import { db } from '../../db/database'
import { SETTING_KEYS } from '../../types/setting'

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="mt-1 text-xs leading-5 text-neutral-400">{description}</p>}
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  )
}

// 数据备份：导出 / 导入（校验失败零破坏）/ 清空（自动先备份）/ 数据修复
export default function BackupPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearBusy, setClearBusy] = useState(false)
  const [repairBusy, setRepairBusy] = useState(false)
  const [importSummary, setImportSummary] = useState<{ json: unknown; text: string } | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const lastBackupAt = useLiveQuery(() => db.settings.get(SETTING_KEYS.lastBackupAt), [])

  const handleExport = async () => {
    try {
      const data = await exportAll()
      downloadBackup(data)
      await markBackupCompleted()
      toast.showToast('已导出备份文件', 'success')
    } catch {
      toast.showToast('导出失败，请重试', 'error')
    }
  }

  const handleCopy = async () => {
    try {
      const data = await exportAll()
      const ok = await copyBackupToClipboard(data)
      if (ok) await markBackupCompleted()
      toast.showToast(ok ? '已复制 JSON 到剪贴板' : '复制失败，请改用下载文件', ok ? 'success' : 'error')
    } catch {
      toast.showToast('导出失败，请重试', 'error')
    }
  }

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选择同一文件
    if (!file) return
    try {
      const text = await file.text()
      const json: unknown = JSON.parse(text)
      const inspected = inspectBackup(json)
      if (!inspected.ok) {
        toast.showToast(inspected.error, 'error')
        return
      }
      const { summary } = inspected
      setImportSummary({
        json,
        text: `备份时间：${summary.exportedAt}\n孩子：${summary.children} 人，课程：${summary.courses} 门，记录：${summary.classRecords} 条`,
      })
    } catch {
      toast.showToast('文件格式不正确，请选择导出的 JSON 备份', 'error')
    }
  }

  const handleImportConfirm = async () => {
    if (!importSummary) return
    setImportBusy(true)
    try {
      const result = await importBackup(importSummary.json)
      if (result.ok) {
        setImportSummary(null)
        toast.showToast(result.skippedItems ? `数据恢复成功（跳过 ${result.skippedItems} 条无效数据）` : '数据恢复成功', 'success')
      } else toast.showToast(result.error ?? '导入失败', 'error')
    } catch {
      toast.showToast('导入失败，当前数据未受影响', 'error')
    } finally {
      setImportBusy(false)
    }
  }

  const handleClear = async () => {
    setClearBusy(true)
    try {
      // 清空前自动导出备份
      const data = await exportAll()
      downloadBackup(data)
      await clearAllData()
      setClearOpen(false)
      toast.showToast('已清空（备份已下载）', 'success')
      navigate('/') // 回到首次使用/空状态页面
    } catch {
      toast.showToast('清空失败，请重试', 'error')
    } finally {
      setClearBusy(false)
    }
  }

  const handleRepair = async () => {
    setRepairBusy(true)
    try {
      await recalculateAllCourseUsage()
      toast.showToast('已按上课记录重新统计课时和课程状态', 'success')
    } catch {
      toast.showToast('操作失败，请重试', 'error')
    } finally {
      setRepairBusy(false)
    }
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <PageHeader title="数据备份" />
      <div className="space-y-3 p-4">
        <Card title="备份状态">
          <p className="text-sm text-neutral-500">
            {lastBackupAt?.value ? `上次备份：${new Date(String(lastBackupAt.value)).toLocaleString()}` : '尚未备份数据'}
          </p>
        </Card>
        <Card
          title="导出数据"
          description="下载 JSON 备份文件（也可复制到剪贴板）。建议定期备份，并保存到 iCloud 或网盘。"
        >
          <Button className="w-full" onClick={() => void handleExport()}>
            下载备份文件
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => void handleCopy()}>
            复制 JSON 到剪贴板
          </Button>
        </Card>

        <Card title="恢复数据" description="选择之前导出的 JSON 备份文件。导入前会校验数据，失败不会影响当前数据。">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => void handleFile(e)}
          />
          <Button className="w-full" variant="secondary" onClick={() => fileRef.current?.click()}>
            选择备份文件
          </Button>
        </Card>

        <Card title="数据修复" description="课程「已用课时」与上课记录不一致时，按记录重新统计（已用课时 = 已完成+补课课时之和）。">
          <Button className="w-full" variant="secondary" loading={repairBusy} onClick={() => void handleRepair()}>
            重新统计课程课时
          </Button>
        </Card>

        <Card title="危险操作" description="清空全部数据（孩子、课程、记录、设置）。清空前会自动下载一份备份。">
          <Button className="w-full" variant="dangerGhost" onClick={() => setClearOpen(true)}>
            清空所有数据
          </Button>
        </Card>
      </div>

      <ConfirmDialog
        open={importSummary !== null}
        title="确认恢复数据"
        message={`${importSummary?.text ?? ''}\n\n恢复会覆盖当前所有孩子、课程和记录，建议先导出当前数据。`}
        confirmLabel="确认恢复"
        confirmVariant="primary"
        busy={importBusy}
        onCancel={() => setImportSummary(null)}
        onConfirm={() => void handleImportConfirm()}
      />

      <ConfirmDialog
        open={clearOpen}
        title="清空所有数据"
        message="此操作将删除所有孩子、课程、上课记录和统计数据，且无法撤销。清空前会自动下载一份备份。"
        confirmLabel="清空"
        busy={clearBusy}
        onCancel={() => setClearOpen(false)}
        onConfirm={() => void handleClear()}
      />
    </div>
  )
}
