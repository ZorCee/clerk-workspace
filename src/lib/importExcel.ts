import * as XLSX from 'xlsx'
import { SHEETS } from '../data/sheets'
import { uid } from './id'
import { applyBalance } from './balance'
import type { SheetKind, SheetRow } from '../types'

export const CONTRACT_YEARS = Array.from(
  { length: Math.max(7, new Date().getFullYear() - 2019) },
  (_, i) => String(2020 + i),
)

const HEADER_KEY: Record<string, string> = {
  合同项目名称: 'name',
  合同名称: 'name',
  项目名称: 'name',
  名称: 'name',
  合同标题: 'name',
  项目: 'name',
  类型: 'type',
  合同类型: 'type',
  类别: 'type',
  相对方: 'party',
  对方单位: 'party',
  往来单位: 'party',
  客户名称: 'party',
  供应商名称: 'party',
  签约方: 'party',
  对方名称: 'party',
  单位名称: 'party',
  客户: 'party',
  供应商: 'party',
  对方: 'party',
  签约时间: 'signDate',
  合同签订时间: 'signDate',
  签订时间: 'signDate',
  签订日期: 'signDate',
  签约日期: 'signDate',
  签署日期: 'signDate',
  签订日: 'signDate',
  合同日期: 'signDate',
  合同金额: 'amount',
  金额: 'amount',
  含税金额: 'amount',
  合同含税金额: 'amount',
  总金额: 'amount',
  价税合计: 'amount',
  合同状态: 'status',
  状态: 'status',
  履约状态: 'status',
  已开: 'invoiced',
  已开票: 'invoiced',
  已开金额: 'invoiced',
  未开: 'uninvoiced',
  未开票: 'uninvoiced',
  未开金额: 'uninvoiced',
  开票时间: 'invoiceDate',
  开票日期: 'invoiceDate',
  发票号码: 'invoiceNo',
  发票号: 'invoiceNo',
  发票编号: 'invoiceNo',
  已付: 'paid',
  已付款: 'paid',
  已回款: 'paid',
  已收: 'paid',
  未付: 'unpaid',
  未付款: 'unpaid',
  未回款: 'unpaid',
  未收: 'unpaid',
  合同: 'files',
  附件: 'files',
  合同附件: 'files',
  合同文件: 'files',
  扫描件: 'files',
  文件: 'files',
  纸质版位置: 'paperPlace',
  纸质位置: 'paperPlace',
  归档位置: 'paperPlace',
  档案位置: 'paperPlace',
  备注: 'notes',
  说明: 'notes',
  采购与销售: 'buySell',
  采购销售: 'buySell',
  业务类型: 'buySell',
  收付类型: 'buySell',
  合同方向: 'buySell',
  购销: 'buySell',
  购销类型: 'buySell',
  归档年度: 'archiveYear',
  年度: 'archiveYear',
  年份: 'archiveYear',
  合同年度: 'archiveYear',
  所属年度: 'archiveYear',
  合同形式: 'form',
  签署方式: 'form',
  开票金额: 'amount',
  存放位置: 'place',
  物品名称: 'name',
  资料内容: 'content',
  交接模块: 'module',
  细分事项: 'item',
  移交资料: 'materials',
  物品明细: 'goods',
  完成情况: 'progress',
  交接文档: 'docs',
  文档完成情况: 'docDone',
  报价日期: 'date',
  物料名称: 'material',
  单位: 'unit',
  数量: 'qty',
  含税单价: 'price',
  含税总价: 'total',
}

export interface ImportPreview {
  kind: SheetKind
  kindName: string
  incoming: SheetRow[]
  skipped: number
  year?: string
  buySell?: string
  source?: string
}

export interface ImportNote {
  source: string
  message: string
}

export interface ParseOptions {
  defaultKind?: 'seal' | 'econtract'
}

export interface ParseResult {
  previews: ImportPreview[]
  notes: ImportNote[]
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}.${value.getMonth() + 1}.${value.getDate()}`
  }
  return String(value).replace(/^\uFEFF/, '').trim()
}

function cellDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}.${value.getMonth() + 1}.${value.getDate()}`
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed?.y) return `${parsed.y}.${parsed.m}.${parsed.d}`
  }
  return cell(value).replace(/[年/]/g, '.').replace(/月/g, '.').replace(/日/g, '')
}

function cellMoney(value: unknown): string {
  return cell(value).replace(/[￥¥]/g, '').replace(/元$/g, '').trim()
}

function normalizeHeader(raw: string): string {
  return cell(raw)
    .replace(/\s+/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/[*＊]/g, '')
}

