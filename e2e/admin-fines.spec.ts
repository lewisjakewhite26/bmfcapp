import { test, expect } from './fixtures'
import { loginAsAdmin } from './helpers/auth'

/** Tom H — mock squad player with no fines on the Sat training session. */
const TOM_PLAYER_ID = 'p1'

test.describe('Admin fines picker', () => {
  test('lateness tile cycles and saves a single lateness fine', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/fines')
    await expect(page.getByRole('heading', { name: 'Fines' })).toBeVisible()

    await page.getByRole('button', { name: /Sat training/i }).click()

    await page.getByTestId(`fine-squad-player-${TOM_PLAYER_ID}`).click()

    const picker = page.getByTestId('fine-picker')
    await expect(picker).toBeVisible()

    const lateness = picker.getByTestId('fine-lateness-tile')

    await lateness.click()
    await expect(lateness).toHaveAttribute('data-lateness-state', 'late')

    await lateness.click()
    await expect(lateness).toHaveAttribute('data-lateness-state', 'late_10')

    await lateness.click()
    await expect(lateness).toHaveAttribute('data-lateness-state', 'off')

    await lateness.click()
    await lateness.click()
    await expect(lateness).toHaveAttribute('data-lateness-state', 'late_10')
    await expect(picker.getByTestId('fine-picker-summary')).toHaveText('1 fine · £2')

    await picker.getByTestId('fine-picker-save').click()
    await expect(picker).toBeHidden()

    await page.getByTestId(`fine-squad-player-${TOM_PLAYER_ID}`).click()
    await expect(page.getByTestId('fine-picker')).toBeVisible()
    await expect(page.getByTestId('fine-lateness-tile')).toHaveAttribute('data-lateness-state', 'late_10')
    await expect(page.getByTestId('fine-picker-summary')).toHaveText('1 fine · £2')
  })
})
