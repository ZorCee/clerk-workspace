import { useEffect, useMemo, useRef, useState } from 'react'
import { SHEETS } from '../data/sheets'
import { yearOf } from '../lib/balance'
import { formatMoney, parseMoney } from '../lib/money'
import {
  applyContractBatch,
  CONTRACT_YEARS,
  dedupeRows,
  isContractKind,
  parseImportFiles,
  parseTableText,
  type ImportNote,
  type ImportPreview,
} from '../lib/importExcel'
import { rowsOf, useStore } from '../store'
import type { SheetRow } from '../types'

type ContractKind = 'seal' | 'econtract'

interface Batch {
  id: string
  source: string
  year: string
  buySell: string
  kind: ContractKind
  incoming: SheetRow[]
  skipped: number
}

const TABS: { kind: ContractKind; label: string; hint: string }[] = [
  { kind: 'seal', label: '单章合同', hint: '纸质单章，按年分采购 / 销售' },
  { kind: 'econtract', label: '电子合同', hint: '电子合同档案，按年分采购 / 销售' },
]

function toBatches(previews: ImportPreview[], existing: SheetRow[], kind: ContractKind): Batch[] {
  let seen = existing
  const batches: Batch[] = []
  for (const item of previews) {
    if (!isContractKind(item.kind)) continue
    const stamped = applyContractBatch(item.incoming, { kind })
    const { keep, skipped } = dedupeRows(seen, stamped)
    seen = [...seen, ...keep]
    batches.push({
      id: `${item.source || item.kindName}-${kind}-${batches.length}`,
      source: item.source || item.kindName,
      year: item.year || keep.find((r) => yearOf(r.fields))?.fields.archiveYear || yearOf(keep[0]?.fields || {}) || '',
      buySell: item.buySell || keep.find((r) => r.fields.buySell)?.fields.buySell || '',
      kind,
      incoming: keep,
      skipped: item.skipped + skipped,
    })
  }
  return batches
}

function sample(row: SheetRow): string {
  const f = row.fields
  return [f.name || '未命名', f.party || '未写相对方', f.amount ? formatMoney(parseMoney(f.amount)) : '金额待定', f.signDate || '无签订日']
    .join(' · ')
}

