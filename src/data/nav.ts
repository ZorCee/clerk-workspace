import type { Page } from '../types'

export const FEISHU_FOLDERS = ['财务资料', '公司基础资料', '合同', '申报资料', '项目资料', '招投标资料']

export interface FolderTool {
  label: string
  hint: string
  page: Page
}

export const FOLDER_TOOLS: Record<string, FolderTool[]> = {
  财务资料: [
    { label: '发票统计', hint: '开票号码与金额', page: { name: 'sheet', sheet: 'invoice' } },
    { label: '应收应付明细', hint: '应收应付分块', page: { name: 'sheet', sheet: 'arap' } },
    { label: '报价单', hint: '含税报价明细', page: { name: 'sheet', sheet: 'quote' } },
  ],
  公司基础资料: [
    { label: '物品清单', hint: '位置与物品', page: { name: 'sheet', sheet: 'item' } },
    { label: '纸质文件存档', hint: '柜层与资料', page: { name: 'sheet', sheet: 'archive' } },
    { label: '工作交接清单', hint: '模块与资料', page: { name: 'sheet', sheet: 'handover' } },
  ],
  合同: [
    { label: '单章合同统计', hint: '单章纸质合同', page: { name: 'sheet', sheet: 'seal' } },
    { label: '电子合同统计', hint: '电子合同档案', page: { name: 'sheet', sheet: 'econtract' } },
    { label: '飞书合同导入', hint: '按年 · 采购 / 销售', page: { name: 'import', sheet: 'seal' } },
    { label: '普通合同模板', hint: '套打后入单章台账', page: { name: 'doc', doc: 'contract' } },
  ],
}

export function sortFeishuFolders(names: string[]): string[] {
  const extra = names.filter((name) => !FEISHU_FOLDERS.includes(name) && name !== '飞书迁入')
  const incoming = names.includes('飞书迁入') ? ['飞书迁入'] : []
  return [...FEISHU_FOLDERS, ...extra.sort((a, b) => a.localeCompare(b, 'zh')), ...incoming]
}

export function toolActive(page: Page, tool: FolderTool): boolean {
  const target = tool.page
  if (page.name !== target.name) return false
  if (target.sheet) return page.sheet === target.sheet
  if (target.doc) return page.doc === target.doc
  return true
}
