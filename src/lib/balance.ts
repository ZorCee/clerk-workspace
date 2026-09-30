import { parseMoney } from './money'

function moneyText(n: number): string {
  if (!Number.isFinite(n)) return ''
  return String(Math.round(n * 100) / 100)
}

export function applyBalance(fields: Record<string, string>, changed?: string): Record<string, string> {
  const next = { ...fields }
  const amount = parseMoney(next.amount || '')
  if (!next.amount) return next

  if (changed === 'uninvoiced') {
    /* keep manual */
  } else if (next.invoiced !== undefined) {
    next.uninvoiced = moneyText(Math.max(0, amount - parseMoney(next.invoiced || '')))
  }

  if (changed === 'unpaid') {
    /* keep manual */
  } else if (next.paid !== undefined) {
    next.unpaid = moneyText(Math.max(0, amount - parseMoney(next.paid || '')))
  }

  return next
}

export function moneyMismatch(fields: Record<string, string>): string[] {
  const issues: string[] = []
  const amount = parseMoney(fields.amount || '')
  if (!fields.amount) return issues
  if (fields.invoiced !== undefined || fields.uninvoiced !== undefined) {
    const sum = parseMoney(fields.invoiced || '') + parseMoney(fields.uninvoiced || '')
    if (Math.abs(sum - amount) > 0.05) issues.push('开票')
  }
  if (fields.paid !== undefined || fields.unpaid !== undefined) {
    const sum = parseMoney(fields.paid || '') + parseMoney(fields.unpaid || '')
    if (Math.abs(sum - amount) > 0.05) issues.push('收付')
  }
  return issues
}

export function yearOf(fields: Record<string, string>): string {
  if (fields.archiveYear?.trim()) return fields.archiveYear.trim()
  const raw = fields.signDate || fields.invoiceDate || fields.date || ''
  const m = raw.match(/(20\d{2})/)
  return m ? m[1] : ''
}
