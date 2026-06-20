import { test as base, expect } from '@playwright/test'
import { STORAGE_KEY } from './helpers/auth'

export const test = base.extend({})

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => typeof (window as Window & { __BMFC_E2E_RESET__?: () => void }).__BMFC_E2E_RESET__ === 'function')
  await page.evaluate(
    ({ storageKey }) => {
      localStorage.removeItem(storageKey)
      const w = window as Window & { __BMFC_E2E_RESET__?: () => void }
      w.__BMFC_E2E_RESET__?.()
    },
    { storageKey: STORAGE_KEY },
  )
})

export { expect }
