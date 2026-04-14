import { parseUnits } from 'viem'
import { minBigInt } from './utils.js'

export const WITHDRAW_HEALTH_FACTOR_MIN = parseUnits('1.2', 18)

export function calculateRepayCap(userDebt, debtWalletBalance) {
  return minBigInt(userDebt, debtWalletBalance)
}

export function validateRepayAmount({ amount, userDebt, debtWalletBalance }) {
  if (amount > userDebt) return 'above_debt'
  if (amount > debtWalletBalance) return 'above_wallet_balance'
  return ''
}

export function calculateMaxWithdrawableCollateral({
  userCollateral,
  userDebt,
  healthFactor,
  minHealthFactor = WITHDRAW_HEALTH_FACTOR_MIN,
}) {
  if (userCollateral <= 0n) return 0n
  if (userDebt <= 0n) return userCollateral
  if (healthFactor <= minHealthFactor) return 0n

  const requiredCollateral = (userCollateral * minHealthFactor + (healthFactor - 1n)) / healthFactor
  if (requiredCollateral >= userCollateral) return 0n
  return userCollateral - requiredCollateral
}

export function calculateProjectedHealthFactorAfterWithdraw({
  userCollateral,
  userDebt,
  healthFactor,
  withdrawAmount,
  maxHealthFactor,
}) {
  if (userDebt <= 0n) return maxHealthFactor
  if (userCollateral <= 0n) return 0n

  const remainingCollateral = userCollateral > withdrawAmount ? userCollateral - withdrawAmount : 0n
  return (healthFactor * remainingCollateral) / userCollateral
}

export function validateWithdrawAmount({
  amount,
  userCollateral,
  maxWithdrawable,
  projectedHealthFactor,
  minHealthFactor = WITHDRAW_HEALTH_FACTOR_MIN,
}) {
  if (amount > userCollateral) return 'above_collateral'
  if (amount > maxWithdrawable) return 'above_safe_max'
  if (projectedHealthFactor < minHealthFactor) return 'below_min_health'
  return ''
}

export function calculateEncumberedCollateral(userCollateral, withdrawAvailable) {
  return userCollateral > withdrawAvailable ? userCollateral - withdrawAvailable : 0n
}
