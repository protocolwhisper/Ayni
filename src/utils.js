import { formatUnits } from 'viem'

export const MAX_HEALTH_FACTOR = (1n << 256n) - 1n

export function shortAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function hexValue(value) {
  return `0x${value.toString(16)}`
}

export function formatTokenAmount(rawAmount, decimals, maximumFractionDigits = 4) {
  const amount = Number(formatUnits(rawAmount, decimals))
  if (!Number.isFinite(amount)) return '0'
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })
}

export function formatTokenAmountCeil(rawAmount, decimals, fractionDigits = 2) {
  const amount = Number(formatUnits(rawAmount, decimals))
  if (!Number.isFinite(amount)) return '0'
  const factor = 10 ** fractionDigits
  const ceiled = Math.ceil(amount * factor) / factor
  return ceiled.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function formatUsdAmount(rawAmount, decimals) {
  const amount = Number(formatUnits(rawAmount, decimals))
  if (!Number.isFinite(amount)) return '$0.00'
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatHealthFactorLabel(rawAmount) {
  if (rawAmount === 0n || rawAmount === MAX_HEALTH_FACTOR) return '--'
  const amount = Number(formatUnits(rawAmount, 18))
  if (!Number.isFinite(amount)) return '--'
  if (amount >= 999) return '999+'
  return amount >= 10 ? amount.toFixed(1) : amount.toFixed(2)
}

export function minBigInt(a, b) {
  return a < b ? a : b
}
