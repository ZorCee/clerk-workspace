import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { COMPANY } from '../data/brand'
import { FEISHU_FOLDERS, FOLDER_TOOLS, sortFeishuFolders, toolActive } from '../data/nav'
import { exportBackup } from '../lib/export'
import { displayName, listDrive, mkdirDrive, openDrive, type DriveItem } from '../lib/drive'
import { openAttachFolder, openDataFolder } from '../lib/storage'
import { useStore } from '../store'
import type { AppData } from '../types'
import { Logo } from './Logo'

export function Layout({ children }: { children: ReactNode }) {
  const { page, go, data, saveError, importData, resetDemo, clearAll, demo, dataDir } = useStore()
  const showDemo = demo || data.rows.some((r) => String(r.id).startsWith('demo-'))
  const fileRef = useRef<HTMLInputElement>(null)
  const [folders, setFolders] = useState<string[]>(FEISHU_FOLDERS)
  const [links, setLinks] = useState<DriveItem[]>([])
  const [openGroup, setOpenGroup] = useState('')

  useEffect(() => {
    void listDrive('').then((listed) => {
      setFolders(sortFeishuFolders(listed.items.filter((item) => item.type === 'dir').map((item) => item.name)))
      setLinks(listed.items.filter((item) => item.type === 'link'))
    }).catch(() => {
      setFolders(FEISHU_FOLDERS)
    })
  }, [page.name, page.path])

  useEffect(() => {
    if (page.name === 'drive' && page.path) {
      setOpenGroup(page.path.split('/')[0] || '')
      return
    }
    for (const [folder, tools] of Object.entries(FOLDER_TOOLS)) {
      if (tools.some((tool) => toolActive(page, tool))) {
        setOpenGroup(folder)
        return
      }
    }
  }, [page])

  function onImport(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (!parsed || !Array.isArray(parsed.rows)) throw new Error('bad')
        importData(parsed)
      } catch {
        window.alert('备份文件无法识别。请导入本工具导出的 JSON。')
      }
    }
    reader.readAsText(file)
  }

  function openFolder(name: string) {
    setOpenGroup(name)
    void mkdirDrive(name).finally(() => go({ name: 'drive', path: name }))
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand" onClick={() => go({ name: 'workbench' })}>
          <Logo tone="light" />
          <div className="brand-meta">
            <strong>{COMPANY.product}</strong>
            <em>内部文员工作台</em>
          </div>
        </div>
        <nav>
          <button className={page.name === 'workbench' ? 'active' : ''} onClick={() => go({ name: 'workbench' })}>
            <span>今日工作台</span>
            <small>合同发票一眼看完</small>
          </button>
          <p className="nav-label">谛图科技</p>
          {folders.map((folder) => {
            const tools = FOLDER_TOOLS[folder] || []
            const expanded = openGroup === folder
            const folderActive = page.name === 'drive' && (page.path === folder || (page.path || '').startsWith(`${folder}/`))
            return (
              <div key={folder} className="nav-group">
                <button
                  className={folderActive ? 'active' : ''}
                  onClick={() => openFolder(folder)}
                >
                  <span>{folder}</span>
                  <small>{tools.length ? `${tools.length} 项台账` : '文件夹'}</small>
                </button>
                {expanded && tools.map((tool) => (
                  <button
                    key={tool.label}
                    className={toolActive(page, tool) ? 'active child' : 'child'}
                    onClick={() => go(tool.page)}
                  >
                    <span>{tool.label}</span>
                    <small>{tool.hint}</small>
                  </button>
                ))}
              </div>
            )
          })}
          {links.map((item) => (
            <button
              key={item.name}
              onClick={() => { void openDrive(item.name) }}
            >
              <span>{displayName(item.name)}</span>
              <small>浏览器链接</small>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button type="button" onClick={() => { void openDataFolder() }}>打开D盘数据夹</button>
          <button type="button" onClick={() => { void openAttachFolder() }}>打开附件夹</button>
          <button type="button" onClick={() => exportBackup(data)}>导出备份</button>
          <button type="button" onClick={() => fileRef.current?.click()}>导入备份</button>
          <button type="button" onClick={() => { if (confirm(showDemo ? '重新装入演示数据？当前内容会被覆盖。' : '恢复为演示数据？当前内容会被覆盖。')) resetDemo() }}>重新装入演示数据</button>
          <button type="button" className="danger" onClick={() => { if (confirm('清空全部本地数据？')) clearAll() }}>清空数据</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImport(file)
              e.target.value = ''
            }}
          />
          <p className="hint">左侧目录与飞书云盘一致。台账和文件都在 {dataDir}。</p>
          {saveError && <p className="hint">{saveError}</p>}
          <p className="company">{COMPANY.name}</p>
        </div>
      </aside>
      <div className="workspace">
        {showDemo && (
          <div className="demo-banner">
            {demo
              ? '演示数据 · 虚构合同和文件夹，不会改 D:\\谛图文事台数据。正式环境请用「启动网站.bat」（5173）。'
              : '当前是演示台账（虚构合同与资料库）。导入飞书真数据后可清空；侧栏「重新装入演示数据」会回到这一套。'}
          </div>
        )}
        <header className="topbar">
          <Logo tone="dark" />
          <span>{COMPANY.name} · {COMPANY.product}{showDemo ? ' · 演示' : ''}</span>
        </header>
        <main className={page.name === 'sheet' && (page.sheet === 'seal' || page.sheet === 'econtract') || page.name === 'drive' ? 'main wide' : 'main'}>{children}</main>
      </div>
    </div>
  )
}
