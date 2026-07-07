import { test, expect } from './fixtures'
import { loginAsAdmin } from './helpers/auth'

test.describe('Admin fines picker', () => {
  test('lateness tile cycles and saves a single lateness fine', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/fines')
    await expect(page.getByRole('heading', { name: 'Fines' })).toBeVisible()

    await page.getByRole('button', { name: /Sat training/i }).click()

    await page.getByRole('button', { name: 'Tom H', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const latenessTile = dialog.getByRole('button', { name: /Lateness|Late/i }).first()

    await latenessTile.click()
    await expect(dialog.getByText('Late', { exact: true })).toBeVisible()
    await expect(dialog.getByText('£1')).toBeVisible()

    await latenessTile.click()
    await expect(dialog.getByText('Late 10+ mins')).toBeVisible()
    await expect(dialog.getByText('£2')).toBeVisible()

    await latenessTile.click()
    await expect(dialog.getByText('Lateness', { exact: true })).toBeVisible()
    await expect(dialog.getByText('Tap to cycle')).toBeVisible()

    await latenessTile.click()
    await latenessTile.click()

    await dialog.getByRole('button', { name: /^Save/i }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Fines saved')).toBeVisible()

    await page.getByRole('button', { name: 'Tom H', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Late 10+ mins')).toBeVisible()
    await expect(page.getByRole('dialog').getByText('Late', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('dialog').getByText('1 fine · £2')).toBeVisible()
  })
})
