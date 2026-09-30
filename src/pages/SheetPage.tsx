import { useEffect, useMemo, useRef, useState } from 'react'
import { SHEETS } from '../data/sheets'
import { applyBalance, moneyMismatch, yearOf } from '../lib/balance'
import { exportSheetCsv } from '../lib/export'
import { applyContractBatch, CONTRACT_YEARS, dedupeRows, isContractKind, parseWorkbook, type ImportPreview } from '../lib/importExcel'
import { formatMoney, parseMoney } from '../lib/money'
import { listAttachFiles, openAttachFile, openAttachFolder } from '../lib/storage'
import { rowsOf, useStore } from '../store'
import type { FieldDef, SheetKind, SheetRow } from '../types'

const CONTRACT_TABS: { kind: SheetKind; label: string }[] = [
  { kind: 'seal', label: '单章合同' },
  { kind: 'econtract', label: '电子合同' },
]

function blankFields(fields: FieldDef[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.key, '']))
}

function FieldInput({
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
  if (field.type === 'textarea') {
    return <textarea rows={3} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
  }
  if (field.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">空着 / 待定</option>
        {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    )
  }
  return (
    <input
      type={field.type === 'date' ? 'date' : 'text'}
      value={value}
      readOnly={readOnly}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function fileNames(raw: string): string[] {
  return raw.split(/[,，;；]/).map((s) => s.trim()).filter(Boolean)
}

function AttachLinks({
  raw,
  files,
  onRemove,
}: {
  raw: string
  files: string[]
  onRemove?: (name: string) => void
}) {
  const names = fileNames(raw)
  if (!names.length) {
    return (
      <span className="attach-item">
        <span>—</span>
        {onRemove && <button type="button" className="text late" onClick={() => onRemove('')}>删除</button>}
      </span>
    )
  }
  return (
    <span className="attach-list">
      {names.map((name) => {
        const hit = files.includes(name)
        return (
          <span key={name} className="attach-item">
            <button
              type="button"
              className={hit ? 'text' : 'text late'}
              onClick={() => {
                if (!hit) {
                  window.alert(`附件夹里没有「${name}」。请放到 D:\\谛图文事台数据\\附件`)
                  return
                }
                void openAttachFile(name).catch((err: unknown) => {
                  window.alert(err instanceof Error ? err.message : '打不开附件')
                })
              }}
            >
              {hit ? name : `${name}（缺附件）`}
            </button>
            {onRemove && (
              <button type="button" className="text late" onClick={() => onRemove(name)}>删除</button>
            )}
          </span>
        )
      })}
    </span>
  )
}

function hasValue(value: string | undefined): boolean {
  const text = (value || '').trim()
  return Boolean(text)
}

export function SheetPage({ kind }: { kind: SheetKind }) {
  const schema = SHEETS[kind]
  const { data, page, upsertRow, addRows, removeRow, go } = useStore()
  const [q, setQ] = useState('')
  const [year, setYear] = useState('all')
  const [buySell, setBuySell] = useState('all')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<SheetRow | null>(null)
  const [fields, setFields] = useState<Record<string, string>>(blankFields(schema.fields))
  const [preview, setPreview] = useState<ImportPreview[] | null>(null)
  const [attach, setAttach] = useState<string[]>([])
  const importRef = useRef<HTMLInputElement>(null)
  const openedId = useRef('')
  const isContract = kind === 'seal' || kind === 'econtract'

  useEffect(() => {
    setEditing(null)
    setFields(blankFields(SHEETS[kind].fields))
    setPreview(null)
    openedId.current = ''
    if (!(kind === 'seal' || kind === 'econtract')) {
      setQ('')
      setYear('all')
      setBuySell('all')
      setStatus('all')
    }
  }, [kind])

  useEffect(() => {
    if (page.name !== 'sheet') return
    setYear(page.year || 'all')
    setBuySell(page.buySell || 'all')
  }, [page.name, page.sheet, page.year, page.buySell])

  useEffect(() => {
    void listAttachFiles().then(setAttach).catch(() => setAttach([]))
  }, [])

  useEffect(() => {
    const id = page.name === 'sheet' ? page.id : undefined
    if (!id || openedId.current === id) return
    const row = data.rows.find((r) => r.id === id)
    if (!row) return
    openedId.current = id
    if (row.kind === kind) {
      setEditing(row)
      setFields(applyBalance({ ...blankFields(schema.fields), ...row.fields }))
    } else if (kind === 'invoice' && (row.kind === 'seal' || row.kind === 'econtract')) {
      setEditing(null)
      setFields(applyBalance({
        ...blankFields(schema.fields),
        contractName: row.fields.name || '',
        party: row.fields.party || '',
        amount: row.fields.uninvoiced || row.fields.amount || '',
        buySell: row.fields.buySell || '',
        invoiceDate: row.fields.invoiceDate || '',
        invoiceNo: row.fields.invoiceNo && row.fields.invoiceNo !== '待开' ? row.fields.invoiceNo : '',
      }))
    }
  }, [kind, page, data.rows, schema.fields])

  const source = rowsOf(data, kind)
  const years = useMemo(() => {
    const set = new Set(source.map((r) => yearOf(r.fields)).filter(Boolean))
    if (isContract) CONTRACT_YEARS.forEach((y) => set.add(y))
    return [...set].sort((a, b) => b.localeCompare(a))
  }, [source, isContract])

  const rows = useMemo(() => {
    return source.filter((r) => {
      if (year !== 'all' && yearOf(r.fields) !== year) return false
      if (buySell === 'none' && (r.fields.buySell === '采购' || r.fields.buySell === '销售')) return false
      if (buySell !== 'all' && buySell !== 'none' && (r.fields.buySell || '') !== buySell) return false
      if (status !== 'all' && (r.fields.status || '') !== status) return false
      if (q) {
        const hay = Object.values(r.fields).join(' ').toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [source, q, year, buySell, status])

  const totals = (schema.moneyKeys || []).map((key) => ({
    key,
    label: schema.fields.find((f) => f.key === key)?.label || key,
    value: rows.reduce((sum, r) => sum + parseMoney(r.fields[key] || ''), 0),
  }))

  const contracts = useMemo(
    () => [...rowsOf(data, 'seal'), ...rowsOf(data, 'econtract')],
    [data],
  )

  function startCreate() {
    setEditing(null)
    setFields(blankFields(schema.fields))
  }

  function startEdit(row: SheetRow) {
    setEditing(row)
    setFields(applyBalance({ ...blankFields(schema.fields), ...row.fields }))
  }

  function setField(key: string, value: string) {
    setFields((prev) => {
      const next = applyBalance({ ...prev, [key]: value }, key)
      if (editing) upsertRow({ id: editing.id, kind, fields: next })
      return next
    })
  }

  function deleteRow(row: SheetRow) {
    if (!confirm('删除这一行？')) return
    if (editing?.id === row.id) startCreate()
    removeRow(row.id)
  }

  function removeAttach(row: SheetRow, name: string) {
    if (!name) {
      deleteRow(row)
      return
    }
    if (!confirm(`从这一行去掉「${name}」？`)) return
    const next = fileNames(row.fields.files || '').filter((item) => item !== name).join('，')
    upsertRow({ id: row.id, kind: row.kind, fields: { ...row.fields, files: next } })
    if (editing?.id === row.id) setFields((prev) => ({ ...prev, files: next }))
  }

  function pickContract(id: string) {
    const row = contracts.find((r) => r.id === id)
    if (!row) return
    setFields((prev) => ({
      ...prev,
      contractName: row.fields.name || '',
      party: row.fields.party || '',
      amount: row.fields.uninvoiced || row.fields.amount || '',
      buySell: row.fields.buySell || '',
      invoiceDate: row.fields.invoiceDate || prev.invoiceDate || '',
      invoiceNo: row.fields.invoiceNo && row.fields.invoiceNo !== '待开' ? row.fields.invoiceNo : prev.invoiceNo || '',
      notes: row.fields.no ? `关联 ${row.fields.name}` : prev.notes,
    }))
  }

  function save() {
    const missing = schema.fields.filter((f) => f.required && !hasValue(fields[f.key]))
    if (missing.length) {
      window.alert(`请先填写：${missing.map((f) => f.label).join('、')}。其余项可空着或写待定。`)
      return
    }
    upsertRow({ id: editing?.id, kind, fields: applyBalance(fields) })
    setEditing(null)
    setFields(blankFields(schema.fields))
  }

  async function onExcel(file: File) {
    try {
      const buffer = await file.arrayBuffer()
      const targetKind = kind === 'econtract' ? 'econtract' : 'seal'
      const parsed = parseWorkbook(buffer, file.name, isContract ? { defaultKind: targetKind } : undefined).map((item) => {
        const incoming = isContract && isContractKind(item.kind)
          ? applyContractBatch(item.incoming, { kind: targetKind })
          : item.incoming
        const { keep, skipped } = dedupeRows(data.rows, incoming)
        return {
          ...item,
          kind: isContract && isContractKind(item.kind) ? targetKind : item.kind,
          kindName: isContract && isContractKind(item.kind) ? SHEETS[targetKind].name : SHEETS[item.kind].name,
          incoming: keep,
          skipped: item.skipped + skipped,
        }
      })
      if (!parsed.length) {
        window.alert(isContract
          ? '没有识别出合同表。请用飞书导出的 Excel，或到「飞书合同导入」一次放入多年文件。'
          : '没有识别出可导入的表。请用交接文档里的原表。')
        return
      }
      setPreview(parsed)
    } catch {
      window.alert('这个文件读不出来。请用飞书或 Excel 导出的 .xlsx / .csv。')
    }
  }

  function confirmImport() {
    if (!preview) return
    addRows(preview.flatMap((item) => item.incoming))
    const added = preview.reduce((n, item) => n + item.incoming.length, 0)
    const skipped = preview.reduce((n, item) => n + item.skipped, 0)
    setPreview(null)
    window.alert(`已写入 ${added} 行${skipped ? `，跳过重复 ${skipped} 行` : ''}。`)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{schema.fileHint}</p>
          <h1>{schema.name}</h1>
        </div>
        <div className="row-actions">
          {(kind === 'quote' || kind === 'seal') && (
            <button onClick={() => go({ name: 'doc', doc: kind === 'quote' ? 'quote' : 'contract' })}>
              {kind === 'quote' ? '开具报价单' : '套打普通合同'}
            </button>
          )}
          {isContract && (
            <button onClick={() => go({ name: 'import', sheet: kind === 'econtract' ? 'econtract' : 'seal' })}>
              导入{kind === 'econtract' ? '电子' : '单章'}合同
            </button>
          )}
          <button onClick={() => importRef.current?.click()}>导入 Excel</button>
          <button onClick={() => { void openAttachFolder() }}>打开附件夹</button>
          <button onClick={() => exportSheetCsv(schema.name, schema.fields, rows)}>导出 CSV</button>
        </div>
      </header>
      <input
        ref={importRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void onExcel(file)
          e.target.value = ''
        }}
      />

      {(kind === 'seal' || kind === 'econtract') && (
        <div className="tabs">
          {CONTRACT_TABS.map((tab) => (
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
      )}

      <p className="hint">
        {schema.description}。没星号的项可以空着或写待定，不必填完才能保存。
        {isContract ? ' 未开 / 未付按金额自动算。可按年度、采购/销售筛选。多年飞书表请用「飞书合同导入」。' : ' '}
        附件请放在 D:\谛图文事台数据\附件，文件名与「合同」列一致即可点开。
      </p>

      {preview && (
        <section className="card">
          <div className="card-head">
            <h2>导入预览</h2>
            <button className="text" onClick={() => setPreview(null)}>取消</button>
          </div>
          <ul className="list">
            {preview.map((item) => (
              <li key={item.kind}>
                <div>
                  <strong>{item.kindName}</strong>
                  <p>将新增 {item.incoming.length} 行{item.skipped ? `，重复跳过 ${item.skipped} 行` : ''}</p>
                </div>
              </li>
            ))}
          </ul>
          <button className="primary" onClick={confirmImport}>确认写入台账</button>
        </section>
      )}

      {totals.length > 0 && (
        <section className="stats compact">
          <article><b>{rows.length}</b><span>条数</span></article>
          {totals.map((t) => (
            <article key={t.key}><b>{formatMoney(t.value)}</b><span>{t.label}合计</span></article>
          ))}
        </section>
      )}

      <section className="card form-grid">
        {kind === 'invoice' && (
          <label className="span-2">从合同带出
            <select defaultValue="" onChange={(e) => pickContract(e.target.value)}>
              <option value="">选择合同后自动填相对方、未开金额、采购与销售</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {(c.fields.buySell || '合同')} · {c.fields.name || '未命名'} · {c.fields.party || ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {schema.fields.map((field) => {
          const auto = isContract && (field.key === 'uninvoiced' || field.key === 'unpaid')
          return (
            <label key={field.key} className={field.type === 'textarea' ? 'span-2' : undefined}>
              {field.label}{field.required ? ' *' : ''}{auto ? '（自动）' : ''}
              <FieldInput
                field={field}
                value={fields[field.key] || ''}
                readOnly={auto}
                onChange={(value) => setField(field.key, value)}
              />
            </label>
          )
        })}
        <div className="row-actions span-2">
          <button className="primary" onClick={save}>{editing ? '保存修改' : '写入台账'}</button>
        </div>
      </section>

      <div className="toolbar">
        <input placeholder="搜索本表" value={q} onChange={(e) => setQ(e.target.value)} />
        {(isContract || kind === 'invoice') && (
          <>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">全部年度</option>
              {years.map((y) => <option key={y} value={y}>{y} 年</option>)}
            </select>
            <select value={buySell} onChange={(e) => setBuySell(e.target.value)}>
              <option value="all">采购与销售</option>
              <option value="采购">采购</option>
              <option value="销售">销售</option>
              <option value="none">未分购销</option>
            </select>
          </>
        )}
        {isContract && (
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">全部状态</option>
            {schema.fields.find((f) => f.key === 'status')?.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
        <span className="hint">{rows.length} 条</span>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>操作</th>
              {schema.fields.filter((f) => f.type !== 'textarea').map((f) => <th key={f.key}>{f.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const bad = moneyMismatch(row.fields)
              const live = editing?.id === row.id
              return (
                <tr key={row.id} id={`row-${row.id}`} className={bad.length ? 'row-bad' : undefined}>
                  <td>
                    <div className="row-actions">
                      {bad.length > 0 && <em className="late">{bad.join('、')}对不上</em>}
                      {!live && <button className="text" onClick={() => startEdit(row)}>修改</button>}
                      <button className="text" onClick={() => deleteRow(row)}>删除</button>
                    </div>
                  </td>
                  {schema.fields.filter((f) => f.type !== 'textarea').map((f) => (
                    <td key={f.key}>
                      {live ? (
                        <FieldInput
                          field={f}
                          value={fields[f.key] || ''}
                          readOnly={isContract && (f.key === 'uninvoiced' || f.key === 'unpaid')}
                          onChange={(value) => setField(f.key, value)}
                        />
                      ) : f.key === 'files'
                        ? <AttachLinks raw={row.fields.files || ''} files={attach} onRemove={(name) => removeAttach(row, name)} />
                        : (row.fields[f.key] || '—')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">这张表还是空的，或被筛选掉了。</p>}
      </div>
    </div>
  )
}
