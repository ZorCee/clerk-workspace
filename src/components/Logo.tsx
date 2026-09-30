import { useId } from 'react'
import { COMPANY } from '../data/brand'

export function LogoMark({ className }: { className?: string }) {
  const raw = useId().replace(/:/g, '')
  const g1 = `ditu-${raw}-1`
  const g2 = `ditu-${raw}-2`

  return (
    <svg className={className} viewBox="118 40 1000 950" aria-hidden="true">
      <defs>
        <linearGradient id={g1} x1=".16" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#58d7ff" />
          <stop offset=".34" stopColor="#36bdf4" />
          <stop offset=".68" stopColor="#258ce9" />
          <stop offset="1" stopColor="#1555d8" />
        </linearGradient>
        <linearGradient id={g2} x1="0" y1="0" x2="1" y2=".2">
          <stop offset="0" stopColor="#3bc7fa" />
          <stop offset=".5" stopColor="#167be6" />
          <stop offset="1" stopColor="#073fc5" />
        </linearGradient>
      </defs>
      <path fill={`url(#${g1})`} d="M190 90h430c235 0 425 190 425 425S855 940 620 940H430c38-55 64-123 71-203h119c123 0 222-99 222-222s-99-222-222-222H190z" />
      <path fill={`url(#${g1})`} d="M190 365h205v575H190z" />
      <path fill={`url(#${g2})`} d="M190 835c85-13 151-46 205-105v210H190zm240 105c35-54 59-122 70-203h120c177 0 327-81 383-198-15 224-182 401-383 401z" />
    </svg>
  )
}

export function Logo({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <div className={`logo-lockup ${tone}`}>
      <LogoMark className="logo-mark" />
      <div className="logo-text">
        <strong>{COMPANY.shortName}</strong>
        <em>{COMPANY.en}</em>
      </div>
    </div>
  )
}
