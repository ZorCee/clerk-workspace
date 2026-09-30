import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { exec } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect } from 'vite'
import { handleDriveApi } from './drive.ts'

export const dataDir = process.env.WENSHI_DATA_DIR || 'D:\\谛图文事台数据'
export const isDemo = process.env.WENSHI_DEMO === '1' || /演示/.test(dataDir)
export const dataFile = path.join(dataDir, 'wenshi.json')
export const bakFile = path.join(dataDir, 'wenshi.bak.json')
export const authFile = path.join(dataDir, 'auth.json')
export const attachDir = path.join(dataDir, '附件')

const tokens = new Map<string, number>()
const TOKEN_MS = 12 * 60 * 60 * 1000

export interface DiskData {
  rows: unknown[]
  closedDesk?: Record<string, string>
}

function ensureDir(): void {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.mkdirSync(attachDir, { recursive: true })
  fs.mkdirSync(path.join(dataDir, '资料库'), { recursive: true })
}

function hashPin(pin: string): string {
  return createHash('sha256').update(`wenshi:${pin}`).digest('hex')
}

function hasPin(): boolean {
  return fs.existsSync(authFile)
}

function pinMatches(pin: string): boolean {
  if (!hasPin()) return false
  const saved = JSON.parse(fs.readFileSync(authFile, 'utf8')) as { pinHash?: string }
  const a = Buffer.from(saved.pinHash || '', 'hex')
  const b = Buffer.from(hashPin(pin), 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

function issueToken(): string {
  const token = randomBytes(24).toString('hex')
  tokens.set(token, Date.now() + TOKEN_MS)
  return token
}

export function readStore(): DiskData {
  ensureDir()
  if (!fs.existsSync(dataFile)) return { rows: [], closedDesk: {} }
  try {
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8')) as DiskData
    return {
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
      closedDesk: parsed.closedDesk && typeof parsed.closedDesk === 'object' ? parsed.closedDesk : {},
    }
  } catch {
    if (fs.existsSync(bakFile)) {
      const parsed = JSON.parse(fs.readFileSync(bakFile, 'utf8')) as DiskData
      return {
        rows: Array.isArray(parsed.rows) ? parsed.rows : [],
        closedDesk: parsed.closedDesk && typeof parsed.closedDesk === 'object' ? parsed.closedDesk : {},
      }
    }
    return { rows: [], closedDesk: {} }
  }
}

export function writeStore(data: DiskData): void {
  ensureDir()
  const json = JSON.stringify({
    rows: data.rows ?? [],
    closedDesk: data.closedDesk ?? {},
  }, null, 2)
  const tmp = `${dataFile}.tmp`
  fs.writeFileSync(tmp, json, 'utf8')
  if (fs.existsSync(dataFile)) {
    fs.copyFileSync(dataFile, bakFile)
    fs.rmSync(dataFile)
  }
  fs.renameSync(tmp, dataFile)
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function listAttach(): string[] {
  ensureDir()
  return fs.readdirSync(attachDir).filter((name) => {
    const full = path.join(attachDir, name)
    return fs.statSync(full).isFile()
  })
}

export async function handlePersistApi(
  req: IncomingMessage,
  res: ServerResponse,
  next: Connect.NextFunction,
): Promise<void> {
  const url = req.url?.split('?')[0] || ''
  if (!url.startsWith('/api/')) {
    next()
    return
  }

  try {
    if (await handleDriveApi(req, res)) return
    if (url === '/api/auth-status' && req.method === 'GET') {
      send(res, 200, { setup: hasPin() })
      return
    }
    if (url === '/api/setup' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req)) as { pin?: string }
      const pin = String(body.pin || '').trim()
      if (pin.length < 4) {
        send(res, 400, { error: '口令至少 4 位' })
        return
      }
      if (hasPin()) {
        send(res, 400, { error: '口令已设置，请直接登录' })
        return
      }
      ensureDir()
      fs.writeFileSync(authFile, JSON.stringify({ pinHash: hashPin(pin) }), 'utf8')
      send(res, 200, { token: issueToken() })
      return
    }
    if (url === '/api/login' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req)) as { pin?: string }
      if (!pinMatches(String(body.pin || ''))) {
        send(res, 401, { error: '口令不对' })
        return
      }
      send(res, 200, { token: issueToken() })
      return
    }

    if (url === '/api/data' && req.method === 'GET') {
      send(res, 200, readStore())
      return
    }
    if (url === '/api/data' && req.method === 'PUT') {
      const parsed = JSON.parse(await readBody(req)) as DiskData
      if (!parsed || !Array.isArray(parsed.rows)) {
        send(res, 400, { error: '数据格式不对' })
        return
      }
      writeStore({ rows: parsed.rows, closedDesk: parsed.closedDesk ?? {} })
      send(res, 200, { ok: true, path: dataFile })
      return
    }
    if (url === '/api/info' && req.method === 'GET') {
      send(res, 200, {
        path: dataFile,
        backup: bakFile,
        attach: attachDir,
        drive: path.join(dataDir, '资料库'),
        dir: dataDir,
        exists: fs.existsSync(dataFile),
        demo: isDemo,
      })
      return
    }
    if (url === '/api/files' && req.method === 'GET') {
      send(res, 200, { files: listAttach() })
      return
    }
    if (url === '/api/open-folder' && req.method === 'POST') {
      ensureDir()
      exec(`explorer "${dataDir}"`)
      send(res, 200, { ok: true })
      return
    }
    if (url === '/api/open-attach-folder' && req.method === 'POST') {
      ensureDir()
      exec(`explorer "${attachDir}"`)
      send(res, 200, { ok: true })
      return
    }
    if (url === '/api/open-file' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req)) as { name?: string }
      const name = path.basename(String(body.name || '').trim())
      if (!name) {
        send(res, 400, { error: '没有文件名' })
        return
      }
      const full = path.join(attachDir, name)
      if (!full.startsWith(attachDir) || !fs.existsSync(full)) {
        send(res, 404, { error: '附件夹里没有这个文件' })
        return
      }
      exec(`explorer "${full}"`)
      send(res, 200, { ok: true })
      return
    }
    send(res, 404, { error: 'not found' })
  } catch (error) {
    send(res, 500, { error: error instanceof Error ? error.message : '保存失败' })
  }
}
