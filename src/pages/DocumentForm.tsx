import { useMemo, useState } from 'react'
import { Logo } from '../components/Logo'
import { COMPANY } from '../data/brand'
import { todayISO } from '../lib/dates'
import { escapeHtml, exportWord, htmlToPlain } from '../lib/export'
import { parseMoney } from '../lib/money'
import { useStore } from '../store'
import type { DocKind } from '../types'

function quoteHtml(f: Record<string, string>): string {
  const lines = [1, 2, 3].map((i) => ({
    name: f[`item${i}`] || '',
    unit: f[`unit${i}`] || '',
    qty: f[`qty${i}`] || '',
    price: f[`price${i}`] || '',
    amount: f[`amount${i}`] || '',
    notes: f[`note${i}`] || '',
  })).filter((l) => l.name)
  const rows = lines.map((l, idx) => (
    `<tr><td>${idx + 1}</td><td>${escapeHtml(l.name)}</td><td>${escapeHtml(l.unit)}</td><td>${escapeHtml(l.qty)}</td><td>${escapeHtml(l.price)}</td><td>${escapeHtml(l.amount)}</td><td>${escapeHtml(l.notes)}</td></tr>`
  )).join('')
  return `
    <h1>${escapeHtml(COMPANY.name)}产品报价单</h1>
    <p class="to">项目名称：${escapeHtml(f.project || '　　')}</p>
    <p class="to">报价日期：${escapeHtml(f.date || '')}</p>
    <p class="to">1、产品范围与金额：</p>
    <table>
      <tr><th>序号</th><th>物料名称</th><th>单位</th><th>数量</th><th>（含税）单价</th><th>（含税）总价</th><th>备注</th></tr>
      ${rows || '<tr><td colspan="7">　</td></tr>'}
      <tr><td colspan="5">合计</td><td>${escapeHtml(f.total || '')}</td><td></td></tr>
    </table>
  `
}

function contractHtml(f: Record<string, string>): string {
  return `
    <p class="to">供方：${escapeHtml(f.partyA || COMPANY.name)}</p>
    <p class="to">需方：${escapeHtml(f.partyB || '　　')}</p>
    <h1>合　同　书</h1>
    <p class="to">合同号：${escapeHtml(f.no || '　　')}　签定日期：${escapeHtml(f.date || '')}　签定地点：${escapeHtml(f.place || '长沙')}</p>
    <p>经供需双方协商一致，签订本合同，共同遵守下列条款：</p>
    <p>1、货物名称、规格、数量、单价、总价：</p>
    <table>
      <tr><th>序号</th><th>名称与规格</th><th>选型</th><th>数量</th><th>单位</th><th>单价(元)(含税)</th><th>小计(元)(含税)</th><th>备注</th></tr>
      <tr>
        <td>1</td>
        <td>${escapeHtml(f.goods || '')}</td>
        <td>${escapeHtml(f.spec || '')}</td>
        <td>${escapeHtml(f.qty || '')}</td>
        <td>${escapeHtml(f.unit || '')}</td>
        <td>${escapeHtml(f.price || '')}</td>
        <td>${escapeHtml(f.subtotal || '')}</td>
        <td>${escapeHtml(f.lineNotes || '')}</td>
      </tr>
      <tr><td colspan="6">合计</td><td>${escapeHtml(f.taxedTotal || '')}</td><td></td></tr>
    </table>
    <p class="to">不含税总价：${escapeHtml(f.untaxed || '')}　税额(13%)：${escapeHtml(f.tax || '')}　含税总价：${escapeHtml(f.taxedTotal || '')}</p>
    <p>2、交货地点、运输方式等：</p>
    <p>2.1 发货日期：${escapeHtml(f.deliverDate || '')}</p>
    <p>2.2 收货地址、收货人及联系方式：${escapeHtml(f.deliverTo || '')}</p>
    <p>${escapeHtml(f.body || '')}</p>
  `
}