export function ContractImport() {
  const { data, page, addRows, go } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [paste, setPaste] = useState('')
  const [defaultKind, setDefaultKind] = useState<ContractKind>(page.sheet === 'econtract' ? 'econtract' : 'seal')
  const [batches, setBatches] = useState<Batch[]>([])
  const [notes, setNotes] = useState<ImportNote[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (page.sheet === 'seal' || page.sheet === 'econtract') setDefaultKind(page.sheet)
  }, [page.sheet])

  const seals = rowsOf(data, 'seal')
  const electrons = rowsOf(data, 'econtract')
  const currentRows = defaultKind === 'seal' ? seals : electrons
  const schema = SHEETS[defaultKind]

  const totals = useMemo(() => {
    const incoming = batches.reduce((n, b) => n + b.incoming.length, 0)
    const skipped = batches.reduce((n, b) => n + b.skipped, 0)
    return { incoming, skipped }
  }, [batches])

  function switchKind(kind: ContractKind) {
    setDefaultKind(kind)
    go({ name: 'import', sheet: kind })
    setBatches((prev) => prev.map((item) => ({
      ...item,
      kind,
      incoming: applyContractBatch(item.incoming, { kind }),
    })))
    setMessage('')
  }

  function mergeResult(previews: ImportPreview[], extraNotes: ImportNote[]) {
    const contractPreviews = previews.filter((item) => isContractKind(item.kind))
    const other = previews.filter((item) => !isContractKind(item.kind))
    const nextNotes = [
      ...extraNotes,
      ...other.map((item) => ({
        source: item.source || item.kindName,
        message: `识别到「${item.kindName}」，本页只导入合同。请到对应台账用「导入 Excel」。`,
      })),
    ]
    const next = toBatches(contractPreviews, data.rows, defaultKind)
    setBatches(next)
    setNotes(nextNotes)
    setMessage('')
    if (!next.length && !nextNotes.length) {
      setNotes([{ source: '导入', message: '没有识别出合同行。请用飞书导出的 Excel，或复制表头+数据行。' }])
    }
  }

  async function onFiles(files: File[]) {
    if (!files.length) return
    const parsed = await parseImportFiles(files, { defaultKind })
    mergeResult(parsed.previews, parsed.notes)
  }

  function onPaste() {
    const parsed = parseTableText(paste, '粘贴自飞书', { defaultKind })
    mergeResult(parsed.previews, parsed.notes)
  }

  function patchBatch(id: string, patch: Partial<Pick<Batch, 'year' | 'buySell' | 'kind'>>) {
    setBatches((prev) => prev.map((item) => {
      if (item.id !== id) return item
      const next = { ...item, ...patch }
      if (patch.kind) next.incoming = applyContractBatch(item.incoming, { kind: patch.kind })
      return next
    }))
  }

  function confirm() {
    let existing = data.rows
    const keepAll: SheetRow[] = []
    let skipped = 0
    for (const batch of batches) {
      const rows = applyContractBatch(batch.incoming, {
        kind: defaultKind,
        year: batch.year || undefined,
        buySell: batch.buySell || undefined,
      })
      const { keep, skipped: skip } = dedupeRows(existing, rows)
      existing = [...existing, ...keep]
      keepAll.push(...keep)
      skipped += skip
    }
    if (!keepAll.length) {
      window.alert(skipped ? `没有新行可写，${skipped} 行与台账重复。` : '没有可写入的合同。')
      return
    }
    addRows(keepAll)
    setBatches([])
    setPaste('')
    setMessage(`已写入 ${schema.name} ${keepAll.length} 份${skipped ? `，跳过重复 ${skipped} 份` : ''}。可继续导入下一批，或切换页签导入另一类。`)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">飞书多维表格 · 2020 年起按年分采购 / 销售</p>
          <h1>飞书合同导入</h1>
        </div>
        <div className="row-actions">
          <button onClick={() => go({ name: 'sheet', sheet: defaultKind })}>打开{schema.name}</button>
          {batches.length > 0 && (
            <button className="primary" onClick={confirm}>写入{defaultKind === 'seal' ? '单章' : '电子'} {totals.incoming} 份</button>
          )}
        </div>
      </header>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            className={defaultKind === tab.kind ? 'active' : ''}
            onClick={() => switchKind(tab.kind)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="hint">
        当前写入「{schema.name}」。单章和电子分开导：先点上面的页签，再放入该年采购/销售表。以后新签的同样导出或复制新增行即可。相对方+合同名称+签订日期相同的会跳过。
      </p>

      {message && <p className="card hint">{message}</p>}

      <section className="stats compact">
        <article><b>{seals.length}</b><span>单章已有</span></article>
        <article><b>{electrons.length}</b><span>电子已有</span></article>
        <article><b>{totals.incoming}</b><span>本次写入{defaultKind === 'seal' ? '单章' : '电子'}</span></article>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>导入{schema.name}</h2>
          <em>{currentRows.length} 条已在台账</em>
        </div>
        <ol className="howto">
          <li>飞书打开{defaultKind === 'seal' ? '单章' : '电子'}合同该年的采购表或销售表。</li>
          <li>点右上角「…」→ 导出 Excel；或框选表头和记录，复制。</li>
          <li>一次可放入 2020–{CONTRACT_YEARS[CONTRACT_YEARS.length - 1]} 多年文件。文件名带「2024」「采购」「销售」会自动归类。</li>
        </ol>
        <div
          className={dragging ? 'drop-zone active' : 'drop-zone'}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void onFiles([...e.dataTransfer.files])
          }}
        >
          <strong>把{defaultKind === 'seal' ? '单章' : '电子'}合同的飞书 Excel 拖到这里</strong>
          <span>可多选。也支持 .xls / .csv。点此选文件。</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          hidden
          onChange={(e) => {
            void onFiles([...e.target.files || []])
            e.target.value = ''
          }}
        />
        <label className="span-block">
          或从飞书复制后粘贴（含表头）
          <textarea
            rows={6}
            value={paste}
            placeholder={'合同名称\t相对方\t合同签订时间\t合同金额\t采购与销售\n示例项目\t某某公司\t2026.3.10\t8000\t销售'}
            onChange={(e) => setPaste(e.target.value)}
          />
        </label>
        <div className="row-actions">
          <button onClick={onPaste} disabled={!paste.trim()}>识别粘贴内容</button>
          {batches.length > 0 && <button className="text" onClick={() => { setBatches([]); setNotes([]); setMessage('') }}>清空预览</button>}
        </div>
        <p className="hint">
          常用列名：合同名称、相对方、签订日期、合同金额、合同状态、已开/未开、已付/未付、采购与销售、归档年度、附件。列名不完全一致也能认。
        </p>
      </section>

      {notes.length > 0 && (
        <section className="card">
          <div className="card-head"><h2>未能写入的表</h2></div>
          <ul className="list">
            {notes.map((note) => (
              <li key={`${note.source}-${note.message}`}>
                <div>
                  <strong>{note.source}</strong>
                  <p>{note.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {batches.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2>导入预览 · {schema.name}</h2>
          </div>
          <div className="table-wrap">
            <table className="import-preview">
              <thead>
                <tr>
                  <th>来源</th>
                  <th>年度</th>
                  <th>采购 / 销售</th>
                  <th>新增</th>
                  <th>重复</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <strong>{batch.source}</strong>
                      {batch.incoming[0] && <p className="hint">{sample(batch.incoming[0])}</p>}
                    </td>
                    <td>
                      <select value={batch.year} onChange={(e) => patchBatch(batch.id, { year: e.target.value })}>
                        <option value="">从签订日识别</option>
                        {CONTRACT_YEARS.map((y) => <option key={y} value={y}>{y} 年</option>)}
                      </select>
                    </td>
                    <td>
                      <select value={batch.buySell} onChange={(e) => patchBatch(batch.id, { buySell: e.target.value })}>
                        <option value="">空着 / 看列里的值</option>
                        <option value="采购">采购</option>
                        <option value="销售">销售</option>
                      </select>
                    </td>
                    <td>{batch.incoming.length}</td>
                    <td>{batch.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row-actions" style={{ marginTop: 16 }}>
            <button className="primary" onClick={confirm}>确认写入{schema.name}</button>
          </div>
        </section>
      )}
    </div>
  )
}
