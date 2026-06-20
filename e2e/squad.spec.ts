import { test, expect } from './fixtures'
import { loginAsPlayer } from './helpers/auth'

test.describe('Squad features', () => {
  test('stats page lists squad members', async ({ page }) => {
    await loginAsPlayer(page)
    await page.getByRole('link', { name: 'Stats', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Squad stats/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Chris L' }).first()).toBeVisible()
  })

  test('player profile opens from stats', async ({ page }) => {
    await loginAsPlayer(page)
    await page.getByRole('link', { name: 'Stats', exact: true }).click()
    await page.getByRole('link', { name: 'Chris L' }).first().click()
    await expect(page).toHaveURL(/\/player\//)
    await expect(page.getByRole('link', { name: /Squad stats/i })).toBeVisible()
  })

  test('calendar shows upcoming items', async ({ page }) => {
    await loginAsPlayer(page)
    await page.getByRole('link', { name: 'Calendar', exact: true }).click()
    await expect(page.getByRole('heading', { name: /Calendar/i })).toBeVisible()
  })

  test('dashboard availability controls', async ({ page }) => {
    await loginAsPlayer(page)
    await expect(page.getByText('Next match')).toBeVisible()
    const inButton = page.getByRole('button', { name: /^In$/i }).first()
    if (await inButton.isVisible()) {
      await inButton.click()
    }
  })
})
