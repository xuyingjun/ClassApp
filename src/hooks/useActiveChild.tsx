import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { SETTING_KEYS } from '../types/setting'
import type { Child } from '../types/child'

interface ActiveChildContextValue {
  childList: Child[] | undefined // undefined = 加载中
  activeChild: Child | undefined
  selectChild: (id: string) => Promise<void>
}

const ActiveChildContext = createContext<ActiveChildContextValue | null>(null)

// 当前孩子：单孩子默认直达；多孩子记住选择（settings.selectedChildId），失效时回退第一个
export function ActiveChildProvider({ children }: { children: ReactNode }) {
  const childList = useLiveQuery(() => db.children.orderBy('createdAt').toArray(), [])
  const selected = useLiveQuery(() => db.settings.get(SETTING_KEYS.selectedChildId), [])

  const activeChild = useMemo(() => {
    if (!childList || childList.length === 0) return undefined
    const selectedId = selected?.value as string | undefined
    if (selectedId) {
      const found = childList.find((c) => c.id === selectedId)
      if (found) return found
    }
    return childList[0]
  }, [childList, selected])

  const selectChild = useCallback(async (id: string) => {
    await db.settings.put({ key: SETTING_KEYS.selectedChildId, value: id })
  }, [])

  const value = useMemo(
    () => ({ childList, activeChild, selectChild }),
    [childList, activeChild, selectChild],
  )

  return <ActiveChildContext.Provider value={value}>{children}</ActiveChildContext.Provider>
}

export function useActiveChild(): ActiveChildContextValue {
  const ctx = useContext(ActiveChildContext)
  if (!ctx) throw new Error('useActiveChild 必须在 ActiveChildProvider 内使用')
  return ctx
}
