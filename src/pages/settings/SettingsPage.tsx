import { Link } from 'react-router-dom'

const ITEMS = [
  { to: '/settings/children', label: '孩子管理', desc: 'Phase 3+ 实现' },
  { to: '/settings/backup', label: '数据备份', desc: 'Phase 9 实现' },
  { to: '/settings/about', label: '关于', desc: 'PWA 信息与版本' },
]

export default function SettingsPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">我的</h1>
      <div className="mt-3 divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
        {ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex min-h-14 items-center justify-between px-4 py-3 active:bg-neutral-50"
          >
            <span className="text-[15px] font-medium">{item.label}</span>
            <span className="text-xs text-neutral-400">{item.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
