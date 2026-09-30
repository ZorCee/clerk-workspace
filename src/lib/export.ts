import type { AppData, FieldDef, SheetRow } from '../types'
import { downloadText } from './storage'

export function exportBackup(data: AppData): void {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadText(
    `谛图文事台备份-${stamp}.json`,
    JSON.stringify(data, null, 2),
    'application/json;charset=utf-8',
  )
}

export function exportSheetCsv(name: string, fields: FieldDef[], rows: SheetRow[]): void {
  const header = fields.map((f) => f.label)
  const body = rows.map((r) => fields.map((f) => r.fields[f.key] || ''))
  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  downloadText(`${name}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8')
}

export function exportWord(title: string, htmlBody: string): void {
  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: SimSun, "Songti SC", serif; font-size: 16pt; line-height: 2; }
  h1 { text-align: center; font-size: 22pt; letter-spacing: 0.4em; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #333; padding: 6px 8px; }
  .to { text-indent: 0; }
</style>
</head>
<body>${htmlBody}</body>
</html>`
  downloadText(`${title || '文稿'}.doc`, html, 'application/msword')
}

export function htmlToPlain(html: string): string {
  const box = document.createElement('div')
  box.innerHTML = html
  return (box.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
