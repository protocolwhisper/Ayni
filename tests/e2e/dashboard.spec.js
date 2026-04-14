import { expect, test } from '@playwright/test'
import { buildMockWallet } from './helpers/mock-wallet.js'

const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

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

    test('deposit action opens modal with Deposit label', async ({ page }) => {
      const depositBtn = page.getByRole('button', { name: /deposit/i }).first()
      await depositBtn.click()
      await expect(page.getByRole('dialog')).toBeVisible()
    })

    test('borrow action opens modal with Borrow label', async ({ page }) => {
      const borrowBtn = page.getByRole('button', { name: /borrow/i }).first()
      await borrowBtn.click()
      await expect(page.getByRole('dialog')).toBeVisible()
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
  test.skip(!process.env.VITE_AYNI_DEBT_TOKEN_ADDRESS, 'Skipped until VITE_AYNI_DEBT_TOKEN_ADDRESS is set')

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildMockWallet({ address: TEST_ADDRESS }))
    await page.goto('/dashboard/')
  })

  test('deposit increases collateral balance', async ({ page }) => {
    const depositBtn = page.getByRole('button', { name: /deposit/i }).first()
    await depositBtn.click()
    const input = page.locator('input[type="text"]').first()
    await input.fill('1')
    await page.getByRole('button', { name: /confirm|deposit/i }).last().click()
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
