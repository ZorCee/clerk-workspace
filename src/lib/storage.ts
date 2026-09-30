import { demoData } from '../data/demo'
import { seedData } from '../data/seed'
import { api, apiJson, clearToken } from './api'
import { seedDemoDrive } from './drive'
import type { AppData } from '../types'

export function emptyData(): AppData {
  return { rows: [], closedDesk: {} }
}

function asClosedDesk(value: unknown): AppData['closedDesk'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return { ...(value as AppData['closedDesk']) }
}

function asAppData(value: unknown): AppData {
  const parsed = value as AppData
  return {
    rows: Array.isArray(parsed?.rows) ? parsed.rows : [],
    closedDesk: asClosedDesk(parsed?.closedDesk),
  }
}

function migrateRows(data: AppData): AppData {
  return {
    rows: data.rows.map((row) => {
      const fields = { ...row.fields }
      if ((row.kind === 'seal' || row.kind === 'econtract') && fields.archive && !fields.paperPlace) {
        fields.paperPlace = fields.archive
      }
      return { ...row, fields }
    }),
    closedDesk: data.closedDesk ?? {},
  }
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof Error && error.message === '请先登录') {
      clearToken()
      window.location.reload()
    }
    throw error
  }
}

function isTinySample(data: AppData): boolean {
  if (data.rows.some((r) => String(r.id).startsWith('demo-'))) return false
  if (data.rows.length === 0) return true
  return data.rows.length <= 20 && data.rows.some((r) => r.id === 's1' || r.id === 'e1')
}

export async function loadData(demo = false): Promise<AppData> {
  return guarded(async () => {
    const disk = migrateRows(asAppData(await apiJson('/api/data')))
    const oldDemo = disk.rows.some((r) => r.id === 's1' && Boolean(r.fields.no) && !r.fields.buySell)
    if (oldDemo || isTinySample(disk) || (demo && disk.rows.length === 0)) {
      const seeded = demoData()
      await saveData(seeded)
      await seedDemoDrive().catch(() => undefined)
      return seeded
    }
    if (disk.rows.length > 0) {
      if (disk.rows.some((r) => String(r.id).startsWith('demo-'))) {
        await seedDemoDrive().catch(() => undefined)
      }
      return disk
    }
    const seeded = seedData()
    await saveData(seeded)
    await seedDemoDrive().catch(() => undefined)
    return seeded
  })
}

export async function saveData(data: AppData): Promise<void> {
  await guarded(async () => {
    await apiJson('/api/data', {
      method: 'PUT',
      body: JSON.stringify({ rows: data.rows ?? [], closedDesk: data.closedDesk ?? {} }),
    })
  })
}

export async function openDataFolder(): Promise<void> {
  await api('/api/open-folder', { method: 'POST' })
}

export async function openAttachFolder(): Promise<void> {
  await api('/api/open-attach-folder', { method: 'POST' })
}

export async function listAttachFiles(): Promise<string[]> {
  const data = await apiJson<{ files: string[] }>('/api/files')
  return data.files || []
}

export async function openAttachFile(name: string): Promise<void> {
  const res = await api('/api/open-file', { method: 'POST', body: JSON.stringify({ name }) })
  const body = await res.json() as { error?: string }
  if (!res.ok) throw new Error(body.error || '打不开附件')
}

export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
