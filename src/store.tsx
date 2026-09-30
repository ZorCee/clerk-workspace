import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { demoData } from './data/demo'
import { seedDemoDrive } from './lib/drive'
import { uid } from './lib/id'
import { loadRuntime } from './lib/runtime'
import { emptyData, loadData, saveData } from './lib/storage'
import type { AppData, DeskClose, Page, SheetKind, SheetRow } from './types'

interface Store {
  data: AppData
  page: Page
  ready: boolean
  saveError: string
  demo: boolean
  dataDir: string
  go: (page: Page) => void
  upsertRow: (input: Partial<SheetRow> & Pick<SheetRow, 'kind' | 'fields'>) => SheetRow
  addRows: (rows: SheetRow[]) => void
  removeRow: (id: string) => void
  closeDesk: (id: string, how: DeskClose) => void
  restoreDesk: (id: string) => void
  importData: (data: AppData) => void
  resetDemo: () => void
  clearAll: () => void
}

const Ctx = createContext<Store | null>(null)

function now(): string {
  return new Date().toISOString()
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>({ rows: [], closedDesk: {} })
  const [page, setPage] = useState<Page>({ name: 'workbench' })
  const [ready, setReady] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [demo, setDemo] = useState(false)
  const [dataDir, setDataDir] = useState('D:\\谛图文事台数据')

  useEffect(() => {
    loadRuntime()
      .then(async (rt) => {
        setDemo(rt.demo)
        setDataDir(rt.dir)
        const next = await loadData(rt.demo)
        setData(next)
        setReady(true)
      })
      .catch((error: unknown) => {
        setSaveError(error instanceof Error ? error.message : '读取失败')
        setReady(true)
      })
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => {
      void saveData(data)
        .then(() => setSaveError(''))
        .catch((error: unknown) => {
          setSaveError(error instanceof Error ? error.message : '保存失败')
        })
    }, 400)
    return () => window.clearTimeout(timer)
  }, [data, ready])

  const store = useMemo<Store>(() => ({
    data,
    page,
    ready,
    saveError,
    demo,
    dataDir,
    go: setPage,
    upsertRow: (input) => {
      const exists = input.id ? data.rows.find((r) => r.id === input.id) : undefined
      const row: SheetRow = {
        id: exists?.id ?? uid('r'),
        kind: input.kind,
        fields: input.fields,
        createdAt: exists?.createdAt ?? now(),
        updatedAt: now(),
      }
      setData((prev) => ({
        ...prev,
        rows: exists
          ? prev.rows.map((r) => (r.id === row.id ? row : r))
          : [...prev.rows, row],
      }))
      return row
    },
    addRows: (rows) => {
      if (!rows.length) return
      setData((prev) => ({ ...prev, rows: [...prev.rows, ...rows] }))
    },
    removeRow: (id) => {
      setData((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== id) }))
    },
    closeDesk: (id, how) => {
      setData((prev) => ({ ...prev, closedDesk: { ...prev.closedDesk, [id]: how } }))
    },
    restoreDesk: (id) => {
      setData((prev) => {
        const next = { ...prev.closedDesk }
        delete next[id]
        return { ...prev, closedDesk: next }
      })
    },
    importData: (next) => setData({ rows: next.rows ?? [], closedDesk: next.closedDesk ?? {} }),
    resetDemo: () => {
      setData(demoData())
      void seedDemoDrive()
    },
    clearAll: () => setData(emptyData()),
  }), [data, page, ready, saveError, demo, dataDir])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Store missing')
  return ctx
}

export function rowsOf(data: AppData, kind: SheetKind): SheetRow[] {
  return data.rows.filter((r) => r.kind === kind)
}
