import { COMPANY } from '../data/brand'
import { NAV_SHEETS, SHEETS } from '../data/sheets'
import { yearOf } from '../lib/balance'
import { todayISO, weekdayLabel } from '../lib/dates'
import { CONTRACT_YEARS } from '../lib/importExcel'
import { formatMoney, parseMoney } from '../lib/money'
import { rowsOf, useStore } from '../store'
import { useState } from 'react'
import type { Page, SheetRow } from '../types'

function moneySum(rows: { fields: Record<string, string> }[], key: string): number {
  return rows.reduce((sum, r) => sum + parseMoney(r.fields[key] || ''), 0)
}

interface DeskTask {
  id: string
  row: SheetRow
  title: string
  detail: string
  tag: string
  page: Page
  completeFields?: Record<string, string>
}

export function Workbench() {
  const { data, go, upsertRow, closeDesk, restoreDesk, demo } = useStore()
  const showDemo = demo || data.rows.some((r) => String(r.id).startsWith('demo-'))
  const [yearKind, setYearKind] = useState<'seal' | 'econtract'>('seal')
  const today = todayISO()
  const seals = rowsOf(data, 'seal')
  const electrons = rowsOf(data, 'econtract')
  const contracts = [...seals, ...electrons]
  const invoices = rowsOf(data, 'invoice')
  const closed = data.closedDesk ?? {}
  const uninvoiced = moneySum(contracts, 'uninvoiced')
  const unpaid = moneySum(contracts, 'unpaid')
  const invoiceTotal = moneySum(invoices.filter((r) => r.fields.invoiceNo && r.fields.invoiceNo !== '待开'), 'amount')
  const openHandover = rowsOf(data, 'handover').filter((r) => r.fields.docDone !== '√' && !closed[r.id])

  const tasks: DeskTask[] = []
  for (const r of invoices) {
    if (r.fields.invoiceNo && r.fields.invoiceNo !== '待开' && r.fields.invoiceNo !== '待定') continue
    tasks.push({
      id: r.id,
      row: r,
      title: r.fields.party || r.fields.contractName || '未写相对方',
      detail: `${r.fields.contractName || '未关联合同'} · ${r.fields.amount || '金额待定'}`,
      tag: '待开发票',
      page: { name: 'sheet', sheet: 'invoice', id: r.id },
    })
  }
  for (const r of contracts) {
    if (parseMoney(r.fields.uninvoiced || '') <= 0 && r.fields.uninvoiced !== '待定') continue
    tasks.push({
      id: r.id,
      row: r,
      title: r.fields.party || r.fields.name || '未写相对方',
      detail: `${r.fields.name || '未命名合同'} · 未开 ${r.fields.uninvoiced || '待定'}`,
      tag: '合同未开',
      page: { name: 'sheet', sheet: 'invoice', id: r.id },
    })
  }
  for (const r of rowsOf(data, 'handover')) {
    if (r.fields.docDone === '√') continue
    tasks.push({
      id: r.id,
      row: r,
      title: r.fields.item || '交接事项',
      detail: `${r.fields.module || '交接'} · ${r.fields.progress || '未写进度'}`,
      tag: '交接未完',
      page: { name: 'sheet', sheet: 'handover', id: r.id },
      completeFields: { ...r.fields, docDone: '√' },
    })
  }

  const openTasks = tasks.filter((t) => !closed[t.id])
  const closedTasks = tasks.filter((t) => closed[t.id])

  function finish(task: DeskTask) {
    if (task.completeFields) {
      upsertRow({ id: task.row.id, kind: task.row.kind, fields: task.completeFields })
    }
    closeDesk(task.id, 'done')
  }

  function cancel(task: DeskTask) {
    closeDesk(task.id, 'cancelled')
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{COMPANY.shortName}　{today.replace(/-/g, ' / ')}　{weekdayLabel()}</p>
          <h1>今日工作台</h1>
        </div>
        <div className="row-actions">
          <button onClick={() => go({ name: 'drive' })}>资料库</button>
          <button onClick={() => go({ name: 'import', sheet: 'seal' })}>导入单章合同</button>
          <button onClick={() => go({ name: 'import', sheet: 'econtract' })}>导入电子合同</button>
          <button onClick={() => go({ name: 'doc', doc: 'quote' })}>开具报价单</button>
          <button className="primary" onClick={() => go({ name: 'sheet', sheet: 'invoice' })}>登记发票</button>
        </div>
      </header>

      {showDemo && (
        <section className="card demo-script">
          <div className="card-head">
            <h2>演示怎么讲（约 3 分钟）</h2>
            <em>点步骤会跳到对应页面</em>
          </div>
          <ol className="howto">
            <li>
              <button type="button" className="text" onClick={() => go({ name: 'workbench' })}>今日工作台</button>
              ：待开发票、合同未开、交接未完，文员每天从这里开工。
            </li>
            <li>
              <button type="button" className="text" onClick={() => go({ name: 'sheet', sheet: 'seal', year: '2026', buySell: '销售' })}>2026 年销售单章</button>
              ：像飞书多维表，格子里直接改。再切
              <button type="button" className="text" onClick={() => go({ name: 'sheet', sheet: 'econtract' })}> 电子合同</button>。
            </li>
            <li>
              <button type="button" className="text" onClick={() => go({ name: 'drive', path: '财务资料' })}>资料库 · 财务资料</button>
              ：左侧目录和飞书云盘一样。招投标里的在线文档是链接，不是文件。
            </li>
            <li>
              <button type="button" className="text" onClick={() => go({ name: 'sheet', sheet: 'invoice' })}>发票统计</button>
              、
              <button type="button" className="text" onClick={() => go({ name: 'sheet', sheet: 'arap' })}>应收应付</button>
              ：未开未付能对上合同。
            </li>
            <li>
              <button type="button" className="text" onClick={() => go({ name: 'doc', doc: 'quote' })}>开具报价单</button>
              、
              <button type="button" className="text" onClick={() => go({ name: 'doc', doc: 'contract' })}>普通合同模板</button>
              ：只起草、登记、提醒，不代替盖章外发。
            </li>
          </ol>
        </section>
      )}

      <section className="stats">
        <article><b>{openTasks.length}</b><span>待办任务</span></article>
        <article><b>{contracts.length}</b><span>合同份数</span></article>
        <article><b>{formatMoney(uninvoiced)}</b><span>合同未开</span></article>
        <article><b>{formatMoney(unpaid)}</b><span>合同未付</span></article>
      </section>

      <div className="split">
        <section className="card">
          <div className="card-head">
            <h2>我的任务</h2>
            <button className="text" onClick={() => go({ name: 'sheet', sheet: 'invoice' })}>发票统计</button>
          </div>
          {openTasks.length === 0 ? <p className="empty">没有待办。已完成或取消的不会再挂在这里。</p> : (
            <ul className="list">
              {openTasks.map((task) => (
                <li key={task.id} className="task-item">
                  <div className="task-main" onClick={() => go(task.page)}>
                    <strong>{task.title}</strong>
                    <p>{task.detail}</p>
                  </div>
                  <div className="task-actions">
                    <em>{task.tag}</em>
                    <button type="button" className="text" onClick={() => finish(task)}>已完成</button>
                    <button type="button" className="text" onClick={() => cancel(task)}>取消</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {closedTasks.length > 0 && (
            <div className="closed-desk">
              <h3>已处理</h3>
              <ul className="list">
                {closedTasks.map((task) => (
                  <li key={task.id} className="task-item mute-card">
                    <div className="task-main">
                      <strong>{task.title}</strong>
                      <p>{closed[task.id] === 'done' ? '已完成' : '已取消'} · {task.detail}</p>
                    </div>
                    <button type="button" className="text" onClick={() => restoreDesk(task.id)}>放回待办</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <h2>收付与交接</h2>
            <button className="text" onClick={() => go({ name: 'sheet', sheet: 'arap' })}>应收应付</button>
          </div>
          <ul className="list">
            <li onClick={() => go({ name: 'sheet', sheet: 'seal' })}>
              <div><strong>合同未开合计</strong><p>单章 + 电子合同「未开」列</p></div>
              <em>{formatMoney(uninvoiced)}</em>
            </li>
            <li onClick={() => go({ name: 'sheet', sheet: 'seal' })}>
              <div><strong>合同未付合计</strong><p>单章 + 电子合同「未付」列</p></div>
              <em>{formatMoney(unpaid)}</em>
            </li>
            <li onClick={() => go({ name: 'sheet', sheet: 'invoice' })}>
              <div><strong>已登发票金额</strong><p>发票统计（不含待开）</p></div>
              <em>{formatMoney(invoiceTotal)}</em>
            </li>
            <li onClick={() => go({ name: 'sheet', sheet: 'handover' })}>
              <div><strong>未完成交接</strong><p>文档完成情况不是 √</p></div>
              <em>{openHandover.length} 项</em>
            </li>
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>合同按年</h2>
          <button className="text" onClick={() => go({ name: 'import', sheet: yearKind })}>
            导入{yearKind === 'seal' ? '单章' : '电子'}合同
          </button>
        </div>
        <div className="tabs">
          <button className={yearKind === 'seal' ? 'active' : ''} onClick={() => setYearKind('seal')}>单章合同 {seals.length}</button>
          <button className={yearKind === 'econtract' ? 'active' : ''} onClick={() => setYearKind('econtract')}>电子合同 {electrons.length}</button>
        </div>
        <p className="hint">点数字进入该年采购或销售。单章和电子分开看、分开导入。</p>
        <div className="table-wrap">
          <table className="year-matrix">
            <thead>
              <tr>
                <th>年度</th>
                <th>采购</th>
                <th>销售</th>
                <th>未分购销</th>
              </tr>
            </thead>
            <tbody>
              {CONTRACT_YEARS.map((year) => {
                const ofYear = (yearKind === 'seal' ? seals : electrons).filter((r) => yearOf(r.fields) === year)
                const buy = ofYear.filter((r) => r.fields.buySell === '采购').length
                const sell = ofYear.filter((r) => r.fields.buySell === '销售').length
                const other = ofYear.length - buy - sell
                const open = (buySell: string) => {
                  go({ name: 'sheet', sheet: yearKind, year, buySell: buySell || 'none' })
                }
                return (
                  <tr key={year}>
                    <td><strong>{year} 年</strong></td>
                    <td><button type="button" className="text" onClick={() => open('采购')}>{buy}</button></td>
                    <td><button type="button" className="text" onClick={() => open('销售')}>{sell}</button></td>
                    <td>{other > 0 ? <button type="button" className="text" onClick={() => open('')}>{other}</button> : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>文员台账</h2>
        </div>
        <div className="template-grid eight">
          {NAV_SHEETS.map((item) => {
            const schema = SHEETS[item.sheet]
            const count = rowsOf(data, item.sheet).length
            return (
              <button key={item.sheet} className="tile" onClick={() => go({ name: 'sheet', sheet: item.sheet })}>
                <b>{schema.name}</b>
                <span>{item.hint} · {count} 条</span>
              </button>
            )
          })}
          <button className="tile" onClick={() => go({ name: 'drive' })}>
            <b>资料库</b>
            <span>从飞书云盘迁入本机</span>
          </button>
          <button className="tile" onClick={() => go({ name: 'import', sheet: 'seal' })}>
            <b>导入单章合同</b>
            <span>飞书 · 按年 · 采购 / 销售</span>
          </button>
          <button className="tile" onClick={() => go({ name: 'import', sheet: 'econtract' })}>
            <b>导入电子合同</b>
            <span>飞书 · 按年 · 采购 / 销售</span>
          </button>
          <button className="tile" onClick={() => go({ name: 'doc', doc: 'contract' })}>
            <b>普通合同模板</b>
            <span>供方需方合同书</span>
          </button>
        </div>
      </section>
    </div>
  )
}
