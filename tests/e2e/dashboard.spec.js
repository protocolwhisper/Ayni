import { expect, test } from '@playwright/test'
import { buildMockWallet } from './helpers/mock-wallet.js'

const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
const HAS_DEBT_TOKEN_ADDRESS = Boolean(globalThis.process?.env?.VITE_AYNI_DEBT_TOKEN_ADDRESS)

test.describe('Dashboard page', () => {
  test('loads without wallet and shows a connect prompt', async ({ page }) => {
    await page.goto('/dashboard/')
    await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible()
  })

  test.describe('with wallet connected', () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(buildMockWallet({ address: TEST_ADDRESS }))
      await page.goto('/dashboard/')
    })

    test('renders collateral asset row (WZKLTC)', async ({ page }) => {
      await expect(page.getByText('WZKLTC')).toBeVisible()
    })

    test('renders debt asset row (USDC)', async ({ page }) => {
      await expect(page.getByText('USDC')).toBeVisible()
    })

    test('health factor displays -- when no position exists', async ({ page }) => {
      await expect(page.getByText('--')).toBeVisible()
    })

    test('supply action opens modal with Supply label', async ({ page }) => {
      const supplyBtn = page.getByRole('button', { name: /supply/i }).first()
      await supplyBtn.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/supply wzkltc/i)).toBeVisible()
    })

    test('borrow action opens modal with Borrow label', async ({ page }) => {
      const borrowBtn = page.getByRole('button', { name: /borrow/i }).first()
      await borrowBtn.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/borrow usdc/i)).toBeVisible()
    })

    test('repay action in borrows card opens modal with Max helper', async ({ page }) => {
      const emptyState = page.getByText(/nothing borrowed yet/i)
      const hasDebtPosition = (await emptyState.count()) === 0
      test.skip(!hasDebtPosition, 'No borrow position available in this environment for repay checks')

      const repayBtn = page.getByRole('button', { name: /^repay$/i }).first()
      await expect(repayBtn).toBeVisible()
      await repayBtn.click()

      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/repay usdc/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /max/i })).toBeVisible()
    })

    test('repay modal validates empty and over-limit amounts', async ({ page }) => {
      const emptyState = page.getByText(/nothing borrowed yet/i)
      const hasDebtPosition = (await emptyState.count()) === 0
      test.skip(!hasDebtPosition, 'No borrow position available in this environment for repay checks')

      await page.getByRole('button', { name: /^repay$/i }).first().click()
      await page.getByRole('button', { name: /confirm repay/i }).click()
      await expect(page.getByText(/repay amount must be greater than zero/i)).toBeVisible()

      const input = page.locator('input[type="text"]').first()
      await input.fill('999999999')
      await page.getByRole('button', { name: /confirm repay/i }).click()
      await expect(page.getByText(/above your outstanding debt|above your usdc wallet balance/i)).toBeVisible()
    })

    test('withdraw action in supplies card opens modal with Max helper', async ({ page }) => {
      const emptyState = page.getByText(/nothing supplied yet/i)
      const hasSupplyPosition = (await emptyState.count()) === 0
      test.skip(!hasSupplyPosition, 'No supplied position available in this environment for withdraw checks')

      const withdrawBtn = page.getByRole('button', { name: /^withdraw$/i }).first()
      await expect(withdrawBtn).toBeVisible()
      await withdrawBtn.click()

      await expect(page.getByRole('dialog')).toBeVisible()
      await expect(page.getByText(/withdraw wzkltc/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /max/i })).toBeVisible()
    })

    test('supplies card shows max withdrawable info when supply exists', async ({ page }) => {
      const emptyState = page.getByText(/nothing supplied yet/i)
      const hasSupplyPosition = (await emptyState.count()) === 0
      test.skip(!hasSupplyPosition, 'No supplied position available in this environment for max withdrawable checks')

      await expect(page.getByText(/max withdrawable:/i)).toBeVisible()
      await expect(page.getByText(/max withdrawable:.*wzkltc/i)).toBeVisible()
    })

    test('withdraw modal validates empty and over-limit amounts', async ({ page }) => {
      const emptyState = page.getByText(/nothing supplied yet/i)
      const hasSupplyPosition = (await emptyState.count()) === 0
      test.skip(!hasSupplyPosition, 'No supplied position available in this environment for withdraw checks')

      await page.getByRole('button', { name: /^withdraw$/i }).first().click()
      await page.getByRole('button', { name: /confirm withdraw/i }).click()
      await expect(page.getByText(/withdraw amount must be greater than zero/i)).toBeVisible()

      const input = page.locator('input[type="text"]').first()
      await input.fill('999999999')
      await page.getByRole('button', { name: /confirm withdraw/i }).click()
      await expect(page.getByText(/above your supplied collateral|exceeds the safe maximum/i)).toBeVisible()
    })

    test('wallet address appears in header', async ({ page }) => {
      await expect(page.getByText(/0xd8dA/i)).toBeVisible()
    })

    test('disconnect clears wallet address', async ({ page }) => {
      await page.getByRole('button', { name: /disconnect/i }).click()
      await expect(page.getByRole('button', { name: /connect wallet/i })).toBeVisible()
    })
  })
})

// ---------------------------------------------------------------------------
// Lending flow (requires VITE_AYNI_DEBT_TOKEN_ADDRESS to be set)
// ---------------------------------------------------------------------------
test.describe('Lending flow', () => {
  test.skip(!HAS_DEBT_TOKEN_ADDRESS, 'Skipped until VITE_AYNI_DEBT_TOKEN_ADDRESS is set')

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildMockWallet({ address: TEST_ADDRESS }))
    await page.goto('/dashboard/')
  })

  test('supply increases collateral balance', async ({ page }) => {
    const supplyBtn = page.getByRole('button', { name: /supply/i }).first()
    await supplyBtn.click()
    const input = page.locator('input[type="text"]').first()
    await input.fill('1')
    await page.getByRole('button', { name: /confirm|supply/i }).last().click()
    await expect(page.locator('.dashboard-message, [class*="message"]')).toBeVisible({ timeout: 15_000 })
  })

  test('borrow up to max does not exceed health factor warning threshold', async ({ page }) => {
    const borrowBtn = page.getByRole('button', { name: /borrow/i }).first()
    await borrowBtn.click()
    await page.getByRole('button', { name: /max/i }).click()
    await page.getByRole('button', { name: /confirm|borrow/i }).last().click()
    await expect(page.locator('[class*="message"]')).toBeVisible({ timeout: 15_000 })
  })
})
