import { describe, expect, it } from 'vitest'
import { formatCents, parseDollars } from './money'

describe('money', () => {
  it('parses dollar amounts into cents', () => {
    expect(parseDollars('12')).toBe(1200)
    expect(parseDollars(' 12.5 ')).toBe(1250)
    expect(parseDollars('0.07')).toBe(7)
  })

  it('rejects anything that is not a positive amount with two decimals at most', () => {
    for (const input of ['', '0', '0.00', '-5', '1.234', 'abc', '1e3']) {
      expect(parseDollars(input)).toBeNull()
    }
  })

  it('formats cents as USD', () => {
    expect(formatCents(123456)).toBe('$1,234.56')
  })
})
