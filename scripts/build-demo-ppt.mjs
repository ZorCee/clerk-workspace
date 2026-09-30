import PptxGenJS from 'pptxgenjs'
import fs from 'node:fs'
import path from 'node:path'

const outDir = path.resolve('演示')
const shotDir = path.join(outDir, '截图')
const pptPath = path.join(outDir, '文事台演示.pptx')

const NAVY = '021F40'
const TEAL = '14C3CF'
const PAPER = 'F7F9FC'
const INK = '071A35'
const MUTED = '5A6B80'
const WHITE = 'FFFFFF'

function shot(name) {
  const file = path.join(shotDir, `${name}.png`)
  return fs.existsSync(file) ? file : ''
}

const pptx = new PptxGenJS()
pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 })
pptx.layout = 'WIDE'
pptx.author = '湖南谛图科技有限公司'
pptx.title = '文事台演示'
pptx.subject = '内部文员工作台'

function cover() {
  const s = pptx.addSlide()
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: NAVY } })
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: TEAL } })
  s.addText('湖南谛图科技有限公司', {
    x: 0.9, y: 1.7, w: 11, h: 0.4,
    fontSize: 14, color: TEAL, fontFace: 'Microsoft YaHei', margin: 0,
  })
  s.addText('文事台', {
    x: 0.9, y: 2.2, w: 11, h: 1.1,
    fontSize: 54, bold: true, color: WHITE, fontFace: 'Microsoft YaHei', margin: 0,
  })
  s.addText('内部文员工作台演示', {
    x: 0.9, y: 3.4, w: 11, h: 0.5,
    fontSize: 22, color: 'CFE8EF', fontFace: 'Microsoft YaHei', margin: 0,
  })
  s.addText('把飞书里的云盘和合同表，收到本机工作台。\n系统只起草、登记、提醒，不代替盖章外发。', {
    x: 0.9, y: 4.3, w: 10, h: 1,
    fontSize: 16, color: '8FB4C8', fontFace: 'Microsoft YaHei', margin: 0,
  })
  s.addText('演示数据 · 虚构台账  |  本机 http://localhost:5173/', {
    x: 0.9, y: 6.6, w: 11, h: 0.35,
    fontSize: 12, color: '8FB4C8', fontFace: 'Microsoft YaHei', margin: 0,
  })
  s.addNotes('开场：这是给办公室文员用的本机工作台，用来接飞书云盘和合同台账。今天用演示数据走一遍，不碰真合同。')
}

function section(no, title, lines, notes) {
  const s = pptx.addSlide()
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: PAPER } })
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: TEAL } })
  s.addText(no, {
    x: 0.7, y: 0.45, w: 2, h: 0.35,
    fontSize: 12, color: TEAL, fontFace: 'Microsoft YaHei', margin: 0,
  })
  s.addText(title, {
    x: 0.7, y: 0.85, w: 12, h: 0.7,
    fontSize: 28, bold: true, color: INK, fontFace: 'Microsoft YaHei', margin: 0,
  })
  s.addText(lines.map((t) => ({ text: t, options: { bullet: false, breakLine: true } })), {
    x: 0.7, y: 1.8, w: 12, h: 4.8,
    fontSize: 18, color: INK, fontFace: 'Microsoft YaHei', paraSpaceAfter: 10,
  })
  if (notes) s.addNotes(notes)
}

function shotSlide(no, title, image, caption, notes) {
  const s = pptx.addSlide()
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: PAPER } })
  s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: TEAL } })
  s.addText(no, {
    x: 0.5, y: 0.28, w: 2, h: 0.28,
    fontSize: 11, color: TEAL, fontFace: 'Microsoft YaHei', margin: 0,
  })
  s.addText(title, {
    x: 0.5, y: 0.52, w: 12.3, h: 0.42,
    fontSize: 20, bold: true, color: INK, fontFace: 'Microsoft YaHei', margin: 0,
  })
  if (image) {
    s.addImage({ path: image, x: 0.45, y: 1.05, w: 12.4, h: 5.7 })
  } else {
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.7, y: 2.2, w: 12, h: 3,
      fill: { color: WHITE }, rectRadius: 0.08,
    })
    s.addText('请先运行 npm run demo:record 生成截图', {
      x: 0.7, y: 3.3, w: 12, h: 0.5, align: 'center',
      fontSize: 16, color: MUTED, fontFace: 'Microsoft YaHei',
    })
  }
  if (caption) {
    s.addText(caption, {
      x: 0.5, y: 6.9, w: 12.3, h: 0.35,
      fontSize: 12, color: MUTED, fontFace: 'Microsoft YaHei', margin: 0,
    })
  }
  if (notes) s.addNotes(notes)
}

cover()

