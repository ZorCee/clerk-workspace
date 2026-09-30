export type SheetKind =
  | 'seal'
  | 'econtract'
  | 'invoice'
  | 'arap'
  | 'item'
  | 'archive'
  | 'quote'
  | 'handover'

export type DocKind = 'quote' | 'contract'
export type PageName = 'workbench' | 'sheet' | 'doc' | 'import' | 'drive'

export interface Page {
  name: PageName
  sheet?: SheetKind
  doc?: DocKind
  id?: string
  year?: string
  buySell?: string
  path?: string
}

export interface SheetRow {
  id: string
  kind: SheetKind
  fields: Record<string, string>
  createdAt: string
  updatedAt: string
}

export type DeskClose = 'done' | 'cancelled'

export interface AppData {
  rows: SheetRow[]
  closedDesk?: Record<string, DeskClose>
}

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'date' | 'money' | 'number' | 'select'
  options?: string[]
  required?: boolean
  placeholder?: string
}

export interface SheetSchema {
  kind: SheetKind
  name: string
  fileHint: string
  description: string
  fields: FieldDef[]
  titleKey: string
  moneyKeys?: string[]
}
