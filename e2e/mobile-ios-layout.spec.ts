import { mkdirSync } from 'fs'
import { test, expect } from '@playwright/test'
import { loginAsPlayer, STORAGE_KEY } from './helpers/auth'
import {
  assertAboveBottomNav,
  assertMainContentClearance,
  bottomNav,
  readMobileNavLayout,
  saveLayoutScreenshot,
} from './helpers/mobileLayout'

test.describe('iPhone layout — popups & bottom nav', () => {
  test.beforeAll(() => {
    mkdirSync('test-results/iphone-layout', { recursive: true })
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate((key) => {
      localStorage.removeItem(key)
      localStorage.removeItem('bmfc_a2hs_prompt_dismissed_at')
    }, STORAGE_KEY)
  })

  test('dashboard PWA banner actions sit above bottom nav', async ({ page }) => {
    await loginAsPlayer(page)
    await page.goto('/dashboard')
    await expect(page.getByText('Add BMFC Club Hub to your home screen')).toBeVisible()

    await assertMainContentClearance(page)

    const notNow = page.getByRole('button', { name: 'Not now' })
    await assertAboveBottomNav(page, notNow, 'PWA banner "Not now"')

    await saveLayoutScreenshot(page, '01-dashboard-pwa-banner')
  })

  test('iOS install dialog "Got it" is visible above bottom nav', async ({ page }) => {
    await loginAsPlayer(page)
    await page.goto('/dashboard')

    await page.getByRole('button', { name: 'Download BMFC Club Hub app' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.getByText('Add BMFC Club Hub to your home screen').first()).toBeVisible()

    const gotIt = page.getByRole('button', { name: 'Got it' })
    await assertAboveBottomNav(page, gotIt, 'iOS install dialog "Got it"')

    await saveLayoutScreenshot(page, '02-ios-install-dialog')
  })

  test('account menu actions sit above bottom nav', async ({ page }) => {
    await loginAsPlayer(page)
    await page.goto('/dashboard')

    await page.getByRole('button', { name: 'Account menu' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const logOut = page.getByRole('button', { name: 'Log out' })
    await assertAboveBottomNav(page, logOut, 'Account menu "Log out"')

    await saveLayoutScreenshot(page, '03-account-menu')
  })

  test('calendar bottom content clears bottom nav when scrolled', async ({ page }) => {
    await loginAsPlayer(page)
    await page.goto('/calendar')
    await expect(page.getByRole('heading', { name: /Calendar/i })).toBeVisible()

    await bottomNav(page).scrollIntoViewIfNeeded()
    const lastCard = page.locator('.glass-card').last()
    await lastCard.scrollIntoViewIfNeeded()

    const layout = await readMobileNavLayout(page)
    const lastBox = await lastCard.boundingBox()
    expect(lastBox).not.toBeNull()
    const lastBottom = lastBox!.y + lastBox!.height
    const scrollableGap = layout.mainPaddingBottom + layout.viewportHeight - lastBottom

    expect(
      scrollableGap,
      `last calendar card should leave ${layout.navHeight}px nav clearance (gap ${scrollableGap.toFixed(0)}px)`,
    ).toBeGreaterThanOrEqual(layout.navHeight - 4)

    await saveLayoutScreenshot(page, '04-calendar-scrolled')
  })
})
