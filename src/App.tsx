import { Layout } from './components/Layout'
import { ContractBitable } from './pages/ContractBitable'
import { ContractImport } from './pages/ContractImport'
import { DocumentForm } from './pages/DocumentForm'
import { DrivePage } from './pages/DrivePage'
import { SheetPage } from './pages/SheetPage'
import { Workbench } from './pages/Workbench'
import { useStore } from './store'

export default function App() {
  const { page, ready, saveError } = useStore()

  if (!ready) {
    return (
      <Layout>
        <p className="empty card">正在读取台账 …</p>
      </Layout>
    )
  }

  let view = <Workbench />
  if (page.name === 'sheet' && page.sheet) {
    view = page.sheet === 'seal' || page.sheet === 'econtract'
      ? <ContractBitable kind={page.sheet} />
      : <SheetPage kind={page.sheet} />
  }
  if (page.name === 'doc' && page.doc) view = <DocumentForm kind={page.doc} id={page.id} />
  if (page.name === 'import') view = <ContractImport />
  if (page.name === 'drive') view = <DrivePage />

  return (
    <Layout>
      {saveError && <p className="empty card">{saveError}</p>}
      {view}
    </Layout>
  )
}
