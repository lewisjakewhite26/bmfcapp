import { test, expect } from './fixtures'
import { loginAsAdmin } from './helpers/auth'

test.describe('Admin', () => {
  test('admin hub lists core tools', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Finance' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Live matchday' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Enter results' })).toBeVisible()
  })

  test('finance page loads overview', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('link', { name: 'Finance' }).click()
    await expect(page).toHaveURL(/\/admin\/finance/)
    await expect(page.getByRole('heading', { name: 'Finance' })).toBeVisible()
    await expect(page.getByText('Net balance')).toBeVisible()
  })

  test('squad list admin page', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByRole('link', { name: 'Squad list' }).click()
    await expect(page).toHaveURL(/\/admin\/squad/)
    await expect(page.getByRole('heading', { name: /Squad list/i })).toBeVisible()
  })

  test('players cannot access squad members admin route', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: 'Test', exact: true }).click()
    await page.waitForURL(/\/dashboard/)
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
