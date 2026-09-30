import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const outDir = path.resolve('演示')
const shotDir = path.join(outDir, '截图')
fs.mkdirSync(shotDir, { recursive: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const STYLE = `
#demo-chapter{
  position:fixed;inset:0;z-index:100000;display:none;
  background:#021f40;color:#f7fbff;flex-direction:column;justify-content:center;
  padding:72px 96px;font-family:"Microsoft YaHei","PingFang SC",sans-serif;
}
#demo-chapter .kicker{color:#14c3cf;letter-spacing:.2em;font-size:15px;margin-bottom:16px}
#demo-chapter h1{font-size:44px;margin:0 0 18px;font-weight:650}
#demo-chapter p{font-size:22px;color:#cfe8ef;margin:0;line-height:1.65;max-width:880px}
#demo-sub{
  position:fixed;left:0;right:0;bottom:0;z-index:99999;
  background:rgba(2,31,64,.92);
  border-top:3px solid #14c3cf;
  padding:14px 36px 18px;
  font-family:"Microsoft YaHei","PingFang SC",sans-serif;
  pointer-events:none;
}
#demo-sub .ttl{color:#14c3cf;font-size:13px;letter-spacing:.16em;margin-bottom:6px}
#demo-sub .txt{color:#fff;font-size:22px;line-height:1.5;font-weight:650}
#demo-cursor{
  position:fixed;width:20px;height:20px;border:2px solid #14c3cf;border-radius:50%;
  background:rgba(20,195,207,.35);z-index:100001;pointer-events:none;
  transform:translate(-50%,-50%);
}
`

const cues = []
let videoStart = 0
let lastCue = null

function nowMs() {
  return Date.now() - videoStart
}

function stamp(ms) {
  const n = Math.max(0, Math.round(ms))
  const h = Math.floor(n / 3600000)
  const m = Math.floor((n % 3600000) / 60000)
  const s = Math.floor((n % 60000) / 1000)
  const milli = n % 1000
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  const mmm = String(milli).padStart(3, '0')
  return { srt: `${hh}:${mm}:${ss},${mmm}`, vtt: `${hh}:${mm}:${ss}.${mmm}` }
}

function closeCue() {
  if (lastCue && !lastCue.end) lastCue.end = nowMs()
}

async function bootUi(page) {
  await page.addStyleTag({ content: STYLE })
  await page.evaluate(() => {
    if (!document.getElementById('demo-chapter')) {
      const chapter = document.createElement('div')
      chapter.id = 'demo-chapter'
      document.body.appendChild(chapter)
    }
    if (!document.getElementById('demo-sub')) {
      const sub = document.createElement('div')
      sub.id = 'demo-sub'
      const ttl = document.createElement('div')
      ttl.className = 'ttl'
      const txt = document.createElement('div')
      txt.className = 'txt'
      sub.append(ttl, txt)
      document.body.appendChild(sub)
    }
    if (!document.getElementById('demo-cursor')) {
      const cur = document.createElement('div')
      cur.id = 'demo-cursor'
      document.body.appendChild(cur)
      document.addEventListener('mousemove', (e) => {
        cur.style.left = `${e.clientX}px`
        cur.style.top = `${e.clientY}px`
      })
    }
  })
}

async function say(page, title, text, hold = 2600) {
  closeCue()
  lastCue = { start: nowMs(), end: 0, title, text }
  cues.push(lastCue)
  await page.evaluate(({ title, text }) => {
    const box = document.getElementById('demo-sub')
    if (!box) return
    box.querySelector('.ttl').textContent = title
    box.querySelector('.txt').textContent = text
  }, { title, text })
  if (hold) await sleep(hold)
}

async function chapter(page, title, sub, ms = 3600) {
  await say(page, '章节', `${title}。${sub}`, 0)
  await page.evaluate(({ title, sub }) => {
    const el = document.getElementById('demo-chapter')
    if (!el) return
    el.replaceChildren()
    const kicker = document.createElement('div')
    kicker.className = 'kicker'
    kicker.textContent = '文事台 · 湖南谛图科技'
    const h = document.createElement('h1')
    h.textContent = title
    const p = document.createElement('p')
    p.textContent = sub
    el.append(kicker, h, p)
    el.style.display = 'flex'
  }, { title, sub })
  await sleep(ms)
  await page.evaluate(() => {
    const el = document.getElementById('demo-chapter')
    if (el) el.style.display = 'none'
  })
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage: false })
}

async function moveTo(page, locator) {
  const box = await locator.boundingBox().catch(() => null)
  if (!box) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 })
  await sleep(160)
}