function headerKey(label: string, kind?: SheetKind | null): string {
  const normalized = normalizeHeader(label)
  if (!normalized || normalized === '序号' || normalized === '记录id' || normalized === '记录ID') return ''
  if (kind === 'seal' || kind === 'econtract') {
    if (normalized === '存放位置' || normalized === '归档位置') return 'paperPlace'
    if (normalized === '项目名称' || normalized === '项目') return 'name'
    if (normalized === '开票金额') return 'invoiced'
  }
  if (kind === 'quote' && (normalized === '项目名称' || normalized === '项目')) return 'project'
  if (kind === 'invoice' && (normalized === '合同项目名称' || normalized === '合同名称' || normalized === '项目名称')) {
    return 'contractName'
  }
  return HEADER_KEY[normalized] || ''
}

function mappedKeys(headers: string[]): string[] {
  return headers.map((h) => headerKey(h))
}

export function inferYear(...texts: string[]): string {
  for (const text of texts) {
    const match = text.match(/20\d{2}/)
    if (match) return match[0]
  }
  return ''
}

export function inferBuySell(...texts: string[]): string {
  const blob = texts.join(' ')
  const buy = /采购|购进|买入/.test(blob)
  const sell = /销售|售出|卖出/.test(blob)
  if (buy && !sell) return '采购'
  if (sell && !buy) return '销售'
  if (/采购合同/.test(blob) && !/销售合同/.test(blob)) return '采购'
  if (/销售合同/.test(blob) && !/采购合同/.test(blob)) return '销售'
  return ''
}

function inferKind(texts: string[], fallback?: 'seal' | 'econtract'): SheetKind {
  const blob = texts.join(' ')
  if (/单章|纸质|盖章/.test(blob) && !/电子/.test(blob)) return 'seal'
  if (/电子/.test(blob) && !/单章/.test(blob)) return 'econtract'
  return fallback || 'seal'
}

function inferFormKind(form: string, fallback: SheetKind): SheetKind {
  if (/电子/.test(form)) return 'econtract'
  if (/单章|纸质|盖章/.test(form)) return 'seal'
  return fallback
}

function looksLikeContract(headers: string[]): boolean {
  const keys = new Set(mappedKeys(headers))
  return keys.has('name') && (keys.has('party') || keys.has('amount') || keys.has('signDate'))
}

function detectKind(headers: string[], sheetName: string, fileName: string, fallback?: 'seal' | 'econtract'): SheetKind | null {
  const set = new Set(headers.map((h) => normalizeHeader(h)))
  const keys = new Set(mappedKeys(headers))
  if (keys.has('material') && (keys.has('price') || set.has('（含税）单价'))) return 'quote'
  if (looksLikeContract(headers)) return inferKind([fileName, sheetName], fallback)
  if (keys.has('invoiceNo') && (set.has('开票金额') || sheetName.includes('发票') || fileName.includes('发票'))) return 'invoice'
  if (set.has('资料内容') && (set.has('存放位置') || keys.has('place'))) return 'archive'
  if (set.has('存放位置') && set.has('物品名称')) return 'item'
  if (keys.has('item') || keys.has('module') || fileName.includes('交接') || sheetName.includes('交接')) return 'handover'
  if (headers.some((h) => /应收|应付|预付/.test(h))) return 'arap'
  if (set.has('开票金额')) return 'invoice'
  return null
}

function headerIndex(rows: unknown[][]): { headers: string[]; start: number } | null {
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const headers = rows[i].map((v) => cell(v))
    if (headers.some((h) => headerKey(h)) && (detectKind(headers, '', '') || looksLikeContract(headers) || headers.includes('存放位置') || headers.includes('细分事项') || headers.includes('开票金额'))) {
      return { headers, start: i + 1 }
    }
  }
  return null
}

function normalizeStatus(value: string): string {
  const text = value.trim()
  if (!text) return ''
  if (/履行中|执行中|进行中/.test(text)) return '履约中'
  if (text === '完成' || text === '已结束') return '已完成'
  if (text === '作废') return '已作废'
  if (text === '终止') return '已终止'
  if (text === '中止') return '已中止'
  return text
}

function normalizeBuySell(value: string): string {
  if (/采购|购进|买入/.test(value)) return '采购'
  if (/销售|售出|卖出/.test(value)) return '销售'
  return value.trim()
}

function cleanAttach(raw: string): string {
  return raw
    .split(/[,，;；\n]/)
    .map((item) => item.replace(/\s*[（(]https?:[\s\S]*?[）)]\s*/g, '').trim())
    .filter((item) => item && !/^https?:/i.test(item))
    .join('，')
}

