import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const dataDir = process.env.WENSHI_DATA_DIR || 'D:\\谛图文事台数据-演示'
const port = process.env.WENSHI_PORT || '5175'
const driveDir = path.join(dataDir, '资料库')
const attachDir = path.join(dataDir, '附件')

process.env.WENSHI_DEMO = '1'
process.env.WENSHI_DATA_DIR = dataDir
process.env.WENSHI_PORT = port

const files = [
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

const links = [
  ['办公网站及密码信息.url', 'https://www.disting.cn'],
  ['财务对账知识库.url', 'https://www.feishu.cn'],
  ['费用报销单.url', 'https://www.feishu.cn'],
  ['易代账账套重建.url', 'https://www.feishu.cn'],
  ['云盘归档资料一览表.url', 'https://www.feishu.cn'],
  ['账套对账工作.url', 'https://www.feishu.cn'],
]

function writeText(rel, text) {
  const full = path.join(driveDir, ...rel.split('/'))
  fs.mkdirSync(path.dirname(full), { recursive: true })
  if (!fs.existsSync(full)) fs.writeFileSync(full, text, 'utf8')
}

function writeLink(rel, href) {
  const full = path.join(driveDir, rel)
  if (fs.existsSync(full)) return
  fs.writeFileSync(full, `[InternetShortcut]\r\nURL=${href}\r\n`, 'utf8')
}

fs.mkdirSync(attachDir, { recursive: true })
fs.mkdirSync(driveDir, { recursive: true })
for (const folder of ['财务资料', '公司基础资料', '合同', '申报资料', '项目资料', '招投标资料']) {
  fs.mkdirSync(path.join(driveDir, folder), { recursive: true })
}
for (const [rel, text] of files) writeText(rel, text)
for (const [rel, href] of links) writeLink(rel, href)

const sampleAttach = path.join(attachDir, '演示·办公设备购销合同.txt')
if (!fs.existsSync(sampleAttach)) {
  fs.writeFileSync(sampleAttach, '演示附件。正式扫描件请放进这个附件夹，文件名与合同台账「合同」列一致。', 'utf8')
}

if (process.argv.includes('--fresh')) {
  const json = path.join(dataDir, 'wenshi.json')
  if (fs.existsSync(json)) fs.rmSync(json)
}

console.log('这是演示环境，不会改正式台账。')
console.log(`数据目录：${dataDir}`)
console.log(`本机访问：http://localhost:${port}/`)
console.log('正式环境请用「启动网站.bat」（5173）。两边可以同时开。')
console.log('讲完后侧栏可点「重新装入演示数据」，台账会回到这套演示数据。')
console.log('')

const child = spawn('npx', ['vite', '--host', '--port', port], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

child.on('exit', (code) => {
  process.exit(code ?? 0)
})
