import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { createMotifPng } from './helpers'

test('key screens have no serious accessibility violations', async ({ page }) => {
  test.setTimeout(60_000)

  await page.goto('/')
  await page.getByRole('button', { name: 'Decline analytics' }).click()
  await expectNoSeriousViolations(page)

  await page.goto('/privacy')
  await expectNoSeriousViolations(page)
  await page.goto('/terms')
  await expectNoSeriousViolations(page)
  await page.goto('/create')
  await page.getByLabel('Upload image').setInputFiles({
    name: 'accessibility-check.png',
    mimeType: 'image/png',
    buffer: createMotifPng()
  })
  await expectNoSeriousViolations(page)

  await page.getByLabel('Stitches').fill('24')
  await page.getByLabel('Rows').fill('20')
  await page.getByRole('button', { name: 'Generate chart' }).click()
  await expect(page.getByText('24 × 20 stitches')).toBeVisible()
  await expectNoSeriousViolations(page)

  await page.getByRole('button', { name: 'Follow pattern' }).click()
  await expect(page.getByText('Row 1 of 20')).toBeVisible()
  await expectNoSeriousViolations(page)
})

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 }
]) {
  test(`avoids horizontal page overflow at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

    await page.goto('/create')
    await expect(page.getByLabel('Upload image')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  })
}

test('keeps a 250 × 250 chart operable', async ({ page }) => {
  test.setTimeout(60_000)

  await page.goto('/')
  await page.getByRole('button', { name: 'Decline analytics' }).click()
  await page.goto('/create')
  await page.getByLabel('Upload image').setInputFiles({
    name: 'large-chart-check.png',
    mimeType: 'image/png',
    buffer: createMotifPng()
  })
  await page.getByLabel('Stitches').fill('250')
  await page.getByLabel('Rows').fill('250')
  await page.getByRole('button', { name: 'Generate chart' }).click()

  await expect(page.getByText('250 × 250 stitches')).toBeVisible()
  await expect(page.getByRole('application', { name: /pattern chart/i })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Follow pattern' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Export chart' })).toBeEnabled()
})

async function expectNoSeriousViolations (page: Page) {
  const results = await new AxeBuilder({ page }).analyze()
  const violations = results.violations.filter(({ impact }) => (
    impact === 'serious' || impact === 'critical'
  ))
  expect(violations).toEqual([])
}