export function DocumentForm({ kind, id }: { kind: DocKind; id?: string }) {
  const { data, upsertRow, go } = useStore()
  const existing = id ? data.rows.find((r) => r.id === id) : undefined
  const [copied, setCopied] = useState(false)
  const [fields, setFields] = useState<Record<string, string>>(() => {
    if (existing) return { ...existing.fields }
    const quote: Record<string, string> = {
      project: '', date: todayISO(), total: '',
    }
    const contract: Record<string, string> = {
      partyA: COMPANY.name, partyB: '', no: '', date: todayISO(), place: '长沙',
      goods: '', spec: '', qty: '', unit: '', price: '', subtotal: '',
      untaxed: '', tax: '', taxedTotal: '', deliverDate: '', deliverTo: '', body: '',
    }
    return kind === 'quote' ? quote : contract
  })

  const html = useMemo(
    () => (kind === 'quote' ? quoteHtml(fields) : contractHtml(fields)),
    [kind, fields],
  )
  const title = kind === 'quote'
    ? (fields.project || '产品报价单')
    : (fields.goods || fields.no || '合同书')

  function set(key: string, value: string) {
    setFields((prev) => {
      const next = { ...prev, [key]: value }
      if (kind === 'quote' && /^(qty|price)\d$/.test(key)) {
        const i = key.slice(-1)
        const amount = parseMoney(next[`qty${i}`] || '') * parseMoney(next[`price${i}`] || '')
        next[`amount${i}`] = amount ? String(amount) : ''
        next.total = String(
          [1, 2, 3].reduce((sum, n) => sum + parseMoney(next[`amount${n}`] || ''), 0),
        )
      }
      if (kind === 'contract' && (key === 'qty' || key === 'price')) {
        const sub = parseMoney(next.qty || '') * parseMoney(next.price || '')
        next.subtotal = sub ? String(sub) : ''
        next.taxedTotal = next.subtotal
      }
      return next
    })
  }

  function save() {
    if (kind === 'quote') {
      const first = fields.item1 || fields.project || '待定'
      upsertRow({
        id: existing?.id,
        kind: 'quote',
        fields: {
          project: fields.project || '待定',
          date: fields.date || '',
          material: first,
          unit: fields.unit1 || '',
          qty: fields.qty1 || '',
          price: fields.price1 || '',
          total: fields.total || '',
          notes: fields.note1 || '',
        },
      })
      go({ name: 'sheet', sheet: 'quote' })
      return
    }
    upsertRow({
      id: existing?.id,
      kind: 'seal',
      fields: {
        name: fields.goods || '待定',
        type: '产品类',
        party: fields.partyB || '待定',
        signDate: fields.date || '',
        amount: fields.taxedTotal || fields.subtotal || '',
        status: '履约中',
        invoiced: '',
        uninvoiced: fields.taxedTotal || '',
        invoiceDate: '',
        invoiceNo: '',
        paid: '',
        unpaid: fields.taxedTotal || '',
        files: '',
        paperPlace: '',
        notes: `合同号${fields.no || '待定'}，由普通合同模板生成`,
        buySell: '销售',
      },
    })
    go({ name: 'sheet', sheet: 'seal' })
  }

  async function copyText() {
    await navigator.clipboard.writeText(htmlToPlain(html))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="page compose">
      <header className="page-head">
        <div>
          <button className="text" onClick={() => go({ name: 'sheet', sheet: kind === 'quote' ? 'quote' : 'seal' })}>
            ← 返回台账
          </button>
          <h1>{kind === 'quote' ? '开具报价单' : '套打普通合同'}</h1>
          <p className="hint">各项都可以空着或写待定，不必填完才能写入台账或下载。</p>
        </div>
        <div className="row-actions">
          <button onClick={copyText}>{copied ? '已复制' : '复制正文'}</button>
          <button onClick={() => exportWord(title, html)}>下载 Word</button>
          <button className="primary" onClick={save}>写入台账</button>
        </div>
      </header>

      <div className="compose-grid">
        <section className="card">
          {kind === 'quote' ? (
            <>
              <label>项目名称<input value={fields.project || ''} onChange={(e) => set('project', e.target.value)} /></label>
              <label>报价日期<input value={fields.date || ''} onChange={(e) => set('date', e.target.value)} /></label>
              {[1, 2, 3].map((i) => (
                <div key={i} className="quote-line">
                  <label>物料名称<input value={fields[`item${i}`] || ''} onChange={(e) => set(`item${i}`, e.target.value)} /></label>
                  <label>单位<input value={fields[`unit${i}`] || ''} onChange={(e) => set(`unit${i}`, e.target.value)} /></label>
                  <label>数量<input value={fields[`qty${i}`] || ''} onChange={(e) => set(`qty${i}`, e.target.value)} /></label>
                  <label>含税单价<input value={fields[`price${i}`] || ''} onChange={(e) => set(`price${i}`, e.target.value)} /></label>
                </div>
              ))}
              <label>含税合计<input value={fields.total || ''} onChange={(e) => set('total', e.target.value)} /></label>
            </>
          ) : (
            <>
              <label>供方<input value={fields.partyA || ''} onChange={(e) => set('partyA', e.target.value)} /></label>
              <label>需方<input value={fields.partyB || ''} onChange={(e) => set('partyB', e.target.value)} /></label>
              <label>合同号<input value={fields.no || ''} onChange={(e) => set('no', e.target.value)} /></label>
              <label>签定日期<input type="date" value={fields.date || ''} onChange={(e) => set('date', e.target.value)} /></label>
              <label>签定地点<input value={fields.place || ''} onChange={(e) => set('place', e.target.value)} /></label>
              <label>名称与规格<input value={fields.goods || ''} onChange={(e) => set('goods', e.target.value)} /></label>
              <label>选型<input value={fields.spec || ''} onChange={(e) => set('spec', e.target.value)} /></label>
              <label>数量<input value={fields.qty || ''} onChange={(e) => set('qty', e.target.value)} /></label>
              <label>单位<input value={fields.unit || ''} onChange={(e) => set('unit', e.target.value)} /></label>
              <label>含税单价<input value={fields.price || ''} onChange={(e) => set('price', e.target.value)} /></label>
              <label>不含税总价<input value={fields.untaxed || ''} onChange={(e) => set('untaxed', e.target.value)} /></label>
              <label>税额(13%)<input value={fields.tax || ''} onChange={(e) => set('tax', e.target.value)} /></label>
              <label>含税总价<input value={fields.taxedTotal || ''} onChange={(e) => set('taxedTotal', e.target.value)} /></label>
              <label>发货日期<input value={fields.deliverDate || ''} onChange={(e) => set('deliverDate', e.target.value)} /></label>
              <label>收货地址及联系人<textarea rows={3} value={fields.deliverTo || ''} onChange={(e) => set('deliverTo', e.target.value)} /></label>
            </>
          )}
        </section>
        <section className="paper-wrap">
          <div className="paper">
            <div className="paper-brand">
              <Logo tone="dark" />
              <span>{COMPANY.name}</span>
            </div>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </section>
      </div>
    </div>
  )
}
