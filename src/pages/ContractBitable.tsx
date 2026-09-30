import { useEffect, useMemo, useState } from 'react'
import { SHEETS } from '../data/sheets'
import { applyBalance, moneyMismatch, yearOf } from '../lib/balance'
import { exportSheetCsv } from '../lib/export'
import { CONTRACT_YEARS } from '../lib/importExcel'
import { formatMoney, parseMoney } from '../lib/money'
import { listAttachFiles, openAttachFile, openAttachFolder } from '../lib/storage'
import { rowsOf, useStore } from '../store'
import type { FieldDef, SheetKind, SheetRow } from '../types'

const TABS: { kind: SheetKind; label: string }[] = [
  { kind: 'seal', label: '单章合同' },
  { kind: 'econtract', label: '电子合同' },
]

const GRID_KEYS = [
  'name', 'party', 'type', 'signDate', 'amount', 'status',
  'invoiced', 'uninvoiced', 'paid', 'unpaid', 'invoiceNo',
  'files', 'paperPlace', 'archiveYear', 'buySell', 'notes',
]

const SIDES = ['采购', '销售', 'none'] as const

function buySellOf(fields: Record<string, string>): '采购' | '销售' | 'none' {
  if (fields.buySell === '采购' || fields.buySell === '销售') return fields.buySell
  return 'none'
}

function sideLabel(side: string): string {
  if (side === '采购') return '采购'
  if (side === '销售') return '销售'
  return '未分购销'
}

function blankFields(fields: FieldDef[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.key, '']))
}

function fileNames(raw: string): string[] {
  return raw.split(/[,，;；]/).map((s) => s.trim()).filter(Boolean)
}