function stampContractMeta(fields: Record<string, string>, year: string, buySell: string): Record<string, string> {
  const next = { ...fields }
  if (year && !next.archiveYear) next.archiveYear = year
  if (buySell && !next.buySell) next.buySell = buySell
  if (next.buySell) next.buySell = normalizeBuySell(next.buySell)
  if (next.status) next.status = normalizeStatus(next.status)
  if (next.files) next.files = cleanAttach(next.files)
  return next
}

function skipContractName(name: string): boolean {
  if (!name) return true
  if (name.includes('上下游') || name.includes('父记录')) return true
  if (/^(合计|小计|总计|序号)$/.test(name)) return true
  return false
}

function rowFromMap(kind: SheetKind, mapped: Record<string, string>, year = '', buySell = ''): SheetRow | null {
  if (kind === 'invoice' && mapped.name && !mapped.contractName) {
    mapped.contractName = mapped.name
  }
  const fields = applyBalance(
    kind === 'seal' || kind === 'econtract' ? stampContractMeta(mapped, year, buySell) : mapped,
  )
  if (kind === 'seal' || kind === 'econtract') {
    if (skipContractName(fields.name || '')) return null
  }
  if (kind === 'invoice' && !fields.invoiceNo && !fields.contractName && !fields.party) return null
  if (kind === 'item' && !fields.name) return null
  if (kind === 'archive' && !fields.content) return null
  if (kind === 'handover') {
    if (!fields.item) return null
    if (/^[一二三四五六]、/.test(fields.item) || fields.item.includes('板块')) return null
    if (fields.item === '交接模块' || fields.item === '交接清单') return null
  }
  if (kind === 'quote' && !fields.material && !fields.project) return null
  if (kind === 'arap' && !fields.party) return null
  return {
    id: uid('imp'),
    kind,
    fields,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function parseArap(rows: unknown[][]): SheetRow[] {
  let left = '应收票据'
  let right = '预付账款'
  const out: SheetRow[] = []
  for (const raw of rows) {
    const a = cell(raw[0])
    const i = cell(raw[8])
    if (a.includes('应收票据')) left = '应收票据'
    else if (a.includes('应收账款')) left = '应收账款'
    else if (a.includes('其他应收')) left = '其他应收款'
    if (i.includes('预付')) right = '预付账款'
    else if (i.includes('应付账款')) right = '应付账款'
    else if (i.includes('其他应付')) right = '其他应付'

    if (a && !a.includes('应收') && !a.includes('应付') && !a.includes('票据')) {
      const row = rowFromMap('arap', {
        category: left,
        party: a,
        related: cell(raw[1]),
        ticketed: cell(raw[3]),
        settled: cell(raw[4]),
        balance: cell(raw[5]),
        notes: cell(raw[6]),
      })
      if (row) out.push(row)
    }
    if (i && !i.includes('预付') && !i.includes('应付')) {
      const row = rowFromMap('arap', {
        category: right,
        party: i,
        related: cell(raw[9]),
        ticketed: cell(raw[11]),
        settled: cell(raw[12]),
        balance: cell(raw[13]),
        notes: cell(raw[14]),
      })
      if (row) out.push(row)
    }
  }
  return out
}

function parseGrid(
  rows: unknown[][],
  sheetName: string,
  fileName: string,
  options: ParseOptions = {},
): ImportPreview | ImportNote {
  const source = sheetName && sheetName !== fileName ? `${fileName} · ${sheetName}` : fileName
  const found = headerIndex(rows)
  const headers = found?.headers || rows[0]?.map((v) => cell(v)) || []
  const kind = detectKind(headers, sheetName, fileName, options.defaultKind)
  if (!kind) {
    const seen = headers.filter(Boolean).slice(0, 10).join('、') || '空表'
    return { source, message: `未识别。看到的列：${seen}。合同表至少要有合同名称，以及相对方或金额。` }
  }

  const year = inferYear(fileName, sheetName, headers.join(' '))
  const buySell = inferBuySell(fileName, sheetName)
  let incoming: SheetRow[] = []

  if (kind === 'arap') {
    incoming = parseArap(rows)
  } else if (found) {
    let progressSeen = false
    const keys = found.headers.map((label) => {
      if (normalizeHeader(label) === '完成情况') {
        const key = progressSeen ? 'docDone' : 'progress'
        progressSeen = true
        return key
      }
      return headerKey(label, kind)
    })
    for (const raw of rows.slice(found.start)) {
      const mapped: Record<string, string> = {}
      keys.forEach((key, idx) => {
        if (!key) return
        const value = raw[idx]
        if (key === 'signDate' || key === 'invoiceDate' || key === 'date') mapped[key] = cellDate(value)
        else if (['amount', 'invoiced', 'uninvoiced', 'paid', 'unpaid', 'price', 'total'].includes(key)) mapped[key] = cellMoney(value)
        else mapped[key] = cell(value)
      })
      const rowKind = (kind === 'seal' || kind === 'econtract')
        ? inferFormKind(mapped.form || '', kind)
        : kind
      delete mapped.form
      const row = rowFromMap(rowKind, mapped, year, buySell)
      if (row) incoming.push(row)
    }
  }

  if (!incoming.length) {
    return { source, message: `识别为「${SHEETS[kind].name}」，但没有可用的数据行。` }
  }

  const previewKind = incoming[0]?.kind || kind
  return {
    kind: previewKind,
    kindName: SHEETS[previewKind].name,
    incoming,
    skipped: 0,
    year: year || incoming.find((r) => r.fields.archiveYear)?.fields.archiveYear,
    buySell: buySell || incoming.find((r) => r.fields.buySell)?.fields.buySell,
    source,
  }
}

function asPreview(result: ImportPreview | ImportNote): result is ImportPreview {
  return 'incoming' in result
}

export function parseWorkbook(buffer: ArrayBuffer, fileName: string, options: ParseOptions = {}): ImportPreview[] {
  return parseWorkbookWithNotes(buffer, fileName, options).previews
}

export function parseWorkbookWithNotes(buffer: ArrayBuffer, fileName: string, options: ParseOptions = {}): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const previews: ImportPreview[] = []
  const notes: ImportNote[] = []
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    if (!sheet) continue
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as unknown[][]
    if (!rows.length) continue
    const result = parseGrid(rows, sheetName, fileName, options)
    if (asPreview(result)) previews.push(result)
    else notes.push(result)
  }
  return { previews, notes }
}

