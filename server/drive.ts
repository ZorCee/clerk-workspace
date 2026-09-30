import { exec, execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'

const dataDir = process.env.WENSHI_DATA_DIR || 'D:\\谛图文事台数据'
const attachDir = path.join(dataDir, '附件')
export const driveDir = path.join(dataDir, '资料库')

export interface DriveItem {
  name: string
  type: 'dir' | 'file' | 'link'
  size: number
  mtime: string
  href?: string
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

const DEMO_FILES: [string, string][] = [
  ['财务资料/发票/演示·2026年3月进项发票登记.txt', '演示发票登记：长沙星河设备 · 18600 元 · 号码 演示26032501\n正式发票请放扫描件，这里只占位。'],
  ['财务资料/对账/演示·应收应付说明.txt', '演示对账：客户乙 8000 未开；临港建设尾款 27000；青禾软件应付 12000。'],
  ['公司基础资料/证照/演示·证照存放说明.txt', '营业执照复印件演示件。真证件仍由办公室保管，系统只记位置。'],
  ['公司基础资料/物品/演示·大厅货架盘点.txt', '1F 打印纸　2F 文具　3F 印油夹子。对应「物品清单」台账。'],
  ['合同/单章/2026/演示·办公设备购销合同.txt', '演示合同文本，不是真合同。金额 18600，采购，已完成。'],
  ['合同/单章/2026/演示·某园区竣工测量.txt', '演示合同文本。金额 54000，销售，履约中，已开一半。'],
  ['合同/电子/2026/演示·技术服务协议.txt', '演示电子合同。金额 20000，已开 10000。'],
  ['申报资料/高新技术/演示·申报材料目录.txt', '演示申报夹。知识产权、审计报告等请从飞书下载后放这里。'],
  ['项目资料/某园区测绘/演示·项目过程记录.txt', '演示项目夹：任务书、过程稿、成果清单。'],
  ['招投标资料/演示·某园区测绘招标说明.txt', '演示招标说明。飞书里的在线文档请用「添加链接」，不要当文件上传。'],
]

const DEMO_LINKS: [string, string][] = [
  ['办公网站及密码信息.url', 'https://www.disting.cn'],
  ['财务对账知识库.url', 'https://www.feishu.cn'],
  ['费用报销单.url', 'https://www.feishu.cn'],
  ['易代账账套重建.url', 'https://www.feishu.cn'],
  ['云盘归档资料一览表.url', 'https://www.feishu.cn'],
  ['账套对账工作.url', 'https://www.feishu.cn'],
]

export function ensureDrive(): void {
  fs.mkdirSync(driveDir, { recursive: true })
}

export function seedDemoDrive(): { written: number } {
  ensureDrive()
  let written = 0
  for (const folder of ['财务资料', '公司基础资料', '合同', '申报资料', '项目资料', '招投标资料']) {
    const full = path.join(driveDir, folder)
    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true })
      written += 1
    }
  }
  for (const [rel, text] of DEMO_FILES) {
    const full = resolveInside(rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    if (!fs.existsSync(full)) {
      fs.writeFileSync(full, text, 'utf8')
      written += 1
    }
  }
  for (const [rel, href] of DEMO_LINKS) {
    const full = resolveInside(rel)
    if (!fs.existsSync(full)) {
      writeShortcut(full, href)
      written += 1
    }
  }
  return { written }
}

function safeRel(raw: string): string[] {
  return String(raw || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..')
    .map((part) => part.replace(/[<>:"|?*]/g, '_'))
}

function resolveInside(rel: string): string {
  const parts = safeRel(rel)
  const full = path.resolve(driveDir, ...parts)
  const root = path.resolve(driveDir)
  if (full !== root && !full.startsWith(root + path.sep)) {
    throw new Error('路径不合法')
  }
  return full
}

function query(req: IncomingMessage, key: string): string {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  return url.searchParams.get(key) || ''
}

function header(req: IncomingMessage, key: string): string {
  const value = req.headers[key.toLowerCase()]
  return Array.isArray(value) ? value[0] || '' : value || ''
}

async function saveUpload(req: IncomingMessage, dest: string, offset = 0, total = 0): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const tmp = `${dest}.uploading`
  if (offset === 0 && fs.existsSync(tmp)) fs.rmSync(tmp)
  const current = fs.existsSync(tmp) ? fs.statSync(tmp).size : 0
  if (offset && current !== offset) {
    throw new Error('上传中断，请重新传这个文件')
  }
  await pipeline(req, fs.createWriteStream(tmp, { flags: offset ? 'a' : 'w' }))
  const next = fs.existsSync(tmp) ? fs.statSync(tmp).size : 0
  if (total && next < total) return
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true })
  fs.renameSync(tmp, dest)
}

function isLinkName(name: string): boolean {
  return /\.url$/i.test(name)
}

function readShortcut(full: string): string {
  try {
    const text = fs.readFileSync(full, 'utf8')
    const match = text.match(/^\s*URL\s*=\s*(\S+)/im)
    return match?.[1] || ''
  } catch {
    return ''
  }
}

function writeShortcut(full: string, href: string): void {
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, `[InternetShortcut]\r\nURL=${href}\r\n`, 'utf8')
}

