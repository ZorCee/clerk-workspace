const DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']
const UNITS = ['', '拾', '佰', '仟']

function sectionToChinese(n: number): string {
  if (n === 0) return ''
  let str = ''
  let zero = false
  const chars = String(n).padStart(4, '0')
  for (let i = 0; i < 4; i++) {
    const d = Number(chars[i])
    const unit = UNITS[3 - i]
    if (d === 0) {
      zero = true
    } else {
      if (zero) str += '零'
      zero = false
      str += DIGITS[d] + unit
    }
  }
  return str.replace(/^壹拾/, '拾')
}

export function toRmbUpper(input: string | number): string {
  const raw = String(input).replace(/[,，\s]/g, '').replace(/元$/, '')
  if (!raw) return ''
  const num = Number(raw)
  if (!Number.isFinite(num) || num < 0) return ''
  if (num === 0) return '零元整'

  const [intPart, decRaw = ''] = raw.includes('.')
    ? raw.split('.')
    : [String(Math.floor(num)), '']
  const integer = Number(intPart)
  const dec = (decRaw + '00').slice(0, 2)
  const jiao = Number(dec[0])
  const fen = Number(dec[1])

  let result = ''
  if (integer > 0) {
    const yi = Math.floor(integer / 100000000)
    const wan = Math.floor((integer % 100000000) / 10000)
    const rest = integer % 10000
    if (yi) result += sectionToChinese(yi) + '亿'
    if (wan) {
      if (yi && wan < 1000) result += '零'
      result += sectionToChinese(wan) + '万'
    } else if (yi && rest) {
      result += '零'
    }
    if (rest) {
      if ((yi || wan) && rest < 1000) result += '零'
      result += sectionToChinese(rest)
    }
    result += '元'
  }

  if (jiao === 0 && fen === 0) {
    result = (result || '零元') + '整'
  } else {
    if (jiao) result += DIGITS[jiao] + '角'
    else if (result) result += '零'
    if (fen) result += DIGITS[fen] + '分'
    else if (jiao) result += '整'
  }

  return result
}

export function parseMoney(input: string): number {
  const n = Number(String(input).replace(/[,，\s]/g, '').replace(/元$/, ''))
  return Number.isFinite(n) ? n : 0
}

export function formatMoney(n: number): string {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