function CellInput({
  field,
  value,
  readOnly,
  onChange,
}: {
  field: FieldDef
  value: string
  readOnly?: boolean
  onChange: (value: string) => void
}) {
  if (field.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">空着</option>
        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }
  return (
    <input
      value={value}
      readOnly={readOnly}
      placeholder={field.placeholder || field.label}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function ContractBitable({ kind }: { kind: SheetKind }) {
  const schema = SHEETS[kind]
  const { data, page, upsertRow, removeRow, go } = useStore()
  const [q, setQ] = useState('')
  const [attach, setAttach] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const year = page.year || 'all'
  const buySell = page.buySell || 'all'

  useEffect(() => {
    void listAttachFiles().then(setAttach).catch(() => setAttach([]))
  }, [])

  const source = rowsOf(data, kind)
  const columns = schema.fields.filter((f) => GRID_KEYS.includes(f.key))

  const filtered = useMemo(() => {
    return source.filter((r) => {
      if (q) {
        const hay = Object.values(r.fields).join(' ').toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [source, q])

  const groups = useMemo(() => {
    const years = year === 'all' ? CONTRACT_YEARS : [year]
    const sides = buySell === 'all' ? [...SIDES] : [buySell === 'none' ? 'none' : buySell]
    const out: { key: string; year: string; side: string; label: string; rows: SheetRow[] }[] = []
    for (const y of years) {
      for (const side of sides) {
        const rows = filtered.filter((r) => (yearOf(r.fields) || '') === y && buySellOf(r.fields) === side)
        const key = `${y}-${side}`
        if (year === 'all' && buySell === 'all' && rows.length === 0) continue
        out.push({
          key,
          year: y,
          side,
          label: `${y}年 · ${sideLabel(side)}`,
          rows,
        })
      }
    }
    if (year === 'all' && buySell === 'all') {
      const unknown = filtered.filter((r) => !yearOf(r.fields))
      if (unknown.length) {
        out.push({ key: 'unknown', year: '', side: 'none', label: '未标年度', rows: unknown })
      }
    }
    return out
  }, [filtered, year, buySell])

  const viewRows = groups.flatMap((g) => g.rows)
  const amountSum = viewRows.reduce((n, r) => n + parseMoney(r.fields.amount || ''), 0)
  const uninvoicedSum = viewRows.reduce((n, r) => n + parseMoney(r.fields.uninvoiced || ''), 0)
  const unpaidSum = viewRows.reduce((n, r) => n + parseMoney(r.fields.unpaid || ''), 0)

  function setSlice(nextYear?: string, nextBuySell?: string) {
    go({
      name: 'sheet',
      sheet: kind,
      year: nextYear,
      buySell: nextBuySell,
    })
  }

  function setField(row: SheetRow, key: string, value: string) {
    const next = applyBalance({ ...row.fields, [key]: value }, key)
    upsertRow({ id: row.id, kind, fields: next })
  }

  function addInGroup(yearValue: string, side: string) {
    upsertRow({
      kind,
      fields: applyBalance({
        ...blankFields(schema.fields),
        name: '待定',
        party: '待定',
        status: '履约中',
        archiveYear: yearValue,
        buySell: side === 'none' ? '' : side,
      }),
    })
    if (yearValue) setSlice(yearValue, side === 'none' ? 'none' : side)
  }

  function remove(row: SheetRow) {
    if (!confirm(`删除「${row.fields.name || '未命名'}」？`)) return
    removeRow(row.id)
  }

  function openFile(name: string) {
    if (!attach.includes(name)) {
      window.alert(`附件夹里没有「${name}」。请放到 D:\\谛图文事台数据\\附件`)
      return
    }
    void openAttachFile(name).catch((err: unknown) => {
      window.alert(err instanceof Error ? err.message : '打不开附件')
    })
  }

  return (
    <div className="page bitable-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">多维表格 · 按年 / 采购 / 销售</p>
          <h1>{schema.name}</h1>
        </div>
        <div className="row-actions">
          <button onClick={() => go({ name: 'import', sheet: kind === 'econtract' ? 'econtract' : 'seal' })}>
            导入{kind === 'econtract' ? '电子' : '单章'}
          </button>
          <button onClick={() => { void openAttachFolder() }}>打开附件夹</button>
          <button onClick={() => exportSheetCsv(schema.name, schema.fields, viewRows)}>导出当前视图</button>
        </div>
      </header>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            className={kind === tab.kind ? 'active' : ''}
            onClick={() => go({
              name: 'sheet',
              sheet: tab.kind,
              year: year === 'all' ? undefined : year,
              buySell: buySell === 'all' ? undefined : buySell,
            })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="stats compact bitable-stats">
        <article><b>{viewRows.length}</b><span>当前视图条数</span></article>
        <article><b>{formatMoney(amountSum)}</b><span>合同金额</span></article>
        <article><b>{formatMoney(uninvoicedSum)}</b><span>未开</span></article>
        <article><b>{formatMoney(unpaidSum)}</b><span>未付</span></article>
      </section>

      <div className="bitable">
        <aside className="bitable-nav">
          <p className="bitable-nav-title">数据表</p>
          <button
            type="button"
            className={year === 'all' && buySell === 'all' ? 'active' : ''}
            onClick={() => setSlice(undefined, undefined)}
          >
            <span>全部{kind === 'econtract' ? '电子' : '单章'}合同</span>
            <em>{source.length}</em>
          </button>
          {CONTRACT_YEARS.map((y) => {
            const ofYear = source.filter((r) => yearOf(r.fields) === y)
            const buy = ofYear.filter((r) => buySellOf(r.fields) === '采购').length
            const sell = ofYear.filter((r) => buySellOf(r.fields) === '销售').length
            const other = ofYear.length - buy - sell
            return (
              <div key={y} className="bitable-year">
                <button
                  type="button"
                  className={year === y && buySell === 'all' ? 'active' : ''}
                  onClick={() => setSlice(y, undefined)}
                >
                  <span>{y} 年</span>
                  <em>{ofYear.length}</em>
                </button>
                <button
                  type="button"
                  className={`child ${year === y && buySell === '采购' ? 'active' : ''}`}
                  onClick={() => setSlice(y, '采购')}
                >
                  <span>采购</span>
                  <em>{buy}</em>
                </button>
                <button
                  type="button"
                  className={`child ${year === y && buySell === '销售' ? 'active' : ''}`}
                  onClick={() => setSlice(y, '销售')}
                >
                  <span>销售</span>
                  <em>{sell}</em>
                </button>
                {other > 0 && (
                  <button
                    type="button"
                    className={`child ${year === y && buySell === 'none' ? 'active' : ''}`}
                    onClick={() => setSlice(y, 'none')}
                  >
                    <span>未分购销</span>
                    <em>{other}</em>
                  </button>
                )}
              </div>
            )
          })}
        </aside>

        <div className="bitable-board">
          <div className="toolbar">
            <input placeholder="搜索合同名称、相对方、金额…" value={q} onChange={(e) => setQ(e.target.value)} />
            <span className="hint">格子里直接改，会立刻写入 D 盘台账。左侧像飞书一样按年、按采购/销售打开。</span>
          </div>

          {groups.length === 0 && (
            <section className="card">
              <p className="empty">这一张表还是空的。可点「导入{kind === 'econtract' ? '电子' : '单章'}」，或在下方添加记录。</p>
              <button className="primary" onClick={() => addInGroup(year === 'all' ? String(new Date().getFullYear()) : year, buySell === 'all' || buySell === 'none' ? '采购' : buySell)}>
                添加记录
              </button>
            </section>
          )}

          {groups.map((group) => {
            const closed = collapsed[group.key]
            const gAmount = group.rows.reduce((n, r) => n + parseMoney(r.fields.amount || ''), 0)
            const gOpen = group.rows.reduce((n, r) => n + parseMoney(r.fields.uninvoiced || ''), 0)
            return (
              <section key={group.key} className="bitable-group">
                <header className="bitable-group-head">
                  <button type="button" className="text" onClick={() => setCollapsed((prev) => ({ ...prev, [group.key]: !closed }))}>
                    {closed ? '▸' : '▾'} {group.label}
                  </button>
                  <span>
                    {group.rows.length} 条 · 金额 {formatMoney(gAmount)}
                    {gOpen > 0 ? ` · 未开 ${formatMoney(gOpen)}` : ''}
                  </span>
                  <button type="button" className="text" onClick={() => addInGroup(group.year, group.side)}>添加记录</button>
                </header>
                {!closed && (
                  <div className="bitable-scroll">
                    <table className="bitable-table">
                      <thead>
                        <tr>
                          <th className="col-op">操作</th>
                          {columns.map((f) => <th key={f.key} className={`col-${f.key}`}>{f.label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => {
                          const bad = moneyMismatch(row.fields)
                          return (
                            <tr key={row.id} className={bad.length ? 'row-bad' : undefined}>
                              <td className="col-op">
                                {bad.length > 0 && <em className="late">{bad.join('、')}</em>}
                                <button type="button" className="text" onClick={() => remove(row)}>删除</button>
                              </td>
                              {columns.map((field) => {
                                const auto = field.key === 'uninvoiced' || field.key === 'unpaid'
                                const value = row.fields[field.key] || ''
                                if (field.key === 'files') {
                                  const names = fileNames(value)
                                  return (
                                    <td key={field.key} className="col-files">
                                      <input
                                        value={value}
                                        placeholder="附件文件名"
                                        onChange={(e) => setField(row, 'files', e.target.value)}
                                      />
                                      {names.map((name) => (
                                        <button
                                          key={name}
                                          type="button"
                                          className={attach.includes(name) ? 'text' : 'text late'}
                                          onClick={() => openFile(name)}
                                        >
                                          {name}
                                        </button>
                                      ))}
                                    </td>
                                  )
                                }
                                return (
                                  <td key={field.key} className={`col-${field.key}`}>
                                    <CellInput
                                      field={field}
                                      value={value}
                                      readOnly={auto}
                                      onChange={(next) => setField(row, field.key, next)}
                                    />
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {group.rows.length === 0 && (
                      <p className="empty">没有记录。点右上角「添加记录」，或导入这一年的飞书表。</p>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}