section('01', '要解决什么', [
  '飞书里同时放着云盘文件夹、合同多维表、发票和对账。',
  '文员每天要找文件、登合同、看谁还没开票、谁还没交接。',
  '文事台把这些收到本机 D 盘：台账可检索、可改，文件可打开。',
  '聊天、日程、审批仍留在飞书。工作台不代替盖章、也不对外发送。',
], '先讲边界，避免被问“能不能直接盖章外发”。强调：起草、登记、提醒。')

shotSlide(
  '02',
  '今日工作台：待办一眼看完',
  shot('01-今日工作台'),
  '待开发票、合同未开、交接未完，都会挂在「我的任务」里。',
  '点开首页。讲四个数字：待办、合同份数、未开、未付。再点一条待办，说明任务从台账长出来，不是另写一份待办表。',
)

shotSlide(
  '03',
  '合同按年 · 采购 / 销售',
  shot('02-2026销售单章'),
  '2023–2026 单章、电子分开看。格子里可以直接改，像飞书多维表。',
  '点「2026 年销售单章」。改一个未开金额，说明保存到 D 盘，清浏览器也不丢。再切到电子合同。',
)

shotSlide(
  '04',
  '电子合同同一套列',
  shot('03-电子合同'),
  '单章和电子分开导入、分开统计，字段对齐飞书合同表。',
  '强调和飞书多维表同一套列：相对方、金额、已开未开、已付未付、纸质位置。',
)

shotSlide(
  '05',
  '资料库：左侧目录对齐飞书云盘',
  shot('04-资料库财务'),
  '财务资料、公司基础资料、合同、申报、项目、招投标。文件在 D:\\谛图文事台数据\\资料库。',
  '点左侧「财务资料」。大文件夹建议用「打开资料库文件夹」在资源管理器里复制，比网页上传稳。',
)

shotSlide(
  '06',
  '招投标里的在线文档是链接',
  shot('05-招投标资料'),
  '飞书文档 / 表格 / 多维表格不是文件。复制浏览器地址，在文件夹里「添加链接」。',
  '点招投标资料，指一下链接条目。打开会走浏览器。不要把飞书占位空文件当附件上传。',
)

shotSlide(
  '07',
  '发票统计',
  shot('06-发票统计'),
  '5 条发票，合计 90,600。待开可以空着，写完会出现在今日工作台。',
  '指「待开」两行：演示客户乙 8000、临港建设二期 27000。讲完可点「已完成」把待办收掉。',
)

shotSlide(
  '08',
  '应收应付能对上合同',
  shot('07-应收应付'),
  '6 条往来，余额合计 62,000。和合同未开未付同一套数。',
  '点开岳阳临港、青禾软件两条。说明财务对账不用再另开一张飞书表。',
)

shotSlide(
  '09',
  '报价单只起草，不外发',
  shot('08-报价单'),
  '按模板填物料、数量、含税单价。导出 Word 后仍由人确认再发。',
  '打开报价单，点一下导出或预览。重复一句：系统不代替发送。',
)

shotSlide(
  '10',
  '普通合同模板同样只套打',
  shot('09-合同模板'),
  '供方需方合同书。套打后可登记进单章台账。',
  '快速带过即可。有人问电子签：电子合同在另一张表，这里是纸质套打。',
)

section('11', '系统边界', [
  '做：合同 / 发票 / 应收应付 / 物品 / 存档 / 报价 / 交接 / 本机资料库。',
  '不做：聊天、日程、审批、在线多人同时改文档、公章与外发。',
  '数据在 D:\\谛图文事台数据，同时留 wenshi.bak.json 备份。',
  '发出和归档仍由人确认。',
], '收尾前再讲一次边界，避免会后被当成“飞书替代品全家桶”。')

section('12', '怎么开、怎么讲', [
  '双击「启动网站.bat」，浏览器打开 http://localhost:5173/',
  '首页按「演示怎么讲」点五步，大约三分钟。',
  '讲乱了：侧栏「重新装入演示数据」。',
  '关：关闭网站.bat，或窗口里 Ctrl+C。',
  '给外地看：开启外地访问.bat，把临时链接发出去。',
], '如果现场没有投影，就直接开网站点，这套 PPT 当提词器用。操作录像在「文事台操作演示.webm」。')

const end = pptx.addSlide()
end.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: NAVY } })
end.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: TEAL } })
end.addText('谢谢', {
  x: 0.9, y: 2.5, w: 11, h: 0.9,
  fontSize: 48, bold: true, color: WHITE, fontFace: 'Microsoft YaHei', margin: 0,
})
end.addText('文事台  ·  湖南谛图科技有限公司\n有问题可以当场打开工作台看。', {
  x: 0.9, y: 3.6, w: 11, h: 1,
  fontSize: 18, color: 'CFE8EF', fontFace: 'Microsoft YaHei', margin: 0,
})
end.addNotes('结束：问要不要当场看真环境。真合同用启动网站后的正式数据；今天这套是虚构演示。')

await pptx.writeFile({ fileName: pptPath })
console.log('PPT', pptPath)
