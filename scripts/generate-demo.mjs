import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const sourceDemo = process.env.WENSHI_DEMO_SOURCE || 'D:\\谛图文事台数据-演示'
const target = process.argv[2] || process.env.WENSHI_DATA_DIR || 'D:\\谛图文事台数据'

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
  const full = path.join(target, '资料库', ...rel.split('/'))
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, text, 'utf8')
}

const drive = path.join(target, '资料库')
const attach = path.join(target, '附件')
fs.mkdirSync(drive, { recursive: true })
fs.mkdirSync(attach, { recursive: true })
for (const folder of ['财务资料', '公司基础资料', '合同', '申报资料', '项目资料', '招投标资料']) {
  fs.mkdirSync(path.join(drive, folder), { recursive: true })
}
for (const [rel, text] of files) writeText(rel, text)
for (const [rel, href] of links) {
  fs.writeFileSync(path.join(drive, rel), `[InternetShortcut]\r\nURL=${href}\r\n`, 'utf8')
}

const attachName = '演示·办公设备购销合同.txt'
fs.writeFileSync(path.join(attach, attachName), '演示附件。正式扫描件请放进这个附件夹，文件名与合同台账「合同」列一致。', 'utf8')

const fromJson = path.join(sourceDemo, 'wenshi.json')
const bundled = path.join(root, 'demo-ledger.json')
let ledger
if (fs.existsSync(fromJson)) {
  ledger = fs.readFileSync(fromJson, 'utf8')
} else if (fs.existsSync(bundled)) {
  ledger = fs.readFileSync(bundled, 'utf8')
} else {
  throw new Error('没有演示台账 JSON。请先开一次演示环境，或把 demo-ledger.json 放进 scripts。')
}

const dest = path.join(target, 'wenshi.json')
if (fs.existsSync(dest)) fs.copyFileSync(dest, path.join(target, 'wenshi.bak.json'))
fs.writeFileSync(dest, ledger, 'utf8')

const parsed = JSON.parse(ledger)
console.log(`已生成演示：${target}`)
console.log(`台账 ${parsed.rows?.length || 0} 条，资料库文件夹已写入。`)
