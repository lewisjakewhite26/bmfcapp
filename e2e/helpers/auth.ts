import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const STORAGE_KEY = 'bmfc_club_session'
export const DEMO_INVITE_TOKEN = 'demoinvite0001'

const DEV_BYPASS_TOKEN = 'dev-bypass-token'

const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'clee',
  display_name: 'Chris L',
  is_admin: false,
  is_committee: false,
  is_approved: true,
  session_token: DEV_BYPASS_TOKEN,
}

const DEV_ADMIN = {
  id: '00000000-0000-0000-0000-000000000002',
  username: 'preview_admin',
  display_name: 'Preview Admin',
  is_admin: true,
  is_committee: true,
  is_approved: true,
  session_token: DEV_BYPASS_TOKEN,
}

async function seedSession(page: Page, user: typeof DEV_USER) {
  await page.goto('/')
  await page.evaluate(
    ({ storageKey, sessionUser }) => {
      localStorage.setItem(storageKey, JSON.stringify(sessionUser))
    },
    { storageKey: STORAGE_KEY, sessionUser: user },
  )
}

export async function loginAsPlayer(page: Page) {
  await seedSession(page, DEV_USER)
  await page.goto('/dashboard')
  await page.waitForURL(/\/dashboard/)
}

export async function loginAsAdmin(page: Page) {
  await seedSession(page, DEV_ADMIN)
  await page.goto('/admin')
  await page.waitForURL(/\/admin/)
}

export async function loginWithCredentials(page: Page, displayName: string, passcode: string) {
  await page.goto('/login')
  await page.getByLabel('Display name').fill(displayName)
  await fillLoginPasscode(page, passcode)
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL(/\/dashboard/)
}

export async function logoutFromNavbar(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).click()
  await page.waitForURL((url) => {
    const path = new URL(url).pathname
    return path === '/' || path === '/login'
  })
}

/** Fill invite UI, then finish via the same mock invite path the app uses in E2E builds. */
export async function completeInviteSetup(
  page: Page,
  details: { firstName: string; lastName: string; passcode: string },
) {
  await page.getByLabel('First name').fill(details.firstName)
  await page.getByLabel('Last name').fill(details.lastName)
  await page.getByLabel('Passcode', { exact: true }).fill(details.passcode)
  await page.getByLabel('Confirm passcode').fill(details.passcode)
  await expect(page.getByLabel('Passcode', { exact: true })).toHaveValue(details.passcode)
  await page.waitForFunction(() => typeof (window as Window & { __BMFC_E2E_FINISH_INVITE__?: unknown }).__BMFC_E2E_FINISH_INVITE__ === 'function')

  await page.evaluate(
    ({ token, firstName, lastName, passcode }) => {
      const finish = (
        window as Window & {
          __BMFC_E2E_FINISH_INVITE__?: (
            token: string,
            firstName: string,
            lastName: string,
            passcode: string,
          ) => unknown
        }
      ).__BMFC_E2E_FINISH_INVITE__
      if (!finish) throw new Error('E2E invite helper not loaded')
      finish(token, firstName, lastName, passcode)
    },
    { token: DEMO_INVITE_TOKEN, ...details },
  )

  await page.goto('/pending')
  await expect(page).toHaveURL(/\/pending/)
}

export async function fillLoginPasscode(page: Page, passcode: string) {
  await page.locator('#login-passcode').fill(passcode)
}
