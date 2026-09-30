import { useEffect, useRef, useState } from 'react'
import {
  addDriveLink,
  clearDrive,
  collectAttach,
  deleteDrive,
  displayName,
  formatSize,
  importZip,
  joinDrive,
  listDrive,
  mkdirDrive,
  openDrive,
  openDriveRoot,
  renameDrive,
  searchDrive,
  uploadDrive,
  type DriveItem,
} from '../lib/drive'
import { useStore } from '../store'

function fileDate(iso: string): string {
  if (!iso) return '—'
  return iso.slice(0, 16).replace('T', ' ')
}

export function DrivePage() {
  const { page } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)
  const zipRef = useRef<HTMLInputElement>(null)
  const [cwd, setCwd] = useState(page.path || '')
  const [items, setItems] = useState<DriveItem[]>([])
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<DriveItem[] | null>(null)
  const [busy, setBusy] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [showLink, setShowLink] = useState(false)

  const crumbs = cwd ? cwd.split('/') : []
  const showing = hits ?? items

  async function refresh(path = cwd) {
    setError('')
    const data = await listDrive(path)
    setCwd(data.path)
    setItems(data.items)
    setHits(null)
  }

  useEffect(() => {
    void refresh(page.path || '').catch((err: unknown) => {
      setError(err instanceof Error ? err.message : '资料库打不开')
    })
  }, [page.path])

  async function run(label: string, work: () => Promise<void>) {
    setBusy(label)
    setError('')
    try {
      await work()
    } catch (err) {
      setError(err instanceof Error ? err.message : label + '失败')
    } finally {
      setBusy('')
    }
  }

  async function putFiles(files: File[], folder = cwd) {
    if (!files.length) return
    const list = files.filter((file) => file.size > 0)
    if (!list.length) {
      setError('选中的文件是空的，或还在飞书同步、本机读不到内容。请先下载到电脑再上传，或直接复制到资料库文件夹。')
      return
    }
    const zips = list.filter((f) => /\.zip$/i.test(f.name))
    const rest = list.filter((f) => !/\.zip$/i.test(f.name))
    await run(`正在写入 ${list.length} 个文件…`, async () => {
      let done = 0
      for (const file of zips) {
        await importZip(joinDrive(folder, '飞书迁入'), file, (sent, total) => {
          setBusy(`解压包 ${file.name} ${Math.round((sent / total) * 100)}%`)
        })
        done += 1
        setBusy(`已完成 ${done}/${list.length}`)
      }
      for (const file of rest) {
        const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
        await uploadDrive(joinDrive(folder, relative), file, (sent, total) => {
          setBusy(`${done + 1}/${list.length} ${file.name} ${Math.round((sent / total) * 100)}%`)
        })
        done += 1
      }
      await refresh(folder)
    })
  }

  function openItem(item: DriveItem) {
    const rel = hits ? item.name : joinDrive(cwd, item.name)
    if (item.type === 'dir') {
      setQ('')
      void refresh(rel)
      return
    }
    void run('正在打开', async () => { await openDrive(rel) })
  }

  return (
    <div className="page bitable-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">D:\谛图文事台数据\资料库 · 替代飞书云盘</p>
          <h1>资料库</h1>
        </div>
        <div className="row-actions">
          <button onClick={() => fileRef.current?.click()}>上传文件</button>
          <button onClick={() => folderRef.current?.click()}>上传文件夹</button>
          <button onClick={() => zipRef.current?.click()}>导入飞书压缩包</button>
          <button onClick={() => { void openDriveRoot() }}>打开资料库文件夹</button>
          <button className="danger" onClick={() => {
            if (!confirm('清空资料库全部文件和文件夹？台账不会动。清空后可重新从飞书导入。')) return
            void run('正在清空资料库', async () => {
              const n = await clearDrive()
              await refresh('')
              window.alert(n ? `已清空 ${n} 项，可以重新导入。` : '资料库已经是空的。')
            })
          }}>清空资料库</button>
        </div>
      </header>

      <p className="hint">
        文件夹结构可以和飞书一样：财务资料、合同、招投标资料… 整夹上传就会保留层级。招投标资料下面那些飞书文档/表格/多维表格不是文件，是网址，请打开后复制浏览器地址，在对应文件夹里「添加链接」。点名称会用浏览器打开飞书。
      </p>

      <div
        className={dragging ? 'drop-zone active' : 'drop-zone'}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void putFiles([...e.dataTransfer.files])
        }}
      >
        <strong>{busy || '把飞书下载的文件、文件夹或 zip 拖到这里'}</strong>
        <span>大文件夹请点「打开资料库文件夹」，用资源管理器直接复制，比网页上传稳。zip 会先分片上传再解压。</span>
      </div>

      <input ref={fileRef} type="file" multiple hidden onChange={(e) => { void putFiles([...e.target.files || []]); e.target.value = '' }} />
      <input ref={folderRef} type="file" multiple hidden onChange={(e) => { void putFiles([...e.target.files || []]); e.target.value = '' }} {...{ webkitdirectory: '', directory: '' }} />
      <input ref={zipRef} type="file" accept=".zip" hidden onChange={(e) => { void putFiles([...e.target.files || []]); e.target.value = '' }} />

      {error && <p className="card late">{error}</p>}

      <div className="toolbar">
        <nav className="drive-crumb">
          <button type="button" className="text" onClick={() => void refresh('')}>资料库</button>
          {crumbs.map((part, idx) => (
            <span key={`${part}-${idx}`}>
              <em>/</em>
              <button type="button" className="text" onClick={() => void refresh(crumbs.slice(0, idx + 1).join('/'))}>{part}</button>
            </span>
          ))}
        </nav>
        <input
          placeholder="搜索资料库"
          value={q}
          onChange={(e) => {
            const value = e.target.value
            setQ(value)
            if (!value.trim()) {
              setHits(null)
              return
            }
            void searchDrive(value.trim()).then(setHits).catch((err: unknown) => {
              setError(err instanceof Error ? err.message : '搜索失败')
            })
          }}
        />
        <button onClick={() => {
          const name = window.prompt('新文件夹名称')
          if (!name?.trim()) return
          void run('正在建夹', async () => {
            await mkdirDrive(joinDrive(cwd, name.trim()))
            await refresh()
          })
        }}>新建文件夹</button>
        <button onClick={() => setShowLink((v) => !v)}>添加链接</button>
        <button onClick={() => {
          void run('正在收入附件', async () => {
            const n = await collectAttach()
            await refresh()
            window.alert(n ? `已把 ${n} 个附件副本放到「合同附件」。原附件夹还在。` : '附件夹是空的，或都已经收过了。')
          })
        }}>收入合同附件</button>
      </div>

      {showLink && (
        <section className="card form-grid">
          <label>名称
            <input value={linkName} placeholder="如：办公网站及密码信息" onChange={(e) => setLinkName(e.target.value)} />
          </label>
          <label>飞书或网页地址
            <input value={linkUrl} placeholder="https://xxx.feishu.cn/..." onChange={(e) => setLinkUrl(e.target.value)} />
          </label>
          <div className="row-actions span-2">
            <button className="primary" onClick={() => {
              if (!linkName.trim() || !linkUrl.trim()) {
                window.alert('请填写名称和网址。在飞书里打开该文档，复制浏览器地址栏即可。')
                return
              }
              void run('正在添加链接', async () => {
                await addDriveLink(joinDrive(cwd, linkName.trim()), linkUrl.trim())
                setLinkName('')
                setLinkUrl('')
                setShowLink(false)
                await refresh()
              })
            }}>保存到当前文件夹</button>
            <button className="text" onClick={() => setShowLink(false)}>取消</button>
          </div>
        </section>
      )}

      <div className="drive-grid">
        {showing.filter((item) => item.type === 'dir').map((item) => (
          <button key={`d-${item.name}`} type="button" className="drive-folder" onClick={() => openItem(item)}>
            <b>{displayName(item.name).split('/').pop()}</b>
            <span>文件夹</span>
          </button>
        ))}
        {showing.filter((item) => item.type === 'link').map((item) => (
          <button key={`l-${item.name}`} type="button" className="drive-folder drive-link" onClick={() => openItem(item)}>
            <b>{displayName(item.name).split('/').pop()}</b>
            <span>浏览器链接</span>
          </button>
        ))}
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>大小</th>
              <th>修改时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {showing.map((item) => {
              const rel = hits ? item.name : joinDrive(cwd, item.name)
              const kind = item.type === 'dir' ? '文件夹' : item.type === 'link' ? '浏览器链接' : '文件'
              return (
                <tr key={`${item.type}-${item.name}`} onDoubleClick={() => openItem(item)}>
                  <td>
                    <button type="button" className="text" onClick={() => openItem(item)}>
                      {item.type === 'dir' ? '📁 ' : item.type === 'link' ? '🔗 ' : ''}
                      {hits ? displayName(item.name) : displayName(item.name)}
                    </button>
                  </td>
                  <td>{kind}</td>
                  <td>{item.type === 'file' ? formatSize(item.size) : '—'}</td>
                  <td>{fileDate(item.mtime)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="text" onClick={() => openItem(item)}>
                        {item.type === 'dir' ? '打开' : item.type === 'link' ? '用浏览器打开' : '用本机打开'}
                      </button>
                      <button type="button" className="text" onClick={(e) => {
                        e.stopPropagation()
                        const next = window.prompt('新名称', displayName(item.name.split('/').pop() || ''))
                        if (!next?.trim()) return
                        const fileName = item.type === 'link' && !/\.url$/i.test(next) ? `${next.trim()}.url` : next.trim()
                        const dest = hits
                          ? joinDrive(rel.split('/').slice(0, -1).join('/'), fileName)
                          : joinDrive(cwd, fileName)
                        void run('正在重命名', async () => {
                          await renameDrive(rel, dest)
                          await refresh()
                        })
                      }}>重命名</button>
                      <button type="button" className="text" onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (!confirm(`删除「${displayName(item.name)}」？删除后不会自动建回来。`)) return
                        void run('正在删除', async () => {
                          await deleteDrive(rel)
                          await refresh(cwd)
                        })
                      }}>删除</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {showing.length === 0 && <p className="empty">{q ? '没有搜到。' : '这个文件夹是空的。把飞书下载的文件拖进来即可。'}</p>}
      </div>
    </div>
  )
}
