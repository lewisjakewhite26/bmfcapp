import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export function bottomNav(page: Page) {
  return page.getByRole('navigation', { name: 'Main navigation' })
}

/** Assert a control's bottom edge sits above the fixed bottom tab bar. */
export async function assertAboveBottomNav(page: Page, target: Locator, label: string) {
  const nav = bottomNav(page)
  await expect(nav, 'bottom nav visible').toBeVisible()
  await expect(target, `${label} visible`).toBeVisible()

  const targetBox = await target.boundingBox()
  const navBox = await nav.boundingBox()
  expect(targetBox, `${label} box`).not.toBeNull()
  expect(navBox, 'bottom nav box').not.toBeNull()

  const targetBottom = targetBox!.y + targetBox!.height
  const navTop = navBox!.y
  const overlapPx = targetBottom - navTop

  expect(
    overlapPx,
    `${label}: bottom ${targetBottom.toFixed(1)}px vs nav top ${navTop.toFixed(1)}px (overlap ${overlapPx.toFixed(1)}px)`,
  ).toBeLessThanOrEqual(2)
}

export async function readMobileNavLayout(page: Page) {
  return page.evaluate(() => {
    const main = document.getElementById('main-content')
    const nav = document.querySelector('nav[aria-label="Main navigation"]')
    const root = document.documentElement
    return {
      viewportHeight: window.innerHeight,
      mainPaddingBottom: main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0,
      navHeight: nav ? nav.getBoundingClientRect().height : 0,
      navTop: nav ? nav.getBoundingClientRect().top : 0,
      cssNavHeight: root.style.getPropertyValue('--mobile-bottom-nav-height')
        || getComputedStyle(root).getPropertyValue('--mobile-bottom-nav-height'),
      hasMobileNavClass: main?.classList.contains('has-mobile-bottom-nav') ?? false,
    }
  })
}

export async function assertMainContentClearance(page: Page) {
  const layout = await readMobileNavLayout(page)
  expect(layout.hasMobileNavClass, 'main-content has-mobile-bottom-nav').toBe(true)
  expect(
    layout.mainPaddingBottom,
    `padding-bottom ${layout.mainPaddingBottom}px should cover nav ${layout.navHeight}px`,
  ).toBeGreaterThanOrEqual(layout.navHeight - 2)
}

export async function saveLayoutScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/iphone-layout/${name}.png`,
    fullPage: true,
  })
}
