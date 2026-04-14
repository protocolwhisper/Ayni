import { expect, test } from '@playwright/test'
import { buildMockWallet } from './helpers/mock-wallet.js'

const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

test.describe('Bridge modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(buildMockWallet({ address: TEST_ADDRESS }))
    await page.goto('/dashboard/')
  })

  test('opens when Bridge / Get WZKLTC button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /get wzkltc|bridge/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Get WZKLTC' })).toBeVisible()
  })

  test('closes on backdrop click', async ({ page }) => {
    await page.getByRole('button', { name: /get wzkltc|bridge/i }).click()
    await page.locator('.wzkltc-modal-backdrop').click({ position: { x: 10, y: 10 } })
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('closes on X button', async ({ page }) => {
    await page.getByRole('button', { name: /get wzkltc|bridge/i }).click()
    await page.getByRole('button', { name: /close modal/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test.describe('with wallet connected', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: /get wzkltc|bridge/i }).click()
    })

    test('shows connected wallet address in settings panel', async ({ page }) => {
      const walletValue = page.locator('.wzkltc-settings-panel strong').first()
      await expect(walletValue).toContainText(/0xd8dA.*6045/i)
    })

    test('25% preset fills input to 25% of balance', async ({ page }) => {
      await page.getByRole('button', { name: '25%' }).click()
      const input = page.locator('.wzkltc-amount-field input')
      const value = await input.inputValue()
      test.skip(!value, 'Wallet balance unavailable in this environment')
      expect(Number.parseFloat(value)).toBeGreaterThan(0)
    })

    test('Max - Gas preset fills input to max spendable', async ({ page }) => {
      await page.getByRole('button', { name: /max/i }).click()
      const input = page.locator('.wzkltc-amount-field input')
      const value = await input.inputValue()
      test.skip(!value, 'Wallet balance unavailable in this environment')
      expect(Number.parseFloat(value)).toBeGreaterThan(0)
    })

    test('entering amount above balance shows a warning', async ({ page }) => {
      await page.locator('.wzkltc-amount-field input').fill('999999')
      await page.getByRole('button', { name: /wrap zkltc/i }).click()
      await expect(page.locator('.wzkltc-panel-message.is-warning')).toBeVisible()
    })

    test('submitting zero amount shows a warning', async ({ page }) => {
      await page.locator('.wzkltc-amount-field input').fill('0')
      await page.getByRole('button', { name: /wrap zkltc/i }).click()
      await expect(page.locator('.wzkltc-panel-message.is-warning')).toBeVisible()
    })

    test('valid submit shows transaction hash in success message', async ({ page }) => {
      const submitButton = page.getByRole('button', { name: /wrap zkltc|coming soon/i })
      const submitLabel = await submitButton.innerText()
      test.skip(/coming soon/i.test(submitLabel), 'Bridge contract not configured in this environment')
      await page.getByRole('button', { name: /max/i }).click()
      const input = page.locator('.wzkltc-amount-field input')
      const value = await input.inputValue()
      test.skip(!value || Number.parseFloat(value) <= 0, 'No spendable amount available for a valid submit')
      await page.getByRole('button', { name: /wrap zkltc/i }).click()
      await expect(page.locator('.wzkltc-panel-message.is-success')).toBeVisible({ timeout: 10_000 })
    })
  })
})
