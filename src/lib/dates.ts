export function todayISO(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${y}年${Number(m)}月${Number(d)}日`
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function weekdayLabel(iso = todayISO()): string {
  const days = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(`${iso}T00:00:00`)
  return `星期${days[d.getDay()]}`
}

export function diffDays(iso: string, from = todayISO()): number | null {
  if (!iso) return null
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${iso}T00:00:00`).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86400000)
}

export function dueLabel(iso: string): string {
  const n = diffDays(iso)
  if (n === null) return '无时限'
  if (n < 0) return `已逾期 ${-n} 天`
  if (n === 0) return '今天到期'
  if (n === 1) return '明天到期'
  return `${n} 天后到期`
}
