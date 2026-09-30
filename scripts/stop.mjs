import { execSync } from 'node:child_process'

function listeningPids(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8' })
    const pids = new Set()
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue
      if (!line.includes(`:${port}`)) continue
      const pid = line.trim().split(/\s+/).pop()
      if (pid && pid !== '0') pids.add(pid)
    }
    return [...pids]
  } catch {
    return []
  }
}

function kill(pid) {
  try {
    execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' })
    console.log(`已关闭进程 ${pid}`)
  } catch {
    /* already gone */
  }
}

for (const port of [5173, 4173, 5175]) {
  for (const pid of listeningPids(port)) kill(pid)
}

try {
  const out = execSync(
    'powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match \'localtunnel|cloudflared\' } | Select-Object -ExpandProperty ProcessId"',
    { encoding: 'utf8' },
  )
  for (const pid of out.split(/\s+/).filter(Boolean)) {
    kill(pid)
  }
} catch {
  /* not running */
}

try {
  execSync('taskkill /IM cloudflared.exe /F', { stdio: 'ignore' })
} catch {
  /* not running */
}

console.log('文事台已关闭。')
