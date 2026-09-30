import { applyBalance } from '../lib/balance'
import type { AppData, SheetKind, SheetRow } from '../types'

function row(kind: SheetKind, id: string, fields: Record<string, string>, created: string): SheetRow {
  return { id, kind, fields, createdAt: created, updatedAt: created }
}

function contract(
  kind: 'seal' | 'econtract',
  id: string,
  fields: Record<string, string>,
  created: string,
): SheetRow {
  return row(kind, id, applyBalance(fields), created)
}

/** 给领导或同事看的虚构台账。相对方和金额都是演示用的，不是公司真合同。 */
export function demoData(): AppData {
  return {
    closedDesk: {},
    rows: [
      contract('seal', 'demo-s-23-1', {
        name: '演示·办公电脑采购合同', type: '产品供应商', party: '长沙星河设备有限公司',
        signDate: '2023.3.12', amount: '28600', status: '已完成',
        invoiced: '28600', invoiceDate: '2023年4月8日', invoiceNo: '演示23040801',
        paid: '28600', files: '演示·办公电脑采购合同.txt', paperPlace: '左柜上方第一层',
        notes: '演示数据', archiveYear: '2023', buySell: '采购',
      }, '2023-03-12T10:00:00'),
      contract('seal', 'demo-s-23-2', {
        name: '演示·园区地形图测绘', type: '服务类', party: '岳阳临港建设有限公司',
        signDate: '2023.9.20', amount: '68000', status: '已完成',
        invoiced: '68000', invoiceDate: '2023年11月2日', invoiceNo: '演示23110201',
        paid: '68000', files: '演示·园区地形图测绘.txt', paperPlace: '左柜上方第一层',
        notes: '演示数据', archiveYear: '2023', buySell: '销售',
      }, '2023-09-20T09:00:00'),

      contract('seal', 'demo-s-24-1', {
        name: '演示·服务器托管服务', type: '服务商', party: '湖南青禾软件科技有限公司',
        signDate: '2024.2.18', amount: '24000', status: '已完成',
        invoiced: '24000', invoiceDate: '2024年3月1日', invoiceNo: '演示24030101',
        paid: '24000', files: '演示·服务器托管服务.txt', paperPlace: '左柜上方第一层',
        notes: '演示数据', archiveYear: '2024', buySell: '采购',
      }, '2024-02-18T11:20:00'),
      contract('seal', 'demo-s-24-2', {
        name: '演示·农村房地一体测绘', type: '工程类', party: '株洲某街道办事处',
        signDate: '2024.6.6', amount: '156000', status: '已完成',
        invoiced: '156000', invoiceDate: '2024年12月10日', invoiceNo: '演示24121001',
        paid: '156000', files: '演示·农村房地一体测绘.txt', paperPlace: '左柜上方第一层',
        notes: '演示数据', archiveYear: '2024', buySell: '销售',
      }, '2024-06-06T14:00:00'),
      contract('seal', 'demo-s-24-3', {
        name: '演示·无人机航测设备', type: '产品类', party: '演示·航测器材行',
        signDate: '2024.8.15', amount: '42000', status: '已完成',
        invoiced: '42000', invoiceDate: '2024年9月3日', invoiceNo: '演示24090301',
        paid: '42000', files: '演示·无人机航测设备.txt', paperPlace: '左柜上方第二层',
        notes: '演示数据', archiveYear: '2024', buySell: '采购',
      }, '2024-08-15T16:10:00'),

      contract('seal', 'demo-s-25-1', {
        name: '演示·不动产登记数据建库', type: '服务类', party: '衡阳某自然资源局',
        signDate: '2025.3.8', amount: '98000', status: '已完成',
        invoiced: '98000', invoiceDate: '2025年8月20日', invoiceNo: '演示25082001',
        paid: '98000', files: '演示·不动产登记数据建库.txt', paperPlace: '左柜上方第一层',
        notes: '演示数据', archiveYear: '2025', buySell: '销售',
      }, '2025-03-08T09:40:00'),
      contract('seal', 'demo-s-25-2', {
        name: '演示·打印纸及耗材年度采购', type: '供应商', party: '演示·办公耗材商行',
        signDate: '2025.4.2', amount: '8600', status: '已完成',
        invoiced: '8600', invoiceDate: '2025年4月18日', invoiceNo: '演示25041801',
        paid: '8600', files: '演示·打印纸及耗材年度采购.txt', paperPlace: '左柜下方第一层',
        notes: '演示数据', archiveYear: '2025', buySell: '采购',
      }, '2025-04-02T10:00:00'),
      contract('seal', 'demo-s-25-3', {
        name: '演示·高新区管线探测', type: '工程类', party: '湘潭高新区建设发展公司',
        signDate: '2025.10.11', amount: '72000', status: '履约中',
        invoiced: '36000', invoiceDate: '2025年12月5日', invoiceNo: '演示25120501',
        paid: '36000', files: '演示·高新区管线探测.txt', paperPlace: '左柜上方第一层',
        notes: '演示数据 · 尾款未开', archiveYear: '2025', buySell: '销售',
      }, '2025-10-11T15:00:00'),

      contract('seal', 'demo-s-26-1', {
        name: '演示·办公设备购销合同', type: '供应商', party: '长沙星河设备有限公司',
        signDate: '2026.3.10', amount: '18600', status: '已完成',
        invoiced: '18600', invoiceDate: '2026年3月25日', invoiceNo: '演示26032501',
        paid: '18600', files: '演示·办公设备购销合同.txt', paperPlace: '左柜上方第一层',
        notes: '演示数据', archiveYear: '2026', buySell: '采购',
      }, '2026-03-10T10:00:00'),
      contract('seal', 'demo-s-26-2', {
        name: '演示·某园区竣工测量', type: '工程类', party: '岳阳临港建设有限公司',
        signDate: '2026.5.20', amount: '54000', status: '履约中',
        invoiced: '27000', invoiceDate: '2026年7月8日', invoiceNo: '演示26070801',
        paid: '27000', files: '演示·某园区竣工测量.txt', paperPlace: '左柜上方第一层',
        notes: '演示数据 · 二期未开未付', archiveYear: '2026', buySell: '销售',
      }, '2026-05-20T09:30:00'),
      contract('seal', 'demo-s-26-3', {
        name: '演示·产品销售合同', type: '产品类', party: '演示客户乙',
        signDate: '2026.6.15', amount: '8000', status: '履约中',
        invoiced: '', invoiceDate: '', invoiceNo: '',
        paid: '', files: '演示·产品销售合同.txt', paperPlace: '',
        notes: '演示数据 · 待开票', archiveYear: '2026', buySell: '销售',
      }, '2026-06-15T09:30:00'),
      contract('seal', 'demo-s-26-4', {
        name: '演示·软件维保采购', type: '服务商', party: '湖南青禾软件科技有限公司',
        signDate: '2026.8.1', amount: '12000', status: '履约中',
        invoiced: '12000', invoiceDate: '2026年8月12日', invoiceNo: '演示26081201',
        paid: '', files: '演示·软件维保采购.txt', paperPlace: '左柜下方第二层',
        notes: '演示数据 · 票已到款未付', archiveYear: '2026', buySell: '采购',
      }, '2026-08-01T11:00:00'),

      contract('econtract', 'demo-e-23-1', {
        name: '演示·云存储年度服务', type: '服务类', party: '演示·云服务商',
        signDate: '2023.1.6', amount: '9600', status: '已完成',
        invoiced: '9600', invoiceDate: '2023/1/20', invoiceNo: '演示E230120',
        paid: '9600', files: '演示·云存储年度服务.txt', paperPlace: '3号柜1层演示盒',
        notes: '电子签', archiveYear: '2023', buySell: '采购',
      }, '2023-01-06T10:00:00'),
      contract('econtract', 'demo-e-24-1', {
        name: '演示·技术服务协议', type: '服务类', party: '演示合作方丙',
        signDate: '2024.4.16', amount: '20000', status: '已完成',
        invoiced: '20000', invoiceDate: '2024/6/20', invoiceNo: '演示E240620',
        paid: '20000', files: '演示·技术服务协议.txt', paperPlace: '3号柜1层演示盒',
        notes: '电子签', archiveYear: '2024', buySell: '销售',
      }, '2024-04-16T14:00:00'),
      contract('econtract', 'demo-e-25-1', {
        name: '演示·电子签章服务采购', type: '服务商', party: '演示·电子签平台',
        signDate: '2025.2.14', amount: '4800', status: '已完成',
        invoiced: '4800', invoiceDate: '2025/2/28', invoiceNo: '演示E250228',
        paid: '4800', files: '演示·电子签章服务采购.txt', paperPlace: '3号柜1层演示盒',
        notes: '电子签', archiveYear: '2025', buySell: '采购',
      }, '2025-02-14T09:00:00'),
      contract('econtract', 'demo-e-25-2', {
        name: '演示·数据加工分包', type: '服务类', party: '常德某数据公司',
        signDate: '2025.7.9', amount: '35000', status: '已完成',
        invoiced: '35000', invoiceDate: '2025/11/15', invoiceNo: '演示E251115',
        paid: '35000', files: '演示·数据加工分包.txt', paperPlace: '3号柜1层演示盒',
        notes: '电子签', archiveYear: '2025', buySell: '销售',
      }, '2025-07-09T13:20:00'),
      contract('econtract', 'demo-e-26-1', {
        name: '演示·技术服务协议', type: '服务类', party: '演示合作方丙',
        signDate: '2026.4.16', amount: '20000', status: '履约中',
        invoiced: '10000', invoiceDate: '2026/5/20', invoiceNo: '演示E260520',
        paid: '10000', files: '演示·技术服务协议-2026.txt', paperPlace: '3号柜1层演示盒',
        notes: '电子签 · 二期未开', archiveYear: '2026', buySell: '销售',
      }, '2026-04-16T14:00:00'),
      contract('econtract', 'demo-e-26-2', {
        name: '演示·投标保证金监管', type: '框架订单', party: '演示·招标代理',
        signDate: '2026.7.22', amount: '5000', status: '履约中',
        invoiced: '', invoiceDate: '', invoiceNo: '',
        paid: '', files: '演示·投标保证金监管.txt', paperPlace: '',
        notes: '电子签 · 待开', archiveYear: '2026', buySell: '采购',
      }, '2026-07-22T16:40:00'),

      row('invoice', 'demo-i-1', {
        invoiceNo: '演示26032501', invoiceDate: '2026年3月25日', party: '长沙星河设备有限公司',
        contractName: '演示·办公设备购销合同', amount: '18600', buySell: '采购', notes: '',
      }, '2026-03-25T16:00:00'),
      row('invoice', 'demo-i-2', {
        invoiceNo: '演示26070801', invoiceDate: '2026年7月8日', party: '岳阳临港建设有限公司',
        contractName: '演示·某园区竣工测量', amount: '27000', buySell: '销售', notes: '一期',
      }, '2026-07-08T11:00:00'),
      row('invoice', 'demo-i-3', {
        invoiceNo: '演示E260520', invoiceDate: '2026/5/20', party: '演示合作方丙',
        contractName: '演示·技术服务协议', amount: '10000', buySell: '销售', notes: '',
      }, '2026-05-20T15:00:00'),
      row('invoice', 'demo-i-4', {
        invoiceNo: '待开', invoiceDate: '', party: '演示客户乙',
        contractName: '演示·产品销售合同', amount: '8000', buySell: '销售', notes: '对应合同未开，演示待办',
      }, '2026-08-18T09:00:00'),
      row('invoice', 'demo-i-5', {
        invoiceNo: '待开', invoiceDate: '', party: '岳阳临港建设有限公司',
        contractName: '演示·某园区竣工测量', amount: '27000', buySell: '销售', notes: '二期待开',
      }, '2026-08-20T09:00:00'),

      row('arap', 'demo-a-1', {
        category: '应收账款', party: '演示客户乙', related: '8000',
        ticketed: '0', settled: '0', balance: '8000', notes: '销售合同未开票',
      }, '2026-06-15T10:00:00'),
      row('arap', 'demo-a-2', {
        category: '应收账款', party: '岳阳临港建设有限公司', related: '54000',
        ticketed: '27000', settled: '27000', balance: '27000', notes: '竣工测量尾款',
      }, '2026-05-20T10:00:00'),
      row('arap', 'demo-a-3', {
        category: '应收账款', party: '演示合作方丙', related: '20000',
        ticketed: '10000', settled: '10000', balance: '10000', notes: '电子合同二期',
      }, '2026-04-16T10:00:00'),
      row('arap', 'demo-a-4', {
        category: '应付账款', party: '长沙星河设备有限公司', related: '18600',
        ticketed: '18600', settled: '18600', balance: '0', notes: '',
      }, '2026-03-25T10:00:00'),
      row('arap', 'demo-a-5', {
        category: '应付账款', party: '湖南青禾软件科技有限公司', related: '12000',
        ticketed: '12000', settled: '0', balance: '12000', notes: '维保已到票未付款',
      }, '2026-08-12T10:00:00'),
      row('arap', 'demo-a-6', {
        category: '预付账款', party: '演示·招标代理', related: '5000',
        ticketed: '0', settled: '0', balance: '5000', notes: '投标保证金',
      }, '2026-07-22T10:00:00'),

      row('item', 'demo-g-1', { place: '大厅货架1F', name: '打印纸、一次性纸杯' }, '2026-06-17T14:00:00'),
      row('item', 'demo-g-2', { place: '大厅货架2F', name: '收纳笔盒、记事本、印泥' }, '2026-06-17T14:00:00'),
      row('item', 'demo-g-3', { place: '大厅货架3F', name: '夹子、印油、白板笔' }, '2026-06-17T14:00:00'),
      row('item', 'demo-g-4', { place: '财务抽屉', name: 'U盘备份、发票夹' }, '2026-06-17T14:10:00'),

      row('archive', 'demo-f-1', { place: '左柜上方第一层', content: '演示·采购/销售合同（2023–2026）' }, '2026-06-18T18:00:00'),
      row('archive', 'demo-f-2', { place: '左柜上方第一层', content: '演示·招标文件复印件' }, '2026-06-18T18:00:00'),
      row('archive', 'demo-f-3', { place: '左柜上方第二层', content: '演示·财务凭证（按月）' }, '2026-06-18T18:00:00'),
      row('archive', 'demo-f-4', { place: '右柜上方第一层', content: '演示·营业执照、开户许可复印件' }, '2026-06-18T18:00:00'),

      row('quote', 'demo-q-1', {
        project: '演示·某园区竣工测量', date: '2026年5月8日', material: '竣工测量（含地形图）',
        unit: '项', qty: '1', price: '54000', total: '54000', notes: '含税',
      }, '2026-05-08T09:40:00'),
      row('quote', 'demo-q-2', {
        project: '演示·办公设备', date: '2026年3月2日', material: '台式计算机',
        unit: '台', qty: '3', price: '6200', total: '18600', notes: '含税',
      }, '2026-03-02T09:40:00'),

      row('handover', 'demo-h-1', {
        module: '财务对账', item: '客户对账工作', materials: '对账台账、应收应付表',
        goods: '电子对账单', progress: '演示资料库已放链接', docs: '应收应付表', docDone: '√',
      }, '2026-06-17T16:00:00'),
      row('handover', 'demo-h-2', {
        module: '合同归档', item: '合同原件归档', materials: '单章/电子合同台账',
        goods: '柜钥匙', progress: '进行中', docs: '合同统计表', docDone: '进行中',
      }, '2026-08-18T09:10:00'),
      row('handover', 'demo-h-3', {
        module: '开票权限', item: '销项待开清单交接', materials: '发票统计、合同未开列',
        goods: '税盘口令本', progress: '待文员核对', docs: '待开发票2张', docDone: '未完成',
      }, '2026-08-25T09:10:00'),
    ],
  }
}
