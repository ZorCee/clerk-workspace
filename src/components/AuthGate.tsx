import { useEffect, useState, type ReactNode } from 'react'
import { getToken } from '../lib/api'
import { Login } from '../pages/Login'

export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [setupDone, setSetupDone] = useState(true)
  const [authed, setAuthed] = useState(Boolean(getToken()))

  useEffect(() => {
    void fetch('/api/auth-status')
      .then((res) => res.json())
      .then((data: { setup?: boolean }) => {
        setSetupDone(Boolean(data.setup))
        if (!data.setup) setAuthed(false)
        setReady(true)
      })
      .catch(() => setReady(true))
  }, [])

  if (!ready) return <p className="empty card">正在打开文事台…</p>
  if (!authed) return <Login setup={!setupDone} onOk={() => setAuthed(true)} />
  return children
}
