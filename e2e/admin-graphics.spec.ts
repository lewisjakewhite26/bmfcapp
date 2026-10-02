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

  test('switches between the navy and light looks', async ({ page }) => {
    await openGraphics(page)
    const canvas = await waitForDrawn(page)
    const corner = () =>
      canvas.evaluate((el) => [...(el as HTMLCanvasElement).getContext('2d')!.getImageData(10, 10, 1, 1).data])

    expect((await corner())[0]).toBeLessThan(60) // navy
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    await expect.poll(async () => (await corner())[0]).toBeGreaterThan(220)
    await page.getByRole('button', { name: 'Navy', exact: true }).click()
    await expect.poll(async () => (await corner())[0]).toBeLessThan(60)
  })

  test('matchday posts can be made for past matches too', async ({ page }) => {
    await openGraphics(page)
    const select = page.locator('#graphics-fixture')
    const upcomingCount = await select.locator('option').count()
    await page.getByLabel('Include past matches').check()
    await expect.poll(() => select.locator('option').count()).toBeGreaterThan(upcomingCount)
    await waitForDrawn(page)
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
    await page.getByRole('button', { name: /^Player photos/ }).click()

    const firstPlayer = page.getByRole('button', { expanded: false }).filter({ hasText: 'No photo' }).first()
    const name = (await firstPlayer.locator('span').first().textContent())?.trim() ?? ''
    await firstPlayer.click()
    // Already-transparent PNG: saved as-is, no model download.
    await page.locator('input[type="file"]').first().setInputFiles(CUTOUT)
    await expect(page.getByRole('img', { name: `Cut-out of ${name}` })).toBeVisible()
    await page.getByRole('button', { name: 'Save photo' }).click()
    await expect(page.getByText('1 photo').first()).toBeVisible()

    await page.getByRole('tab', { name: 'Make a post' }).click()
    await page.getByLabel('Poster player').selectOption({ label: name })
    await waitForDrawn(page)
    await expect(page.getByText(`No graphics photo for ${name} yet`)).toHaveCount(0)

    // Resize and drag the photo for this post; Reset puts it back exactly.
    const canvas = page.getByRole('img', { name: 'Matchday post preview' })
    const pixels = () => canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL())
    const original = await pixels()
    const reset = page.getByRole('button', { name: 'Reset' })
    await expect(reset).toBeDisabled()

    await page.getByLabel('Photo size').fill('180')
    await expect(page.getByText('180%')).toBeVisible()
    await expect.poll(pixels).not.toBe(original)

    const box = (await canvas.boundingBox())!
    const dragDown = async () => {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 60, { steps: 4 })
      await page.mouse.up()
    }
    // Locked to start, so a drag (or a scroll on a phone) leaves it alone.
    const sized = await pixels()
    await dragDown()
    expect(await pixels()).toBe(sized)

    const move = page.getByRole('button', { name: 'Move photo' })
    await move.click()
    await expect(page.getByRole('button', { name: 'Done moving' })).toHaveAttribute('aria-pressed', 'true')
    await dragDown()
    const dragged = await pixels()
    expect(dragged).not.toBe(sized)
    await page.getByRole('button', { name: 'Done moving' }).click()

    await reset.click()
    await expect(page.getByText('100%')).toBeVisible()
    await expect.poll(pixels).toBe(original)
    expect(dragged).not.toBe(original)
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
