import { describe, expect, it } from 'vitest'
import { parseUnits } from 'viem'
import { MAX_HEALTH_FACTOR } from '../../src/utils.js'
import {
  calculateEncumberedCollateral,
  calculateMaxWithdrawableCollateral,
  calculateProjectedHealthFactorAfterWithdraw,
  calculateRepayCap,
  validateRepayAmount,
  validateWithdrawAmount,
  WITHDRAW_HEALTH_FACTOR_MIN,
} from '../../src/lendingMath.js'

describe('repay flow math', () => {
  it('calculates repay cap as min(debt, wallet balance)', () => {
    expect(calculateRepayCap(100n, 70n)).toBe(70n)
    expect(calculateRepayCap(40n, 90n)).toBe(40n)
  })

  it('validates repay amount boundaries', () => {
    expect(validateRepayAmount({ amount: 120n, userDebt: 100n, debtWalletBalance: 150n })).toBe('above_debt')
    expect(validateRepayAmount({ amount: 120n, userDebt: 200n, debtWalletBalance: 100n })).toBe('above_wallet_balance')
    expect(validateRepayAmount({ amount: 80n, userDebt: 200n, debtWalletBalance: 100n })).toBe('')
  })
})

describe('withdraw flow math', () => {
  it('returns full collateral when no debt exists', () => {
    const maxWithdrawable = calculateMaxWithdrawableCollateral({
      userCollateral: parseUnits('5', 18),
      userDebt: 0n,
      healthFactor: MAX_HEALTH_FACTOR,
    })
    expect(maxWithdrawable).toBe(parseUnits('5', 18))
  })

  it('returns zero max withdrawable when health factor is at/below threshold', () => {
    const maxWithdrawable = calculateMaxWithdrawableCollateral({
      userCollateral: parseUnits('5', 18),
      userDebt: parseUnits('100', 6),
      healthFactor: WITHDRAW_HEALTH_FACTOR_MIN,
    })
    expect(maxWithdrawable).toBe(0n)
  })

  it('returns positive max withdrawable for healthy borrowed position', () => {
    const maxWithdrawable = calculateMaxWithdrawableCollateral({
      userCollateral: parseUnits('10', 18),
      userDebt: parseUnits('100', 6),
      healthFactor: parseUnits('1.8', 18),
    })
    expect(maxWithdrawable).toBeGreaterThan(0n)
    expect(maxWithdrawable).toBeLessThan(parseUnits('10', 18))
  })

  it('projects max health factor when there is no debt', () => {
    const projected = calculateProjectedHealthFactorAfterWithdraw({
      userCollateral: parseUnits('3', 18),
      userDebt: 0n,
      healthFactor: 0n,
      withdrawAmount: parseUnits('1', 18),
      maxHealthFactor: MAX_HEALTH_FACTOR,
    })
    expect(projected).toBe(MAX_HEALTH_FACTOR)
  })

  it('validates withdraw amount boundaries', () => {
    expect(
      validateWithdrawAmount({
        amount: 6n,
        userCollateral: 5n,
        maxWithdrawable: 4n,
        projectedHealthFactor: parseUnits('2', 18),
      }),
    ).toBe('above_collateral')
    expect(
      validateWithdrawAmount({
        amount: 5n,
        userCollateral: 6n,
        maxWithdrawable: 4n,
        projectedHealthFactor: parseUnits('2', 18),
      }),
    ).toBe('above_safe_max')
    expect(
      validateWithdrawAmount({
        amount: 3n,
        userCollateral: 6n,
        maxWithdrawable: 4n,
        projectedHealthFactor: parseUnits('1.1', 18),
      }),
    ).toBe('below_min_health')
    expect(
      validateWithdrawAmount({
        amount: 3n,
        userCollateral: 6n,
        maxWithdrawable: 4n,
        projectedHealthFactor: parseUnits('1.5', 18),
      }),
    ).toBe('')
  })

  it('computes encumbered collateral as collateral minus available', () => {
    expect(calculateEncumberedCollateral(100n, 40n)).toBe(60n)
    expect(calculateEncumberedCollateral(100n, 120n)).toBe(0n)
  })
})