function asItem(name: string, full: string): DriveItem {
  const stat = fs.statSync(full)
  if (stat.isDirectory()) {
    return { name, type: 'dir', size: 0, mtime: stat.mtime.toISOString() }
  }
  if (isLinkName(name)) {
    return { name, type: 'link', size: 0, mtime: stat.mtime.toISOString(), href: readShortcut(full) }
  }
  return { name, type: 'file', size: stat.size, mtime: stat.mtime.toISOString() }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function listDir(rel: string): { path: string; items: DriveItem[] } {
  ensureDrive()
  const full = resolveInside(rel)
  if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) {
    return { path: safeRel(rel).join('/'), items: [] }
  }
  const items = fs.readdirSync(full)
    .filter((name) => !name.startsWith('.') && !name.endsWith('.uploading'))
    .map((name) => asItem(name, path.join(full, name)))
    .sort((a, b) => {
      const order = { dir: 0, link: 1, file: 2 }
      if (a.type !== b.type) return order[a.type] - order[b.type]
      return a.name.localeCompare(b.name, 'zh')
    })
  return { path: safeRel(rel).join('/'), items }
}

function clearDrive(): { removed: number } {
  ensureDrive()
  let removed = 0
  for (const name of fs.readdirSync(driveDir)) {
    fs.rmSync(path.join(driveDir, name), { recursive: true, force: true })
    removed += 1
  }
  return { removed }
}

function walk(rel: string, q: string, out: DriveItem[], prefix = ''): void {
  if (out.length >= 200) return
  const full = resolveInside(rel)
  if (!fs.existsSync(full)) return
  for (const name of fs.readdirSync(full)) {
    const childRel = prefix ? `${prefix}/${name}` : name
    const stat = fs.statSync(path.join(full, name))
    if (stat.isDirectory()) {
      if (name.toLowerCase().includes(q)) {
        out.push({ name: childRel, type: 'dir', size: 0, mtime: stat.mtime.toISOString() })
      }
      walk(childRel, q, out, childRel)
    } else if (name.toLowerCase().includes(q) || readShortcut(path.join(full, name)).toLowerCase().includes(q)) {
      out.push(asItem(childRel, path.join(full, name)))
    }
    if (out.length >= 200) return
  }
}

function unzip(zipFile: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = `Expand-Archive -LiteralPath '${zipFile.replace(/'/g, "''")}' -DestinationPath '${dest.replace(/'/g, "''")}' -Force`
    execFile('powershell', ['-NoProfile', '-Command', script], { windowsHide: true }, (error) => {
      if (error) reject(new Error('解压失败。请确认是 zip 压缩包。'))
      else resolve()
    })
  })
}

function copyAttachIntoDrive(): { copied: number } {
  ensureDrive()
  const dest = path.join(driveDir, '合同附件')
  fs.mkdirSync(dest, { recursive: true })
  if (!fs.existsSync(attachDir)) return { copied: 0 }
  let copied = 0
  for (const name of fs.readdirSync(attachDir)) {
    const from = path.join(attachDir, name)
    if (!fs.statSync(from).isFile()) continue
    const to = path.join(dest, name)
    if (!fs.existsSync(to)) {
      fs.copyFileSync(from, to)
      copied += 1
    }
  }
  return { copied }
}

