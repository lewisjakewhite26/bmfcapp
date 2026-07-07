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
    await expect(latenessTile.getByText('Late', { exact: true })).toBeVisible()
    await expect(latenessTile.getByText('£1', { exact: true })).toBeVisible()

    await latenessTile.click()
    await expect(latenessTile.getByText('Late 10+ mins')).toBeVisible()
    await expect(latenessTile.getByText('£2', { exact: true })).toBeVisible()

    await latenessTile.click()
    await expect(latenessTile.getByText('Lateness', { exact: true })).toBeVisible()
    await expect(latenessTile.getByText('Tap to cycle')).toBeVisible()

    await latenessTile.click()
    await latenessTile.click()

    await dialog.getByRole('button', { name: /^Save/i }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Fines saved')).toBeVisible()

    await page.getByRole('button', { name: 'Tom H', exact: true }).click()
    const reopened = page.getByRole('dialog')
    await expect(reopened).toBeVisible()
    const latenessAfterSave = reopened.getByRole('button', { name: /Late 10\+ mins/i })
    await expect(latenessAfterSave).toBeVisible()
    await expect(latenessAfterSave.getByText('£2', { exact: true })).toBeVisible()
    await expect(reopened.getByText('1 fine · £2')).toBeVisible()
  })
})