export function parseTableText(text: string, source = '粘贴自飞书', options: ParseOptions = {}): ParseResult {
  const raw = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!raw) return { previews: [], notes: [{ source, message: '粘贴内容是空的。' }] }
  const lines = raw.split('\n').filter((line) => line.trim())
  const delim = (lines[0].match(/\t/g) || []).length >= (lines[0].match(/,/g) || []).length ? '\t' : ','
  const rows = lines.map((line) => line.split(delim).map((part) => part.trim().replace(/^"|"$/g, '')))
  const result = parseGrid(rows, source, source, options)
  if (asPreview(result)) return { previews: [result], notes: [] }
  return { previews: [], notes: [result] }
}

export async function parseImportFiles(files: File[], options: ParseOptions = {}): Promise<ParseResult> {
  const previews: ImportPreview[] = []
  const notes: ImportNote[] = []
  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer()
      const parsed = parseWorkbookWithNotes(buffer, file.name, options)
      previews.push(...parsed.previews)
      notes.push(...parsed.notes)
    } catch (error) {
      notes.push({
        source: file.name,
        message: error instanceof Error ? error.message : '无法读取这个文件。请用飞书导出的 Excel 或 CSV。',
      })
    }
  }
  return { previews, notes }
}

export function isContractKind(kind: SheetKind): boolean {
  return kind === 'seal' || kind === 'econtract'
}

export function applyContractBatch(
  rows: SheetRow[],
  patch: { kind?: 'seal' | 'econtract'; year?: string; buySell?: string },
): SheetRow[] {
  return rows.map((row) => {
    const fields = { ...row.fields }
    if (patch.year) fields.archiveYear = patch.year
    if (patch.buySell) fields.buySell = patch.buySell
    return {
      ...row,
      kind: patch.kind || row.kind,
      fields,
    }
  })
}

export function dedupeRows(existing: SheetRow[], incoming: SheetRow[]): { keep: SheetRow[]; skipped: number } {
  const seen = new Set(
    existing.map((r) => `${r.kind}|${(r.fields.party || '').trim()}|${(r.fields.name || r.fields.item || r.fields.content || r.fields.material || r.fields.contractName || '').trim()}|${(r.fields.signDate || r.fields.place || '').trim()}`.toLowerCase()),
  )
  const keep: SheetRow[] = []
  let skipped = 0
  for (const row of incoming) {
    const key = `${row.kind}|${(row.fields.party || '').trim()}|${(row.fields.name || row.fields.item || row.fields.content || row.fields.material || row.fields.contractName || '').trim()}|${(row.fields.signDate || row.fields.place || '').trim()}`.toLowerCase()
    if (seen.has(key)) {
      skipped += 1
      continue
    }
    seen.add(key)
    keep.push(row)
  }
  return { keep, skipped }
}
