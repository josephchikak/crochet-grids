import { expect, test } from '@playwright/test'
import { createMotifPng } from './helpers'

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

test('edits a chart on a phone without page overflow', async ({ page }) => {
  await page.goto('/create')
  await page.getByLabel('Upload image').setInputFiles({
    name: 'motif.png',
    mimeType: 'image/png',
    buffer: createMotifPng()
  })
  await page.getByLabel('Stitches').fill('20')
  await page.getByLabel('Rows').fill('20')
  await page.getByRole('button', { name: 'Generate chart' }).click()

  await expect(page.getByText('20 × 20 stitches')).toBeVisible()
  const chart = page.getByRole('application', { name: /pattern chart/i })
  await expect(chart).toBeVisible()

  // Tool buttons meet the 44px touch-target minimum
  for (const name of ['Pencil', 'Fill', 'Undo', 'Mirror']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }

  // Paint a corner stitch: the corner is background, so the pencil changes it
  const undo = page.getByRole('button', { name: 'Undo' })
  await expect(undo).toBeDisabled()
  const chartBox = await chart.boundingBox()
  if (!chartBox) throw new Error('Chart has no size')
  const side = Math.min(chartBox.width, chartBox.height)
  await page.touchscreen.tap(
    chartBox.x + (chartBox.width - side) / 2 + side * 0.02,
    chartBox.y + (chartBox.height - side) / 2 + side * 0.02
  )
  await expect(undo).toBeEnabled()

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()

  await page.getByRole('button', { name: /^palette/i }).click()
  const yarnName = page.getByLabel('Yarn name for colour 1')
  await expect(yarnName).toBeVisible()
  await yarnName.fill('Cream cotton')
  await page.getByRole('button', { name: 'Close palette' }).click()
  await expect(yarnName).toBeHidden()

  const overflows = await page.evaluate(() =>
    document.documentElement.scrollWidth > window.innerWidth)
  expect(overflows).toBe(false)
})
