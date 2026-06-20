import { test, expect } from './fixtures'

import { DEMO_INVITE_TOKEN, completeInviteSetup, fillLoginPasscode, loginAsAdmin, logoutFromNavbar } from './helpers/auth'



test.describe('Onboarding', () => {

  test('invalid invite link shows error', async ({ page }) => {

    await page.goto('/invite/not-a-real-token')

    await expect(page.getByRole('heading', { name: 'Invite link problem' })).toBeVisible()

    await expect(page.getByRole('link', { name: 'Go to login' })).toBeVisible()

  })



  test('demo invite: name + passcode → pending approval', async ({ page }) => {

    await page.goto(`/invite/${DEMO_INVITE_TOKEN}`)

    await expect(page.getByRole('heading', { name: 'Join BMFC Club Hub' })).toBeVisible()



    await completeInviteSetup(page, { firstName: 'Alex', lastName: 'Edge', passcode: '4321' })



    await expect(page).toHaveURL(/\/pending/)

    await expect(page.getByRole('heading', { name: 'Awaiting approval' })).toBeVisible()

    await expect(page.getByText(/Alex E/)).toBeVisible()

  })



  test('admin creates a new invite link', async ({ page }) => {

    await loginAsAdmin(page)

    await page.getByRole('link', { name: 'Squad members' }).click()

    await expect(page).toHaveURL(/\/admin\/users/)



    await page.getByPlaceholder('Label (optional)').fill('E2E Trialist')

    await page.getByRole('button', { name: 'Create invite' }).click()



    await expect(page.getByText('Latest invite link')).toBeVisible()

    await expect(page.locator('text=/\\/invite\\/[a-f0-9]+/i')).toBeVisible()

  })



  test('full onboarding: invite → pending → admin approve → player login', async ({ page }) => {

    const passcode = '4321'



    await page.goto(`/invite/${DEMO_INVITE_TOKEN}`)

    await completeInviteSetup(page, { firstName: 'Alex', lastName: 'Edge', passcode })



    await expect(page).toHaveURL(/\/pending/)



    await page.getByRole('button', { name: 'Log out' }).click()

    await expect(page).toHaveURL(/\/login/)

    await loginAsAdmin(page)



    await page.getByRole('link', { name: 'Squad members' }).click()

    const pendingSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: /Pending approval \(\d+\)/ }),
    })

    await expect(pendingSection.getByText('Alex E').first()).toBeVisible()

    await pendingSection.locator('.glass-card').filter({ hasText: 'Alex E' }).getByRole('button', { name: 'Approve' }).click()

    await expect(page.getByText('Alex E approved')).toBeVisible()



    await logoutFromNavbar(page)

    if (!page.url().endsWith('/login')) {
      await page.getByRole('link', { name: 'Log in' }).first().click()
    }

    await page.getByLabel('Display name').fill('AlexE')

    await fillLoginPasscode(page, passcode)

    await page.getByRole('button', { name: 'Log in' }).click()



    await expect(page).toHaveURL(/\/dashboard/)

    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)/i })).toBeVisible()

  })



  test('admin approves pre-seeded pending player (SamE2e)', async ({ page }) => {

    await loginAsAdmin(page)

    await page.getByRole('link', { name: 'Squad members' }).click()



    const pendingSection = page.locator('section').filter({
      has: page.getByRole('heading', { name: /Pending approval \(\d+\)/ }),
    })

    await expect(pendingSection.getByText('Sam E').first()).toBeVisible()

    await pendingSection.locator('.glass-card').filter({ hasText: 'Sam E' }).getByRole('button', { name: 'Approve' }).click()

    await expect(page.getByText('Sam E approved')).toBeVisible()

  })

})

