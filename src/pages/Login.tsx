import { useState } from 'react'
import { Logo } from '../components/Logo'
import { COMPANY } from '../data/brand'
import { apiJson, setToken } from '../lib/api'

export function Login({ setup, onOk }: { setup: boolean; onOk: () => void }) {
  const [pin, setPin] = useState('')
  const [again, setAgain] = useState('')
  const [error, setError] = useState('')

  async function submit() {
    setError('')
    if (pin.length < 4) {
      setError('口令至少 4 位')
      return
    }
    if (setup && pin !== again) {
      setError('两次口令不一致')
      return
    }
    try {
      const data = await apiJson<{ token: string }>(setup ? '/api/setup' : '/api/login', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      setToken(data.token)
      onOk()
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    }
  }

  return (
    <div className="login-page">
      <section className="card login-card">
        <Logo tone="dark" />
        <h1>{setup ? '设置本机口令' : '输入本机口令'}</h1>
        <p className="hint">
          {setup
            ? '第一次使用，先设一个口令。口令只存在 D:\\谛图文事台数据，用来挡住外人打开网页。'
            : `${COMPANY.name} · 文事台`}
        </p>
        <label>
          口令
          <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void submit()} />
        </label>
        {setup && (
          <label>
            再输入一次
            <input type="password" value={again} onChange={(e) => setAgain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void submit()} />
          </label>
        )}
        {error && <p className="late">{error}</p>}
        <button className="primary" onClick={() => void submit()}>{setup ? '保存并进入' : '进入'}</button>
      </section>
    </div>
  )
}