async function clickBtn(page, name, wait = 800) {
  const loc = page.getByRole('button', { name })
  if (!(await loc.count())) {
    console.log('跳过按钮', String(name))
    return false
  }
  const target = loc.first()
  await target.scrollIntoViewIfNeeded()
  await moveTo(page, target)
  await target.click()
  await sleep(wait)
  return true
}

async function fillLabeled(page, label, value) {
  const input = page.locator('label').filter({ hasText: label }).locator('input, textarea').first()
  if (!(await input.count())) return false
  await input.scrollIntoViewIfNeeded()
  await moveTo(page, input)
  await input.click()
  await input.fill('')
  await input.pressSequentially(value, { delay: 45 })
  await sleep(280)
  return true
}

function writeSubs() {
  closeCue()
  const usable = cues.filter((c) => c.end > c.start && (c.text || c.title))
  const srt = usable.map((c, i) => {
    const a = stamp(c.start)
    const b = stamp(c.end)
    return `${i + 1}\n${a.srt} --> ${b.srt}\n${c.title}\n${c.text}\n`
  }).join('\n')
  const vtt = `WEBVTT\n\n${usable.map((c) => {
    const a = stamp(c.start)
    const b = stamp(c.end)
    return `${a.vtt} --> ${b.vtt}\n${c.title}\n${c.text}\n`
  }).join('\n')}`
  fs.writeFileSync(path.join(outDir, '文事台完整功能演示.srt'), srt, 'utf8')
  fs.writeFileSync(path.join(outDir, '文事台完整功能演示.vtt'), vtt, 'utf8')
  console.log('字幕', usable.length, '条')
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge',
    args: ['--disable-dev-shm-usage'],
  })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    locale: 'zh-CN',
    recordVideo: {
      dir: path.join(outDir, 'raw-video'),
      size: { width: 1600, height: 900 },
    },
  })
  const page = await context.newPage()
  page.setDefaultTimeout(15000)
  page.on('dialog', (dialog) => { void dialog.accept() })

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: '今日工作台' }).waitFor({ timeout: 20000 })
  videoStart = Date.now()
  await bootUi(page)
  await sleep(400)

  if (await page.getByRole('button', { name: /重新装入演示数据/ }).count()) {
    await clickBtn(page, /重新装入演示数据/, 1400)
    await page.getByRole('heading', { name: '今日工作台' }).waitFor()
    await bootUi(page)
  }

  await chapter(page, '完整功能演示', '这是湖南谛图科技的文员工作台。用来登合同、管资料库、看发票和收付。今天用演示数据走一遍，不代替盖章外发。', 4200)

  await chapter(page, '1. 今日工作台', '文员每天从这里开工：谁还没开票、哪份合同没收齐、交接还剩几项。', 3200)
  await say(page, '今日工作台', '上面四个数是待办、合同份数、合同未开、合同未付。都从台账里算出来，不用另做一张表。', 3200)
  await page.locator('.stats').first().scrollIntoViewIfNeeded()
  await sleep(1800)
  await say(page, '我的任务', '左边是待办。待开发票、合同未开、交接未完，都会挂在这里。点名称可以跳到对应台账。', 3400)
  await page.getByText('我的任务').first().scrollIntoViewIfNeeded()
  await sleep(1600)
  await say(page, '合同按年', '往下是合同按年。单章和电子分开，点数字就进那一年的采购或销售。', 3000)
  await page.getByText('合同按年').first().scrollIntoViewIfNeeded()
  await sleep(1600)
  await shot(page, '01-今日工作台')

  await say(page, '进入合同', '现在点 2026 年销售单章，看多维表怎么用。', 1800)
  await clickBtn(page, '2026 年销售单章', 1400)

  await chapter(page, '2. 单章 / 电子合同', '按年、按采购或销售打开。格子里改完，立刻写到 D 盘，清浏览器也不丢。', 3400)
  await say(page, '单章合同', '左侧像飞书一样按年展开。先看全部单章，一共有多少份、未开未付多少。', 2800)
  await clickBtn(page, /全部单章合同/, 1600)
  await shot(page, '02-2026销售单章')
  await sleep(1200)

  const search = page.getByPlaceholder('搜索合同名称、相对方、金额…')
  if (await search.count()) {
    await say(page, '检索合同', '上面可以搜合同名称或相对方。输入「临港」，只留下岳阳临港这一家。', 1800)
    await moveTo(page, search)
    await search.click()
    await search.pressSequentially('临港', { delay: 70 })
    await sleep(2400)
    await say(page, '检索合同', '搜到了。清空以后继续按年看。', 1400)
    await search.fill('')
    await sleep(600)
  }

  await say(page, '按年筛选', '点 2026 年，再点销售。只看这一年卖出去的单章合同。', 1600)
  await clickBtn(page, /^2026 年/, 600)
  await clickBtn(page, /销售/, 1400)
  await say(page, '格子里改', '金额、未开、未付都可以在格子里直接改，不用弹出窗口。改完就进台账。', 3200)
  const moneyInput = page.locator('.bitable-board input').nth(4)
  if (await moneyInput.count()) {
    await moneyInput.scrollIntoViewIfNeeded()
    await moveTo(page, moneyInput)
    await moneyInput.click()
    await sleep(1600)
  }

  await say(page, '电子合同', '字段和单章一样。点上面「电子合同」，两套表分开统计、分开导入。', 1800)
  await clickBtn(page, '电子合同', 1600)
  await shot(page, '03-电子合同')
  await sleep(1200)
  await clickBtn(page, /全部电子合同/, 1400)
  await say(page, '电子合同', '电子签的技术服务、云存储，都在这张表。纸质位置记的是柜层。', 3000)

  await chapter(page, '3. 飞书合同导入', '从飞书导出 Excel，或把表复制粘贴进来。按年、按采购销售写入，重复行会跳过。', 3600)
  await clickBtn(page, /导入电子|飞书合同导入/, 1400)
  await say(page, '导入合同', '把飞书多维表拖进来，或复制表头加数据行。单章和电子要分开导，不要混在一张里。', 3600)
  await clickBtn(page, '单章合同', 1200)
  await page.mouse.wheel(0, 220)
  await sleep(1600)

  await chapter(page, '4. 资料库', '左侧目录和飞书云盘对齐。文件在本机 D 盘。飞书在线文档请放链接，不要当空文件传。', 3600)
  await clickBtn(page, /财务资料/, 1500)
  await say(page, '资料库', '现在在财务资料。对账、发票文件夹都在这里。大夹请点「打开资料库文件夹」，用资源管理器复制，比网页上传稳。', 3800)
  await shot(page, '04-资料库财务')

  if (await page.getByRole('button', { name: /发票/ }).count()) {
    await page.getByRole('button', { name: /^发票$|📁\s*发票/ }).first().click().catch(async () => {
      await page.getByText('发票', { exact: true }).first().click()
    })
    await sleep(1400)
  }

  const driveSearch = page.getByPlaceholder('搜索资料库')
  if (await driveSearch.count()) {
    await say(page, '找文件', '资料库可以按文件名搜。输入「发票」，对账夹和发票登记都能找到。', 1600)
    await driveSearch.click()
    await driveSearch.pressSequentially('发票', { delay: 60 })
    await sleep(2400)
    await driveSearch.fill('')
    await sleep(500)
  }

  await clickBtn(page, /招投标资料/, 1400)
  await say(page, '招投标链接', '飞书文档、表格、多维表格不是文件。打开后复制浏览器地址，点「添加链接」。', 2800)
  await shot(page, '05-招投标资料')
  await clickBtn(page, '添加链接', 1000)
  await say(page, '添加链接', '名称写清楚，网址从飞书地址栏复制，保存到当前文件夹。点名称会用浏览器打开。', 1800)
  await fillLabeled(page, '名称', '演示·招标公告')
  await fillLabeled(page, '飞书或网页地址', 'https://www.feishu.cn')
  await sleep(1600)
  await clickBtn(page, '取消', 700)

  await chapter(page, '5. 发票与收付', '待开的发票会回到今日工作台。应收应付要和合同未开、未付对得上。', 3400)
  await clickBtn(page, /财务资料/, 600)
  await clickBtn(page, /发票统计/, 1500)
  await say(page, '发票统计', '可以从合同带出相对方和未开金额。还没拿到票号的，先写成「待开」。', 3400)
  await shot(page, '06-发票统计')
  const sheetSearch = page.getByPlaceholder('搜索本表')
  if (await sheetSearch.count()) {
    await say(page, '待开发票', '搜「待开」，就是今天要盯的两张：客户乙 8000，临港建设二期 27000。', 1800)
    await sheetSearch.scrollIntoViewIfNeeded()
    await sheetSearch.click()
    await sheetSearch.pressSequentially('待开', { delay: 60 })
    await sleep(2600)
    await sheetSearch.fill('')
    await sleep(500)
  } else {
    await page.mouse.wheel(0, 400)
    await sleep(1800)
  }

  await clickBtn(page, /应收应付/, 1500)
  await say(page, '应收应付', '应收账款是别人欠我们的，应付是我们欠别人的。临港尾款、青禾到票未付、投标保证金，都在这里。', 3800)
  await shot(page, '07-应收应付')
  await page.mouse.wheel(0, 360)
  await sleep(2000)

  await chapter(page, '6. 物品、存档、交接', '货架有什么、合同放哪一层柜子、谁还没交完，文员交接时对着这三张表。', 3400)
  await clickBtn(page, /公司基础资料/, 600)
  await clickBtn(page, /物品清单/, 1400)
  await say(page, '物品清单', '大厅货架几层放打印纸、文具、印油。位置和名称两列，找东西不用问人。', 3200)
  await clickBtn(page, /纸质文件存档/, 1400)
  await say(page, '纸质存档', '左柜右柜哪一层放合同、招标文件、财务凭证，登记在这里，和合同表的「纸质版位置」对应。', 3400)
  await clickBtn(page, /工作交接清单/, 1400)
  await say(page, '工作交接', '文档完成情况不是对勾，今日工作台就会出现「交接未完」。交完点完成，待办就收掉。', 3400)
  await page.mouse.wheel(0, 260)
  await sleep(1600)

  await chapter(page, '7. 报价单与合同模板', '只负责起草和套打。下载 Word 之后，发出、盖章仍由人确认。', 3400)
  await clickBtn(page, /今日工作台/, 800)
  await clickBtn(page, '开具报价单', 1300)
  await say(page, '开具报价单', '左边填项目和物料，右边马上出预览。可以复制正文或下载 Word，再写入报价台账。', 2800)
  await fillLabeled(page, '项目名称', '演示·某园区竣工测量')
  await page.locator('label').filter({ hasText: '物料名称' }).locator('input').first().click()
  await page.locator('label').filter({ hasText: '物料名称' }).locator('input').first().fill('')
  await page.locator('label').filter({ hasText: '物料名称' }).locator('input').first().pressSequentially('竣工测量（含地形图）', { delay: 35 })
  await page.locator('label').filter({ hasText: '单位' }).locator('input').first().fill('项')
  await page.locator('label').filter({ hasText: '数量' }).locator('input').first().fill('1')
  await page.locator('label').filter({ hasText: '含税单价' }).locator('input').first().fill('54000')
  await say(page, '开具报价单', '含税合计会跟着数量和单价算。这是演示项目，不是对外报价。', 2800)
  await shot(page, '08-报价单')
  await page.locator('.paper').first().scrollIntoViewIfNeeded().catch(() => undefined)
  await sleep(1600)

  await clickBtn(page, /^合同/, 600)
  await clickBtn(page, /普通合同模板/, 1300)
  await say(page, '普通合同模板', '供方默认本公司，需方、货物、数量填完就能套打合同书。写入后进单章台账。', 2600)
  await fillLabeled(page, '需方', '岳阳临港建设有限公司')
  await fillLabeled(page, '合同号', 'DT-2026-DEMO-01')
  await fillLabeled(page, '名称与规格', '某园区竣工测量')
  await fillLabeled(page, '数量', '1')
  await fillLabeled(page, '单位', '项')
  await fillLabeled(page, '含税单价', '54000')
  await say(page, '普通合同模板', '右边是套打预览。系统不会盖章，也不会自动发给对方。', 3000)
  await shot(page, '09-合同模板')
  await sleep(1400)

  await chapter(page, '回到今日工作台', '待办处理完点「已完成」。讲乱了，侧栏可以重新装入演示数据。', 3200)
  await clickBtn(page, /今日工作台/, 1300)
  await say(page, '处理待办', '点第一条的「已完成」，这条不再挂在待办里。取消也可以，之后还能放回。', 2200)
  await page.getByText('我的任务').first().scrollIntoViewIfNeeded()
  await sleep(800)
  const done = page.getByRole('button', { name: '已完成' })
  if (await done.count()) {
    await moveTo(page, done.first())
    await done.first().click()
    await sleep(2000)
  }
  await shot(page, '10-回到工作台')
  await say(page, '恢复演示', '讲完或讲乱了，点「重新装入演示数据」，虚构台账会回到这一套。正式合同不受影响。', 2200)
  if (await page.getByRole('button', { name: /重新装入演示数据/ }).count()) {
    await clickBtn(page, /重新装入演示数据/, 1400)
  }

  await chapter(page, '演示结束', '双击启动网站.bat，打开 http://localhost:5173/。文事台只起草、登记、提醒，盖章和外发仍由人确认。', 4800)

  closeCue()
  writeSubs()

  await page.close()
  const video = page.video()
  await context.close()
  await browser.close()

  if (video) {
    const raw = await video.path()
    const dest = path.join(outDir, '文事台完整功能演示.webm')
    const also = path.join(outDir, '文事台操作演示.webm')
    fs.copyFileSync(raw, dest)
    fs.copyFileSync(raw, also)
    console.log('视频', dest)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
