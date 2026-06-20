import { test, expect } from './fixtures'
import { loginAsPlayer } from './helpers/auth'

test.describe('Public & squad smoke', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /BMFC Club Hub/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible()
  })

  test('login page shows mock test buttons', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Test', exact: true })).toBeVisible()
  })

  test('player reaches dashboard and primary nav', async ({ page }) => {
    await loginAsPlayer(page)
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })).toBeVisible()
    await expect(page.getByText('League position')).toBeVisible()

    await page.getByRole('link', { name: 'Table', exact: true }).click()
    await expect(page).toHaveURL(/\/table/)
    await expect(page.getByRole('heading', { name: /League table/i })).toBeVisible()

    await page.getByRole('link', { name: 'Results', exact: true }).click()
    await expect(page).toHaveURL(/\/results/)

    await page.getByRole('link', { name: 'Stats', exact: true }).click()
    await expect(page).toHaveURL(/\/stats/)

    await page.getByRole('link', { name: 'Calendar', exact: true }).click()
    await expect(page).toHaveURL(/\/calendar/)
  })

  test('404 page for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    await expect(page.getByRole('heading', { name: /doesn't go anywhere/i })).toBeVisible()
  })
})
