import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { loginAsAdmin, loginAsPlayer } from './helpers/auth'

const here = path.dirname(fileURLToPath(import.meta.url))
const CUTOUT = path.join(here, 'assets', 'player-cutout.png')

interface Seeded {
  scorers: string[]
  motm: string
}

/** Signs in, adds an upcoming and a played match, then opens the page (client-side, so the data stays). */
async function openGraphics(page: Page): Promise<Seeded> {
  await loginAsAdmin(page)
  await page.waitForFunction(() => typeof (window as Window & { __BMFC_E2E_SEED_GRAPHICS__?: unknown }).__BMFC_E2E_SEED_GRAPHICS__ === 'function')
  const seeded = await page.evaluate(() =>
    (window as Window & { __BMFC_E2E_SEED_GRAPHICS__: () => Seeded }).__BMFC_E2E_SEED_GRAPHICS__(),
  )
  await page.getByRole('link', { name: 'Matchday graphics' }).click()
  await expect(page).toHaveURL(/\/admin\/graphics/)
  await expect(page.getByRole('heading', { name: 'Matchday graphics' })).toBeVisible()
  return seeded
}

/** Waits until the canvas has drawn and returns a pixel from it. */
async function waitForDrawn(page: Page) {
  const canvas = page.getByRole('img', { name: /post preview/ }).first()
  await expect(canvas).toHaveClass(/opacity-100/)
  return canvas
}

test.describe('Matchday graphics', () => {
  test('old Canva link redirects', async ({ page }) => {
    await loginAsAdmin(page)
    await page.goto('/admin/canva')
    await expect(page).toHaveURL(/\/admin\/graphics/)
  })

  test('players cannot open the graphics page', async ({ page }) => {
    await loginAsPlayer(page)
    await page.goto('/admin/graphics')
    await expect(page).not.toHaveURL(/\/admin\/graphics/)
  })

  test('draws and downloads a matchday post', async ({ page }) => {
    await openGraphics(page)
    const canvas = await waitForDrawn(page)

    // Canvas really painted: centre-top is navy/blue, not blank.
    const pixel = await canvas.evaluate((el) => {
      const c = el as HTMLCanvasElement
      return [...c.getContext('2d')!.getImageData(540, 20, 1, 1).data]
    })
    expect(pixel[3]).toBe(255)
    expect(pixel[2]).toBeGreaterThan(pixel[0])

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download', exact: true }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^matchday-.+-\d{4}-\d{2}-\d{2}\.png$/)
  })

  test('MOTM post defaults to the logged man of the match', async ({ page }) => {
    const seeded = await openGraphics(page)
    await page.getByRole('button', { name: 'MOTM' }).click()
    await expect(page.getByLabel('Man of the match')).toHaveValue(/.+/)
    await expect(page.getByRole('img', { name: `${seeded.motm} post preview` })).toHaveClass(/opacity-100/)
  })

  test('goalscorer posts: one per scorer, downloadable together', async ({ page }) => {
    const seeded = await openGraphics(page)
    await page.getByRole('button', { name: 'Goalscorer' }).click()
    for (const name of seeded.scorers) {
      await expect(page.getByRole('img', { name: `${name} post preview` })).toHaveClass(/opacity-100/)
    }
    const downloads: string[] = []
    page.on('download', (d) => downloads.push(d.suggestedFilename()))
    await page.getByRole('button', { name: 'Download all' }).click()
    await expect.poll(() => downloads.length).toBe(seeded.scorers.length)
    expect(downloads.every((f) => f.startsWith('goalscorer-'))).toBe(true)
  })

  test('adds a cut-out to the library and uses it on the matchday post', async ({ page }) => {
    await openGraphics(page)
    await page.getByRole('tab', { name: 'Photos & badges' }).click()

    const firstPlayer = page.getByRole('button', { expanded: false }).filter({ hasText: 'No photo' }).first()
    const name = (await firstPlayer.locator('span').first().textContent())?.trim() ?? ''
    await firstPlayer.click()
    // Already-transparent PNG: saved as-is, no model download.
    await page.locator('input[type="file"]').nth(1).setInputFiles(CUTOUT)
    await expect(page.getByRole('img', { name: `Cut-out of ${name}` })).toBeVisible()
    await page.getByRole('button', { name: 'Save photo' }).click()
    await expect(page.getByText('1 photo').first()).toBeVisible()

    await page.getByRole('tab', { name: 'Make a post' }).click()
    await page.getByLabel('Poster player').selectOption({ label: name })
    await waitForDrawn(page)
    await expect(page.getByText(`No graphics photo for ${name} yet`)).toHaveCount(0)
  })
})

test.describe('Sponsors', () => {
  test('admin adds a sponsor to a player and sees the status change', async ({ page }) => {
    await openGraphics(page)
    await page.getByRole('tab', { name: 'Sponsors' }).click()

    const row = page.locator('li', { has: page.getByRole('button', { name: 'Add sponsor' }) }).first()
    const name = (await row.locator('p').first().textContent())?.trim() ?? ''
    await expect(row.getByText('No sponsor', { exact: true }).first()).toBeVisible()

    await row.getByRole('button', { name: 'Add sponsor' }).click()
    await page.getByLabel(`Sponsor for ${name}`).fill('L Brown Installations')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('Sponsor saved')).toBeVisible()

    const updated = page.locator('li', { hasText: name }).filter({ hasText: 'L Brown Installations' })
    await expect(updated.getByText('Needs logo')).toBeVisible()
  })
})