export async function handleDriveApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url?.split('?')[0] || ''
  if (!url.startsWith('/api/drive')) return false

  try {
    if (url === '/api/drive/list' && req.method === 'GET') {
      send(res, 200, listDir(query(req, 'path')))
      return true
    }
    if (url === '/api/drive/search' && req.method === 'GET') {
      const q = query(req, 'q').trim().toLowerCase()
      const items: DriveItem[] = []
      if (q) walk('', q, items)
      send(res, 200, { items })
      return true
    }
    if (url === '/api/drive/mkdir' && req.method === 'POST') {
      const rel = decodeURIComponent(header(req, 'x-drive-path') || query(req, 'path'))
      if (!safeRel(rel).length) {
        send(res, 400, { error: '请填写文件夹名' })
        return true
      }
      fs.mkdirSync(resolveInside(rel), { recursive: true })
      send(res, 200, { ok: true })
      return true
    }
    if (url === '/api/drive/rename' && req.method === 'POST') {
      const from = decodeURIComponent(header(req, 'x-drive-from') || '')
      const to = decodeURIComponent(header(req, 'x-drive-to') || '')
      if (!from || !to) {
        send(res, 400, { error: '缺少文件名' })
        return true
      }
      const src = resolveInside(from)
      const dest = resolveInside(to)
      if (!fs.existsSync(src)) {
        send(res, 404, { error: '没有这个文件' })
        return true
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.renameSync(src, dest)
      send(res, 200, { ok: true })
      return true
    }
    if (url === '/api/drive/delete' && req.method === 'POST') {
      const rel = decodeURIComponent(header(req, 'x-drive-path') || query(req, 'path'))
      const full = resolveInside(rel)
      if (!rel || full === path.resolve(driveDir)) {
        send(res, 400, { error: '不能删除资料库根目录' })
        return true
      }
      if (!fs.existsSync(full)) {
        send(res, 404, { error: '没有这个文件' })
        return true
      }
      fs.rmSync(full, { recursive: true, force: true })
      send(res, 200, { ok: true })
      return true
    }
    if (url === '/api/drive/open' && req.method === 'POST') {
      const rel = decodeURIComponent(header(req, 'x-drive-path') || query(req, 'path'))
      const full = resolveInside(rel)
      if (!fs.existsSync(full)) {
        send(res, 404, { error: '资料库里没有这个文件' })
        return true
      }
      if (fs.statSync(full).isDirectory()) {
        execFile('explorer', [full], { windowsHide: true })
      } else {
        const href = isLinkName(full) ? readShortcut(full) : ''
        const target = href && /^https?:\/\//i.test(href) ? href : full
        exec(`cmd /c start "" "${target.replace(/"/g, '')}"`)
      }
      send(res, 200, { ok: true })
      return true
    }
    if (url === '/api/drive/open-root' && req.method === 'POST') {
      ensureDrive()
      execFile('explorer', [driveDir], { windowsHide: true })
      send(res, 200, { ok: true })
      return true
    }
    if (url === '/api/drive/seed-demo' && req.method === 'POST') {
      send(res, 200, seedDemoDrive())
      return true
    }
    if (url === '/api/drive/collect-attach' && req.method === 'POST') {
      send(res, 200, copyAttachIntoDrive())
      return true
    }
    if (url === '/api/drive/clear' && req.method === 'POST') {
      send(res, 200, clearDrive())
      return true
    }
    if (url === '/api/drive/link' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req) || '{}') as { path?: string; url?: string }
      const rel = String(body.path || '').trim()
      const href = String(body.url || '').trim()
      if (!rel) {
        send(res, 400, { error: '请填写链接名称' })
        return true
      }
      if (!/^https?:\/\//i.test(href)) {
        send(res, 400, { error: '请填写完整网址，以 http:// 或 https:// 开头' })
        return true
      }
      const named = isLinkName(rel) ? rel : `${rel}.url`
      writeShortcut(resolveInside(named), href)
      send(res, 200, { ok: true, path: safeRel(named).join('/') })
      return true
    }
    if (url === '/api/drive/upload' && req.method === 'POST') {
      const rel = decodeURIComponent(header(req, 'x-drive-path') || query(req, 'path'))
      if (!safeRel(rel).length) {
        send(res, 400, { error: '没有文件名' })
        return true
      }
      const dest = resolveInside(rel)
      if (fs.existsSync(dest) && fs.statSync(dest).isDirectory()) {
        send(res, 400, { error: '同名文件夹已存在' })
        return true
      }
      const offset = Number(header(req, 'x-drive-offset') || 0)
      const total = Number(header(req, 'x-drive-total') || 0)
      await saveUpload(req, dest, Number.isFinite(offset) ? offset : 0, Number.isFinite(total) ? total : 0)
      send(res, 200, { ok: true, path: safeRel(rel).join('/'), size: fs.existsSync(dest) ? fs.statSync(dest).size : 0 })
      return true
    }
    if (url === '/api/drive/unzip' && req.method === 'POST') {
      const rel = decodeURIComponent(header(req, 'x-drive-path') || query(req, 'path'))
      const destRel = decodeURIComponent(header(req, 'x-drive-dest') || query(req, 'dest') || '飞书迁入')
      const zip = resolveInside(rel)
      if (!fs.existsSync(zip) || !fs.statSync(zip).isFile()) {
        send(res, 404, { error: '没有这个压缩包' })
        return true
      }
      const dest = resolveInside(destRel)
      fs.mkdirSync(dest, { recursive: true })
      await unzip(zip, dest)
      if (fs.existsSync(zip)) fs.rmSync(zip, { force: true })
      send(res, 200, { ok: true, path: safeRel(destRel).join('/') })
      return true
    }
    if (url === '/api/drive/import-zip' && req.method === 'POST') {
      ensureDrive()
      const folder = decodeURIComponent(header(req, 'x-drive-path') || query(req, 'path') || '飞书迁入')
      const dest = resolveInside(folder)
      fs.mkdirSync(dest, { recursive: true })
      const tmp = path.join(os.tmpdir(), `wenshi-zip-${Date.now()}.zip`)
      await saveUpload(req, tmp)
      try {
        await unzip(tmp, dest)
      } finally {
        if (fs.existsSync(tmp)) fs.rmSync(tmp, { force: true })
      }
      send(res, 200, { ok: true, path: safeRel(folder).join('/') })
      return true
    }
    send(res, 404, { error: 'not found' })
    return true
  } catch (error) {
    send(res, 500, { error: error instanceof Error ? error.message : '资料库操作失败' })
    return true
  }
}
