import { useEffect, useState, type ReactNode } from 'react'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'

const VERSION = '0.1.0'

function formatBytes(n: number): string {
  if (n >= 1048576) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1024).toFixed(1)} KB`
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-sm text-neutral-400">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium">{children}</span>
    </div>
  )
}

export default function AboutPage() {
  const [installed, setInstalled] = useState(false)
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null)
  const [updateMessage, setUpdateMessage] = useState('')
  const [resourceBusy, setResourceBusy] = useState(false)

  const checkUpdate = async () => {
    if (!('serviceWorker' in navigator)) {
      setUpdateMessage('当前环境不支持 PWA 更新')
      return
    }
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.update()))
    setUpdateMessage('已检查更新，请重新打开应用确认最新版本')
  }

  const refreshResources = async () => {
    setResourceBusy(true)
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      const registrations = await navigator.serviceWorker?.getRegistrations()
      await Promise.all((registrations ?? []).map((registration) => registration.unregister()))
      setUpdateMessage('应用资源已刷新，正在重新加载')
      window.location.reload()
    } finally {
      setResourceBusy(false)
    }
  }

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setInstalled(standalone)
    void navigator.storage?.estimate?.().then((e) => {
      setStorage({ usage: e.usage ?? 0, quota: e.quota ?? 0 })
    })
  }, [])

  return (
    <div className="mx-auto min-h-dvh max-w-lg">
      <PageHeader title="关于" />
      <div className="space-y-3 p-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
          <img src="./icons/icon-192.png" alt="童课图标" className="mx-auto h-16 w-16 rounded-2xl" />
          <h2 className="mt-3 text-lg font-bold">童课</h2>
          <p className="mt-1 text-sm text-neutral-400">儿童培训课程管理 · 数据仅存于本设备</p>
        </div>

        <div className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
          <Row label="安装状态">
            {installed ? <span className="text-success">✓ 已安装到主屏幕</span> : <span>未安装（浏览器中使用）</span>}
          </Row>
          <Row label="数据占用">
            {storage ? `${formatBytes(storage.usage)} / ${formatBytes(storage.quota)}` : '计算中...'}
          </Row>
          <Row label="应用版本">v{VERSION}</Row>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => void checkUpdate()}>
              检测更新
            </Button>
            <Button variant="secondary" className="flex-1" loading={resourceBusy} onClick={() => void refreshResources()}>
              刷新应用资源
            </Button>
          </div>
          {updateMessage && <p className="mt-3 text-center text-xs text-neutral-400">{updateMessage}</p>}
          <p className="mt-3 text-xs leading-5 text-neutral-400">刷新应用资源不会删除孩子、课程和上课记录，但需要联网重新加载应用。</p>
        </div>

        {!installed && (
          <div className="rounded-2xl bg-primary-soft p-4 text-sm leading-6 text-primary-dark">
            <p className="font-semibold">📲 添加到主屏幕（推荐）</p>
            <p className="mt-1">
              iPhone / iPad：Safari 打开本页 → 点「分享」按钮 →「添加到主屏幕」。
              <br />
              电脑：Chrome / Edge 地址栏右侧的安装图标。
            </p>
            <p className="mt-1 text-xs opacity-80">
              安装后像 App 一样全屏使用，且 Safari 不会清理本应用的离线数据。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
