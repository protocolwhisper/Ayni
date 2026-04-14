import { describe, expect, it } from 'vitest'
import { parseUnits } from 'viem'
import {
  MAX_HEALTH_FACTOR,
  formatHealthFactorLabel,
  formatTokenAmount,
  formatUsdAmount,
  hexValue,
  minBigInt,
  shortAddress,
} from '../../src/utils.js'

// ---------------------------------------------------------------------------
// shortAddress
// ---------------------------------------------------------------------------
describe('shortAddress', () => {
  it('truncates a full address', () => {
    expect(shortAddress('0xcd02907e3677f7726f4a062001b08215394bc07c')).toBe('0xcd02...c07c')
  })

  it('returns empty string for null', () => {
    expect(shortAddress(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(shortAddress(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(shortAddress('')).toBe('')
  })
})

// ---------------------------------------------------------------------------
// hexValue
// ---------------------------------------------------------------------------
describe('hexValue', () => {
  it('converts 0n to 0x0', () => {
    expect(hexValue(0n)).toBe('0x0')
  })

  it('converts a known BigInt', () => {
    expect(hexValue(255n)).toBe('0xff')
  })

  it('converts chain ID 4441 correctly', () => {
    expect(hexValue(BigInt(4441))).toBe('0x1159')
  })
})

// ---------------------------------------------------------------------------
// formatTokenAmount
// ---------------------------------------------------------------------------
describe('formatTokenAmount', () => {
  it('formats 1 WZKLTC (18 decimals)', () => {
    expect(formatTokenAmount(parseUnits('1', 18), 18)).toBe('1')
  })

  it('formats 1.5 tokens', () => {
    expect(formatTokenAmount(parseUnits('1.5', 18), 18)).toBe('1.5')
  })

  it('formats zero', () => {
    expect(formatTokenAmount(0n, 18)).toBe('0')
  })

  it('respects maximumFractionDigits override', () => {
    const result = formatTokenAmount(parseUnits('1.123456', 18), 18, 2)
    expect(result).toBe('1.12')
  })

  it('formats USDC (6 decimals)', () => {
    expect(formatTokenAmount(parseUnits('100', 6), 6)).toBe('100')
  })
})

// ---------------------------------------------------------------------------
// formatUsdAmount
// ---------------------------------------------------------------------------
describe('formatUsdAmount', () => {
  it('formats $1.00', () => {
    expect(formatUsdAmount(parseUnits('1', 6), 6)).toBe('$1.00')
  })

  it('formats $1,234.56', () => {
    expect(formatUsdAmount(parseUnits('1234.56', 6), 6)).toBe('$1,234.56')
  })

  it('formats zero as $0.00', () => {
    expect(formatUsdAmount(0n, 6)).toBe('$0.00')
  })
})

// ---------------------------------------------------------------------------
// formatHealthFactorLabel
// ---------------------------------------------------------------------------
describe('formatHealthFactorLabel', () => {
  it('returns -- for 0', () => {
    expect(formatHealthFactorLabel(0n)).toBe('--')
  })

  it('returns -- for MAX_HEALTH_FACTOR (no debt)', () => {
    expect(formatHealthFactorLabel(MAX_HEALTH_FACTOR)).toBe('--')
  })

  it('returns 999+ for very large health factor', () => {
    expect(formatHealthFactorLabel(parseUnits('1000', 18))).toBe('999+')
  })

  it('uses 2 decimal places for small values', () => {
    expect(formatHealthFactorLabel(parseUnits('1.5', 18))).toBe('1.50')
  })

  it('uses 1 decimal place for values >= 10', () => {
    expect(formatHealthFactorLabel(parseUnits('12.3', 18))).toBe('12.3')
  })

  it('returns 999+ for exactly 999', () => {
    expect(formatHealthFactorLabel(parseUnits('999', 18))).toBe('999+')
  })
})

// ---------------------------------------------------------------------------
// minBigInt
// ---------------------------------------------------------------------------
describe('minBigInt', () => {
  it('returns the smaller value', () => {
    expect(minBigInt(5n, 10n)).toBe(5n)
  })

  it('returns a when equal', () => {
    expect(minBigInt(7n, 7n)).toBe(7n)
  })

  it('works with zero', () => {
    expect(minBigInt(0n, 100n)).toBe(0n)
  })
})
