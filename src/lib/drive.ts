export interface DriveItem {
  name: string
  type: 'dir' | 'file' | 'link'
  size: number
  mtime: string
  href?: string
}

async function readJson<T>(res: Response): Promise<T> {
  const data = await res.json() as T & { error?: string }
  if (!res.ok) throw new Error(data.error || '资料库请求失败')
  return data
}

export async function listDrive(rel = ''): Promise<{ path: string; items: DriveItem[] }> {
  return readJson(await fetch(`/api/drive/list?path=${encodeURIComponent(rel)}`))
}

export async function searchDrive(q: string): Promise<DriveItem[]> {
  const data = await readJson<{ items: DriveItem[] }>(await fetch(`/api/drive/search?q=${encodeURIComponent(q)}`))
  return data.items || []
}

export async function mkdirDrive(rel: string): Promise<void> {
  await readJson(await fetch('/api/drive/mkdir', {
    method: 'POST',
    headers: { 'X-Drive-Path': encodeURIComponent(rel) },
  }))
}

export async function renameDrive(from: string, to: string): Promise<void> {
  await readJson(await fetch('/api/drive/rename', {
    method: 'POST',
    headers: {
      'X-Drive-From': encodeURIComponent(from),
      'X-Drive-To': encodeURIComponent(to),
    },
  }))
}

export async function deleteDrive(rel: string): Promise<void> {
  await readJson(await fetch('/api/drive/delete', {
    method: 'POST',
    headers: { 'X-Drive-Path': encodeURIComponent(rel) },
  }))
}

export async function openDrive(rel: string): Promise<void> {
  await readJson(await fetch('/api/drive/open', {
    method: 'POST',
    headers: { 'X-Drive-Path': encodeURIComponent(rel) },
  }))
}

export async function openDriveRoot(): Promise<void> {
  await readJson(await fetch('/api/drive/open-root', { method: 'POST' }))
}

export async function collectAttach(): Promise<number> {
  const data = await readJson<{ copied: number }>(await fetch('/api/drive/collect-attach', { method: 'POST' }))
  return data.copied || 0
}

export async function clearDrive(): Promise<number> {
  const data = await readJson<{ removed: number }>(await fetch('/api/drive/clear', { method: 'POST' }))
  return data.removed || 0
}

export async function seedDemoDrive(): Promise<number> {
  const data = await readJson<{ written: number }>(await fetch('/api/drive/seed-demo', { method: 'POST' }))
  return data.written || 0
}

export async function addDriveLink(rel: string, href: string): Promise<void> {
  await readJson(await fetch('/api/drive/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: rel, url: href }),
  }))
}

export function displayName(name: string): string {
  return name.replace(/\.url$/i, '')
}

const CHUNK = 2 * 1024 * 1024

function uploadError(error: unknown): Error {
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return new Error('上传中断。一次拖得太多或文件太大时，浏览器会断开。请改用「打开资料库文件夹」，在资源管理器里直接复制；或一次少选几个文件。')
  }
  return error instanceof Error ? error : new Error('上传失败')
}

async function postChunk(rel: string, blob: Blob, offset: number, total: number): Promise<void> {
  let last: unknown
  for (let i = 0; i < 3; i++) {
    try {
      await readJson(await fetch('/api/drive/upload', {
        method: 'POST',
        headers: {
          'X-Drive-Path': encodeURIComponent(rel),
          'X-Drive-Offset': String(offset),
          'X-Drive-Total': String(total),
          'Content-Type': 'application/octet-stream',
        },
        body: blob,
      }))
      return
    } catch (error) {
      last = error
      await new Promise((resolve) => window.setTimeout(resolve, 400 * (i + 1)))
    }
  }
  throw uploadError(last)
}

export async function uploadDrive(
  rel: string,
  file: Blob,
  onProgress?: (sent: number, total: number) => void,
): Promise<void> {
  const total = file.size
  if (!total) return
  let offset = 0
  while (offset < total) {
    const end = Math.min(offset + CHUNK, total)
    await postChunk(rel, file.slice(offset, end), offset, total)
    offset = end
    onProgress?.(offset, total)
  }
}

export async function importZip(
  dest: string,
  file: Blob,
  onProgress?: (sent: number, total: number) => void,
): Promise<void> {
  const temp = joinDrive(dest, file instanceof File ? file.name : `导入-${Date.now()}.zip`)
  await uploadDrive(temp, file, onProgress)
  try {
    await readJson(await fetch('/api/drive/unzip', {
      method: 'POST',
      headers: {
        'X-Drive-Path': encodeURIComponent(temp),
        'X-Drive-Dest': encodeURIComponent(dest),
      },
    }))
  } catch (error) {
    throw uploadError(error)
  }
}

export function joinDrive(...parts: string[]): string {
  return parts.map((p) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')
}

export function formatSize(n: number): string {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
