export interface RuntimeInfo {
  dir: string
  path: string
  demo: boolean
}

const FALLBACK: RuntimeInfo = {
  dir: 'D:\\谛图文事台数据',
  path: 'D:\\谛图文事台数据\\wenshi.json',
  demo: false,
}

export async function loadRuntime(): Promise<RuntimeInfo> {
  try {
    const res = await fetch('/api/info')
    const data = await res.json() as Partial<RuntimeInfo>
    return {
      dir: data.dir || FALLBACK.dir,
      path: data.path || FALLBACK.path,
      demo: Boolean(data.demo),
    }
  } catch {
    return FALLBACK
  }
}
